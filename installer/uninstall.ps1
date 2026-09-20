[CmdletBinding()]
param([switch]$PurgeUserData)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$stopMarker = Join-Path $InstallDir '.tvci-stop'
New-Item -ItemType File -Path $stopMarker -Force -ErrorAction SilentlyContinue | Out-Null
foreach ($process in @(Get-OwnHost)) { Stop-Process -Id $process.ProcessId -ErrorAction Stop }
$registered = (Get-ItemProperty -LiteralPath $WefKey -Name $AppId -ErrorAction SilentlyContinue).$AppId
if ($registered -eq (Join-Path $InstallDir 'manifest\manifest.xml')) {
    Remove-ItemProperty -LiteralPath $WefKey -Name $AppId -ErrorAction SilentlyContinue
}
$launcher = Join-Path $InstallDir 'scripts\launcher.vbs'
$runValue = (Get-ItemProperty -LiteralPath $RunKey -Name 'TVCIWordTools' -ErrorAction SilentlyContinue).TVCIWordTools
if ($runValue -and $runValue.Contains($launcher)) {
    Remove-ItemProperty -LiteralPath $RunKey -Name 'TVCIWordTools' -ErrorAction SilentlyContinue
}
$stateFile = Join-Path $CertDir 'thumbprint.txt'
if (Test-Path -LiteralPath $stateFile) {
    $thumb = (Get-Content -LiteralPath $stateFile -Raw).Trim()
    if ($thumb -match '^[A-Fa-f0-9]{40}$') {
        foreach ($storeName in @('Root', 'My')) {
            $store = New-Object System.Security.Cryptography.X509Certificates.X509Store($storeName, 'CurrentUser')
            try {
                $store.Open('ReadWrite')
                $cert = $store.Certificates.Find('FindByThumbprint', $thumb, $false) | Where-Object { $_.Subject -eq 'CN=TVCI Word Tools localhost' } | Select-Object -First 1
                if ($cert) { $store.Remove($cert) }
            } finally { $store.Close() }
        }
    }
}
if (Test-Path -LiteralPath $CertDir) { Remove-Item -LiteralPath $CertDir -Recurse -Force }
if ($PurgeUserData) {
    foreach ($name in @('drafts', 'favorites', 'recent', 'user-templates', 'knowledge', 'prefs', 'ai-settings')) {
        $target = Join-Path $InstallDir $name
        if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    }
}
Write-Host 'TVCI Word Tools registration and certificate removed. User data retained unless purge was requested.'
