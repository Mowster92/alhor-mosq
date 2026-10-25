@echo off
setlocal
where pwsh.exe >nul 2>&1
if errorlevel 1 (
  echo PowerShell 7 ontbreekt. Installeer voor deze gebruiker via https://aka.ms/powershell-release?tag=stable
  echo Open daarna START-MOSQUE.cmd opnieuw. Er wordt niets automatisch geinstalleerd.
  pause
  exit /b 1
)
pwsh.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0dev\vrijdagpreek\start-mosque.ps1"
if errorlevel 1 (
  pause
  exit /b 1
)
exit /b 0
