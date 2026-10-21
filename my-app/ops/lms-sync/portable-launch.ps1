param([switch]$Demo)
$ErrorActionPreference = 'Stop'
$workerDir = Join-Path $PSScriptRoot 'my-app\ops\lms-sync'
$config = Join-Path $workerDir 'config.local.json'
if (-not (Test-Path -LiteralPath $config)) {
    Copy-Item -LiteralPath (Join-Path $workerDir 'config.example.json') -Destination $config
}
# Opening the local UI does not log in, save a school session, sync or register tasks.
$env:LMS_CONFIG_PATH = $config
$env:BUTLER_DB_PATH = Join-Path $workerDir '.private\butler.sqlite'
& (Join-Path $workerDir 'start-butler.ps1')
Start-Process -FilePath 'http://127.0.0.1:3000/?view=courses'
if ($Demo) {
    Write-Output 'Demo ready. No school sign-in, sync or schedule was started.'
} else {
    Write-Output 'Open School settings, preview and confirm your school and semester. Then follow README for setup, manual login and a first sync. Daily scheduling remains disabled until explicitly installed.'
}
