@echo off
setlocal
chcp 65001 >nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-client.ps1" -ProjectPath "%~dp0." %*
set "exitCode=%ERRORLEVEL%"

if not "%exitCode%"=="0" (
  echo.
  echo Uninstall that bai. Ma loi: %exitCode%
) else (
  echo.
  echo Uninstall hoan tat.
)

pause
exit /b %exitCode%
