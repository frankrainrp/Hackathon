# Hackathon

A local learning assistant built on [Bulter](https://github.com/frankrainrp/Bulter): course records, tasks, notes and source-grounded AI.

[中文说明](README.zh-CN.md) · [Windows beginner guide](distribution/GETTING-STARTED.md) · [AI setup and storage](my-app/docs/local-ai.md)

## First successful course answer

1. Extract the full Windows package and open **Butler.exe**. It starts the bundled runtime and opens Microsoft Edge when ready. Keep its console open; the default local address is `http://127.0.0.1:3000`. Keep the EXE with its companion folders. `Start-Hackathon.cmd` is a manual-browser fallback.
2. Optional AI setup: choose an existing local OpenAI-compatible service, the included CPU engine with an explicitly approved model download, DeepSeek with your own key, or Skip. **Test connection** checks availability; the separately consented sample checks actual text generation. Local mode has no cloud fallback.
3. Open **Settings → Connect your Singapore polytechnic**. Paste the direct school learning URL, choose **Recognise and save school**, then **Sign in and find courses**. Complete your own SSO/MFA. The school, latest accessible semester and course names/IDs come from the URL and authenticated school data.
4. Newly discovered current-term courses are selected by default; existing choices are retained. Login/refresh imports selected learning records. **Download selected course files** explicitly saves and parses files locally. No daily schedule or cloud summary is enabled by these actions.
5. **Courses** shows the detected school/term and every discovered current-term course. Expand a downloaded course, choose **Ask course AI** and check the answer's actual source. School configuration, course download choices, sync history and export remain in Settings.

The interface defaults to English; choose Chinese in AI setup or **Settings → Language**. User-authored records keep their original language. Example courses are opt-in and labelled; new panels start empty.

The default dark appearance uses neutral translucent surfaces. Courses starts with the current semester and combines submitted/missing/unknown states into one three-colour bar. Ordinary Chat can retrieve a course by its code or title, and app-supplied source links open the original page in Edge. Note-writing proposals remain reviewable before saving.

An optional weekly check in School settings imports confirmed missing work from every active current-term course into Tasks without downloading files or calling cloud AI. Unknown submissions stay unknown and outside the active task queue; no missing work produces a clear empty result. The packaged app catches up due checks when opened and runs them while it stays open. This installs no Windows scheduled task; fresh packages have the option off.

Recognition covers five Singapore polytechnics. Reviewed login adapters support exact TP/RP/SP Brightspace hosts; other recognised URLs remain metadata only. Your normal Edge session is separate: Butler retains its own encrypted session and reuses it until expired. Microsoft/school policy may require signing in again. No password or artificial extension of token expiry is used.

## Windows source quick start

Use Node 24, pnpm 9, Python 3.11+ and Edge. An existing local model service is optional; deterministic school facts do not need AI.

```powershell
cd my-app
pnpm install --frozen-lockfile
python -m venv ops/lms-sync/.venv
./ops/lms-sync/.venv/Scripts/python.exe -m pip install -r ops/lms-sync/requirements.txt -c ops/lms-sync/requirements-ci.txt
$env:BUTLER_DB_PATH = "$PWD/ops/lms-sync/.private/butler.sqlite"
pnpm --filter @smart-hub/web dev --hostname 127.0.0.1
```

Use the Settings workflow above. The app supplies its owned worker's local bridge credential; you do not need to stop the app and run the old manual `setup` command. Advanced CLI, connection boundaries and retention details are in [School profile workflow](my-app/ops/lms-sync/PROFILE_WORKFLOW.md).

## Data and verification

Back up existing data before upgrading. SQLite, school profiles, extracted files and encrypted sessions remain local across restarts; browser pending edits also depend on the browser/profile and origin. Export non-secret records from School settings. See the [beginner guide](distribution/GETTING-STARTED.md#keep-your-data) for package paths. DPAPI protects credentials for the current Windows account; ordinary course files and SQLite are not encrypted vaults.

Assignment dates/status come from Brightspace, with missing facts kept unknown. Lesson checkboxes do not submit assignments. Scans need separate OCR; Quiz/forum/LTI submissions and DeepTutor are not integrated. AI task changes require review and confirmation. Provider charges are separate from the app's local billing demonstration.

GitHub Actions runs Node regressions, type checks and a production build on Ubuntu and Python/DPAPI tests on Windows. HTTP checks use isolated synthetic data. Real school/course evidence stays local and is excluded from fresh archives. Read [language verification](LOCALIZATION.md) and [changes by file](docs/CHANGE-FILES-2026-10-22.md).

## Build a Windows package

From `my-app`, run `pnpm --filter @smart-hub/web build`. From the repository root, run `node tools/package-windows.cjs <new-absolute-output-folder>`. The packager uses the locally present pinned engine, frozen connector and Node, refuses to overwrite an installation and includes both beginner guides. It includes no weights, private database, key or school session. Microsoft runtime prerequisites and notices are in the beginner guide.

Pushing `main` updates source; it does not replace old [GitHub Releases](https://github.com/frankrainrp/Hackathon/releases) ZIPs. Daily schedules require a separate explicit `install-schedule.ps1 -Install`; `-DryRun` only previews. Source/artwork attribution and existing third-party notices from Bulter are retained.

Run `node tools/audit-portability.cjs --source` for the source audit and `node tools/audit-portability.cjs <fresh-package-folder>` for every regular package file. The packager removes this project's absolute build paths from compiled application code and checks for private state, weights and common credential patterns. Upstream compiler source/debug locations inside unmodified vendor binaries are listed separately; they are not personal settings or runtime dependencies on the build computer. The audit does not decode compressed third-party payload internals or promise detection of every possible secret format.
