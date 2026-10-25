param([ValidateSet('ensure','ensure-home','open','restart','stop','status','configure')][string]$Action='ensure')
if($MyInvocation.InvocationName -ne '.' -and $PSVersionTable.PSVersion.Major -lt 7){
    & pwsh.exe -NoProfile -ExecutionPolicy RemoteSigned -File $PSCommandPath -Action $Action
    exit $LASTEXITCODE
}
$ErrorActionPreference='Stop'
$script:RepoRoot=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:ControllerPath=$PSCommandPath

function Get-AppPaths {
    $app=Join-Path $script:RepoRoot 'apps\vrijdagpreek'
    $state=Join-Path $env:LOCALAPPDATA 'ALHOR\Vrijdagpreek'
    [pscustomobject]@{RepoRoot=$script:RepoRoot;AppRoot=$app;StateRoot=$state;
        CredentialFile=(Join-Path $state 'azure.clixml');OwnerFile=(Join-Path $state 'runtime.json');
        OutLog=(Join-Path $state 'server.log');ErrorLog=(Join-Path $state 'server-error.log');
        Url='http://127.0.0.1:8080/';ActivationScript=(Join-Path $app 'scripts\activate-development.mjs')}
}

function New-PrivateDirectory($Path) {
    [IO.Directory]::CreateDirectory($Path) | Out-Null
    $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
    $existing=Get-Acl -LiteralPath $Path
    $access=@($existing.Access)
    if($existing.AreAccessRulesProtected -and $access.Count -gt 0 -and
       @($access|Where-Object {$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or $_.AccessControlType -ne 'Allow'}).Count -eq 0){return}
    $acl=[Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true,$false)
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
    [IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($Path),$acl)
}

function Save-AzureCredential($Paths,[string]$Region,[Security.SecureString]$Key) {
    $regions=@('westeurope','northeurope','eastus','westus','eastus2','westus2','uksouth','francecentral','germanywestcentral','swedencentral')
    if ($Region -notin $regions -or !$Key -or $Key.Length -eq 0) { throw 'Kies een ondersteunde Azure Speech-regio en vul een sleutel in.' }
    New-PrivateDirectory $Paths.StateRoot
    $temporary=Join-Path $Paths.StateRoot ('azure-'+[guid]::NewGuid().ToString('N')+'.tmp')
    try {
        # On Windows Export-Clixml protects SecureString with DPAPI for this user and PC.
        [pscredential]::new($Region,$Key) | Export-Clixml -LiteralPath $temporary
        Move-Item -LiteralPath $temporary -Destination $Paths.CredentialFile -Force
    } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
}

function Read-AzureCredential($Paths) {
    if (!(Test-Path -LiteralPath $Paths.CredentialFile)) { return $null }
    try {
        $credential=Import-Clixml -LiteralPath $Paths.CredentialFile
        if ($credential -isnot [pscredential] -or $credential.Password.Length -eq 0) { throw 'Invalid credential' }
        if ($credential.UserName -notmatch '^[a-z][a-z0-9]{1,40}$') { throw 'Invalid region' }
        return $credential
    } catch { throw 'De opgeslagen Azure-instelling is niet leesbaar voor deze Windows-gebruiker. Open de launcher met -Action configure om die opnieuw in te stellen.' }
}

function Set-AzureConfiguration($Paths) {
    Write-Host 'Vrijdagpreek - Azure eenmalig instellen'
    Write-Host 'De sleutel wordt versleuteld bewaard voor jouw Windows-account op deze pc, buiten Git en buiten de agentsandbox.'
    Write-Host 'Er wordt nu geen audio naar Azure gestuurd. Een draaiende vertaling wordt niet gestopt.'
    $region=(Read-Host 'Azure Speech-regio [northeurope]').Trim().ToLowerInvariant()
    if (!$region) { $region='northeurope' }
    $key=Read-Host 'Azure Speech-sleutel (verborgen)' -AsSecureString
    try { Save-AzureCredential $Paths $region $key }
    finally { if($key){$key.Dispose()} }
    Write-Host 'Azure-instelling opgeslagen. De app kan nu zonder nieuwe sleutelvraag starten.'
}

