[CmdletBinding()]
param()
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'common.ps1')
$failures = New-Object System.Collections.Generic.List[string]
function Check($Name, $Ok, $Detail) {
    if ($Ok) { Write-Host "PASS $Name $Detail" }
    else { Write-Host "FAIL $Name $Detail"; $failures.Add("$Name`: $Detail") }
}
$windowsArch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
$office = Get-OfficeInfo
Write-Host "Windows arch: $windowsArch"
Write-Host "Office version: $($office.Version) [$($office.Product)]"
Write-Host "Office arch: $($office.OfficeArch)"
Check 'Windows architecture' ($windowsArch -eq 'x64') 'x64 host required'
Check 'Office installation' ($office.OfficeArch -in @('x86', 'x64')) 'Office 16 Click-to-Run platform required'
Check 'Word executable' ([bool]$office.WordPath) $office.WordPath
$webview = Test-WebView2
Write-Host "WebView2: $(if ($webview) { $webview } else { 'missing' })"
Check 'WebView2' ([bool]$webview) 'runtime registry version'
foreach ($relative in @('runtime\node.exe', 'server\server.js', 'manifest\manifest.xml', 'app\taskpane.html', 'app\templates', 'app\assets')) {
    Check 'Payload' (Test-Path -LiteralPath (Join-Path $InstallDir $relative)) $relative
}
$registered = (Get-ItemProperty -LiteralPath $WefKey -Name $AppId -ErrorAction SilentlyContinue).$AppId
Check 'Manifest registered' ($registered -eq (Join-Path $InstallDir 'manifest\manifest.xml')) $registered
$run = (Get-ItemProperty -LiteralPath $RunKey -Name 'TVCIWordTools' -ErrorAction SilentlyContinue).TVCIWordTools
Check 'Autostart' ($run -and $run.Contains($HostExe)) 'HKCU Run'
$thumbFile = Join-Path $CertDir 'thumbprint.txt'
$thumb = if (Test-Path -LiteralPath $thumbFile) { (Get-Content -LiteralPath $thumbFile -Raw).Trim() } else { '' }
$trusted = [bool](Get-ChildItem Cert:\CurrentUser\Root -ErrorAction SilentlyContinue | Where-Object Thumbprint -eq $thumb | Select-Object -First 1)
Check 'HTTPS certificate' ($trusted -and (Test-Path (Join-Path $CertDir 'localhost.pfx'))) 'CurrentUser Root'
$port = Get-PortOwner
Write-Host "Port: 38473 $(if ($port) { 'PID ' + $port.OwningProcess } else { 'not listening' })"
$own = @(Get-OwnHost)
Check 'Host running' ($port -and $port.OwningProcess -in @($own | ForEach-Object ProcessId)) 'bundled runtime'
Check 'HTTPS health' (Get-Health) 'https://localhost:38473/api/health'
if ($failures.Count) { Write-Host "FAIL: $($failures -join '; ')"; exit 1 }
Write-Host 'READY: TVCI Word Tools is installed and healthy.'
exit 0
