[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$logDir = Join-Path $InstallDir 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$failureFile = Join-Path $logDir 'uninstall-failure.txt'
$uninstallLog = Join-Path $logDir 'uninstall.log'
Remove-Item -LiteralPath $failureFile -ErrorAction SilentlyContinue

function Write-UninstallLog([string]$Message) {
    Add-Content -LiteralPath $uninstallLog -Value ("{0} {1}" -f (Get-Date -Format o), $Message)
    Write-Host $Message
}

try {
    $stopMarker = Join-Path $InstallDir '.tvci-stop'
    New-Item -ItemType File -Path $stopMarker -Force | Out-Null
    foreach ($process in @(Get-OwnHost)) {
        Stop-Process -Id $process.ProcessId -ErrorAction Stop
    }
    Write-UninstallLog 'Stopped only the TVCI production host; Microsoft Word was not stopped.'

    $manifest = Join-Path $InstallDir 'manifest\manifest.xml'
    $registered = (Get-ItemProperty -LiteralPath $WefKey -Name $AppId -ErrorAction SilentlyContinue).$AppId
    if ($registered -eq $manifest) {
        Remove-ItemProperty -LiteralPath $WefKey -Name $AppId -ErrorAction SilentlyContinue
        Write-UninstallLog 'Removed the TVCI manifest registration.'
    }

    $launcher = Join-Path $InstallDir 'scripts\launcher.vbs'
    $runValue = (Get-ItemProperty -LiteralPath $RunKey -Name 'TVCIWordTools' -ErrorAction SilentlyContinue).TVCIWordTools
    if ($runValue -and $runValue.Contains($launcher)) {
        Remove-ItemProperty -LiteralPath $RunKey -Name 'TVCIWordTools' -ErrorAction SilentlyContinue
        Write-UninstallLog 'Removed the TVCI autostart entry.'
    }

    $stateFile = Join-Path $CertDir 'thumbprint.txt'
    if (Test-Path -LiteralPath $stateFile -PathType Leaf) {
        $thumb = (Get-Content -LiteralPath $stateFile -Raw).Trim().Replace(' ', '')
        if ($thumb -match '^[A-Fa-f0-9]{40}$') {
            foreach ($storeName in @('Root', 'My')) {
                $store = New-Object System.Security.Cryptography.X509Certificates.X509Store($storeName, 'CurrentUser')
                try {
                    $store.Open('ReadWrite')
                    $cert = $store.Certificates.Find('FindByThumbprint', $thumb, $false) |
                        Where-Object { $_.Subject -eq 'CN=TVCI Word Tools localhost' } | Select-Object -First 1
                    if ($cert) { $store.Remove($cert) }
                } finally { $store.Close() }
            }
            Write-UninstallLog 'Removed only the TVCI localhost certificate from the current-user stores.'
        }
    }

    if (Test-Path -LiteralPath $CertDir) {
        Remove-Item -LiteralPath $CertDir -Recurse -Force
    }
    Write-UninstallLog 'Removed TVCI certificate files. User data and Microsoft Word data were retained.'
    exit 0
} catch {
    $message = $_.Exception.Message
    if ($message -notmatch '^CHECK FAIL') { $message = "CHECK FAIL [Uninstall] $message" }
    Set-Content -LiteralPath $failureFile -Value $message -Encoding Ascii
    Add-Content -LiteralPath $uninstallLog -Value ("{0} {1}" -f (Get-Date -Format o), $message)
    Write-Error $message
    exit 1
}
