@echo off
setlocal
chcp 65001 >nul
title TVCI Word Tools - Gỡ cài đặt (Uninstall)

echo ========================================================
echo   TVCI WORD TOOLS - TIỆN ÍCH GỠ CÀI ĐẶT (UNINSTALL)
echo ========================================================
echo.

echo [1/4] Đang dừng tiến trình máy chủ ngầm...
if exist "%~dp0tvci-host.exe" (
    "%~dp0tvci-host.exe" --stop >nul 2>&1
)
taskkill /f /im tvci-host.exe >nul 2>&1

echo [2/4] Đang xóa đăng ký Add-in khỏi Microsoft Word...
reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Office\16.0\WEF\Developer" /v "8d912cc6-37a5-4b7a-8c41-6f661a999b36" /f >nul 2>&1

echo [3/4] Đang xóa cấu hình tự khởi động cùng Windows...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "TVCIWordToolsHost" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "TVCIWordToolsHost" /f >nul 2>&1

echo [4/4] Đang dọn dẹp bộ nhớ đệm của Office...
if exist "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" (
    rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" >nul 2>&1
)

echo.
echo ========================================================
echo   ĐÃ GỠ BỎ HOÀN TẤT TVCI WORD TOOLS KHỎI MICROSOFT WORD!
echo ========================================================
echo.
pause