function Wait-AzureConfiguration($Paths) {
    try {
        $stored=Read-AzureCredential $Paths
        if($stored){$stored.Password.Dispose();return}
    } catch {Write-Host 'De eerdere Azure-instelling hoort niet bij deze Windows-aanmelding of is beschadigd. Stel die opnieuw in het geopende venster in.'}
    Write-Host 'Eenmalige Azure-instelling nodig. Vul de regio en verborgen sleutel in het geopende venster in; deze launcher gaat daarna zelf verder.'
    $shell=(Get-Command pwsh.exe -ErrorAction Stop).Source
    $arguments='-NoProfile -ExecutionPolicy RemoteSigned -File "'+$script:ControllerPath+'" -Action configure'
    # This window is intentionally visible: only the operator may enter the secret.
    $configuration=Start-Process -FilePath $shell -ArgumentList $arguments -PassThru
    $deadline=[datetime]::UtcNow.AddSeconds(120)
    while ([datetime]::UtcNow -lt $deadline) {
        try {
            $stored=Read-AzureCredential $Paths
            if($stored){$stored.Password.Dispose();return}
        } catch { }
        $configuration.Refresh()
        if ($configuration.HasExited) { throw 'Azure-instelling is niet opgeslagen. De bestaande app blijft draaien. Open de launcher opnieuw om verder te gaan.' }
        Start-Sleep -Milliseconds 400
    }
    throw 'Azure-instelling is nog niet afgerond. De bestaande app blijft draaien. Open de launcher opnieuw nadat de instelling is opgeslagen.'
}

