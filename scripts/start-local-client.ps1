[CmdletBinding()]
param(
    [string]$ProjectPath = ""
)

$ErrorActionPreference = "Stop"
try {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [Console]::OutputEncoding = $utf8
    $OutputEncoding = $utf8
} catch {
    # Do not block local startup if PowerShell cannot change console encoding.
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

function Test-ProjectHostListening {
    $getConnections = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
    if ($null -eq $getConnections) {
        return $false
    }

    $connections = @(Get-NetTCPConnection -LocalPort 38473 -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $connections) {
        try {
            $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction Stop
            $commandLine = [string]$processInfo.CommandLine
            if ($commandLine -like "*$resolvedProjectPath*" -or $commandLine -match "webpack(\.js)?\s+serve") {
                return $true
            }
        } catch {
            # A short-lived process may disappear between the two queries.
        }
    }

    return $false
}

function Test-ProjectHostWatchdog {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = [string]$_.CommandLine
        $commandLine -like "*$launcherPath*" -and $commandLine -like "*$resolvedProjectPath*"
    })
    return $processes.Count -gt 0
}

function Stop-ProjectHost {
    $getConnections = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
    if ($null -eq $getConnections) {
        return
    }

    $connections = @(Get-NetTCPConnection -LocalPort 38473 -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $connections) {
        try {
            $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction Stop
            $commandLine = [string]$processInfo.CommandLine
            if ($commandLine -like "*$resolvedProjectPath*" -or $commandLine -match "webpack(\.js)?\s+serve") {
                Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
            }
        } catch {
            Write-Warning "Khong rollback duoc host TVCI: $($_.Exception.Message)"
        }
    }
}

function Assert-LocalHostReady {
    $lastError = "Khong co phan hoi tu host local."
    for ($attempt = 1; $attempt -le 15; $attempt++) {
        try {
            $checkOutput = & $nodeCommand $hostCheckScriptPath $localHostUri 2>&1
            $checkExitCode = $LASTEXITCODE
            if ($checkExitCode -eq 0) {
                return
            }

            $lastError = ($checkOutput | Out-String).Trim()
        } catch {
            $lastError = $_.Exception.Message
        }

        if ($attempt -lt 15) {
            Start-Sleep -Seconds 1
        }
    }

    throw "Host local chua san sang tai ${localHostUri}: $lastError"
}

function Assert-OfficeAddInRegistered {
    $registeredOutput = (& $devSettingsCliPath registered 2>&1 | Out-String)
    $registeredExitCode = $LASTEXITCODE
    $registeredText = $registeredOutput.Replace("/", "\")
    $expectedManifestPath = (Resolve-Path -LiteralPath $manifestPath).Path.Replace("/", "\")
    $isRegistered = $registeredText.IndexOf($expectedManifestPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
    if ($registeredExitCode -ne 0 -or -not $isRegistered) {
        throw "Word chua dang ky manifest TVCI. Kiem tra chinh sach dang ky add-in cua Office va thu lai."
    }
}

$resolvedProjectPath = Resolve-ProjectPath $ProjectPath
$packageJsonPath = Join-Path $resolvedProjectPath "package.json"
$manifestPath = Join-Path $resolvedProjectPath "manifest\manifest.xml"
$launcherPath = Join-Path $resolvedProjectPath "scripts\local-host-launcher.vbs"
$devSettingsCliPath = Join-Path $resolvedProjectPath "node_modules\.bin\office-addin-dev-settings.cmd"
$hostCheckScriptPath = Join-Path $resolvedProjectPath "scripts\check-local-host.mjs"
$stopFilePath = Join-Path $resolvedProjectPath ".tvci-host-stop"
$localHostUri = "https://localhost:38473/taskpane.html"

foreach ($requiredPath in @($packageJsonPath, $manifestPath, $launcherPath, $devSettingsCliPath, $hostCheckScriptPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Khong tim thay file can thiet: $requiredPath"
    }
}

$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$nodeCommand = (Get-Command node.exe -ErrorAction Stop).Source
$wscriptCommand = (Get-Command wscript.exe -ErrorAction Stop).Source
$hostStartedByScript = $false

try {
    Write-Host "TVCI Word Tools - start local client an toan"
    Write-Host "Project: $resolvedProjectPath"

    if (Test-Path -LiteralPath $stopFilePath) {
        Remove-Item -LiteralPath $stopFilePath -Force
    }

    $hostIsListening = Test-ProjectHostListening
    $watchdogIsRunning = Test-ProjectHostWatchdog
    if ($hostIsListening -and $watchdogIsRunning) {
        Write-Host "Host TVCI va watchdog da dang chay tai cong 38473; dung lai trang thai hien tai."
    } else {
        if ($hostIsListening -and -not $watchdogIsRunning) {
            Write-Host "Phat hien host cu chua co watchdog; dang khoi dong lai host TVCI..."
            Stop-ProjectHost
        }

        $quotedLauncherPath = '"' + $launcherPath + '"'
        $quotedProjectPath = '"' + $resolvedProjectPath + '"'
        $quotedNpmCommand = '"' + $npmCommand + '"'
        $launcherArguments = "//B //Nologo $quotedLauncherPath $quotedProjectPath $quotedNpmCommand"
        Start-Process -FilePath $wscriptCommand -ArgumentList $launcherArguments -WindowStyle Hidden | Out-Null
        $hostStartedByScript = $true
    }

    Assert-LocalHostReady
    & $devSettingsCliPath register $manifestPath
    $registerExitCode = $LASTEXITCODE
    if ($registerExitCode -ne 0) {
        throw "Khong dang ky duoc manifest vao Word (exit code $registerExitCode)."
    }
    Assert-OfficeAddInRegistered

    Write-Host "Host local san sang tai https://localhost:38473."
    Write-Host "Manifest da dang ky vao Word; khong mo tai lieu debug tam."
} catch {
    if ($hostStartedByScript) {
        New-Item -ItemType File -Path $stopFilePath -Force | Out-Null
        Stop-ProjectHost
    }
    throw
}
