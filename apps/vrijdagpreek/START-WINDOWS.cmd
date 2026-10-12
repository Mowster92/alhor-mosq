@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo FOUT: Node.js ontbreekt. Installeer Node.js 22 LTS of 24 LTS via nodejs.org en open dit bestand opnieuw.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo FOUT: Node.js 22 of nieuwer nodig.
  pause
  exit /b 1
)
if not exist "node_modules\microsoft-cognitiveservices-speech-sdk\distrib\browser\microsoft.cognitiveservices.speech.sdk.bundle-min.js" (
  echo Eerste start: SDK installeren via npm. Internet nodig. Geen Azure-audioverbinding.
  call npm ci --ignore-scripts
  if errorlevel 1 (
    echo FOUT: installatie mislukt. Controleer internet, Node/npm en schrijfrechten.
    pause
    exit /b 1
  )
)
echo Open na de startmelding http://127.0.0.1:8080 in Edge of Chrome.
echo Laat dit venster open. Ctrl+C stopt de server.
node server.mjs
pause
