@echo off
setlocal
echo Vrijdagpreek - livevertaling met Azure
echo Voor de huidige proef: regio northeurope.
echo Voer de sleutel alleen in het verborgen veld in.
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0apps\vrijdagpreek\START-LIVE.ps1"
if errorlevel 1 pause
