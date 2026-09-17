[CmdletBinding()]
param(
    [string]$ProjectPath = "",
    [switch]$RemoveCertificate
)

$ErrorActionPreference = "Stop"
try {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [Console]::OutputEncoding = $utf8
    $OutputEncoding = $utf8
} catch {
    # Do not block uninstall if PowerShell cannot change console encoding.
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

function Invoke-BestEffortOfficeUnregister {
    if (-not (Test-Path -LiteralPath $script:devSettingsCliPath)) {
        Write-Warning "Khong tim thay office-addin-dev-settings; khong the go dang ky add-in khoi Word."
        return
    }

    try {
        & $script:devSettingsCliPath unregister $script:manifestPath
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            Write-Warning "Khong go duoc dang ky manifest khoi Word (exit code $exitCode)."
        }
    } catch {
        Write-Warning "Khong go duoc dang ky manifest khoi Word. $($_.Exception.Message)"
    }
}

function Invoke-BestEffortPowerShellScript {
    param(
        [string]$ScriptPath,
        [string[]]$Arguments
    )

    if (-not (Test-Path -LiteralPath $ScriptPath)) {
        Write-Warning "Khong tim thay script can chay: $ScriptPath"
        return
    }

    try {
        & $script:powerShellCommand -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            Write-Warning "Khong go duoc autostart (exit code $exitCode)."
        }
    } catch {
        Write-Warning "Khong go duoc autostart. $($_.Exception.Message)"
    }
}

function Test-OfficeAddInUnregistered {
    if (-not (Test-Path -LiteralPath $script:devSettingsCliPath)) {
        Write-Warning "Khong tim thay office-addin-dev-settings; khong the xac nhan go dang ky Office."
        return $false
    }

    $registeredOutput = (& $script:devSettingsCliPath registered 2>&1 | Out-String)
    $registeredExitCode = $LASTEXITCODE
    $registeredText = $registeredOutput.Replace("/", "\")
    $expectedManifestPath = (Resolve-Path -LiteralPath $script:manifestPath).Path.Replace("/", "\")
    $isRegistered = $registeredText.IndexOf($expectedManifestPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
    if ($isRegistered) {
        Write-Warning "Manifest TVCI van con dang ky trong Office. Hay dong Word va chay lai uninstall."
        return $false
    }

    $noRegisteredAddIns = $registeredText -match "No add-ins are registered|unable to find the specified registry key or value"
    if ($registeredExitCode -ne 0 -and -not $noRegisteredAddIns) {
        Write-Warning "Khong doc duoc danh sach Office Add-in da dang ky (exit code $registeredExitCode)."
        return $false
    }

    return $true
}

function Test-StartupRemoved {
    if (Test-Path -LiteralPath $script:startupShortcutPath) {
        Write-Warning "Shortcut TVCI van con trong Windows Startup: $($script:startupShortcutPath)"
        return $false
    }

    return $true
}

function Stop-LocalHost {
    $getConnections = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
    if ($null -eq $getConnections) {
        Write-Warning "Khong co Get-NetTCPConnection; hay dung thu cong host tai cong 38473 neu host van con chay."
        return
    }

    $connections = @(Get-NetTCPConnection -LocalPort 38473 -State Listen -ErrorAction SilentlyContinue)
    $processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($processId in $processIds) {
        try {
            $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction Stop
            $commandLine = [string]$processInfo.CommandLine
            if ($commandLine -notmatch "webpack(\.js)?\s+serve" -and $commandLine -notlike "*$resolvedProjectPath*") {
                Write-Warning "Khong tu dung PID $processId vi khong xac dinh la host TVCI."
                continue
            }

            Stop-Process -Id $processId -ErrorAction Stop
            Write-Host "Da dung host TVCI dang lang nghe tai cong 38473 (PID $processId)."
        } catch {
            Write-Warning "Khong dung duoc host tai cong 38473 (PID $processId). Co the can dong host hoac chay lai bang quyen phu hop. $($_.Exception.Message)"
        }
    }
}

function Stop-LocalHostWatchdog {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = [string]$_.CommandLine
        $commandLine -like "*$launcherPath*" -and $commandLine -like "*$resolvedProjectPath*"
    })

    foreach ($processInfo in $processes) {
        try {
            Stop-Process -Id $processInfo.ProcessId -Force -ErrorAction Stop
            Write-Host "Da dung watchdog host TVCI (PID $($processInfo.ProcessId))."
        } catch {
            Write-Warning "Khong dung duoc watchdog host TVCI (PID $($processInfo.ProcessId)): $($_.Exception.Message)"
        }
    }
}

function Test-LocalHostWatchdogStopped {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = [string]$_.CommandLine
        $commandLine -like "*$launcherPath*" -and $commandLine -like "*$resolvedProjectPath*"
    })
    return $processes.Count -eq 0
}

