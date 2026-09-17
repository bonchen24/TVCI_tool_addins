@echo off
setlocal
chcp 65001 >nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-client.ps1" -ProjectPath "%~dp0." %*
set "exitCode=%ERRORLEVEL%"

if not "%exitCode%"=="0" (
  echo.
  echo Setup that bai. Ma loi: %exitCode%
) else (
  echo.
  echo Setup hoan tat.
)

pause
exit /b %exitCode%
