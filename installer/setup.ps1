[CmdletBinding()]
param()
$ErrorActionPreference = "Stop"

$installDir = Split-Path -Parent $PSScriptRoot

Write-Host "Cài đặt TVCI Word Tools..."

# 1. Certificate
$certDir = Join-Path $installDir "certs"
if (-not (Test-Path $certDir)) { New-Item -ItemType Directory -Path $certDir -Force | Out-Null }
$pfxPath = Join-Path $certDir "localhost.pfx"

if (-not (Test-Path $pfxPath)) {
    Write-Host "Đang tạo self-signed certificate..."
    $cert = New-SelfSignedCertificate -Subject "CN=TVCI Localhost" -DnsName "localhost", "127.0.0.1" -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider"
    $password = ConvertTo-SecureString -String "tvci123" -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
    
    Write-Host "Đang thêm certificate vào Root store..."
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "CurrentUser"
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
}

# 2. Close Word and clear cache
Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
foreach ($ver in @("16.0", "15.0")) {
    $wefCache = "$env:LOCALAPPDATA\Microsoft\Office\$ver\Wef"
    if (Test-Path $wefCache) { Remove-Item -Path $wefCache -Recurse -Force -ErrorAction SilentlyContinue }
}

# 3. Check and Install Edge WebView2 Runtime if missing
$wvInstalled = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue) -or (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue) -or (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue)
if (-not $wvInstalled) {
    Write-Host "Đang tự động cài đặt Microsoft Edge WebView2 Runtime..."
    $wvSetup = Join-Path $installDir "runtime\MicrosoftEdgeWebview2Setup.exe"
    if (Test-Path $wvSetup) {
        try {
            $p = Start-Process -FilePath $wvSetup -ArgumentList "/silent /install" -Wait -PassThru
            if ($p.ExitCode -ne 0) {
                Start-Process -FilePath $wvSetup -Wait
            }
        } catch {
            Start-Process -FilePath $wvSetup -Wait
        }
    }
}

# 4. Loopback exemption
try {
    & CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy" | Out-Null
} catch {}

# 5. Register Office Add-in & Force Edge WebView2
Write-Host "Đang đăng ký Office Add-in manifest và kích hoạt WebView2..."
$manifestPath = Join-Path $installDir "manifest\manifest.xml"
foreach ($ver in @("16.0", "15.0")) {
    foreach ($root in @("HKCU:\Software\Microsoft\Office\$ver\WEF", "HKLM:\Software\Microsoft\Office\$ver\WEF", "HKLM:\Software\WOW6432Node\Microsoft\Office\$ver\WEF")) {
        try {
            if (-not (Test-Path $root)) { New-Item -Path $root -Force -ErrorAction SilentlyContinue | Out-Null }
            New-ItemProperty -Path $root -Name "Win32WebView2" -Value 1 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
            
            $devKey = Join-Path $root "Developer"
            if (-not (Test-Path $devKey)) { New-Item -Path $devKey -Force -ErrorAction SilentlyContinue | Out-Null }
            New-ItemProperty -Path $devKey -Name "TVCIWordTools" -Value $manifestPath -PropertyType String -Force -ErrorAction SilentlyContinue | Out-Null
        } catch {}
    }
}

# 3. Autostart
Write-Host "Đang thiết lập Autostart..."
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$vbsPath = Join-Path $installDir "scripts\launcher.vbs"
$nodePath = Join-Path $installDir "runtime\node.exe"
$serverPath = Join-Path $installDir "server\server.js"
$runCommand = "wscript.exe `"$vbsPath`" `"$nodePath`" `"$serverPath`""
New-ItemProperty -Path $runKey -Name "TVCIWordTools" -Value $runCommand -PropertyType String -Force | Out-Null

# 4. Start Server immediately
Write-Host "Đang khởi động local server..."
Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`" `"$nodePath`" `"$serverPath`"" -WindowStyle Hidden

Write-Host "Hoàn tất."
