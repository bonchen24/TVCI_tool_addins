@echo off
setlocal
chcp 65001 >nul

:: Tu dong nang quyen Administrator neu dang chay quyen thuong
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================================
    echo   [THONG BAO] Dang yeu cau quyen Administrator...
    echo ========================================================
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   TVCI WORD TOOLS - CONG CU SUA CHUA HE THONG (REPAIR)
echo ========================================================
echo.

echo [1/6] Dung tien trinh cu neu co...
if exist "%~dp0tvci-host.exe" (
    "%~dp0tvci-host.exe" --stop >nul 2>&1
)
taskkill /f /im tvci-host.exe >nul 2>&1
taskkill /f /im WINWORD.EXE >nul 2>&1

echo [2/6] Cap Loopback Exemption cho Edge WebView2...
CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy" >nul 2>&1

echo [3/6] Cai dat chung chi SSL Localhost vao LocalMachine Root...
if exist "%~dp0ca.crt" (
    certutil -addstore "Root" "%~dp0ca.crt" >nul 2>&1
    if exist "%~dp0tvci-host.exe" (
        "%~dp0tvci-host.exe" --install-cert "%~dp0ca.crt" >nul 2>&1
    )
)

echo [4/6] Dang ky Add-in va bat buoc kich hoat Edge WebView2 cho Word (32-bit & 64-bit)...
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /t REG_SZ /d "%~dp0manifest.xml" /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\16.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /t REG_SZ /d "%~dp0manifest.xml" /f /reg:32 >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\16.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /t REG_SZ /d "%~dp0manifest.xml" /f /reg:64 >nul 2>&1

reg add "HKCU\Software\Microsoft\Office\15.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /t REG_SZ /d "%~dp0manifest.xml" /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\15.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /t REG_SZ /d "%~dp0manifest.xml" /f /reg:32 >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\15.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /t REG_SZ /d "%~dp0manifest.xml" /f /reg:64 >nul 2>&1

reg add "HKCU\Software\Microsoft\Office\16.0\WEF" /v "Win32WebView2" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\16.0\WEF" /v "Win32WebView2" /t REG_DWORD /d 1 /f /reg:32 >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\16.0\WEF" /v "Win32WebView2" /t REG_DWORD /d 1 /f /reg:64 >nul 2>&1

reg add "HKCU\Software\Microsoft\Office\15.0\WEF" /v "Win32WebView2" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\15.0\WEF" /v "Win32WebView2" /t REG_DWORD /d 1 /f /reg:32 >nul 2>&1
reg add "HKLM\Software\Microsoft\Office\15.0\WEF" /v "Win32WebView2" /t REG_DWORD /d 1 /f /reg:64 >nul 2>&1

echo [5/6] Don sach cache Office WEF...
if exist "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" (
    rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" >nul 2>&1
)
if exist "%LOCALAPPDATA%\Microsoft\Office\15.0\Wef" (
    rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\15.0\Wef" >nul 2>&1
)

echo [6/6] Kiem tra va dam bao Microsoft Edge WebView2 Runtime da duoc cai dat...
powershell -Command "$wvInstalled = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue) -or (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue) -or (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue); if (-not $wvInstalled) { Write-Host 'May tinh chua co Edge WebView2 Runtime. Dang tu dong cai dat...' -ForegroundColor Yellow; if (Test-Path '%~dp0MicrosoftEdgeWebview2Setup.exe') { Start-Process -FilePath '%~dp0MicrosoftEdgeWebview2Setup.exe' -ArgumentList '/silent /install' -Wait } else { Write-Host 'Dang tai bo cai WebView2 tu Microsoft...' -ForegroundColor Yellow; Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile '$env:TEMP\MicrosoftEdgeWebview2Setup.exe'; Start-Process -FilePath '$env:TEMP\MicrosoftEdgeWebview2Setup.exe' -ArgumentList '/silent /install' -Wait } Write-Host '-> Da cai dat WebView2 Runtime thanh cong!' -ForegroundColor Green } else { Write-Host '-> Microsoft Edge WebView2 Runtime da san sang!' -ForegroundColor Green }"

echo.
echo [7/7] Khoi dong dich vu chay ngam tvci-host.exe...
start "" "%~dp0tvci-host.exe" --port 38473

timeout /t 2 /nobreak >nul

echo.
echo ========================================================
echo   DANG KIEM TRA TRANG THAI HOAT DONG...
echo ========================================================

powershell -Command "try { $r = Invoke-WebRequest -Uri 'https://localhost:38473/api/health' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { Write-Host '[THANH CONG] May chu dang phan hoi tot (HTTP 200 OK)!' -ForegroundColor Green } } catch { Write-Host ('[CANH BAO] Khong the ket noi: ' + $_.Exception.Message) -ForegroundColor Red }"

echo.
echo ========================================================
echo   HOAN TAT SUA CHUA!
echo   Vui long mo Microsoft Word de su dung Add-in TVCI.
echo ========================================================
echo.
pause
