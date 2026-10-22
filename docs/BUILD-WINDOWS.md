# Build the Windows x64 package

Use a fresh source checkout on Windows x64 with Node.js 24, pnpm 9, Python 3.11 or 3.12, Microsoft Edge and the Windows .NET Framework C# compiler. The CPU engine also needs the Microsoft Visual C++ x64 runtime described in [the beginner guide](../distribution/GETTING-STARTED.md). The pinned engine and licence files are already in `runtime/llama` and `runtime/licenses`.

Open PowerShell **in the inner project folder containing `README.md`, `my-app` and `tools`**. The following is one guarded script: a failed command stops it. It installs application/build dependencies, never model weights. Use a fresh checkout so `runtime/school-worker` and `release/Butler-Windows-x64` do not already exist; preserve any previous build instead of overwriting it.

```powershell
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath './my-app/package.json')) { throw 'Open the inner project folder containing README.md and my-app first.' }
$projectRoot = (Get-Location).Path
function Run-Checked {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Executable" }
}

Push-Location -LiteralPath (Join-Path $projectRoot 'my-app')
try {
    Run-Checked 'pnpm.cmd' @('install','--frozen-lockfile')
    Run-Checked 'python.exe' @('-m','venv','ops/lms-sync/.venv')
    $buildPython = Join-Path (Get-Location).Path 'ops/lms-sync/.venv/Scripts/python.exe'
    Run-Checked $buildPython @('-m','pip','install','--requirement','ops/lms-sync/requirements.txt','--constraint','ops/lms-sync/requirements-ci.txt')
    Run-Checked $buildPython @('-m','pip','install','PyInstaller==6.16.0')
    Run-Checked 'pnpm.cmd' @('--filter','@smart-hub/web','build')
} finally { Pop-Location }

$env:LMS_BUILD_PYTHON = $buildPython
Run-Checked 'node.exe' @('tools/package-school-worker.cjs')
$package = Join-Path $projectRoot 'release/Butler-Windows-x64'
Run-Checked 'node.exe' @('tools/package-windows.cjs',$package)
$smoke = Join-Path $projectRoot 'release/verify-exact-zip'
Run-Checked 'node.exe' @('tools/smoke-package.cjs',($package+'.zip'),$smoke)
```

Deliver the complete ZIP and its `.sha256`, not just `Butler.exe`. The executable needs the companion `app`, `runtime` and `ops` folders. A fresh archive contains no `data` directory. The exact ZIP check starts a disposable extracted installation using local synthetic fixtures, verifies persistence, and stops its own processes. It performs no school sign-in, model download or paid request.

For source development, use `Start-Source.cmd` instead of building a distribution. Its first dependency installation does not need PyInstaller or a frozen worker. It uses the Python connector directly. The Windows runtime ZIP contains that connector and does not require Python or pnpm on the destination.
