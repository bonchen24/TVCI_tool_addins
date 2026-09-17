[CmdletBinding()]
param(
    [string]$ProjectPath = "",
    [switch]$SkipInstall,
    [switch]$SkipCertificate,
    [switch]$SkipAutostart,
    [switch]$SkipSideload
)

$ErrorActionPreference = "Stop"
try {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [Console]::OutputEncoding = $utf8
    $OutputEncoding = $utf8
} catch {
    # Do not block setup if PowerShell cannot change console encoding.
}

if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $ProjectPath = Split-Path -Parent $PSScriptRoot
}

function Resolve-ProjectPath {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Khong tim thay thu muc project: $Path"
    }

    return (Resolve-Path -LiteralPath $Path).Path
}

function Invoke-Npm {
    param([string[]]$Arguments)

    & $script:npmCommand @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Lenh npm that bai (exit code $exitCode): npm $($Arguments -join ' ')"
    }
}

function Invoke-PowerShellScript {
    param(
        [string]$ScriptPath,
        [string[]]$Arguments
    )

    & $script:powerShellCommand -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "PowerShell script that bai (exit code $exitCode): $ScriptPath"
    }
}

function Stop-ProjectHostWatchdog {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = [string]$_.CommandLine
        $commandLine -like "*$launcherPath*" -and $commandLine -like "*$resolvedProjectPath*"
    })

    foreach ($processInfo in $processes) {
        try {
            Stop-Process -Id $processInfo.ProcessId -Force -ErrorAction Stop
            Write-Host "Da dung watchdog host TVCI (PID $($processInfo.ProcessId)) truoc khi cai dependency."
        } catch {
            throw "Khong dung duoc watchdog host TVCI (PID $($processInfo.ProcessId)): $($_.Exception.Message)"
        }
    }
}

function Stop-ProjectHost {
    $getConnections = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
    if ($null -eq $getConnections) {
        throw "Khong the kiem tra host TVCI tren cong 38473 truoc khi cai dependency."
    }

    $connections = @(Get-NetTCPConnection -LocalPort 38473 -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $connections) {
        try {
            $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction Stop
            $commandLine = [string]$processInfo.CommandLine
            if ($commandLine -notlike "*$resolvedProjectPath*" -and $commandLine -notmatch "webpack(\.js)?\s+serve") {
                continue
            }

            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
            Write-Host "Da dung host TVCI tai cong 38473 (PID $($connection.OwningProcess)) truoc khi cai dependency."
        } catch {
            throw "Khong dung duoc host TVCI tai cong 38473: $($_.Exception.Message)"
        }
    }
}

function Stop-ProjectHostForDependencyInstall {
    New-Item -ItemType File -Path $hostStopMarkerPath -Force | Out-Null
    Stop-ProjectHostWatchdog
    Stop-ProjectHost

    $remainingWatchdogs = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = [string]$_.CommandLine
        $commandLine -like "*$launcherPath*" -and $commandLine -like "*$resolvedProjectPath*"
    })
    if ($remainingWatchdogs.Count -gt 0) {
        throw "Watchdog host TVCI van dang chay; dung cai dependency de tranh hong node_modules."
    }

    $remainingConnections = @(Get-NetTCPConnection -LocalPort 38473 -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $remainingConnections) {
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
        $commandLine = [string]$processInfo.CommandLine
        if ($commandLine -like "*$resolvedProjectPath*" -or $commandLine -match "webpack(\.js)?\s+serve") {
            throw "Host TVCI van dang lang nghe cong 38473; dung cai dependency de tranh hong node_modules."
        }
    }
}

function Assert-CertificateReady {
    $verificationOutput = (& $script:certCliPath verify 2>&1 | Out-String)
    $verificationExitCode = $LASTEXITCODE
    if ($verificationExitCode -ne 0 -or $verificationOutput -notmatch "trusted access to https://localhost") {
        $detail = ($verificationOutput.Trim() -replace "\s+", " ")
        if ($detail.Length -gt 240) {
            $detail = $detail.Substring(0, 240)
        }
        throw "Certificate HTTPS localhost chua san sang. Hay dong Word/WebView dang dung certificate, sau do chay lai setup. $detail"
    }
}

