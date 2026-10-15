param([ValidateSet('open','up','test','status')][string]$Action='open',[string]$SandboxName,[string]$SessionId,[switch]$NewSession)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$config=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'sandbox.json') -Raw | ConvertFrom-Json
if ($SandboxName) { $config.name=$SandboxName }
$config.portalReference=[IO.Path]::GetFullPath((Join-Path $repoRoot $config.portalReference))
$sbxCommand=Join-Path $env:LOCALAPPDATA 'DockerSandboxes\bin\sbx.exe'
if (!(Test-Path -LiteralPath $sbxCommand)) { throw 'Docker Sandboxes is not installed for this Windows user.' }
function Invoke-Sandbox {
    & $sbxCommand @args
    if ($LASTEXITCODE -ne 0) { throw "Sandbox command failed (exit $LASTEXITCODE)." }
}
function Ensure-Sandbox {
    $sandboxes=& $sbxCommand ls --json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Could not list sandboxes.' }
    $existing=$sandboxes | Where-Object name -eq $config.name
    if (!$existing) {
        $data=Join-Path $repoRoot 'apps\vrijdagpreek\data'
        if (!(Test-Path -LiteralPath $data)) { New-Item -ItemType Directory -Path $data | Out-Null }
        if (!(Test-Path -LiteralPath $config.portalReference)) { throw 'The existing ALHOR visual reference is missing.' }
        Invoke-Sandbox create --name $config.name --cpus $config.cpus --memory $config.memory --skills off --template $config.template codex $repoRoot "${data}:ro" "$($config.portalReference):ro"
    } elseif (!($existing.workspaces | Where-Object { [IO.Path]::GetFullPath(($_ -replace '\\\\','\')) -eq $repoRoot })) {
        throw 'The existing sandbox belongs to a different project.'
    }
    Invoke-Sandbox exec $config.name true
}
$SandboxName=$config.name
$projectRoot=$repoRoot
function Open-ProjectAgent {
    param([string]$Label, [string]$PreferredSession, [string]$SelectedSession)
    $selector = @('exec', $SandboxName, 'python3', 'dev/project_session.py', '--prefer', $PreferredSession)
    if ($SelectedSession) { $selector += @('--select', $SelectedSession) }
    if ($NewSession) { $selection = [pscustomobject]@{ mode='new'; id=$null } }
    else {
        $selection = & $sbxCommand @selector | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw 'Could not resolve this project agent session.' }
    }
    Write-Host "`nALHOR | $Label | DEVELOPMENT"
    Write-Host "Project: $projectRoot"
    Write-Host "Sandbox: $SandboxName"
    Write-Host 'Only this terminal agent receives requests. Esc interrupts; Ctrl+C closes. Reopen this launcher to resume.'
    try { $host.UI.RawUI.WindowTitle = "ALHOR - $Label development - $SandboxName" } catch { }
    if ($selection.mode -eq 'resume') {
        Write-Host "Resuming session: $($selection.id)`n"
        & $sbxCommand run --name $SandboxName -- resume $selection.id
        $agentExit = $LASTEXITCODE
        if ($agentExit -notin @(0,130)) {
            Write-Warning "Agent connection ended (exit $agentExit). The pinned session remains $($selection.id). Reopen this development launcher to reconnect; app startup does not require a new agent task."
        }
    } elseif ($selection.mode -in @('missing','ambiguous')) {
        throw "$($selection.reason). Use -SessionId <id> or -NewSession deliberately. Available: $($selection.ids -join ', ')"
    } else {
        Write-Host 'Starting a NEW project session. No existing conversation is being resumed.'
        $entered = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        & $sbxCommand run --name $SandboxName
        $newSession = & $sbxCommand exec $SandboxName python3 dev/project_session.py --after $entered | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $newSession.mode -eq 'resume') { Write-Host "Saved session for reopening: $($newSession.id)" }
        else { Write-Warning 'No unique new interactive session was found. Next opening will show the available recovery choice.' }
    }
    Write-Host "Agent closed. Saved work remains. Reopen the $Label development launcher to continue."
}

switch ($Action) {
    'status' { Invoke-Sandbox ls }
    'up' { Ensure-Sandbox }
    'test' {
        Ensure-Sandbox
        Invoke-Sandbox exec $config.name docker compose -f dev/vrijdagpreek/compose.yaml run --build --rm checks
        Invoke-Sandbox exec $config.name docker compose -f dev/vrijdagpreek/compose.yaml run --build --rm browser
    }
    'open' {
        Ensure-Sandbox
        Open-ProjectAgent -Label 'Vrijdagpreek' -PreferredSession '01a13e18-fe66-7e20-8cdf-5ece2574d056' -SelectedSession $SessionId
    }
}