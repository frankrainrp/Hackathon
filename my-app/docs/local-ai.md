# Local AI setup, provider resolution and packaging

This implementation extends the Hackathon course-sync baseline at `571d6ad209dc1cf38c471e6960bc33562e7a97a2`, retaining the confirmed profile and semester work. The commits separate profile retention, optional AI setup and interface localization so each change can be reviewed. The Butler reference repository supplied packaging/configuration facts; it did not replace this application.

## User flow and state

`AiSetupGate` mounts on the existing home page. `/ai-setup` exposes the same real setup surface directly. First run opens it; **Skip for now** saves a paused step; the banner and PreferencesPanel reopen it; completion persists on disk. No AI setup action clears courses, tasks, notes, IndexedDB migrations, the SQLite LMS inbox, confirmed profiles or semester history. The older automatic tour is no longer shown over AI setup.

Four steps cover Choose, Prepare, Test and Use. Settings are applied on explicit action buttons, including navigation. Inputs for an API key remain in React memory only until save/close; the masked input is cleared before the save request finishes. It is never repopulated from storage. Downloads and samples require separate explicit choices. A completed setup does not claim that generation/quality was tested if the user selected Test later.

## One resolver for text AI

`ai-provider.ts` is the server-side authority. The compatibility entry `model-endpoints.ts` delegates to it. `ai-models.ts` retains saved selection IDs but labels them as primary/alternate routes instead of falsely naming hardware or treating those IDs as actual models.

| Caller | Implementation |
| --- | --- |
| Chat streaming | Resolves `endpointCandidates`; uses the endpoint's real model, credential and URL |
| DDL extraction | `completeWithProvider`; original extraction/tool contract retained |
| Panel/source generation | `completeWithProvider`; existing output validation retained |
| Research plan/squad | `completeWithProvider`; bounded original output contracts retained |
| Optional LMS brief | Same resolver; deterministic ingest succeeds when optional AI is unavailable |
| Setup model list, connection and sample | Same resolver and actual `/models` / chat-completions APIs |

Modes:

- `none`: actionable AI-off response; manual work remains usable.
- `local/bundled`: only the app-managed CPU server on `127.0.0.1:18639/v1`, authenticated with a per-process random token. Uses the basename of the verified on-disk file as the explicit runtime alias, and verifies that `/v1/models` reports it before marking the engine ready. A stopped engine exposes no active model name.
- `local/external`: only an HTTP loopback `/v1` URL and a service-reported model ID. Finding models saves the sole valid ID only when no model is selected. Multiple IDs require a user choice; existing choices are preserved and a removed model fails the connection test. No cloud fallback. The existing service owns its lifecycle and model installation.
- `deepseek`: fixed official `https://api.deepseek.com`, actual `deepseek-flash` or `deepseek-v4-pro`, DPAPI credential. Shared non-streaming calls disable thinking for bounded structured outputs; setup sample is capped at 128 output tokens. User requests can still incur costs. No automatic balance top-up or paid retry occurs.
- `legacy`: explicit existing primary/alternate `OLLAMA_SERVER_*` and `OLLAMA_WINDOWS_*` order, including alternate-first for the retained thinking selection ID. Existing configured network routes can be used here; it is identified separately in setup. `DEEPSEEK_*` never supplies a hidden local URL, model or key.

Provider error bodies and headers are not returned or logged. Controlled messages distinguish authentication, insufficient balance, rate limits, missing model, context/format rejection, overload and unreachable service. Switching providers does not mutate school records.

## Protected storage and local bridge

`BUTLER_AI_DATA_DIR` defaults to `apps/web/.private/ai`. `settings.json` is an allowlisted nonsecret projection written by temp-file rename. `deepseek.dpapi` contains Windows DPAPI CurrentUser ciphertext; its input/output is piped to a fixed PowerShell program, not command arguments or shell interpolation. No plaintext fallback is implemented. Non-Windows key storage fails closed and suggests Local/external. Moving ciphertext to a different Windows account does not migrate the key.

