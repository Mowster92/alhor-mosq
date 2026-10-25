param([string]$Controller=(Join-Path $PSScriptRoot 'windows-app.ps1'))
$ErrorActionPreference='Stop'
function Assert([bool]$Value,[string]$Message) { if (!$Value) { throw "FAIL: $Message" } }
Assert (Test-Path -LiteralPath $Controller) 'the app-owned Windows startup controller exists'
. $Controller
$expected=[pscustomobject]@{state='identified';version='dev-test';source_digest=('a'*64)}
$ready=[pscustomobject]@{listening=$true;owned=$true;identified=$true;version='dev-test';source_digest=('a'*64);configured=$true;active=$false}
Assert ((Get-StartDecision $expected $ready) -eq 'reuse') 'a configured current process is reused'
$ready.configured=$false
Assert ((Get-StartDecision $expected $ready) -eq 'replace') 'a current but unconfigured owned process is prepared for replacement'
$ready.configured=$true
$ready.source_digest='b'*64
Assert ((Get-StartDecision $expected $ready) -eq 'replace') 'owned inactive stale source is replaced'
$ready.active=$true
Assert ((Get-StartDecision $expected $ready) -eq 'busy') 'active translation prevents replacement'
$ready.active=$null
Assert ((Get-StartDecision $expected $ready) -eq 'busy') 'unknown activity prevents replacement'
$ready.owned=$false
Assert ((Get-StartDecision $expected $ready) -eq 'refuse') 'an unrelated occupied port is never replaced'
$ready.listening=$false
Assert ((Get-StartDecision $expected $ready) -eq 'start') 'a stopped app can be started'
$birth=[datetime]'2026-10-15T06:05:06.38944Z'
$record=[pscustomobject]@{schema='alhor-vrijdagpreek-process/v1';app_root='C:\test\app';pid=12345;creation_time=$birth.ToUniversalTime().ToString('O');executable='C:\node\node.exe';command_line='node "C:\test\app\server.mjs"'}
$process=[pscustomobject]@{ProcessId=12345;CreationDate=$birth;ExecutablePath='C:\node\node.exe';CommandLine=$record.command_line}
Assert (Test-OwnedProcess $record $process 12345 'C:\test\app') 'saved ownership matches the exact process'
$process.CreationDate=$birth.AddSeconds(1)
Assert (!(Test-OwnedProcess $record $process 12345 'C:\test\app')) 'a reused process ID cannot be stopped'
$process.CreationDate=$birth
Assert (!(Test-OwnedProcess $record $process 99999 'C:\test\app')) 'a different listener cannot be stopped'
$process.CommandLine='node unrelated.mjs'
Assert (!(Test-OwnedProcess $record $process 12345 'C:\test\app')) 'changed command line invalidates ownership'
$testRoot=[IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')+'\'
$temp=Join-Path $testRoot ('synthetic-config-test-'+[guid]::NewGuid().ToString('N'))
$secure=ConvertTo-SecureString 'synthetic-fake-key-for-DPAPI-test' -AsPlainText -Force
try {
  $paths=[pscustomobject]@{StateRoot=$temp;CredentialFile=(Join-Path $temp 'azure.clixml')}
  Save-AzureCredential $paths 'northeurope' $secure
  $xml=Get-Content -LiteralPath $paths.CredentialFile -Raw
  Assert (!$xml.Contains('synthetic-fake-key-for-DPAPI-test')) 'the stored credential contains no plaintext key'
  $credential=Read-AzureCredential $paths
  Assert ($credential.UserName -eq 'northeurope') 'the region survives the encrypted credential round trip'
  Assert ($credential.GetNetworkCredential().Password -eq 'synthetic-fake-key-for-DPAPI-test') 'the current Windows user can decrypt the synthetic credential'
  $acl=Get-Acl -LiteralPath $temp
  Assert $acl.AreAccessRulesProtected 'credential directory does not inherit broad access'
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  foreach($rule in $acl.Access) { Assert ($rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -eq $sid) 'credential directory grants only the current user' }
  $credential.Password.Dispose()

  $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
  $listener.Start();$testPort=$listener.LocalEndpoint.Port;$listener.Stop()
  $app=Join-Path $temp 'app';[IO.Directory]::CreateDirectory($app)|Out-Null
  $fixture=@'
import http from 'node:http';
const candidate={state:'identified',app_key:'vrijdagpreek',version:'synthetic-test',source_digest:'c'.repeat(64)};
const server=http.createServer((req,res)=>{
  if(req.url==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({active:false,dutch:'Synthetic caption never returned by status'})+'\n\n');return;}
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(req.url==='/api/bootstrap'?{configured:process.env.AZURE_SPEECH_KEY==='synthetic-fake-key-for-DPAPI-test',region:process.env.AZURE_SPEECH_REGION,feedbackFile:process.env.ALHOR_FEEDBACK_FILE,modulesFile:process.env.ALHOR_MODULES_FILE}:candidate));
});
server.listen(TEST_PORT,'127.0.0.1',()=>console.log('Synthetic child ready.'));
setTimeout(()=>console.log('Synthetic child still writes after launcher return.'),2000);
'@
  $fixture.Replace('TEST_PORT',[string]$testPort)|Set-Content -LiteralPath (Join-Path $app 'server.mjs') -Encoding utf8
  $childPaths=[pscustomobject]@{AppRoot=$app;StateRoot=(Join-Path $temp 'runtime');OwnerFile=(Join-Path $temp 'runtime\runtime.json');OutLog=(Join-Path $temp 'runtime\server.log');ErrorLog=(Join-Path $temp 'runtime\error.log');Url="http://127.0.0.1:$testPort/"}
  $childCandidate=[pscustomobject]@{state='identified';version='synthetic-test';source_digest=('c'*64)}
  $fakeCredential=[pscredential]::new('northeurope',$secure)
  Start-OwnedApp $childPaths $childCandidate $fakeCredential
  $childRecord=Read-OwnerRecord $childPaths
  Assert ($childRecord.pid -gt 0) 'a hidden detached server records its own PID'
  Assert ((Get-LocalJson $childPaths.Url -Bootstrap).configured -eq $true) 'the synthetic key is inherited only in child memory'
  Assert ((Get-LocalJson $childPaths.Url -Bootstrap).feedbackFile -eq (Join-Path $childPaths.StateRoot 'feedback.json')) 'feedback stays in the private Windows state directory'
  Assert ((Get-LocalJson $childPaths.Url -Bootstrap).modulesFile -eq (Join-Path $childPaths.StateRoot 'modules.json')) 'module preferences stay in their own Windows state file'
  Assert ((Get-ActiveTranslation $childPaths.Url) -eq $false) 'the activity probe returns only the lifecycle flag'
  $runtime=Get-RuntimeStatus $childPaths
  Assert ($runtime.owned -and $runtime.configured -and $runtime.identified -and $runtime.process_id -eq $childRecord.pid) 'the readiness result belongs to the recorded listener and configured child'
  Start-Sleep -Milliseconds 2200
  Assert ((Get-Content -LiteralPath $childPaths.OutLog -Raw).Contains('still writes after launcher return')) 'server log handles survive the startup helper exit'
  $childProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($childRecord.pid)"
  Assert (Test-OwnedProcess $childRecord $childProcess $childRecord.pid $app) 'the newly started process has verifiable ownership'
} catch {
  Write-Host ('Synthetic test failure: '+$_.Exception.Message)
  Write-Host $_.ScriptStackTrace
  throw
} finally {
  if(!$childRecord -and $childPaths -and (Test-Path -LiteralPath $childPaths.OwnerFile)){$childRecord=Read-OwnerRecord $childPaths}
  if($childRecord){
    $childProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($childRecord.pid)"
    if(Test-OwnedProcess $childRecord $childProcess $childRecord.pid $app){Stop-Process -Id $childRecord.pid -ErrorAction SilentlyContinue;Start-Sleep -Milliseconds 400}
  }
  $secure.Dispose()
  $resolved=[IO.Path]::GetFullPath($temp)
  if(!$resolved.StartsWith($testRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'Synthetic cleanup left the test directory'}
  if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
Write-Host 'PASS: lifecycle decisions, exact process ownership, detached startup/readiness/logging, and Windows-user encrypted configuration.'
