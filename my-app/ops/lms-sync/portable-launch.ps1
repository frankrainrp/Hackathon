param([switch]$Demo, [switch]$Check)
$ErrorActionPreference = 'Stop'
$runtimeRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if ((Test-Path -LiteralPath (Join-Path $runtimeRoot 'Butler.exe')) -and (Test-Path -LiteralPath (Join-Path $runtimeRoot 'Launch.cjs'))) {
    if ($Check) { & (Join-Path $runtimeRoot 'Butler.exe') --check }
    else { & (Join-Path $runtimeRoot 'Butler.exe') }
    exit $LASTEXITCODE
}
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$entry = Join-Path $sourceRoot 'tools/start-source.ps1'
if (-not (Test-Path -LiteralPath $entry)) { throw 'Incomplete package. Extract the entire ZIP and use Butler.exe (runtime) or Start-Source.cmd (source).' }
# The old Demo shortcut starts the same app; it never seeds fictional records.
& $entry -Install -Check:$Check
exit $LASTEXITCODE
