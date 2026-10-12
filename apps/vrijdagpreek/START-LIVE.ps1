# Run locally by the operator. No key in arguments, files, browser, or command history.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$secure = $null
$ptr = [IntPtr]::Zero
try {
    $region = Read-Host 'Azure Speech regio (bijvoorbeeld westeurope; exact die van je resource)'
    $secure = Read-Host 'Azure Speech sleutel (verborgen; niet delen in chat)' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:AZURE_SPEECH_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $env:AZURE_SPEECH_REGION = $region.Trim().ToLowerInvariant()
    & "$PSScriptRoot\START-WINDOWS.cmd"
} finally {
    Remove-Item Env:AZURE_SPEECH_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:AZURE_SPEECH_REGION -ErrorAction SilentlyContinue
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    if ($secure) { $secure.Dispose() }
}
