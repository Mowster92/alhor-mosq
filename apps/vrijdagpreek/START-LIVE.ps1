param([ValidateSet('ensure','open','restart','stop','status','configure')][string]$Action='open')
# Compatibility entry: normal use shares the same readiness, reuse and protected configuration path.
$controller=Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'dev\vrijdagpreek\windows-app.ps1'
& pwsh.exe -NoProfile -ExecutionPolicy RemoteSigned -File $controller -Action $Action
exit $LASTEXITCODE
