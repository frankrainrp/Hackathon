param([string]$ConfigPath = (Join-Path $PSScriptRoot 'config.local.json'), [switch]$DryRun, [switch]$Install)
$ErrorActionPreference = 'Stop'
if ($DryRun -and $Install) { throw 'Choose either -DryRun or -Install.' }
$configFile = (Resolve-Path -LiteralPath $ConfigPath).Path
$frozen = Join-Path $PSScriptRoot 'ButlerSync.exe'
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$runner = Join-Path $PSScriptRoot 'lms_sync.py'
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
if (Test-Path -LiteralPath $frozen) {
    $json = & $frozen --config $configFile schedule-plan --task-user $user
} elseif (Test-Path -LiteralPath $python) {
    $pythonw = Join-Path $PSScriptRoot '.venv\Scripts\pythonw.exe'
    $json = & $python $runner --config $configFile schedule-plan --task-user $user --task-executable $pythonw
} else { throw 'Create the worker .venv and install requirements, or use the portable package.' }
if ($LASTEXITCODE -ne 0) { throw 'Cannot generate a schedule for an unconfirmed school profile.' }
$plan = $json | ConvertFrom-Json
if (-not $Install) {
    # Preview is the default. This branch never registers a task.
    $plan | ConvertTo-Json -Depth 4
    return
}
if (-not $plan.connectionSupported) { throw 'This profile has no reviewed connection policy. Task registration is blocked.' }
if (Get-ScheduledTask -TaskName $plan.taskName -ErrorAction SilentlyContinue) {
    throw "Task $($plan.taskName) already exists. Inspect it before changing or replacing it."
}
Register-ScheduledTask -TaskName $plan.taskName -Xml $plan.xml | Select-Object TaskName,State
Write-Output 'Daily worker registered for this signed-in Windows user. Keep Butler running. Legacy hourly tasks were not changed.'
