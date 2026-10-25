$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'windows-app.ps1')
function Assert($Value,$Message){if(!$Value){throw "FAIL: $Message"}}
$script:Trace=[Collections.Generic.List[string]]::new()
function node { $script:Trace.Add(($args -join '|'));$global:LASTEXITCODE=0; if($args[0] -eq '-p'){return 24}}
function Get-ExpectedCandidate($Paths){[pscustomobject]@{state='identified';version='portable-fixture'}}
function Test-Path {param($LiteralPath) $LiteralPath -like '*portable-release.json' -or $LiteralPath -like '*bundle-min.js'}
$paths=[pscustomobject]@{RepoRoot='C:\Andere Gebruiker\Moskee';AppRoot='C:\Andere Gebruiker\Moskee\apps\vrijdagpreek';ActivationScript='must-not-run'}
$candidate=Prepare-AppSource $paths
Assert ($candidate.state -eq 'identified') 'portable candidate accepted'
Assert (@($script:Trace|Where-Object {$_ -like '*verify-portable.mjs*'}).Count -eq 1) 'verify checkpoint bytes at destination without Git or development tests'
Assert (@($script:Trace|Where-Object {$_ -like '*must-not-run*'}).Count -eq 0) 'no developer activation'
Write-Host 'PASS: portable source verification without developer activation.'
