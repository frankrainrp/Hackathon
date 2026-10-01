param([string]$ConfigPath = (Join-Path $PSScriptRoot 'config.local.json'))
$ErrorActionPreference = 'Stop'
$configFile = (Resolve-Path -LiteralPath $ConfigPath).Path
$settings = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
$pythonPath = Join-Path $PSScriptRoot '.venv\Scripts\pythonw.exe'
$frozenPath = Join-Path $PSScriptRoot 'ButlerSync.exe'
if (Test-Path -LiteralPath $frozenPath) { $pythonPath = $frozenPath }
$runnerPath = Join-Path $PSScriptRoot 'lms_sync.py'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Create the .venv and install requirements first.' }
$taskName = 'Butler-LMS-Sync-RP'
$webTaskName = 'Butler-LMS-Web'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) { throw "Task $taskName already exists. Inspect it before changing its schedule." }
if (Get-ScheduledTask -TaskName $webTaskName -ErrorAction SilentlyContinue) { throw "Task $webTaskName already exists. Inspect it before changing it." }
$workerArguments = '"{0}" --config "{1}" sync' -f $runnerPath, $configFile
if (Test-Path -LiteralPath $frozenPath) { $workerArguments = '--config "{0}" sync' -f $configFile }
$action = New-ScheduledTaskAction -Execute $pythonPath -Argument $workerArguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $settings.interval_minutes)
$taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 55) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $taskSettings -Principal $principal -Description 'Download RP courses and send assignment facts to the local Butler inbox every hour.' | Select-Object TaskName, State
$shellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$webScript = Join-Path $PSScriptRoot 'start-butler.ps1'
$webAction = New-ScheduledTaskAction -Execute $shellPath -Argument ('-NoProfile -File "{0}"' -f $webScript) -WorkingDirectory $PSScriptRoot
$webTrigger = New-ScheduledTaskTrigger -AtLogOn -User $principal.UserId
Register-ScheduledTask -TaskName $webTaskName -Action $webAction -Trigger $webTrigger -Settings $taskSettings -Principal $principal -Description 'Start the local Butler bridge at Windows sign-in.' | Select-Object TaskName, State
