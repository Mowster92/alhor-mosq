@echo off
rem Compatibility entry: app only; VRIJDAGPREEK-DEV.cmd remains the coding workspace.
call "%~dp0MOSQUE-LOCAL.cmd" %*
exit /b %errorlevel%
