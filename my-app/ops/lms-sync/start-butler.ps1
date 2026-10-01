$ErrorActionPreference = 'Stop'
$privatePath = Join-Path $PSScriptRoot '.private'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\apps\web')).Path
$bundleRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$nodePath = Join-Path $bundleRoot 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source }
$serverPath = Join-Path $projectPath 'server.js'
$nextPath = Join-Path $projectPath 'node_modules\next\dist\bin\next'
if (-not (Test-Path -LiteralPath $serverPath) -and -not (Test-Path -LiteralPath $nextPath)) { throw 'Install the my-app workspace dependencies first.' }
New-Item -ItemType Directory -Path $privatePath -Force | Out-Null
$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    try {
        $feed = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/lms/feed' -TimeoutSec 10
        if ($null -ne $feed.revision) { Write-Output 'Butler is already running.'; exit 0 }
    } catch { }
    throw 'Port 3000 is occupied by another service; configure a different Butler port.'
}
if (Test-Path -LiteralPath $serverPath) {
    $env:HOSTNAME = '127.0.0.1'
    $env:PORT = '3000'
    $env:NODE_ENV = 'production'
    $nodeArguments = '"{0}"' -f $serverPath
} else {
    $nodeArguments = '"{0}" dev -H 127.0.0.1 -p 3000 "{1}"' -f $nextPath, $projectPath
}
Start-Process -FilePath $nodePath -ArgumentList $nodeArguments -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $privatePath 'web.log') -RedirectStandardError (Join-Path $privatePath 'web-error.log')
Write-Output 'Butler started on http://127.0.0.1:3000.'
