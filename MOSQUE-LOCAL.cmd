@echo off
setlocal
cd /d "%~dp0"
set "MOSQUE_PORT=18182"
set "ALHOR_PORTAL_PORT=18180"
if /i "%~1"=="stop" goto stop
if /i "%~1"=="status" goto status
if not "%~1"=="" if /i not "%~1"=="open" if /i not "%~1"=="up" exit /b 2
docker compose -f compose.yaml up --build -d --wait --pull never vrijdagspreek
if errorlevel 1 exit /b 1
if /i "%~1"=="up" exit /b 0
start "" "http://127.0.0.1:18182/"
exit /b 0
:stop
docker compose -f compose.yaml stop vrijdagspreek
exit /b %errorlevel%
:status
docker compose -f compose.yaml ps --all vrijdagspreek
exit /b %errorlevel%
