@echo off
setlocal
chcp 65001 >nul
title TVCI Word Tools - Kich hoat Microsoft Edge WebView2

echo ========================================================
echo   TVCI Word Tools - Kich hoat Microsoft Edge WebView2
echo ========================================================
echo.

set "SCRIPT=%~dp0scripts\repair.ps1"
if not exist "%SCRIPT%" set "SCRIPT=%~dp0repair.ps1"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"

echo.
echo ========================================================
echo   HOAN TAT! Hay dong va mo lai Word de nap add-in production.
echo ========================================================
echo.
pause