function Assert-StartupConfigured {
    if (-not (Test-Path -LiteralPath $script:startupShortcutPath)) {
        throw "Khong tao duoc shortcut autostart TVCI: $script:startupShortcutPath"
    }

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($script:startupShortcutPath)
    $expectedWscriptPath = (Get-Command wscript.exe -ErrorAction Stop).Source
    $arguments = [string]$shortcut.Arguments
    $hasLauncher = $arguments -like "*local-host-launcher.vbs*"
    $hasProjectPath = $arguments -like "*$resolvedProjectPath*"
    if (-not [String]::Equals($shortcut.TargetPath, $expectedWscriptPath, [StringComparison]::OrdinalIgnoreCase) -or -not $hasLauncher -or -not $hasProjectPath) {
        throw "Shortcut autostart TVCI khong tro dung toi launcher host an."
    }
}

$resolvedProjectPath = Resolve-ProjectPath $ProjectPath
$packageJsonPath = Join-Path $resolvedProjectPath "package.json"
$lockFilePath = Join-Path $resolvedProjectPath "package-lock.json"
$manifestPath = Join-Path $resolvedProjectPath "manifest\manifest.xml"
$clientStartScriptPath = Join-Path $resolvedProjectPath "scripts\start-local-client.ps1"
$startupScriptPath = Join-Path $resolvedProjectPath "scripts\local-startup.ps1"
$launcherPath = Join-Path $resolvedProjectPath "scripts\local-host-launcher.vbs"
$hostStopMarkerPath = Join-Path $resolvedProjectPath ".tvci-host-stop"
$webpackEmitterPath = Join-Path $resolvedProjectPath "node_modules\webpack\hot\emitter.js"
$script:certCliPath = Join-Path $resolvedProjectPath "node_modules\.bin\office-addin-dev-certs.cmd"
$script:startupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "TVCI Word Tools Local.lnk"
$autostartConfigured = $false

if (-not (Test-Path -LiteralPath $packageJsonPath)) {
    throw "Khong tim thay package.json trong project: $resolvedProjectPath"
}
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Khong tim thay manifest/manifest.xml trong project: $resolvedProjectPath"
}
if (-not (Test-Path -LiteralPath $clientStartScriptPath)) {
    throw "Khong tim thay scripts/start-local-client.ps1 trong project: $resolvedProjectPath"
}
if (-not (Test-Path -LiteralPath $startupScriptPath)) {
    throw "Khong tim thay scripts/local-startup.ps1 trong project: $resolvedProjectPath"
}
if (-not (Test-Path -LiteralPath $launcherPath)) {
    throw "Khong tim thay scripts/local-host-launcher.vbs trong project: $resolvedProjectPath"
}

$nodeCommandInfo = Get-Command node.exe -ErrorAction SilentlyContinue
if ($null -eq $nodeCommandInfo) {
    throw "Chua cai Node.js LTS. Hay cai Node.js LTS truoc khi setup TVCI Word Tools."
}
$npmCommandInfo = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($null -eq $npmCommandInfo) {
    throw "Chua cai npm cung Node.js LTS. Hay cai lai Node.js LTS truoc khi setup."
}
$nodeCommand = $nodeCommandInfo.Source
$script:npmCommand = $npmCommandInfo.Source
$script:powerShellCommand = (Get-Command powershell.exe -ErrorAction Stop).Source

Write-Host "TVCI Word Tools - setup may khach"
Write-Host "Project: $resolvedProjectPath"
Write-Host "Node: $(& $nodeCommand --version)"
Write-Host ""

if (-not $SkipInstall) {
    if (-not (Test-Path -LiteralPath $lockFilePath)) {
        throw "Thieu package-lock.json; khong the cai dependency reproducible bang npm ci."
    }

    Write-Host "[1/4] Cai dependency bang npm ci..."
    Write-Host "Dang tam dung host TVCI de tranh npm ci xoa file dependency dang duoc webpack su dung..."
    Stop-ProjectHostForDependencyInstall
    Invoke-Npm @("ci")
} else {
    Write-Host "[1/4] Bo qua npm ci theo tuy chon."
}

