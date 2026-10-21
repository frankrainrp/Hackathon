# Brightspace → Butler worker

The current source uses confirmed school profiles, retained semester history and daily preferences. Read [PROFILE_WORKFLOW.md](PROFILE_WORKFLOW.md) for configuration, manual login, catalog/selection, session isolation, URL restrictions, retention and backup.

Opening the launcher does not sign in, sync or register tasks. Custom schools may be saved as metadata; only explicitly supported school/SSO connection policies can access a school. Daily checks default to 09:00 Asia/Singapore and remain disabled until separately approved and installed. Existing release ZIPs may predate these changes.

## Tests

From this directory:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -c requirements-ci.txt
.\.venv\Scripts\python.exe -m unittest discover -v
node --test ../../apps/web/tests/*.test.mjs
.\.venv\Scripts\python.exe lms_sync.py schedule-plan
.\install-schedule.ps1 -DryRun
```

The plan commands require a confirmed profile but perform no school login, downloads or schedule registration. Unit tests use synthetic metadata and temporary stores. The CI production HTTP test also uses only isolated fixture data.

## Rebuild a portable package

On Windows x64, install the workspace dependencies first. Stop the app before building. Before **every** new dev/build invocation that may clear an old standalone output, detach its Windows junctions; Next 14 cleanup can otherwise reach pnpm dependency directories. The helper supports Python 3.11+.

```powershell
.\.venv\Scripts\python.exe prepare_build.py
pnpm --dir ../../apps/web build
.\.venv\Scripts\python.exe -m PyInstaller --noconfirm --onedir --name ButlerSync --distpath .private/freeze --workpath .private/build --specpath .private --collect-all playwright --collect-all pypdf lms_sync.py
.\.venv\Scripts\python.exe package_windows.py --replace
```

Packaging excludes local config, sessions, bridge secrets, SQLite, logs and course archives. Rebuilding is not publishing a release; this task does not deploy or upload a new ZIP. Preserve Bulter's existing third-party notices.