function Test-OwnedProcess($Record,$Process,[int]$ListenerId,[string]$AppRoot) {
    if (!$Record -or !$Process) { return $false }
    try {
        return $Record.schema -eq 'alhor-vrijdagpreek-process/v1' -and
            [IO.Path]::GetFullPath($Record.app_root).TrimEnd('\') -eq [IO.Path]::GetFullPath($AppRoot).TrimEnd('\') -and
            [int]$Record.pid -eq $ListenerId -and [int]$Process.ProcessId -eq $ListenerId -and
            ([datetime]$Record.creation_time).ToUniversalTime().Ticks -eq ([datetime]$Process.CreationDate).ToUniversalTime().Ticks -and
            [string]$Record.executable -eq [string]$Process.ExecutablePath -and
            [IO.Path]::GetFileName($Process.ExecutablePath) -eq 'node.exe' -and
            [string]$Record.command_line -eq [string]$Process.CommandLine
    } catch { return $false }
}

function Test-AppReadiness($Expected,$Identity,$Bootstrap,[switch]$HomeOnly) {
    return $Expected.state -eq 'identified' -and $Identity.state -eq 'identified' -and
        $Identity.version -eq $Expected.version -and $Identity.source_digest -eq $Expected.source_digest -and
        ($HomeOnly -or $Bootstrap.configured -eq $true)
}

function Get-StartDecision($Expected,$Status,[switch]$HomeOnly) {
    if (!$Status.listening) { return 'start' }
    if ($HomeOnly -and !$Status.owned) { return 'refuse' }
    if ($Expected.state -eq 'identified' -and $Status.identified -and ($HomeOnly -or $Status.configured -eq $true) -and
        $Status.version -eq $Expected.version -and $Status.source_digest -eq $Expected.source_digest) { return 'reuse' }
    if (!$Status.owned) { return 'refuse' }
    if ($Status.active -ne $false) { return 'busy' }
    return 'replace'
}

function Get-ExpectedCandidate($Paths) {
    $module=Join-Path $Paths.AppRoot 'candidate.mjs'
    $json=& node --input-type=module -e 'import {pathToFileURL} from "node:url";const {readCandidate}=await import(pathToFileURL(process.argv[1]));console.log(JSON.stringify(readCandidate()));' $module
    if($LASTEXITCODE -ne 0){throw 'De bronversie kon niet worden gecontroleerd. Controleer Node.js 22 of nieuwer.'}
    $json | ConvertFrom-Json
}

function Get-LocalJson([string]$Url,[switch]$Bootstrap) {
    try {
        if($Bootstrap){
            return Invoke-RestMethod -Uri ($Url+'api/bootstrap') -Method Post -Headers @{Origin=$Url.TrimEnd('/');'X-Local-App'='1'} -ContentType 'application/json' -Body '{}' -TimeoutSec 2 -NoProxy
        }
        return Invoke-RestMethod -Uri ($Url+'api/identity') -TimeoutSec 2 -NoProxy
    } catch { return $null }
}

function Get-ActiveTranslation([string]$Url) {
    $client=[Net.Http.HttpClient]::new([Net.Http.HttpClientHandler]@{UseProxy=$false})
    $cancel=[Threading.CancellationTokenSource]::new(2000)
    $response=$null;$reader=$null
    try {
        $request=[Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Get,$Url+'api/events')
        $response=$client.SendAsync($request,[Net.Http.HttpCompletionOption]::ResponseHeadersRead,$cancel.Token).GetAwaiter().GetResult()
        if(!$response.IsSuccessStatusCode){return $null}
        $stream=$response.Content.ReadAsStreamAsync($cancel.Token).GetAwaiter().GetResult()
        $reader=[IO.StreamReader]::new($stream)
        while(!$cancel.IsCancellationRequested){
            $line=$reader.ReadLineAsync($cancel.Token).GetAwaiter().GetResult()
            if($null -eq $line){break}
            if($line.StartsWith('data: ')){
                # Read only the lifecycle flag. Never log, return, or persist captions.
                $eventState=$line.Substring(6)|ConvertFrom-Json
                if($eventState.active -is [bool]){return [bool]$eventState.active}
                break
            }
        }
    } catch { return $null }
    finally {if($reader){$reader.Dispose()};if($response){$response.Dispose()};$cancel.Dispose();$client.Dispose()}
    return $null
}

function Read-OwnerRecord($Paths) {
    try { Get-Content -LiteralPath $Paths.OwnerFile -Raw -ErrorAction Stop | ConvertFrom-Json }
    catch { return $null }
}

function Write-OwnerRecord($Paths,$Process,$Candidate) {
    New-PrivateDirectory $Paths.StateRoot
    $record=[ordered]@{schema='alhor-vrijdagpreek-process/v1';app_root=$Paths.AppRoot;pid=[int]$Process.ProcessId;
        creation_time=([datetime]$Process.CreationDate).ToUniversalTime().ToString('O');
        executable=$Process.ExecutablePath;command_line=$Process.CommandLine;
        version=$Candidate.version;source_digest=$Candidate.source_digest}
    $temporary=Join-Path $Paths.StateRoot ('runtime-'+[guid]::NewGuid().ToString('N')+'.tmp')
    try {$record|ConvertTo-Json|Set-Content -LiteralPath $temporary -Encoding utf8;Move-Item -LiteralPath $temporary -Destination $Paths.OwnerFile -Force}
    finally {if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Force}}
}