if (-not (Test-Path -LiteralPath (Join-Path $resolvedProjectPath "node_modules"))) {
    throw "Chua co node_modules. Hay bo -SkipInstall hoac chay npm ci truoc."
}
if (-not (Test-Path -LiteralPath $webpackEmitterPath)) {
    throw "Thieu node_modules\\webpack\\hot\\emitter.js. Hay chay lai setup khong co -SkipInstall de cai lai dependency."
}

if (-not $SkipCertificate) {
    if (-not (Test-Path -LiteralPath $script:certCliPath)) {
        throw "Khong tim thay office-addin-dev-certs. Hay chay lai setup khong co -SkipInstall."
    }

    Write-Host "[2/4] Cai/chung thuc certificate HTTPS localhost..."
    & $script:certCliPath install
    $certExitCode = $LASTEXITCODE
    if ($certExitCode -ne 0) {
        throw "Khong cai duoc certificate HTTPS localhost (exit code $certExitCode)."
    }
    Assert-CertificateReady
} else {
    Write-Host "[2/4] Bo qua certificate theo tuy chon."
}

if (-not $SkipAutostart) {
    Write-Host "[3/4] Dang ky host tu khoi dong cung Windows..."
    try {
        Invoke-PowerShellScript $startupScriptPath @("-ProjectPath", $resolvedProjectPath)
        Assert-StartupConfigured
        $autostartConfigured = $true
    } catch {
        try { Invoke-PowerShellScript $startupScriptPath @("-ProjectPath", $resolvedProjectPath, "-Uninstall") } catch { Write-Warning "Khong rollback duoc shortcut autostart: $($_.Exception.Message)" }
        throw
    }
} else {
    Write-Host "[3/4] Bo qua autostart theo tuy chon."
}

if (-not $SkipSideload) {
    Write-Host "[4/4] Khoi dong host nen va dang ky manifest vao Word..."
    try {
        Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        foreach ($ver in @("16.0", "15.0")) {
            foreach ($root in @("HKCU:\Software\Microsoft\Office\$ver\WEF", "HKLM:\Software\Microsoft\Office\$ver\WEF", "HKLM:\Software\WOW6432Node\Microsoft\Office\$ver\WEF")) {
                try {
                    if (-not (Test-Path $root)) { New-Item -Path $root -Force -ErrorAction SilentlyContinue | Out-Null }
                    New-ItemProperty -Path $root -Name "Win32WebView2" -Value 1 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
                } catch {}
            }
        }
        
        Write-Host "Xoa cache Office de cap nhat WebView2..."
        foreach ($ver in @("16.0", "15.0")) {
            $wefCache = "$env:LOCALAPPDATA\Microsoft\Office\$ver\Wef"
            if (Test-Path $wefCache) { Remove-Item -Path $wefCache -Recurse -Force -ErrorAction SilentlyContinue }
        }
        
        Write-Host "Cap quyen Loopback cho Edge WebView2..."
        & CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy" | Out-Null

        Invoke-PowerShellScript $clientStartScriptPath @("-ProjectPath", $resolvedProjectPath)
    } catch {
        Write-Warning "Setup khong xac nhan duoc host/dang ky Word. Dang rollback trang thai host/autostart..."
        if ($autostartConfigured) {
            try { Invoke-PowerShellScript $startupScriptPath @("-ProjectPath", $resolvedProjectPath, "-Uninstall") } catch { Write-Warning "Khong rollback duoc autostart: $($_.Exception.Message)" }
        }
        throw
    }
} else {
    if (Test-Path -LiteralPath $hostStopMarkerPath) {
        Remove-Item -LiteralPath $hostStopMarkerPath -Force
    }
    Write-Host "[4/4] Bo qua sideload theo tuy chon."
}

Write-Host ""
Write-Host "Setup hoan tat. Host local dung https://localhost:38473."
Write-Host "Shortcut autostart chay host nen qua launcher an; khong tu mo Word."
Write-Host "Neu Word dang mo, hay dong va mo lai Word de nap Ribbon TVCI Tools moi."
Write-Host "Go cai dat bang: npm run uninstall"
