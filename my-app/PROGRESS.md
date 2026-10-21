# Current local AI build

The independent Hackathon course-sync build now has English-first optional AI setup, a shared server provider resolver, Windows DPAPI DeepSeek credentials, local hardware/task-fit recommendations, reviewed resumable model downloads, a pinned llama.cpp Windows CPU sidecar and local packaging scripts. Existing profile/semester storage and confirmation paths remain. The optional LMS AI brief is scoped to the incoming profile and semester.

Verified runtime: Node 24.18.0, pnpm 9.0.0, Next 14.2.35, TypeScript 5.9.3, React 18.3.1, OpenAI SDK 4.104.0, better-sqlite3 12.11.1; llama.cpp b11669 / 0.7.0-dev / `620d2225c`.

Type checks, production build, 23 unit regressions, AI/LMS HTTP integration, actual native-engine lifecycle with a generated tiny GGUF, process-interrupted synthetic download recovery, and an independently extracted ZIP launch/restart smoke passed. The first packaging dependency-resolution failure was corrected before the verified ZIP was produced. A pre-existing 400/403 fixture expectation was corrected while retaining both rejection tests.

Browser access to the loopback fixture was explicitly denied by the browser authority gate. No workaround, visual screenshot, desktop/mobile walkthrough or claim of UI verification was made. Real Qwen weights, paid DeepSeek calls, GPU backends, clean Windows runtime provisioning and real school sessions remain untested. The known Active task filter still does not exclude `lmsArchived`; it was not redesigned in this task.

The portable Windows CPU package includes the actual engine, Node and license notices. Model weights and Microsoft system runtime are not bundled. The authorized machine's existing Microsoft runtime successfully ran the engine; other machines may need the official prerequisite. No upload, release, push, deployment, real school login or scheduled-task activation occurred.

See `docs/local-ai.md` and `../distribution/GETTING-STARTED.md` for the implemented flow and limits. See the deliverable acceptance report for the browser blocker and artifact paths.
