@echo off
setlocal
cd /d "%~dp0"
echo Dang dong bo bieu mau tu templates sang dist\templates...
robocopy templates dist\templates *.docx /S /NFL /NDL /NJH /NJS
echo Dong bo thanh cong!
timeout /t 2 >nul
exit /b 0
