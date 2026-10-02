# Hackathon

A local learning assistant built on [Bulter](https://github.com/frankrainrp/Bulter), combining course progress, tasks, reminders and AI.

## Quick Start

Requires Windows, Microsoft Edge and a running Ollama chat model for AI.

1. Download and extract [the portable app](https://github.com/frankrainrp/Hackathon/releases/latest).
2. Run `Start-Butler-Demo.cmd` for a demo, or `Start-Butler.cmd` to sign in to Brightspace and start hourly sync.
3. Open [Courses](http://127.0.0.1:3000/?view=courses). Expand a module, track lessons and select **Ask course AI**. Switch Chinese / English at the top.
4. In **Chat**, ask: “Create a task to review Lesson 1 tomorrow.” Confirm the draft, then manage it in **Tasks** or **Calendar**.

## Framework

- **Next.js + React:** Bulter's native interface and task confirmation cards.
- **Python + Playwright:** school login, incremental downloads and hourly sync.
- **SQLite:** shared course, task and reminder storage.
- **Ollama:** task drafting and course answers with source citations.

```text
School → Python sync → SQLite → Courses / Tasks / Calendar
Course files → Text extraction → Relevant passages → AI answer
Task request → AI draft → User confirmation → Saved task
```

UI and task logic: `my-app/apps/web/src/`
Sync worker and setup guide: [my-app/ops/lms-sync/](my-app/ops/lms-sync/README.md)

Edit `config.local.json` in the worker folder to change courses, frequency or download location. Personal files and credentials stay out of Git. Scanned course files need OCR; DeepTutor is not integrated yet.
