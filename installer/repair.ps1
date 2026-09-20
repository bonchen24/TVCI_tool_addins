[CmdletBinding()]
param(
    [switch]$RestartWord
)

Write-Host "TVCI Word Tools: Bắt đầu cấu hình Edge WebView2..." -ForegroundColor Cyan

# 1. Đóng Word nếu có yêu cầu
if ($RestartWord) {
    Write-Host "Đang đóng Microsoft Word để xóa cache..." -ForegroundColor Yellow
    Get-Process -Name 'WINWORD' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# 2. Cấu hình Registry Win32WebView2 = 1 cho các phiên bản Office
$versions = @('16.0', '15.0')
foreach ($ver in $versions) {
    $keys = @(
        "HKCU:\Software\Microsoft\Office\$ver\WEF",
        "HKCU:\Software\Microsoft\Office\$ver\WEF\Developer",
        "HKCU:\Software\Microsoft\Office\Common\WEF"
    )
    foreach ($k in $keys) {
        if (-not (Test-Path $k)) {
            New-Item -Path $k -Force | Out-Null
        }
        New-ItemProperty -Path $k -Name 'Win32WebView2' -Value 1 -PropertyType DWord -Force | Out-Null
    }
    
    # Xóa thư mục WEF cache của Office để buộc Word nhận engine mới
    $cache = Join-Path $env:LOCALAPPDATA "Microsoft\Office\$ver\Wef"
    if (Test-Path $cache) {
        Write-Host "Đang dọn dẹp WEF cache: $cache" -ForegroundColor Gray
        Remove-Item -Path $cache -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "Cấu hình Registry Win32WebView2 thành công!" -ForegroundColor Green

# 3. Kích hoạt Loopback exemption
& CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy" 2>$null | Out-Null

# 4. Kiểm tra runtime WebView2
$bootstrapper = Join-Path $PSScriptRoot '..\runtime\MicrosoftEdgeWebview2Setup.exe'
if (-not (Test-Path $bootstrapper)) {
    $bootstrapper = Join-Path $PSScriptRoot 'runtime\MicrosoftEdgeWebview2Setup.exe'
}
if (Test-Path $bootstrapper) {
    $installed = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-F501-47EC-9A48-C42B02E8F6DB}' -Name 'pv' -ErrorAction SilentlyContinue) -or (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-F501-47EC-9A48-C42B02E8F6DB}' -Name 'pv' -ErrorAction SilentlyContinue)
    if (-not $installed) {
        Write-Host "Cài đặt bổ sung Edge WebView2 Runtime..." -ForegroundColor Yellow
        Start-Process -FilePath $bootstrapper -ArgumentList '/silent', '/install' -Wait
    }
}

# 5. Khởi động lại Word nếu được yêu cầu
if ($RestartWord) {
    Start-Sleep -Seconds 1
    Write-Host "Đang khởi động lại Microsoft Word..." -ForegroundColor Cyan
    Start-Process -FilePath 'WINWORD.EXE' -ErrorAction SilentlyContinue
}

Write-Host "HOÀN TẤT: Đã kích hoạt Edge WebView2 cho Word thành công!" -ForegroundColor Green
exit 0
