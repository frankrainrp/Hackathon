# School profiles, retained semesters and daily checks

> Updated URL-only onboarding: the current interface recognises a Singapore polytechnic from its learning URL, then discovers the latest accessible semester and courses after explicit login. The historical manual-profile/CLI reference below remains for retained installations and integrations. The portable app includes ButlerSync.exe; it does not install Python or browsers. Login adapters currently cover exact TP/RP/SP Brightspace hosts.


These instructions describe this source branch. Existing release ZIPs are not automatically upgraded. No school login or background schedule is enabled by saving settings or opening the launcher.

## Configure and confirm

1. Install the locked workspace dependencies and start the local web app on `127.0.0.1`. Open **Courses → School, semester and daily checks**.
2. Enter your school name and its direct HTTPS LMS entry URL. Free text is kept as your description; it is never used to infer your institution. Preview the normalized name, entry URL and domain, then confirm them together with the current semester label. The TP/RP buttons are explicitly examples, not the current user's school.
3. Choose Brightspace only if that is the school's platform. Connection support currently permits only the exact TP/RP school hosts. Other public custom URLs, including other Brightspace schools, can be retained as metadata; login, sync and scheduler installation fail closed until their connection policy/adapter is added. The shared PoliteMall portal is not a supported login destination: use a supported school's direct entry rather than silently adopting its redirect.
4. Choose the daily time. Default is **09:00 Asia/Singapore**; **UTC** is also supported. Both are fixed-offset zones. Other zones are rejected rather than silently applying the wrong daylight-saving rules.
5. Confirm each semester's course selection and statuses (active, completed, paused). Only selected **active** courses are downloaded. An empty selection never means "all enrolled courses".

