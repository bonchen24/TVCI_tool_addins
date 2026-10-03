[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$env:PSModulePath = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\Modules'
. (Join-Path $PSScriptRoot 'common.ps1')

$logDir = Join-Path $InstallDir 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$failureFile = Join-Path $logDir 'setup-failure.txt'
Remove-Item -LiteralPath $failureFile -ErrorAction SilentlyContinue
$transcriptStarted = $false

function Fail-Check {
    param([string]$Name, [string]$Detail)
    throw "CHECK FAIL [$Name] $Detail"
}

try {
    Start-Transcript -Path (Join-Path $logDir 'setup.log') -Append | Out-Null
    $transcriptStarted = $true
    Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
    Write-Host 'BƯỚC: Kiểm tra Windows và Microsoft Word/Office.'

    if (-not [Environment]::Is64BitOperatingSystem) {
        Fail-Check 'Windows architecture' 'Windows x86 is not supported: the bundled host is x64.'
    }

    $office = Get-OfficeInfo
    if ($office.OfficeArch -notin @('x86', 'x64')) {
        Fail-Check 'Office installation' 'Office/Word 2024 bitness could not be detected through registry, Click-to-Run, or App Paths.'
    }
    if (-not $office.WordPath) {
        Fail-Check 'Word executable' 'WINWORD.EXE was not found for the detected Office installation.'
    }
    Write-Host "Windows x64; Office $($office.Version) $($office.OfficeArch) [$($office.Product)]"

    foreach ($required in @('runtime\node.exe', 'server\server.js', 'manifest\manifest.xml', 'app\taskpane.html', 'app\templates', 'app\assets')) {
        if (-not (Test-Path -LiteralPath (Join-Path $InstallDir $required))) {
            Fail-Check 'Payload' "Missing install payload: $required"
        }
    }

    Write-Host 'BƯỚC: Kiểm tra WebView2; nếu thiếu sẽ cài bằng bộ cài offline đi kèm.'
    $webview = Test-WebView2
    if (-not $webview) {
        $offlineInstaller = Join-Path $InstallDir 'runtime\MicrosoftEdgeWebView2RuntimeInstallerX64.exe'
        if (-not (Test-Path -LiteralPath $offlineInstaller -PathType Leaf)) {
            Fail-Check 'WebView2' "Runtime is missing and the offline installer is unavailable: $offlineInstaller"
        }
        Write-Host 'WebView2 missing; installing from the bundled offline Evergreen Standalone Installer.'
        $p = Start-Process -FilePath $offlineInstaller -ArgumentList '/silent', '/install' -Wait -PassThru -WindowStyle Hidden
        if ($p.ExitCode -ne 0) {
            Fail-Check 'WebView2' "Offline Evergreen Standalone Installer exited with code $($p.ExitCode). Run Repair or contact support."
        }
        $webview = Test-WebView2
        if (-not $webview) {
            Fail-Check 'WebView2' 'Offline Evergreen Standalone Installer completed but a usable WebView2 runtime was not detected.'
        }
    }
    Write-Host "WebView2: $webview"

    Write-Host 'BƯỚC: Cấu hình HTTPS localhost/certificate.'
    New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
    $stateFile = Join-Path $CertDir 'thumbprint.txt'
    $pfxFile = Join-Path $CertDir 'localhost.pfx'
    $passwordFile = Join-Path $CertDir 'password.txt'
    $validCert = Test-TvciCertificate
    if (-not $validCert) {
        $oldThumb = if (Test-Path -LiteralPath $stateFile) { (Get-Content -LiteralPath $stateFile -Raw).Trim().Replace(' ', '') } else { '' }
        if ($oldThumb -match '^[A-Fa-f0-9]{40}$') {
            foreach ($storeName in @('Root', 'My')) {
                $oldStore = New-Object System.Security.Cryptography.X509Certificates.X509Store($storeName, 'CurrentUser')
                try {
                    $oldStore.Open('ReadWrite')
                    $oldCert = $oldStore.Certificates.Find('FindByThumbprint', $oldThumb, $false) |
                        Where-Object { $_.Subject -eq 'CN=TVCI Word Tools localhost' } | Select-Object -First 1
                    if ($oldCert) { $oldStore.Remove($oldCert) }
                } finally { $oldStore.Close() }
            }
        }
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $password = [Convert]::ToBase64String($bytes)
        $secure = ConvertTo-SecureString $password -AsPlainText -Force
        $cert = New-SelfSignedCertificate -Subject 'CN=TVCI Word Tools localhost' -DnsName 'localhost' -CertStoreLocation 'Cert:\CurrentUser\My' -KeyExportPolicy Exportable -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -NotBefore (Get-Date).AddMinutes(-5) -NotAfter (Get-Date).AddYears(3) -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.1')
        Export-PfxCertificate -Cert $cert -FilePath $pfxFile -Password $secure -Force | Out-Null
        Set-Content -LiteralPath $passwordFile -Value $password -NoNewline -Encoding Ascii
        Set-Content -LiteralPath $stateFile -Value $cert.Thumbprint -NoNewline -Encoding Ascii
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root', 'CurrentUser')
        try { $store.Open('ReadWrite'); $store.Add($cert) } finally { $store.Close() }
    }
    if (-not (Test-TvciCertificate)) {
        Fail-Check 'HTTPS certificate' 'The per-user localhost certificate, private key, or trust entry is not usable.'
    }

    $checkNetIsolation = Get-Command CheckNetIsolation.exe -ErrorAction SilentlyContinue
    if ($checkNetIsolation) {
        & $checkNetIsolation.Source LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy" 2>$null | Out-Null
    }

    Write-Host 'BƯỚC: Kiểm tra cổng localhost 38473 sau khi PrepareToInstall đã dừng host TVCI cũ.'
    $externalOwners = @(Get-ExternalPortOwners)
    if ($externalOwners.Count -gt 0) {
        $details = ($externalOwners | ForEach-Object { "PID=$($_.OwningProcess) address=$($_.LocalAddress)" }) -join ', '
        Fail-Check 'Port conflict' "Port 38473 is already used by an unrelated process ($details). No process was stopped."
    }

    if ((Get-PortOwners).Count -gt 0) {
        Fail-Check 'Port conflict' 'Port 38473 became busy after PrepareToInstall; no process was stopped here.'
    }

    Write-Host 'BƯỚC: Đăng ký Word add-in trong tài khoản hiện tại.'
    $manifest = Join-Path $InstallDir 'manifest\manifest.xml'
    New-Item -Path $WefKey -Force | Out-Null
    New-ItemProperty -Path $WefKey -Name $AppId -Value $manifest -PropertyType String -Force | Out-Null
    $registered = (Get-ItemProperty -LiteralPath $WefKey -Name $AppId -ErrorAction SilentlyContinue).$AppId
    if ($registered -ne $manifest) {
        Fail-Check 'WEF registration' "Developer AppId value is not the installed manifest: $registered"
    }
    $launcher = Join-Path $InstallDir 'scripts\launcher.vbs'
    $command = 'wscript.exe //B //Nologo "' + $launcher + '" "' + $HostExe + '" "' + $HostScript + '"'
    New-ItemProperty -Path $RunKey -Name 'TVCIWordTools' -Value $command -PropertyType String -Force | Out-Null

    $stopMarker = Join-Path $InstallDir '.tvci-stop'
    Remove-Item -LiteralPath $stopMarker -Force -ErrorAction SilentlyContinue
    Write-Host 'BƯỚC: Khởi động TVCI local host.'
    Start-Process -FilePath 'wscript.exe' -ArgumentList @('//B', '//Nologo', $launcher, $HostExe, $HostScript) -WindowStyle Hidden | Out-Null
    Write-Host 'BƯỚC: Kiểm tra runtime, lệnh và cấu hình Ribbon.'
    $runtime = Test-TvciCommandRuntime
    if (-not $runtime.Ok) {
        Fail-Check 'Command runtime' $runtime.Detail
    }

    $verification = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'verify.ps1') 2>&1)
    $verifyExit = $LASTEXITCODE
    $verification | ForEach-Object { Write-Host $_ }
    if ($verifyExit -ne 0) {
        $failedChecks = @($verification | Where-Object { "$_" -like 'FAIL *' })
        Fail-Check 'Post-install verification' ($failedChecks -join '; ')
    }
    if (Get-Process WINWORD -ErrorAction SilentlyContinue) {
        $wordInstruction = 'IMPORTANT: ALL Microsoft Word windows must be closed and reopened now to load the production TVCI add-in. TVCI did not interrupt Word.'
        Write-Warning $wordInstruction
    }
} catch {
    $message = $_.Exception.Message
    if ($message -notmatch '^CHECK FAIL') { $message = "CHECK FAIL [Setup] $message" }
    Set-Content -LiteralPath $failureFile -Value $message -Encoding Ascii
    Write-Error $message
    exit 1
} finally {
    if ($transcriptStarted) { Stop-Transcript | Out-Null }
}