function Get-RuntimeStatus($Paths) {
    $listeners=@(Get-NetTCPConnection -LocalPort ([uri]$Paths.Url).Port -State Listen -ErrorAction SilentlyContinue)
    $result=[ordered]@{listening=($listeners.Count -gt 0);owned=$false;identified=$false;version=$null;source_digest=$null;configured=$false;region=$null;active=$null;process_id=$null}
    if(!$result.listening){return [pscustomobject]$result}
    $ids=@($listeners|Select-Object -ExpandProperty OwningProcess -Unique)
    if($ids.Count -ne 1){return [pscustomobject]$result}
    $processId=[int]$ids[0]
    $result.process_id=$processId
    $process=Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
    $record=Read-OwnerRecord $Paths
    $result.owned=Test-OwnedProcess $record $process $processId $Paths.AppRoot
    $identity=Get-LocalJson $Paths.Url
    if($identity.app_key -eq 'vrijdagpreek' -and $identity.state -eq 'identified' -and $identity.source_digest -match '^[a-f0-9]{64}$'){
        $result.identified=$true;$result.version=$identity.version;$result.source_digest=$identity.source_digest
    }
    if($result.identified -or $result.owned){
        $bootstrap=Get-LocalJson $Paths.Url -Bootstrap
        if($bootstrap.configured -is [bool]){$result.configured=$bootstrap.configured;$result.region=$bootstrap.region}
        $result.active=Get-ActiveTranslation $Paths.Url
    }
    [pscustomobject]$result
}

function Prepare-AppSource($Paths) {
    $nodeMajor=& node -p 'process.versions.node.split(".")[0]'
    if($LASTEXITCODE -ne 0 -or [int]$nodeMajor -lt 22){throw 'Node.js 22 of nieuwer is nodig.'}
    if(!(Test-Path -LiteralPath (Join-Path $Paths.AppRoot 'node_modules\microsoft-cognitiveservices-speech-sdk\distrib\browser\microsoft.cognitiveservices.speech.sdk.bundle-min.js'))){
        Write-Host 'Eerste start: vastgelegde afhankelijkheden installeren. Er wordt geen audio verstuurd.'
        Push-Location $Paths.AppRoot
        try {& npm.cmd ci --ignore-scripts | Out-Host;if($LASTEXITCODE -ne 0){throw 'Installatie mislukt; de bestaande app blijft draaien.'}}
        finally {Pop-Location}
    }
    if(Test-Path -LiteralPath (Join-Path $Paths.RepoRoot 'portable-release.json')){
        & node (Join-Path $Paths.RepoRoot 'scripts\verify-portable.mjs') | Out-Host
        if($LASTEXITCODE -ne 0){throw 'Portable broncontrole mislukt. Pak de originele ZIP opnieuw uit; de bestaande app is niet gestopt.'}
        $candidate=Get-ExpectedCandidate $Paths
        if($candidate.state -ne 'identified'){throw 'Portable bronidentiteit onbekend; de bestaande app is niet gestopt.'}
        return $candidate
    }
    Write-Host 'Nieuwe bron controleren en de lokale ontwikkelversie voorbereiden. De bestaande app blijft intussen draaien.'
    if(!(Test-Path -LiteralPath $Paths.ActivationScript)){throw 'De lokale activatiecontrole ontbreekt. De bestaande app is niet gestopt.'}
    Push-Location $Paths.RepoRoot
    try {& node $Paths.ActivationScript | Out-Host;if($LASTEXITCODE -ne 0){throw 'Broncontrole of activatie mislukt. De bestaande app is niet gestopt.'}}
    finally {Pop-Location}
    $candidate=Get-ExpectedCandidate $Paths
    if($candidate.state -ne 'identified'){throw 'De gecontroleerde bronversie is nog onbekend. De bestaande app is niet gestopt.'}
    return $candidate
}

function Stop-OwnedApp($Paths) {
    $status=Get-RuntimeStatus $Paths
    if(!$status.listening){return}
    if(!$status.owned){throw 'Poort 8080 wordt gebruikt door een proces dat niet bij deze launcher hoort. Er wordt niets gestopt.'}
    if($status.active -ne $false){throw 'De vertaling is actief of de toestand is niet bevestigd. Klik eerst Stop in Vrijdagpreek en probeer opnieuw.'}
    # Revalidate the exact process birth and command just before stopping it.
    $process=Get-CimInstance Win32_Process -Filter "ProcessId=$($status.process_id)"
    if(!(Test-OwnedProcess (Read-OwnerRecord $Paths) $process $status.process_id $Paths.AppRoot)){throw 'De procesidentiteit is veranderd. Er is niets gestopt.'}
    Stop-Process -Id $status.process_id -ErrorAction Stop
    $deadline=[datetime]::UtcNow.AddSeconds(8)
    while([datetime]::UtcNow -lt $deadline){
        if(!(Get-NetTCPConnection -LocalPort ([uri]$Paths.Url).Port -State Listen -ErrorAction SilentlyContinue)){return}
        Start-Sleep -Milliseconds 200
    }
    throw 'Vrijdagpreek is nog niet afgesloten. Er is geen tweede instantie gestart.'
}

