# Isolated controller fixture: never starts the real app, reads secrets, or configures Azure.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'windows-app.ps1')
function Assert([bool]$Value,[string]$Message){if(!$Value){throw "FAIL: $Message"}}
$script:Expected=[pscustomobject]@{state='identified';version='dev-home-test';source_digest=('a'*64)}
$script:Status=[pscustomobject]@{listening=$false;owned=$true;identified=$true;version='dev-home-test';source_digest=('a'*64);configured=$false;active=$false}
$script:Trace=[Collections.Generic.List[string]]::new()
$script:Stored=$null
function Get-AppPaths { [pscustomobject]@{AppRoot=(Join-Path $PSScriptRoot 'synthetic-home-app');Url='http://127.0.0.1:8080/'} }
function Get-ExpectedCandidate($Paths){$script:Expected}
function Get-RuntimeStatus($Paths){$script:Status}
function Wait-AzureConfiguration($Paths){$script:Trace.Add('configure');throw 'No configuration window allowed'}
function Read-AzureCredential($Paths){$script:Trace.Add('read-stored');$script:Stored}
function Prepare-AppSource($Paths){$script:Trace.Add('prepare');$script:Expected}
function Stop-OwnedApp($Paths){$script:Trace.Add('stop')}
function Start-OwnedApp($Paths,$Candidate,$Credential,[switch]$HomeOnly){
  Assert $HomeOnly 'shell startup must explicitly accept missing Azure'
  Assert ($Candidate.source_digest -eq $script:Expected.source_digest) 'startup receives exact checked source'
  Assert ($Credential -eq $script:Stored) 'only the existing optional stored credential is passed'
  $script:Trace.Add('start-home')
}
Invoke-AppAction 'ensure-home'
Assert (($script:Trace -join ',') -eq 'read-stored,prepare,start-home') 'missing Azure opens shell without configure'
$script:Trace.Clear();$script:Status.listening=$true
Invoke-AppAction 'ensure-home'
Assert ($script:Trace.Count -eq 0) 'current unconfigured shell is reused without credential access or restart'
Assert ((Get-StartDecision $script:Expected $script:Status) -eq 'replace') 'legacy speech ensure still requires Azure'
$script:Status.source_digest='b'*64
foreach($active in @($true,$null)){
  $script:Status.active=$active
  try {Invoke-AppAction 'ensure-home';throw 'Expected busy refusal'}catch{Assert ($_.Exception.Message -match 'Stop in Vrijdagpreek') 'active or unknown translation is not interrupted'}
  Assert ($script:Trace.Count -eq 0) 'busy refusal has no side effects'
}
$script:Status.active=$false;$script:Status.owned=$false
try {Invoke-AppAction 'ensure-home';throw 'Expected unknown process refusal'}catch{Assert ($_.Exception.Message -match 'niet-beheerde') 'unknown stale listener is refused'}
Assert ($script:Trace.Count -eq 0) 'unknown listener is never stopped'
$script:Status.source_digest='a'*64
try {Invoke-AppAction 'ensure-home';throw 'Expected unknown process refusal'}catch{Assert ($_.Exception.Message -match 'niet-beheerde') 'even current shell identity cannot authorize an unknown owner'}
$script:Status.owned=$true;$script:Status.source_digest='b'*64
$secure=ConvertTo-SecureString 'synthetic-only-fixture' -AsPlainText -Force
$script:Stored=[pscredential]::new('northeurope',$secure)
Invoke-AppAction 'ensure-home'
Assert (($script:Trace -join ',') -eq 'read-stored,prepare,stop,start-home') 'stored credential follows normal checked owned replacement without configure'
$script:Trace.Clear();$script:Stored=$null;$script:Status.listening=$false
try {Invoke-AppAction 'ensure';throw 'Expected legacy configure path'}catch{Assert ($_.Exception.Message -eq 'No configuration window allowed') 'legacy ensure keeps existing configuration flow'}
Assert (($script:Trace -join ',') -eq 'configure') 'legacy ensure still asks for Azure'
$identity=[pscustomobject]@{state='identified';version='dev-home-test';source_digest=('a'*64)}
$bootstrap=[pscustomobject]@{configured=$false}
Assert (Test-AppReadiness $script:Expected $identity $bootstrap -HomeOnly) 'shell readiness accepts exact current source without Azure'
Assert (!(Test-AppReadiness $script:Expected $identity $bootstrap)) 'legacy readiness still requires configuration'
$identity.source_digest='b'*64
Assert (!(Test-AppReadiness $script:Expected $identity $bootstrap -HomeOnly)) 'shell readiness rejects stale source'
$identity.source_digest='a'*64;$identity.state='unknown'
Assert (!(Test-AppReadiness $script:Expected $identity $bootstrap -HomeOnly)) 'shell readiness rejects unknown identity'
Write-Host 'PASS: ensure-home no-config startup, optional stored credentials, exact readiness, reuse, ownership, busy and legacy boundaries.'
