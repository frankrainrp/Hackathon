# Hackathon

A local learning assistant built on [Bulter](https://github.com/frankrainrp/Bulter): course records, tasks, notes and source-grounded AI.

[中文说明](README.zh-CN.md) · [Windows beginner guide](distribution/GETTING-STARTED.md) · [AI setup and storage](my-app/docs/local-ai.md)

## First successful course answer

1. Extract the full Windows package and open **Butler.exe**. It starts the bundled runtime and opens Microsoft Edge when ready. Keep its console open; the default local address is `http://127.0.0.1:3000`. Keep the EXE with its companion folders. `Start-Hackathon.cmd` is a manual-browser fallback.
2. Optional AI setup: choose an existing local OpenAI-compatible service, the included CPU engine with an explicitly approved model download, DeepSeek with your own key, or Skip. **Test connection** checks availability; the separately consented sample checks actual text generation. Local mode has no cloud fallback.
3. Open **Settings → Connect your Singapore polytechnic**. Paste the direct school learning URL, choose **Recognise and save school**, then **Sign in and find courses**. Complete your own SSO/MFA. The school, latest accessible semester and course names/IDs come from the URL and authenticated school data.
4. Newly discovered current-term courses are selected by default; existing choices are retained. Login/refresh imports selected learning records. **Download selected course files** explicitly saves and parses files locally. No daily schedule or cloud summary is enabled by these actions.
5. **Courses** shows the detected school/term and every discovered current-term course. Expand a downloaded course, choose **Ask course AI** and check the answer's actual source. School configuration, course download choices, sync history and export remain in Settings.

The interface defaults to English; choose Chinese in AI setup or **Settings → Language**. User-authored records keep their original language. New conversations, courses, tasks, notes and panels start empty; no fictional record importer is included.

Fresh browsers use Retro. Settings retains Dark as a neutral translucent option and preserves an existing saved theme. Wallpaper is an optional user-provided local image. Courses starts with the current semester and combines submitted/missing/unknown states into one three-colour bar. Ordinary Chat can retrieve a course by its code or title, and app-supplied source links open the original page in Edge. Note-writing proposals remain reviewable before saving.

An optional weekly check in School settings imports confirmed missing work from every active current-term course into Tasks without downloading files or calling cloud AI. Unknown submissions stay unknown and outside the active task queue; no missing work produces a clear empty result. The packaged app catches up due checks when opened and runs them while it stays open. This installs no Windows scheduled task; fresh packages have the option off.

Recognition covers five Singapore polytechnics. Reviewed login adapters support exact TP/RP/SP Brightspace hosts; other recognised URLs remain metadata only. Your normal Edge session is separate: Butler retains its own encrypted session and reuses it until expired. Microsoft/school policy may require signing in again. No password or artificial extension of token expiry is used.

## Setup guide — Windows

First identify your download:

| Files in the folder | Start here |
| --- | --- |
| `Butler.exe`, `Launch.cjs`, `app/`, `runtime/` | Runtime ZIP: double-click **Butler.exe**. Do not run pnpm or the source instructions. |
| `README.md`, `Start-Source.cmd`, `my-app/`, `tools/` | Source checkout/ZIP: follow the steps below. |

### 1. What to download

| Download | Version | Needed for | Link |
| --- | --- | --- | --- |
| Git | any | Cloning the repo | [git-scm.com](https://git-scm.com/download/win) |
| Node.js | **24** exactly | Running the app | [nodejs.org](https://nodejs.org/) |
| pnpm | 9 | Installing app packages | Run `npm install -g pnpm@9` after Node is installed |
| Python | **3.11 or 3.12** | School sign-in and course downloads | [python.org](https://www.python.org/downloads/) — tick **Add python.exe to PATH** in the installer |
| Microsoft Edge | latest | Opening the app and school sign-in | Already installed on Windows |

The launcher refuses other Node or Python versions. Close and reopen your terminal after installing, then check everything is found:

```powershell
git --version
node -v          # should start with v24
pnpm -v          # should start with 9
python --version # should be 3.11.x or 3.12.x
```

### 2. Get the code

```powershell
git clone https://github.com/frankrainrp/Hackathon.git
cd Hackathon
```

If you downloaded a ZIP instead, open the **inner folder that contains `README.md` and `my-app`**, not the outer folder it was extracted into.

### 3. Start the app

Double-click **Start-Source.cmd**, or run it from PowerShell in the project folder:

```powershell
.\Start-Source.cmd
```

The first run installs the Node and Python packages, which takes a few minutes and needs internet. When it prints `Ready`, Edge opens at <http://127.0.0.1:3000>. Keep the console window open; press `Ctrl+C` in it to stop the app. It downloads no AI model and makes no AI requests on its own.

Useful options:

```powershell
# Check your downloads without starting the app
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-source.ps1 -Check

# Use another port if 3000 is busy
.\Start-Source.cmd -Port 3001
```

If a command fails, fix that error before running the next one.

### 4. Connect your school

Everything happens in the app; no terminal commands are needed:

1. Open **Settings → Connect your Singapore polytechnic** and paste your school's learning URL.
2. Choose **Recognise and save school**, then **Sign in and find courses**, and finish your school's Microsoft sign-in in Edge.
3. Choose **Download selected course files**, then open **Courses** to browse them or ask the course AI.

Sign-in currently works for TP, RP and SP. The source launcher is for development; the packaged weekly check runs only in the Windows runtime. Advanced CLI commands, connection boundaries and retention details are in [School profile workflow](my-app/ops/lms-sync/PROFILE_WORKFLOW.md).

## Data and verification

Back up existing data before upgrading. SQLite, school profiles, extracted files and encrypted sessions remain local across restarts; browser pending edits also depend on the browser/profile and origin. Export non-secret records from School settings. See the [beginner guide](distribution/GETTING-STARTED.md#keep-your-data) for package paths. DPAPI protects credentials for the current Windows account; ordinary course files and SQLite are not encrypted vaults.

Assignment dates/status come from Brightspace, with missing facts kept unknown. Lesson checkboxes do not submit assignments. Scans need separate OCR; Quiz/forum/LTI submissions and DeepTutor are not integrated. AI task changes require review and confirmation. Provider charges are separate from the app's local billing demonstration.

GitHub Actions runs Node regressions, type checks and a production build on Ubuntu and Python/DPAPI tests on Windows. HTTP checks use isolated synthetic data. Real school/course evidence stays local and is excluded from fresh archives. Read [language verification](LOCALIZATION.md) and [changes by file](docs/CHANGE-FILES-2026-10-22.md).

## Build a Windows package

Packaging requires a production web build **and a frozen school connector**, not just `pnpm build`. Follow [Build a Windows package](docs/BUILD-WINDOWS.md) from a fresh source checkout. The guide includes the locked connector dependencies, PyInstaller, prerequisites and exact ZIP verification. The package includes no model weights, private database, key or school session.

Pushing `main` updates source; it does not replace old [GitHub Releases](https://github.com/frankrainrp/Hackathon/releases) ZIPs. Daily schedules require a separate explicit `install-schedule.ps1 -Install`; `-DryRun` only previews. Source/artwork attribution and existing third-party notices from Bulter are retained.

Run `node tools/audit-portability.cjs --source` for the source audit and `node tools/audit-portability.cjs <fresh-package-folder>` for every regular package file. The packager removes this project's absolute build paths from compiled application code and checks for private state, weights and common credential patterns. Upstream compiler source/debug locations inside unmodified vendor binaries are listed separately; they are not personal settings or runtime dependencies on the build computer. The audit does not decode compressed third-party payload internals or promise detection of every possible secret format.