The setup HTTP route checks the actual Host, loopback origin, port/protocol and Fetch Metadata. Mutations require Origin and are capped at 16 KiB. No endpoint accepts arbitrary commands, executable paths, source download URLs or hashes. State responses reveal only `keyPresent`, never ciphertext/plaintext. SQLite/learning exports do not include AI secret files. The local launcher fixes HOSTNAME to `127.0.0.1`; it does not expose a LAN listener or install startup tasks. This remains a single-user desktop web app, not a multi-tenant hosted service.

Hardware inspection uses `os` RAM/architecture/OS, `statfs` for the chosen drive, `nvidia-smi` name/memory fields where available, or only GPU names via a fixed CIM query. It does not request serial numbers, identities, browser history or recursive personal-file scans. Hardware is returned to the local UI only and is never included in provider requests. Unsupported/unknown details remain explicit. Engine execution is probed separately; GPU name does not imply backend capability.

## Model catalog and downloads

`ai-catalog.ts` version `2026-10-22.2` records reviewed evidence links, capabilities/limits, license, exact revision, filename, size and SHA-256. Current recommendations include Gemma 4 12B, Qwen3.8 27B and Qwen3.6 35B-A3B variants. Preference comes from the maintained capability review, then available RAM, context overhead, CPU backend and remaining disk filter eligibility. Eligible lower-resource models remain selectable; no eligible model means an API recommendation. Models of 8B and below remain compatibility metadata for existing installations and isolated tests, but are not offered for new downloads. Catalog labels describe recommendations, never an active runtime identity. No GPU runtime is selected by inference from VRAM alone.

Maintainers can run `node my-app/ops/local-ai/check-catalog.mjs` from the source root to compare current public publisher metadata. This fetches no weights and changes nothing. Review capability/license/engine compatibility before editing the versioned catalog and rebuilding. Arbitrary unreviewed model URLs are not accepted through the UI. Existing noncatalog GGUF files are listed, but must be run through an existing compatible local service; managed-engine startup requires a reviewed SHA-256.

The download API accepts only a catalog ID and explicit confirmation. It writes `.gguf.part` in a selected local absolute folder. It rejects network/device paths and file symlinks, checks free disk and enforces expected size. Interrupted downloads resume using a checked HTTP Range response; if the server ignores Range, transfer restarts rather than appending wrong bytes. The full SHA-256 is checked before atomic rename. Damaged partial files are removed. Journals persist under the AI data folder; stale running journals are shown as paused after process restart. No download restarts on its own. A 120-second inactivity timeout tolerates healthy long downloads. Cancellation waits for the file handle to close and retains resumable bytes.

## Engine and lifecycle

The package contains the official b11669 Windows x64 CPU server/DLLs, archive SHA-256 `37b3efcf962847ca869745fd4ccf7f5e7e8dacfeff9fa3523b4ca8cdc66d632b`. The version probe reports `0.7.0-dev`, build 11669, commit `620d2225c`, Clang 20.1.8. v0.7.0's official `nightly-tag.txt` points to b11669; the fixed asset, not a guessed download path, was used.

`ai-engine.ts` verifies the model, estimates memory, probes executable compatibility and checks the port without stopping another process. `engine-host.cjs` owns the native process through an IPC channel. It uses fixed arguments for loopback, one slot, CPU layers, context, Jinja, an explicit alias, disabled web UI and authentication. Parent IPC disconnect stops the engine even after an abrupt web-process exit. Stop affects only that owned child. Changing provider/model/context stops the old managed engine; restarting Butler requires an explicit start again. Existing Ollama services are never killed.

