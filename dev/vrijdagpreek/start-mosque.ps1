$ErrorActionPreference='Stop'
function Get-NodeMajor { & node -p 'process.versions.node.split(".")[0]' }
function Test-MosquePrerequisites {
    if(!(Get-Command pwsh.exe -ErrorAction SilentlyContinue) -or $PSVersionTable.PSVersion.Major -lt 7){throw 'PowerShell 7 ontbreekt. Installeer voor deze gebruiker via https://aka.ms/powershell-release?tag=stable en open START-MOSQUE.cmd opnieuw.'}
    if(!(Get-Command node -ErrorAction SilentlyContinue) -or !(Get-Command npm.cmd -ErrorAction SilentlyContinue)){throw 'Node.js met npm ontbreekt. Installeer Node.js LTS (22 of nieuwer) via https://nodejs.org/en/download en open START-MOSQUE.cmd opnieuw.'}
    $major=Get-NodeMajor
    if("$major" -notmatch '^\d+$' -or [int]$major -lt 22){throw 'Node.js 22 of nieuwer is nodig. Download Node.js LTS via https://nodejs.org/en/download en open START-MOSQUE.cmd opnieuw.'}
}
function Invoke-MosqueController($Controller,$RequestedAction){
    & $Controller -Action $RequestedAction
    if($LASTEXITCODE -ne 0){throw 'Mosque kon niet starten. Lees de melding hierboven; er is geen browser geopend.'}
}
function Open-MosqueBrowser($Url){Start-Process $Url|Out-Null}
function Invoke-MosqueStart($Root){
    Test-MosquePrerequisites
    Invoke-MosqueController (Join-Path $Root 'dev\vrijdagpreek\windows-app.ps1') 'ensure-home'
    Open-MosqueBrowser 'http://127.0.0.1:8080/mosque?portal=standalone'
}
if($MyInvocation.InvocationName -ne '.'){
    try{Invoke-MosqueStart (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))}
    catch{Write-Host ('Mosque: '+$_.Exception.Message) -ForegroundColor Red;exit 1}
}
