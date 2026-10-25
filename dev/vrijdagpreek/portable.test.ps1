$ErrorActionPreference='Stop'
function Assert($Value,$Message){if(!$Value){throw "FAIL: $Message"}}
$entry=Join-Path $PSScriptRoot 'start-mosque.ps1'
Assert (Test-Path $entry) 'portable starter exists'
. $entry
$script:Available=@{node=$true;'npm.cmd'=$true;'pwsh.exe'=$true}
$script:Major=24
function Get-Command {param($Name,$ErrorAction) if($script:Available[$Name]){[pscustomobject]@{Source=$Name}}}
function Get-NodeMajor {$script:Major}
foreach($missing in @('node','npm.cmd','pwsh.exe')){
 $script:Available[$missing]=$false
 try{Test-MosquePrerequisites;throw 'expected prerequisite refusal'}catch{Assert ($_.Exception.Message -match 'https://') 'actionable download link'}
 $script:Available[$missing]=$true
}
$script:Major=20
try{Test-MosquePrerequisites;throw 'expected old Node refusal'}catch{Assert ($_.Exception.Message -match '22') 'minimum Node message'}
$script:Major=24
Test-MosquePrerequisites
$script:Trace=[Collections.Generic.List[string]]::new()
function Invoke-MosqueController($Controller,$RequestedAction){$script:Trace.Add("$Controller|$RequestedAction")}
function Open-MosqueBrowser($Url){$script:Trace.Add($Url)}
$fixture=Join-Path $env:TMPDIR ('Andere Gebruiker\Moskee met spaties '+[guid]::NewGuid().ToString('N'))
Invoke-MosqueStart $fixture
Assert ($script:Trace.Count -eq 2) 'only controller and browser called'
Assert ($script:Trace[0] -eq ((Join-Path $fixture 'dev\vrijdagpreek\windows-app.ps1')+'|ensure-home')) 'relative controller preserves spaces and username'
Assert ($script:Trace[1] -eq 'http://127.0.0.1:8080/mosque?portal=standalone') 'honest standalone navigation'
$script:Trace.Clear()
function Invoke-MosqueController($Controller,$RequestedAction){throw 'Poort 8080 onbekend'}
try{Invoke-MosqueStart $fixture;throw 'expected port refusal'}catch{Assert ($_.Exception.Message -match '8080') 'controller refusal preserved'}
Assert ($script:Trace.Count -eq 0) 'no browser after failed ensure-home'
Write-Host 'PASS: portable prerequisites, paths with spaces, standalone, unknown-port refusal.'
