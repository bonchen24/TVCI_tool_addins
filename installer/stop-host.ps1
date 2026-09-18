[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$InstallDir)
$ErrorActionPreference = 'Stop'
$hostExe = Join-Path $InstallDir 'runtime\node.exe'
$hostScript = Join-Path $InstallDir 'server\server.js'
foreach ($process in @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue)) {
    if ($process.ExecutablePath -eq $hostExe -and $process.CommandLine -like "*$hostScript*") {
        Stop-Process -Id $process.ProcessId -ErrorAction Stop
    }
}
