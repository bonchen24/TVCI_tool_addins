[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$logDir = Join-Path $InstallDir 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$failureFile = Join-Path $logDir 'repair-failure.txt'
Remove-Item -LiteralPath $failureFile -ErrorAction SilentlyContinue

try {
    Write-Host 'TVCI Word Tools: production repair started.'
    Write-Host 'Repair never stops or restarts Microsoft Word. Close and reopen Word after repair.'
    $setup = Join-Path $PSScriptRoot 'setup.ps1'
    if (-not (Test-Path -LiteralPath $setup -PathType Leaf)) {
        throw 'CHECK FAIL [Repair] Missing setup.ps1 in the install directory.'
    }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "CHECK FAIL [Repair] Setup repair failed with exit code $exitCode. See logs."
    }
    $wordProcess = @(Get-Process -Name 'WINWORD' -ErrorAction SilentlyContinue)
    if ($wordProcess.Count -gt 0) {
        Write-Host 'Repair completed. Close and reopen Word to load the production manifest; Word was not interrupted.'
    }
    exit 0
}
catch {
    $message = $_.Exception.Message
    if ($message -notmatch '^CHECK FAIL') {
        $message = "CHECK FAIL [Repair] $message"
    }
    Set-Content -LiteralPath $failureFile -Value $message -Encoding Ascii
    Write-Error $message
    exit 1
}
