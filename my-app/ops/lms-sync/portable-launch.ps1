param([switch]$Demo)
$ErrorActionPreference = 'Stop'
$workerDir = Join-Path $PSScriptRoot 'my-app\ops\lms-sync'
$worker = Join-Path $workerDir 'ButlerSync.exe'
$config = Join-Path $workerDir 'config.local.json'
if (-not (Test-Path -LiteralPath $config)) {
    Copy-Item -LiteralPath (Join-Path $workerDir 'config.example.json') -Destination $config
}
& $worker --config $config setup
if ($LASTEXITCODE -ne 0) { throw 'Butler setup failed.' }
& (Join-Path $workerDir 'start-butler.ps1')
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
        $feed = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/lms/feed' -TimeoutSec 2
        if ($null -ne $feed.revision) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}
if (-not $ready) { throw 'Butler did not start. See my-app\ops\lms-sync\.private\web-error.log.' }
Start-Process -FilePath 'http://127.0.0.1:3000'
if ($Demo) {
    Write-Output 'Demo ready. Select Courses, then View demo courses. No school sign-in or schedule is started.'
    exit 0
}
if (-not (Test-Path -LiteralPath (Join-Path $workerDir '.private\session.enc'))) {
    Write-Output 'Complete the Republic Polytechnic login in the new Edge window.'
    & $worker --config $config login
    if ($LASTEXITCODE -ne 0) { throw 'School login was not completed.' }
}
if (-not (Get-ScheduledTask -TaskName 'Butler-LMS-Sync-RP' -ErrorAction SilentlyContinue)) {
    & (Join-Path $workerDir 'install-schedule.ps1') -ConfigPath $config
}
Start-Process -FilePath $worker -ArgumentList ('--config "{0}" sync' -f $config) -WorkingDirectory $workerDir -WindowStyle Hidden
Write-Output 'Butler is ready. School facts arrive first; course files download in the background.'
