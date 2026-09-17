[CmdletBinding()]
param()
$ErrorActionPreference = "Continue"

$installDir = Split-Path -Parent $PSScriptRoot

Write-Host "Gỡ cài đặt TVCI Word Tools..."

# 1. Kill server
Write-Host "Đang dừng server..."
$nodePath = Join-Path $installDir "runtime\node.exe"
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -eq $nodePath } | Invoke-CimMethod -MethodName Terminate | Out-Null

# 2. Remove Registry
Write-Host "Đang xóa Registry keys..."
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $runKey -Name "TVCIWordTools" -ErrorAction SilentlyContinue

$wefKey = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"
Remove-ItemProperty -Path $wefKey -Name "TVCIWordTools" -ErrorAction SilentlyContinue

# 3. Remove Certificate
Write-Host "Đang gỡ bỏ certificate..."
$certDir = Join-Path $installDir "certs"
$pfxPath = Join-Path $certDir "localhost.pfx"
if (Test-Path $pfxPath) {
    $pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $pfx.Import($pfxPath, "tvci123", "DefaultKeySet")
    $thumbprint = $pfx.Thumbprint

    $storeMy = New-Object System.Security.Cryptography.X509Certificates.X509Store "My", "CurrentUser"
    $storeMy.Open("ReadWrite")
    $certMy = $storeMy.Certificates.Find("FindByThumbprint", $thumbprint, $false)
    if ($certMy.Count -gt 0) { $storeMy.Remove($certMy[0]) }
    $storeMy.Close()

    $storeRoot = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "CurrentUser"
    $storeRoot.Open("ReadWrite")
    $certRoot = $storeRoot.Certificates.Find("FindByThumbprint", $thumbprint, $false)
    if ($certRoot.Count -gt 0) { $storeRoot.Remove($certRoot[0]) }
    $storeRoot.Close()
}

Write-Host "Hoàn tất."