function Test-LocalHostStopped {
    $getConnections = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
    if ($null -eq $getConnections) {
        Write-Warning "Khong the xac minh host tai cong 38473 vi thieu Get-NetTCPConnection."
        return $false
    }

    $connections = @(Get-NetTCPConnection -LocalPort 38473 -State Listen -ErrorAction SilentlyContinue)
    if ($connections.Count -gt 0) {
        Write-Warning "Van con tien trinh lang nghe tai cong 38473; khong the xac nhan da dung host TVCI."
        return $false
    }

    return $true
}

$resolvedProjectPath = Resolve-ProjectPath $ProjectPath
$packageJsonPath = Join-Path $resolvedProjectPath "package.json"
$startupScriptPath = Join-Path $resolvedProjectPath "scripts\local-startup.ps1"
$nodeModulesPath = Join-Path $resolvedProjectPath "node_modules"
$script:manifestPath = Join-Path $resolvedProjectPath "manifest\manifest.xml"
$launcherPath = Join-Path $resolvedProjectPath "scripts\local-host-launcher.vbs"
$hostStopMarkerPath = Join-Path $resolvedProjectPath ".tvci-host-stop"
$script:devSettingsCliPath = Join-Path $resolvedProjectPath "node_modules\.bin\office-addin-dev-settings.cmd"
$script:startupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "TVCI Word Tools Local.lnk"
$officeRegistrationVerified = $false
$startupRemoved = $false
$hostStopped = $false
$watchdogStopped = $false

if (-not (Test-Path -LiteralPath $packageJsonPath)) {
    throw "Khong tim thay package.json trong project: $resolvedProjectPath"
}

$script:powerShellCommand = (Get-Command powershell.exe -ErrorAction Stop).Source
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue

Write-Host "TVCI Word Tools - uninstall may khach"
Write-Host "Project: $resolvedProjectPath"

if ($null -ne $npm -and (Test-Path -LiteralPath $nodeModulesPath)) {
    $script:npmCommand = $npm.Source
    Write-Host "[1/3] Go dang ky manifest khoi Word..."
    Invoke-BestEffortOfficeUnregister
    $officeRegistrationVerified = Test-OfficeAddInUnregistered
} else {
    Write-Warning "Thieu npm hoac node_modules; khong the tu go dang ky add-in khoi Word."
}

Write-Host "[2/3] Go host khoi Windows Startup..."
Invoke-BestEffortPowerShellScript $startupScriptPath @("-ProjectPath", $resolvedProjectPath, "-Uninstall")
try {
    New-Item -ItemType File -Path $hostStopMarkerPath -Force | Out-Null
} catch {
    Write-Warning "Khong tao duoc dau hieu dung watchdog host: $($_.Exception.Message)"
}
Stop-LocalHostWatchdog
Stop-LocalHost
$startupRemoved = Test-StartupRemoved
$hostStopped = Test-LocalHostStopped
$watchdogStopped = Test-LocalHostWatchdogStopped

if ($RemoveCertificate) {
    $certCliPath = Join-Path $resolvedProjectPath "node_modules\.bin\office-addin-dev-certs.cmd"
    if (Test-Path -LiteralPath $certCliPath) {
        Write-Host "[3/3] Go certificate development cua Office Add-ins khoi user hien tai..."
        & $certCliPath uninstall
        $certExitCode = $LASTEXITCODE
        if ($certExitCode -ne 0) {
            throw "Khong go duoc certificate development (exit code $certExitCode)."
        }
    } else {
        Write-Warning "Khong tim thay office-addin-dev-certs; bo qua go certificate."
    }
} else {
    Write-Host "[3/3] Giu certificate localhost de khong anh huong add-in Office khac."
}

Write-Host ""
Write-Host "Uninstall hoan tat: da dung/go trang thai project co the go tu dong."
Write-Host "Khong xoa thu muc project, node_modules, template ca nhan hoac API key."
if (-not $RemoveCertificate) {
    Write-Host "Neu chac chan khong con Office Add-in local nao dung certificate, chay them: npm run uninstall:local:purge-cert"
}

if (-not $officeRegistrationVerified -or -not $startupRemoved -or -not $hostStopped -or -not $watchdogStopped) {
    Write-Warning "Uninstall chua hoan tat: can xac nhan Word da go manifest, shortcut Startup da bi xoa, watchdog va host da dung."
    exit 1
}
