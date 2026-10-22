param(
    [switch]$Install,
    [switch]$Check,
    [switch]$NoBrowser,
    [ValidateRange(1024,65535)][int]$Port = 3000
)
$ErrorActionPreference = 'Stop'
$originalDirectory = Get-Location
$savedEnvironment = @{}
$result = 0
$server = $null
function Invoke-Required {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed (exit $LASTEXITCODE): $Executable. Startup stopped." }
}
try {
    # Resolve from this script, never from the terminal's current directory.
    $root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $workspace = Join-Path $root 'my-app'
    $web = Join-Path $workspace 'apps/web'
    $worker = Join-Path $workspace 'ops/lms-sync'
    foreach ($relative in @('my-app/package.json','my-app/pnpm-lock.yaml','my-app/apps/web/package.json','my-app/ops/lms-sync/lms_sync.py')) {
        if (-not (Test-Path -LiteralPath (Join-Path $root $relative) -PathType Leaf)) {
            throw 'Incomplete source folder. Extract the entire source ZIP, then open Start-Source.cmd beside README.md and my-app. A Windows runtime package uses Butler.exe instead.'
        }
    }
    Write-Output "Source root: $root"
    # Corepack selects the declared pnpm version from this workspace.
    Set-Location -LiteralPath $workspace
    $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    $pnpm = (Get-Command pnpm.cmd -ErrorAction SilentlyContinue).Source
    $python = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
    if (-not $node) { throw 'Node.js 24 is required for source mode. Install it, reopen the terminal and retry. The Windows runtime ZIP does not need Node installed.' }
    $nodeMajor = & $node -p 'parseInt(process.versions.node)'
    if ($LASTEXITCODE -ne 0 -or $nodeMajor -ne '24') { throw 'Source mode requires Node.js 24. Reopen the terminal after changing Node.' }
    if (-not $pnpm) { throw 'pnpm 9 is required for source mode. Install pnpm 9, reopen the terminal and retry.' }
    $pnpmVersion = & $pnpm --version
    if ($LASTEXITCODE -ne 0 -or $pnpmVersion -notmatch '^9\.') { throw 'Source mode requires pnpm 9, matching my-app/package.json.' }
    if (-not $python) { throw 'Python 3.11 or 3.12 is required for the source school connector. The Windows runtime ZIP includes its connector.' }
    $pythonVersion = & $python --version
    if ($LASTEXITCODE -ne 0 -or $pythonVersion -notmatch '^Python 3\.(11|12)\.') { throw 'Use Python 3.11 or 3.12 for the tested source school connector.' }
    $edge = @(${env:ProgramFiles(x86)}, $env:ProgramFiles, $env:LOCALAPPDATA) | Where-Object { $_ } | ForEach-Object { Join-Path $_ 'Microsoft/Edge/Application/msedge.exe' } | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if (-not $edge) { throw 'Microsoft Edge is required for school sign-in and opening course sources. Install Edge and retry.' }
    $next = Join-Path $web 'node_modules/next/dist/bin/next'
    $venvPython = Join-Path $worker '.venv/Scripts/python.exe'
    $webReady = Test-Path -LiteralPath $next -PathType Leaf
    $workerReady = $false
    if (Test-Path -LiteralPath $venvPython -PathType Leaf) {
        try {
            & $venvPython -c 'import playwright.async_api, cryptography, pypdf' 2>$null
            $workerReady = $LASTEXITCODE -eq 0
        } catch { $workerReady = $false }
    }
    if ($Check) {
        Write-Output "Node $nodeMajor; pnpm $pnpmVersion; $pythonVersion; Edge found."
        Write-Output "Web dependencies ready: $webReady; school connector ready: $workerReady."
        if (-not ($webReady -and $workerReady)) { throw 'Dependencies are not installed. Run Start-Source.cmd once; it installs locked application dependencies, never model weights.' }
        Write-Output 'Source prerequisites ready. No server started.'
    } else {
        $probe = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
        $probe.Server.ExclusiveAddressUse = $true
        try { $probe.Start() } catch { throw "Port $Port is already in use. Choose -Port with another free port. No process was stopped." } finally { $probe.Stop() }
        Set-Location -LiteralPath $workspace
        if (-not $webReady) {
            if (-not $Install) { throw 'Web dependencies are missing. Run Start-Source.cmd or use -Install.' }
            Write-Output 'Installing locked application dependencies (no model weights).'
            Invoke-Required $pnpm @('install','--frozen-lockfile')
        }
        if (-not $workerReady) {
            if (-not $Install) { throw 'School connector dependencies are missing. Run Start-Source.cmd or use -Install.' }
            if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) { Invoke-Required $python @('-m','venv',(Join-Path $worker '.venv')) }
            Invoke-Required $venvPython @('-m','pip','install','--requirement',(Join-Path $worker 'requirements.txt'),'--constraint',(Join-Path $worker 'requirements-ci.txt'))
        }
        Set-Location -LiteralPath $web
        # stdin avoids Windows PowerShell 5.1 stripping JavaScript string quotes.
        'require("better-sqlite3")(":memory:").close()' | & $node
        if ($LASTEXITCODE -ne 0) { throw 'The native SQLite dependency could not load. Check the Node version and rerun pnpm install --force --frozen-lockfile inside my-app.' }
        $environment = @{ HOSTNAME='127.0.0.1'; PORT=[string]$Port; BUTLER_APP_URL="http://127.0.0.1:$Port"; NODE_ENV='development'; NEXT_TELEMETRY_DISABLED='1'; BUTLER_LMS_WORKER_DIR=$worker; BUTLER_ENGINE_DIR=(Join-Path $root 'runtime/llama') }
        foreach ($name in $environment.Keys) {
            $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
            [Environment]::SetEnvironmentVariable($name, $environment[$name], 'Process')
        }
        Write-Output "Starting Butler source mode at http://127.0.0.1:$Port . Keep this window open; Ctrl+C stops it."
        Write-Output 'AI setup is optional. No model download, school login or paid AI request is started.'
        $start = New-Object Diagnostics.ProcessStartInfo
        $start.FileName = $node
        $start.Arguments = '"{0}" dev --hostname 127.0.0.1 --port {1}' -f $next, $Port
        $start.WorkingDirectory = $web
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $server = [Diagnostics.Process]::Start($start)
        $ready = $false
        for ($attempt = 0; $attempt -lt 120 -and -not $server.HasExited; $attempt++) {
            try {
                $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/api/ai/setup" -TimeoutSec 2
                if ($response.StatusCode -eq 200) { $ready = $true; break }
            } catch { }
            Start-Sleep -Milliseconds 250
        }
        if (-not $ready -or $server.HasExited) { throw 'The source server did not become ready. Check the error above; no browser was opened.' }
        Write-Output "Ready: http://127.0.0.1:$Port"
        if (-not $NoBrowser) { Start-Process -FilePath $edge -ArgumentList "http://127.0.0.1:$Port" -WindowStyle Normal }
        $server.WaitForExit()
        if ($server.ExitCode -ne 0) { throw "Source server exited with code $($server.ExitCode)." }
    }
} catch {
    [Console]::Error.WriteLine("Butler source startup: " + $_.Exception.Message)
    $result = 1
} finally {
    if ($server -and -not $server.HasExited) {
        # Stop only the process tree created by this launcher.
        & taskkill.exe /PID $server.Id /T /F 2>$null | Out-Null
    }
    foreach ($name in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process') }
    Set-Location -LiteralPath $originalDirectory
}
exit $result
