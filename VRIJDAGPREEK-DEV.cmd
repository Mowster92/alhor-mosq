@echo off
setlocal
cd /d "%~dp0"
pwsh.exe -NoProfile -File "%~dp0dev\vrijdagpreek\vrijdagpreek-dev.ps1" open
if errorlevel 1 pause