The official engine requires Microsoft's system C++ runtime. PE imports were checked. This artifact does not copy Windows system DLLs or bundle a Microsoft redistributable without an established publisher entitlement. See the specific prerequisite/recovery path and original license texts in the distribution guide/notices. This is a working package on the authorized machine, not a claim of validation on a clean Windows installation. No GPU or non-Windows package is produced.

## OCR, course facts and confirmation

Mistral OCR is independent of the selected text provider. `cloudOcr` defaults false. `/api/ocr` requires the separate opt-in before reading/uploading a scanned file and still needs its server-side Mistral configuration. No local OCR adapter is implemented. The UI explains the upload and offline limit; it does not represent text inference as offline OCR. Optional browser semantic filtering can separately require a first model-asset download.

Selected-course retrieval remains server-side and bounded; course text is untrusted reference, never a system instruction. Existing proposed-write confirmation cards and output validation are retained. Optional LMS brief facts now use the snapshot's profile/semester-specific session and tasks, rather than the entire historical feed. Submission state continues to come from school facts; AI must not imply submission or mastery. Active/history task-list presentation was not redesigned as part of this work.

## Build and package

Use Node 24.18.0 and the pnpm 9 lockfile for this verified build. Install with `pnpm install --frozen-lockfile` in `my-app`, then `pnpm --filter @smart-hub/web build`. The prebuild script removes only generated standalone output without following dependency junctions.

From the source root, run `node tools/package-windows.cjs <new-absolute-output-folder>`. It refuses to overwrite an existing folder/ZIP, materializes traced dependency links, copies static/public assets and the actual CPU engine/Node runtime, collects notices, excludes private data/model weights and writes a manifest, ZIP and SHA-256. It performs no download, install or publication. The portable launcher sets separate new data paths and starts only a loopback web server. School scripts are included but are not activated. Source users launch through `Start-Source.cmd`; complete distribution rebuild instructions, including the frozen connector, are in `docs/BUILD-WINDOWS.md`.

Tests: `node --test tests/ai-local.test.mjs tests/lms-ai-scope.test.mjs` plus existing LMS/context unit tests; `node tests/ai-http.integration.mjs`; `node tests/ai-native.integration.mjs`; `node tests/ai-download-restart.integration.mjs`; `node tests/lms-settings.integration.mjs`, all from `apps/web`. `tools/smoke-package.cjs` verifies a completed ZIP's SHA-256 before extracting it into a new directory and testing the actual packaged runtime. The cloud preloader is test-only and routes the official DeepSeek hostname to a loopback fixture; the product launcher never loads it. Native tests generate an untrained 115,264-byte GGUF locally and replace checksum metadata only in the test process; no product catalog is changed, model downloaded or reasoning quality implied. See the repository change record and localization guide for verification scope and browser acceptance limits.


## Fresh installations and moving devices

A new browser defaults to English and Retro; saved language/theme preferences survive. Chat and Courses contain no seeded records or fictional-course fallback. UI labels and prompt suggestions remain localized copy; names, counts, model IDs and school facts come from their actual sources.

The Windows x64 CPU package resolves its companion runtime from the executable directory and fixes its data/engine/worker paths there, even when started from another working directory or a shell with stale paths. It refuses an occupied port without stopping any process. Source mode defaults SQLite to `apps/web/.private/butler.sqlite`; `BUTLER_DB_PATH` explicitly selects any existing external store. It no longer adopts drive-root `/data/butler.sqlite` automatically.

Copy the full package to a writable local folder. Model auto-storage follows the current account; custom folders require a path that exists on the destination. Export or back up records separately. DPAPI keys and school sessions belong to the original Windows account; moving to a different account/device requires entering the key and signing in again. Browser pending edits and preferences also belong to that browser profile/origin.

The release is Windows x64 CPU only. Ubuntu CI checks source/backend regressions, not a Linux desktop bundle. ARM64, macOS, clean Windows installations and rendered phone acceptance are not certified by these checks. The server binds loopback, so this package does not expose a phone/LAN deployment automatically.
