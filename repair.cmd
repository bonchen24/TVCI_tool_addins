@echo off
setlocal
cd /d "%~dp0"

echo TVCI Word Tools - repair client
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-client.ps1" -SkipInstall %*
set "EXITCODE=%ERRORLEVEL%"

echo.
if not "%EXITCODE%"=="0" echo Repair that bai. Hay xem thong bao o tren va thu lai sau khi dong Word.
if "%EXITCODE%"=="0" echo Repair hoan tat. Hay dong va mo lai Word de nap Ribbon TVCI Tools.
pause
exit /b %EXITCODE%
