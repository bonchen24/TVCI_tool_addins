[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$InstallDir,
    [string]$DiagnosticFile = (Join-Path $env:TEMP 'TVCIWordTools-stop-host.log')
)
$ErrorActionPreference = 'Stop'
$targetInstallDir = $InstallDir
. (Join-Path $PSScriptRoot 'common.ps1')

try {
    Stop-TvciHost -InstallPath $targetInstallDir | Out-Null
    exit 0
} catch {
    $detail = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')] InstallDir=$targetInstallDir`r`n$($_.Exception.ToString())"
    [Console]::Error.WriteLine($detail)
    try {
        $parent = Split-Path -Parent $DiagnosticFile
        if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        [System.IO.File]::WriteAllText($DiagnosticFile, $detail, [System.Text.Encoding]::Default)
    } catch {
        [Console]::Error.WriteLine("Unable to write stop-host diagnostic file '$DiagnosticFile': $($_.Exception.Message)")
    }
    exit 1
}
