[CmdletBinding()]
param()

$installDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Check ($Name, $Condition) {
    if ($Condition) {
        Write-Host "[PASS] $Name" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $Name" -ForegroundColor Red
    }
}

Check "Installation directory" (Test-Path $installDir)
Check "Runtime (node.exe)" (Test-Path "$installDir\runtime\node.exe")
Check "Local server (server.js)" (Test-Path "$installDir\server\server.js")
Check "Manifest (manifest.xml)" (Test-Path "$installDir\manifest\manifest.xml")
Check "Templates" (Test-Path "$installDir\app\templates")
Check "Assets" (Test-Path "$installDir\app\assets")
Check "Startup registration" ($null -ne (Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "TVCIWordTools" -ErrorAction SilentlyContinue))
Check "Word Add-in registration" ($null -ne (Get-ItemProperty "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Name "TVCIWordTools" -ErrorAction SilentlyContinue))
Check "Certificate" (Test-Path "$installDir\certs\localhost.pfx")

try {
    $res = Invoke-WebRequest -Uri "https://localhost:38473/taskpane.html" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Check "HTTPS Endpoint" ($res.StatusCode -eq 200)
} catch {
    Check "HTTPS Endpoint" $false
}