function Start-OwnedApp($Paths,$Candidate,[pscredential]$Credential,[switch]$HomeOnly) {
    New-PrivateDirectory $Paths.StateRoot
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=(Get-Command node -ErrorAction Stop).Source
    $start.ArgumentList.Add((Join-Path $Paths.AppRoot 'server.mjs'))
    $start.WorkingDirectory=$Paths.AppRoot;$start.UseShellExecute=$false;$start.CreateNoWindow=$true
    # Never inherit an unrelated shell's Azure secrets for an unconfigured home.
    $start.Environment.Remove('AZURE_SPEECH_REGION')|Out-Null
    $start.Environment.Remove('AZURE_SPEECH_KEY')|Out-Null
    if($Credential){$start.Environment['AZURE_SPEECH_REGION']=$Credential.UserName}
    $start.Environment['ALHOR_FEEDBACK_FILE']=(Join-Path $Paths.StateRoot 'feedback.json')
    $start.Environment['ALHOR_MODULES_FILE']=(Join-Path $Paths.StateRoot 'modules.json')
    $pointer=[IntPtr]::Zero
    try {
        if($Credential){
            $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Credential.Password)
            $start.Environment['AZURE_SPEECH_KEY']=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        }elseif(!$HomeOnly){throw 'Azure is nog niet ingesteld.'}
        # The short runner passes real file handles to Node. No pipe depends on this launcher staying open.
        $start.ArgumentList.Clear()
        $start.ArgumentList.Add((Join-Path $PSScriptRoot 'windows-child.mjs'))
        $start.ArgumentList.Add((Join-Path $Paths.AppRoot 'server.mjs'))
        $start.ArgumentList.Add($Paths.OutLog)
        $start.ArgumentList.Add($Paths.ErrorLog)
        $start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
        $process=[Diagnostics.Process]::new();$process.StartInfo=$start
        if(!$process.Start()){throw 'De app kon niet gestart worden.'}
        $runnerOutput=$process.StandardOutput.ReadToEndAsync()
        $runnerError=$process.StandardError.ReadToEndAsync()
        if(!$process.WaitForExit(10000)){throw 'De lokale appstarter reageert niet op tijd.'}
        if($process.ExitCode -ne 0){throw 'De lokale appstarter is mislukt. Controleer de lokale bron en Node.js.'}
        $child=$runnerOutput.GetAwaiter().GetResult()|ConvertFrom-Json
        Start-Sleep -Milliseconds 150
        $metadata=Get-CimInstance Win32_Process -Filter "ProcessId=$($child.pid)"
        if(!$metadata){throw 'De app is direct gestopt. Bekijk het lokale serverlog.'}
        Write-OwnerRecord $Paths $metadata $Candidate
        $deadline=[datetime]::UtcNow.AddSeconds(20)
        while([datetime]::UtcNow -lt $deadline){
            if(!(Get-Process -Id $child.pid -ErrorAction SilentlyContinue)){throw 'De app is gestopt tijdens het starten. Bekijk het lokale serverlog.'}
            $identity=Get-LocalJson $Paths.Url
            if($identity.state -eq 'identified' -and $identity.version -eq $Candidate.version -and $identity.source_digest -eq $Candidate.source_digest){
                $bootstrap=Get-LocalJson $Paths.Url -Bootstrap
                if(Test-AppReadiness $Candidate $identity $bootstrap -HomeOnly:$HomeOnly){
                    $listeners=@(Get-NetTCPConnection -LocalPort ([uri]$Paths.Url).Port -State Listen -ErrorAction SilentlyContinue|Select-Object -ExpandProperty OwningProcess -Unique)
                    if($listeners.Count -eq 1 -and $listeners[0] -eq $child.pid){return}
                    throw 'De poort hoort niet bij de zojuist gestarte app. Er wordt geen ander proces gestopt.'
                }
            }
            Start-Sleep -Milliseconds 250
        }
        throw 'De app bevestigde niet op tijd de vereiste bronversie en gereedheid. Er is geen extra instantie gestart.'
    } finally {
        $start.Environment.Remove('AZURE_SPEECH_KEY')|Out-Null
        if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
        if($process){$process.Dispose()}
    }
}

