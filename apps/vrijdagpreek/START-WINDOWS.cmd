@echo off
setlocal
pwsh.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0..\..\dev\vrijdagpreek\windows-app.ps1" -Action ensure
exit /b %ERRORLEVEL%
