param([ValidateSet('open','up','test','status')][string]$Action='open',[string]$SandboxName)
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
        Write-Host 'Vrijdagpreek agent. Esc interrupts; Ctrl+C exits. Reopen this launcher to continue.'
        $sessions=& $sbxCommand exec $config.name sh -c 'find /home/agent/.codex/sessions -name "*.jsonl" -type f 2>/dev/null | head -n 1'
        if ($sessions) { Invoke-Sandbox run --name $config.name -- resume --last }
        else { Invoke-Sandbox run --name $config.name -- 'Read AGENTS.md and dev/vrijdagpreek/ONBOARDING.md. Briefly explain your assignment and what is already proven, then wait for my request.' }
    }
}
