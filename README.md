# Hackathon — Butler Learning Workflow

[中文说明](README.zh-CN.md) · Built on [frankrainrp/Bulter](https://github.com/frankrainrp/Bulter)

A local learning assistant using Bulter's native Next.js, React, SQLite and Ollama framework. Brightspace courses become module progress rows, organized lesson files, deadline reminders and source-grounded AI conversations.

- One row per module, with separate school-submission and self-reported lesson progress.
- Chinese / English course interface and AI responses. Original module names are preserved.
- Hourly, incremental Brightspace downloads to `school/module/Lesson 01…`, with Markdown indexes.
- Course AI reads extracted PDF, PPTX, DOCX, HTML, text and supported ZIP contents, then cites source links.
- Native Butler chat, tasks, notes, calendar, model endpoints and confirmation cards remain in use.
- Windows login sessions are encrypted with DPAPI. Public examples contain fictional courses only.

## Windows portable app

Download **Butler-LMS-Windows.zip** from [Releases](https://github.com/frankrainrp/Hackathon/releases). Extract it to a fixed directory.

1. Run `Start-Butler-Demo.cmd` to try fictional courses without school sign-in or a scheduled task.
2. Or run `Start-Butler.cmd`, sign in to Brightspace in the dedicated Edge window, and enable hourly sync.
3. Open [local Butler](http://127.0.0.1:3000/?view=courses). Expand a module and click **Ask course AI**.

Node and the Python worker are bundled. Microsoft Edge is required. AI needs Ollama running with an installed chat model. If AI is offline, school facts and deterministic reminders still work.

## Run from source on Windows

Prerequisites: Node.js 24, pnpm 9, Python 3.11+, Microsoft Edge; Ollama with a chat model for AI.

```powershell
git clone https://github.com/frankrainrp/Hackathon.git
cd Hackathon/my-app
pnpm install --frozen-lockfile
python -m venv ops/lms-sync/.venv
./ops/lms-sync/.venv/Scripts/python.exe -m pip install -r ops/lms-sync/requirements.txt
Copy-Item ops/lms-sync/config.example.json ops/lms-sync/config.local.json
./ops/lms-sync/.venv/Scripts/python.exe ops/lms-sync/lms_sync.py setup
pnpm --filter @smart-hub/web dev --hostname 127.0.0.1
```

`setup` writes ignored local environment settings, generates a bridge token and discovers an installed Ollama model. It does not sign in or download school files. Open Courses and select **View demo courses** to explore the UI first.

To use real courses, keep the web app running and use another terminal:

```powershell
cd my-app/ops/lms-sync
./.venv/Scripts/python.exe lms_sync.py login
./.venv/Scripts/python.exe lms_sync.py sync
./install-schedule.ps1
```

The example discovers the signed-in user's enrolled courses; it contains no student roster. Edit `config.local.json` to limit courses or change frequency. School sessions may expire or require MFA; sign in again when prompted. Other Brightspace schools need their URL, timezone and allowed origin configured. Other LMS products need an adapter.

## How course AI works

Download → bounded text extraction → authenticated local bridge → SQLite → relevant course passages → existing Ollama chat. The chat identifies its selected course and cites material names and URLs. It cannot submit school work. Course Q&A has no write tools; ordinary task conversations retain Butler's confirmation cards.

Each file contributes up to 20,000 text characters; each snapshot is limited to 1,200,000. Questions retrieve up to eight relevant passages. Scans require OCR, which is not connected to automatic course sync yet. Images, formulas and complex tables may not survive extraction. Empty or unavailable text is reported rather than treated as read. Assignments/Dropbox are supported; quizzes, forums and external LTI submissions are not yet synchronized.

This is a local, single-user application. Bind it to `127.0.0.1`. Local Ollama keeps selected passages on the machine; a configured remote model receives them. Set `LMS_CONTENT_AI_ENABLED=false` to disable course text in AI. Private courses, sessions, databases, local configuration and logs are excluded from this repository and its portable release. Public code is not a public website deployment.

## Validation and packaging

```powershell
# From my-app/apps/web
node --test tests/*.test.mjs
pnpm exec tsc --noEmit
# From my-app/ops/lms-sync
./.venv/Scripts/python.exe -m unittest discover -v
```

The release was validated with a synthetic PPTX → extraction → bridge → real Ollama answers in Chinese and English, including the correct numeric result and source citation. Temporary material and its test database were removed. For packaging commands and Windows junction handling, see [worker documentation](my-app/ops/lms-sync/README.md).

## DeepTutor

[HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) is a planned extension for deeper tutoring and knowledge-base workflows. It is **not integrated in this release**. The current course question feature uses bounded local text retrieval and Bulter's existing AI connection.

Upstream framework and assets originate from Bulter. Existing third-party notices are retained where supplied; no new project-wide license grant is asserted here.
