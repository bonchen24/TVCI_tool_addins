[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$InstallDir)
$ErrorActionPreference = 'Stop'
$stopMarker = Join-Path $InstallDir '.tvci-stop'
New-Item -ItemType File -Path $stopMarker -Force | Out-Null
$hostExe = Join-Path $InstallDir 'runtime\node.exe'
$hostScript = Join-Path $InstallDir 'server\server.js'
foreach ($process in @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue)) {
    if ($process.ExecutablePath -eq $hostExe -and $process.CommandLine -like "*$hostScript*") {
        Stop-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
    }
}
foreach ($process in @(Get-CimInstance Win32_Process -Filter "Name = 'wscript.exe'" -ErrorAction SilentlyContinue)) {
    if ($process.CommandLine -like "*launcher.vbs*") {
        Stop-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
    }
}
