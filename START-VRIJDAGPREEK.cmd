@echo off
setlocal
title ALHOR - Vrijdagpreek gebruiken
pwsh.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0dev\vrijdagpreek\windows-app.ps1" -Action open
if errorlevel 1 pause