function Invoke-AppAction([string]$RequestedAction) {
    $paths=Get-AppPaths
    if($RequestedAction -eq 'configure'){Set-AzureConfiguration $paths;return}
    if($RequestedAction -eq 'status'){
        $state=Get-RuntimeStatus $paths
        $state|Add-Member -NotePropertyName app_root -NotePropertyValue $paths.AppRoot
        $state|ConvertTo-Json -Compress
        return
    }
    $hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($paths.AppRoot))).Substring(0,20)
    $mutex=[Threading.Mutex]::new($false,'Local\ALHOR.Vrijdagpreek.'+$hash)
    $locked=$false
    try {
        try {$locked=$mutex.WaitOne(150000)}catch [Threading.AbandonedMutexException] {$locked=$true}
        if(!$locked){throw 'Een andere Vrijdagpreek-start is nog bezig. Er is geen tweede instantie gestart.'}
        if($RequestedAction -eq 'stop'){Stop-OwnedApp $paths;Write-Host 'Vrijdagpreek is gestopt. Opgeslagen werk en Azure-instelling blijven bewaard.';return}
        $expected=Get-ExpectedCandidate $paths
        $status=Get-RuntimeStatus $paths
        $homeOnly=$RequestedAction -eq 'ensure-home'
        $decision=Get-StartDecision $expected $status -HomeOnly:$homeOnly
        if($RequestedAction -eq 'restart' -and $decision -eq 'reuse'){
            if(!$status.owned){$decision='refuse'}elseif($status.active -ne $false){$decision='busy'}else{$decision='replace'}
        }
        if($decision -eq 'refuse'){throw 'Poort 8080 is in gebruik door een niet-beheerde of onbekende instantie. Er is niets gestopt; sluit die instantie bewust af voordat je opnieuw opent.'}
        if($decision -eq 'busy'){throw 'De vertaling is actief of niet bereikbaar. Klik eerst Stop in Vrijdagpreek; open daarna opnieuw om de nieuwe versie te activeren.'}
        if($decision -ne 'reuse'){
            if(!$homeOnly){Wait-AzureConfiguration $paths}
            $credential=Read-AzureCredential $paths
            if(!$credential -and !$homeOnly){throw 'Azure is nog niet ingesteld.'}
            try {
                $expected=Prepare-AppSource $paths
                # A new operator may have started while setup/tests were running; recheck before stopping.
                if((Get-RuntimeStatus $paths).listening){Stop-OwnedApp $paths}
                Start-OwnedApp $paths $expected $credential -HomeOnly:$homeOnly
            } finally {if($credential){$credential.Password.Dispose()}}
        }
        Write-Host ('Vrijdagpreek gereed: '+$paths.Url+' ['+$expected.version+']')
        if($RequestedAction -eq 'open'){Start-Process ($paths.Url+'?portal=docker')|Out-Null}
    } finally {if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
}

if($MyInvocation.InvocationName -ne '.') {
    try {Invoke-AppAction $Action}
    catch {Write-Host ('Vrijdagpreek: '+$_.Exception.Message) -ForegroundColor Red;exit 1}
}