TP's example domain is supported by the [official Student's IT Needs guide](https://www.tp.edu.sg/life-at-tp/tp-students-digital-access-it-matters/students-it-needs.html). RP's example comes from this project's existing RP setup and README. Always check the school's current published entry domain before confirming; neither example verifies your account or enrollment.

Public HTTPS DNS hosts on port 443 are required. Credentials, query strings and fragments in configuration URLs, IP literals, local hostnames and private/reserved DNS results are rejected. These checks alone do not make arbitrary URLs safe against DNS rebinding. Consequently the worker refuses all custom school domains before DNS lookup or browser/API startup. Supported connections are limited to the exact `tplms.polite.edu.sg` or `rplms.polite.edu.sg` origin; interactive SSO/subresources are limited to that same school and Microsoft-controlled `microsoftonline.com`, `msauth.net`, `msftauth.net` and `msauthimages.net` domains. Another school, unknown redirect/CDN domain, HTTP request or WebSocket is blocked. DNS is rechecked for permitted requests, TLS certificate validation stays enabled, and API redirects are never followed. Login is accepted only back at the configured school origin. If an institution changes its SSO domains the policy must be reviewed and updated; this branch has not live-tested either institution's complete SSO flow.

## First connection — manual, after approving access

From `my-app/ops/lms-sync`, with the local app stopped before setup:

```powershell
.\.venv\Scripts\python.exe lms_sync.py setup
# Restart the local app so it loads the bridge token and LMS_CONFIG_PATH.
.\.venv\Scripts\python.exe lms_sync.py login
.\.venv\Scripts\python.exe lms_sync.py catalog
```

Login opens a separate Edge window for the user to complete SSO/MFA, restoring Butler's previous encrypted session when available. It does not attach to or copy the ordinary Edge profile. Choose Microsoft's **Stay signed in** option when offered if you want the school session retained. `catalog` retrieves enrollment IDs/names and official semester metadata without downloading files; the app then selects the latest accessible semester. Review the selected courses, then use **Download selected course files** or explicitly run:

```powershell
.\.venv\Scripts\python.exe lms_sync.py sync
```

For a rebuilt portable package use `ButlerSync.exe` in place of the Python/script command. The launcher now opens the local UI only. It does not run setup, login, sync, or install a schedule automatically. Demo mode remains fictional.

## Persistence and session isolation

- `config.local.json`: confirmed profiles, active profile/semester, all previous semester selections and course statuses, and daily preferences. Before each update, `config.local.json.bak` retains the previous metadata version; replacement is atomic.
- `.private/catalogs/<profile-id>.json`: discovered enrollment names/IDs, still unassigned until user confirmation.
- `.private/sessions/<scope>/session.enc`: browser cookies, localStorage and IndexedDB, encrypted with Windows user DPAPI. Login, catalog and successful sync save refreshed state, including permitted Microsoft SSO state, so a later process can reuse it. `savedAt` prevents an older expiry snapshot from invalidating a newer successful login. Scope includes the profile, school name and origin. Switching school/domain requires a new profile and separate login; old sessions are not silently reused or moved. Legacy unscoped sessions remain on disk but require a fresh scoped login. Plaintext passwords are never stored; regular Edge profile databases are never read, copied or decrypted.
- `.private/sync.sqlite`: incremental download ledger. File identity now includes school profile and semester. Existing legacy archives are retained; the first scoped sync may download them again. Within a scope, unchanged materials are reused, with the existing file-size limit, partial-file replacement and lock behavior preserved.
- `courses/<profile-id>/<semester-id>/<school>/<module>/...`: retained downloads and indexes, separated by semester.
- `.private/sync-history.json`, `.private/last-snapshot.json`: durable sync outcomes and retry data, including login-expiry outcomes.
- The configured `BUTLER_DB_PATH` (normally `.private/butler.sqlite`) retains the LMS inbox, historical course/submission facts, task state, notes and learning progress. Switching semesters marks records historical; it does not delete or overwrite another semester's tasks. Unknown submission status preserves the last confirmed fact. Frontend task state survives restarts in the same SQLite database.

Only session/bridge secrets are encrypted; ordinary metadata, course files and SQLite are local personal data. DPAPI protects against other user accounts, not every process under the same account. The local bridge token also exists in the app's ignored `.env.local`. The web UI never exports those files or decrypted session data. Optional institution-issued `LMS_ACCESS_TOKEN` must also specify the exact `LMS_ACCESS_TOKEN_ORIGIN` and `LMS_ACCESS_TOKEN_PROFILE`; it cannot follow a profile change.

Login expiry does not erase profiles, semesters, selections, course states or tasks. A new manual login is required. No refresh-token service or school-side revocation endpoint is implemented.

Retention does not override Microsoft Entra conditional access, session revocation, sign-in frequency, MFA or school expiry. The worker never rewrites cookie/token expiry and never creates a timer to defeat sign-in policy. A local `session-check` verifies encrypted state and known expiry metadata; a successful live `catalog`/`sync` is the evidence that the school still accepts it. See [Playwright authentication](https://playwright.dev/python/docs/auth) and [Microsoft session lifetime](https://learn.microsoft.com/en-us/entra/identity/authentication/concepts-azure-multi-factor-authentication-prompts-session-lifetime).

## Daily scheduler — preview first

```powershell
# Pure plan generation: no login, downloads or task registration.
.\.venv\Scripts\python.exe lms_sync.py schedule-plan
.\install-schedule.ps1 -DryRun
```

The default installer action is also preview-only. Only a later explicit `-Install` registers `Butler-LMS-Daily-<profile-id>`, under the current signed-in Windows user with limited privileges; unsupported domains cannot be installed. Its command is bound to that expected profile ID: switching the active school stops the old schedule from silently accessing the new school. It uses a daily calendar trigger with an explicit timezone offset, catches missed starts when available, ignores overlapping runs and limits runs to 55 minutes. It does not replace/delete legacy hourly tasks or register a separate web-start task. Review any old tasks before enabling a daily one. Keep the local Butler service running; if unavailable, snapshots remain for `retry`.

The machine must be available and this Windows user signed in. Daily checks can miss deadlines or changed due dates announced less than a day ahead; the 24/6-hour LMS messages are evaluated at sync time, not continuously. Web inbox polling every 30 seconds is not another school check. `watch` is a foreground daily loop; it rereads settings before each run.

## Retention, export and recovery

Records are kept until the user deliberately clears them. This is not indestructible or guaranteed permanent storage. Disk loss, manual deletion or corruption still require a backup.

Use **Export local profiles, history and tasks** to download JSON containing the non-secret settings, complete retained LMS inbox and manual tasks/notes. The UI displays only the latest ten sync entries; the full history remains in the backup/database. Store exports privately. The JSON export excludes `.env.local`, DPAPI session/bridge blobs and raw download files. It is an export format, not an automatic import button.

For complete recovery, stop the app/worker and copy `config.local.json`, its backup, the entire configured private directory and the course archive to a private backup. Restore ordinary records in the same layout and point `BUTLER_DB_PATH` at the restored SQLite file. On a new Windows account/machine sign in again; DPAPI files are not portable credentials. Do not copy sessions between profile scopes. No profile change or login expiry performs a destructive cleanup.

To disconnect, stop the worker/its reviewed scheduled task and remove the relevant scoped session only when you intend to discard it. School-side logout/revocation is separate. Course history/tasks are retained; deleting credentials does not delete records. This branch did not enable any real schedule or sign into a school.

## Checks

```powershell
node --test ../../apps/web/tests/*.test.mjs
.\.venv\Scripts\python.exe -m unittest discover -v
```

Tests use synthetic profiles, temporary stores and dry-run XML; hosted CI includes Windows DPAPI tests. Live SSO/MFA, real enrollment/semester correctness and actual scheduler activation require a later user-approved end-to-end run.
