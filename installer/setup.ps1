[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$env:PSModulePath = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\Modules'
. (Join-Path $PSScriptRoot 'common.ps1')
$logDir = Join-Path $InstallDir 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$failureFile = Join-Path $logDir 'setup-failure.txt'
Remove-Item -LiteralPath $failureFile -ErrorAction SilentlyContinue
Start-Transcript -Path (Join-Path $logDir 'setup.log') -Append | Out-Null
try {
    Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
    if (-not [Environment]::Is64BitOperatingSystem) { throw 'Windows x86 is not supported: this installer contains an x64 host.' }
    $office = Get-OfficeInfo
    if ($office.OfficeArch -notin @('x86', 'x64')) { throw 'Microsoft Word/Office 2024 bitness could not be detected. Install Office first.' }
    if (-not $office.WordPath) { throw 'WINWORD.EXE was not found in Windows App Paths. Install desktop Word before running setup.' }
    Write-Host "Windows x64; Office $($office.Version) $($office.OfficeArch) [$($office.Product)]"
    foreach ($required in @('runtime\node.exe', 'server\server.js', 'manifest\manifest.xml', 'app\taskpane.html', 'app\templates', 'app\assets')) {
        if (-not (Test-Path -LiteralPath (Join-Path $InstallDir $required))) { throw "Missing install payload: $required" }
    }

    if (-not (Test-WebView2)) {
        $bootstrapper = Join-Path $InstallDir 'runtime\MicrosoftEdgeWebview2Setup.exe'
        if (-not (Test-Path -LiteralPath $bootstrapper)) { throw 'WebView2 is missing and its bootstrapper was not bundled.' }
        Write-Host 'WebView2 missing; starting bundled online bootstrapper (Internet required).'
        $p = Start-Process -FilePath $bootstrapper -ArgumentList '/silent', '/install' -Wait -PassThru -WindowStyle Hidden
        if ($p.ExitCode -ne 0 -or -not (Test-WebView2)) { throw "WebView2 installation failed (exit code $($p.ExitCode)). Connect to the Internet and run Repair." }
    }

    New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
    $stateFile = Join-Path $CertDir 'thumbprint.txt'
    $pfxFile = Join-Path $CertDir 'localhost.pfx'
    $passwordFile = Join-Path $CertDir 'password.txt'
    $validCert = $false
    if ((Test-Path $stateFile) -and (Test-Path $pfxFile) -and (Test-Path $passwordFile)) {
        $thumb = (Get-Content -LiteralPath $stateFile -Raw).Trim()
        $validCert = [bool](Get-ChildItem Cert:\CurrentUser\Root | Where-Object Thumbprint -eq $thumb | Select-Object -First 1)
    }
    if (-not $validCert) {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $password = [Convert]::ToBase64String($bytes)
        $secure = ConvertTo-SecureString $password -AsPlainText -Force
        $cert = New-SelfSignedCertificate -Subject 'CN=TVCI Word Tools localhost' -DnsName 'localhost' -CertStoreLocation 'Cert:\CurrentUser\My' -KeyExportPolicy Exportable -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(3)
        Export-PfxCertificate -Cert $cert -FilePath $pfxFile -Password $secure -Force | Out-Null
        Set-Content -LiteralPath $passwordFile -Value $password -NoNewline -Encoding Ascii
        Set-Content -LiteralPath $stateFile -Value $cert.Thumbprint -NoNewline -Encoding Ascii
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root', 'CurrentUser')
        try { $store.Open('ReadWrite'); $store.Add($cert) } finally { $store.Close() }
    }

    & CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy" 2>$null | Out-Null

    $manifest = Join-Path $InstallDir 'manifest\manifest.xml'
    New-Item -Path $WefKey -Force | Out-Null
    New-ItemProperty -Path $WefKey -Name $AppId -Value $manifest -PropertyType String -Force | Out-Null
    $launcher = Join-Path $InstallDir 'scripts\launcher.vbs'
    $command = 'wscript.exe //B //Nologo "' + $launcher + '" "' + $HostExe + '" "' + $HostScript + '"'
    New-ItemProperty -Path $RunKey -Name 'TVCIWordTools' -Value $command -PropertyType String -Force | Out-Null

    $owner = Get-PortOwner
    $own = @(Get-OwnHost)
    if ($owner -and $owner.OwningProcess -notin @($own | ForEach-Object ProcessId)) {
        throw "Port 38473 is used by PID $($owner.OwningProcess). No process was stopped."
    }
    if ($owner) {
        Stop-Process -Id $owner.OwningProcess -ErrorAction Stop
        for ($i = 0; $i -lt 20 -and (Get-PortOwner); $i++) { Start-Sleep -Milliseconds 200 }
        if (Get-PortOwner) { throw 'Previous TVCI host did not release port 38473.' }
    }
    Start-Process -FilePath 'wscript.exe' -ArgumentList @('//B', '//Nologo', $launcher, $HostExe, $HostScript) -WindowStyle Hidden | Out-Null
    $healthy = $false
    for ($i = 0; $i -lt 20; $i++) { Start-Sleep -Milliseconds 500; if (Get-Health) { $healthy = $true; break } }
    $verification = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'verify.ps1') 2>&1)
    $verifyExit = $LASTEXITCODE
    $verification | ForEach-Object { Write-Host $_ }
    if ($verifyExit -ne 0) {
        $failedChecks = @($verification | Where-Object { "$_" -like 'FAIL *' })
        throw "Post-install verification failed: $($failedChecks -join '; ')"
    }
    if (Get-Process WINWORD -ErrorAction SilentlyContinue) { Write-Host 'Close and reopen Word to load the add-in. Open documents were not interrupted.' }
} catch {
    Set-Content -LiteralPath $failureFile -Value $_.Exception.Message -Encoding Ascii
    Write-Error $_
    exit 1
} finally { Stop-Transcript | Out-Null }
