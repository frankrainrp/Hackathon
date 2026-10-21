# File-by-file change record — 21 October 2026

This record compares the previous `main` (`3c6edab`) with the reviewed source delivered here. Existing repair commits through `571d6ad` are retained. The publication adds five focused commits: confirmed profile/semester retention, optional AI setup and pinned runtime, default-English localization, CI coverage, and usage/per-file documentation.

## Behavior and verification

- English is the fresh-interface default; Chinese is optional. User-authored courses, notes and conversation history keep their original content.
- The actual selected model, counts, dates, hardware and state provide dynamic labels. New panels start empty; optional examples are labelled and require an explicit choice.
- Manual study tools work without AI. Local downloads, cloud samples, school login and scheduler installation remain explicit actions.
- Local verification of the publishing checkout: 32 Node tests and 20 Python tests, type checking, production build, the 1,528-entry bilingual catalog audit, AI HTTP integration in both languages, and LMS settings HTTP integration passed. Tests use synthetic records and local provider mocks.
- The previously built Windows ZIP was extracted and exercised locally, including the included native engine, configured model labels and SQLite/settings restart. No real paid API, model-weight download, school login or scheduler activation was used for verification.
- Desktop/mobile browser acceptance was blocked by the desktop tooling policy during local verification; no visual/interaction pass is claimed.
- Runtime binaries are pinned upstream files with notices, not trained model weights. No private database, credentials, sessions, diagnostic screenshots, local-machine provenance, dependency/build caches or ZIP release assets are committed.
- Source publication on `main` does not replace previously uploaded GitHub Releases ZIPs. Build a new archive using the documented command; release publication is separate.

## Commit groups

| Commit | Scope |
| --- | --- |
| `801d155` | Confirmed school profiles, semester history, retention and explicit daily plans. |
| `b72cef8` | Optional local/DeepSeek setup, common resolver, pinned Windows CPU runtime and packaging/tests. |
| `9258042` | Default-English interface, optional Chinese, truthful defaults and copy/parameter audit. |
| `c7cbc2b` | Copy/HTTP CI checks and unsupported-platform native-engine test contract. |
| This documentation commit | Current English/Chinese usage, safe configuration example and this per-file record. |

## Files

232 changed files; A: 124, M: 107, D: 1. `A` = added, `M` = modified, `D` = removed.

| File | Status | Description |
| --- | --- | --- |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | A | Run Node, type/build, copy audit and local-mock HTTP checks; retain Windows Python tests. |
| [.gitignore](../.gitignore) | M | Exclude private configuration, databases, sessions, caches and downloaded model files. |
| [distribution/GETTING-STARTED.md](../distribution/GETTING-STARTED.md) | A | Explain English/Chinese setup, explicit AI actions, recovery and system prerequisites. |
| [distribution/Launch.cjs](../distribution/Launch.cjs) | A | Start the packaged app on loopback with separate state paths and no automatic model installation. |
| [distribution/Start-Hackathon.cmd](../distribution/Start-Hackathon.cmd) | A | Windows entry point using the included Node runtime. |
| [distribution/THIRD-PARTY-NOTICES.md](../distribution/THIRD-PARTY-NOTICES.md) | A | Attribute engine/runtime dependencies and distinguish source publication from binary releases. |
| [docs/CHANGE-FILES-2026-10-21.md](../docs/CHANGE-FILES-2026-10-21.md) | A | This per-file record: commit groups, verification evidence and publication boundaries. |
| [LOCALIZATION.md](../LOCALIZATION.md) | A | Document language/data boundaries, message catalogs, checks and browser verification limits. |
| [my-app/apps/web/.env.local.example](../my-app/apps/web/.env.local.example) | M | Document optional server/OCR configuration without keys, assumed model identity or hardcoded pricing. |
| [my-app/apps/web/package.json](../my-app/apps/web/package.json) | M | Record the existing workspace scripts, exact dependency resolution or native runtime requirement. |
| [my-app/apps/web/public/manifest.webmanifest](../my-app/apps/web/public/manifest.webmanifest) | M | Default the installable web application name, description and language metadata to English. |
| [my-app/apps/web/src/app/ai-setup/page.tsx](../my-app/apps/web/src/app/ai-setup/page.tsx) | A | Expose the same AI setup surface directly at /ai-setup. |
| [my-app/apps/web/src/app/api/ai/setup/route.ts](../my-app/apps/web/src/app/api/ai/setup/route.ts) | A | Expose protected local setup, true model metadata and explicit consent actions. |
| [my-app/apps/web/src/app/api/chat/route.ts](../my-app/apps/web/src/app/api/chat/route.ts) | M | Preserve the chat contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/connector/route.ts](../my-app/apps/web/src/app/api/connector/route.ts) | M | Preserve the connector contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/extract-ddls/route.ts](../my-app/apps/web/src/app/api/extract-ddls/route.ts) | M | Preserve the extract-ddls contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/generate-panel/route.ts](../my-app/apps/web/src/app/api/generate-panel/route.ts) | M | Preserve the generate-panel contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/generate-source/route.ts](../my-app/apps/web/src/app/api/generate-source/route.ts) | M | Preserve the generate-source contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/lms/context/route.ts](../my-app/apps/web/src/app/api/lms/context/route.ts) | M | Preserve the lms/context contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/lms/feed/route.ts](../my-app/apps/web/src/app/api/lms/feed/route.ts) | M | Preserve the lms/feed contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/lms/ingest/route.ts](../my-app/apps/web/src/app/api/lms/ingest/route.ts) | M | Persist deterministic scoped school facts; make AI brief optional and language-aware. |
| [my-app/apps/web/src/app/api/lms/settings/route.ts](../my-app/apps/web/src/app/api/lms/settings/route.ts) | A | Preview/confirm profiles and export nonsecret retained configuration. |
| [my-app/apps/web/src/app/api/ocr/route.ts](../my-app/apps/web/src/app/api/ocr/route.ts) | M | Preserve the ocr contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/research/plan/route.ts](../my-app/apps/web/src/app/api/research/plan/route.ts) | M | Preserve the research/plan contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/research/squad/route.ts](../my-app/apps/web/src/app/api/research/squad/route.ts) | M | Preserve the research/squad contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/api/state/route.ts](../my-app/apps/web/src/app/api/state/route.ts) | M | Preserve the state contract while using localized errors/selected provider where applicable. |
| [my-app/apps/web/src/app/error.tsx](../my-app/apps/web/src/app/error.tsx) | A | Provide a localized application recovery page. |
| [my-app/apps/web/src/app/layout.tsx](../my-app/apps/web/src/app/layout.tsx) | M | Serve English initial document metadata and the existing application shell. |
| [my-app/apps/web/src/app/not-found.tsx](../my-app/apps/web/src/app/not-found.tsx) | A | Provide a localized missing-page entry back to the workspace. |
| [my-app/apps/web/src/app/page.tsx](../my-app/apps/web/src/app/page.tsx) | M | Mount AI setup and use real processing results, localized actions and preserved study records. |
| [my-app/apps/web/src/components/AchievementsRoom.tsx](../my-app/apps/web/src/components/AchievementsRoom.tsx) | M | Localize AchievementsRoom interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/AiSetup.module.css](../my-app/apps/web/src/components/AiSetup.module.css) | A | Style the existing setup flow for desktop/mobile, wrapping and keyboard/reduced-motion states. |
| [my-app/apps/web/src/components/AiSetup.tsx](../my-app/apps/web/src/components/AiSetup.tsx) | A | Optional resumable AI setup, explicit downloads/samples, real status and first-screen language choice. |
| [my-app/apps/web/src/components/AttachmentPreview.tsx](../my-app/apps/web/src/components/AttachmentPreview.tsx) | M | Localize AttachmentPreview interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/CalendarPanel.tsx](../my-app/apps/web/src/components/CalendarPanel.tsx) | M | Localize CalendarPanel interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/ChatCanvas.tsx](../my-app/apps/web/src/components/ChatCanvas.tsx) | M | Localize greetings/prompts at render time so language changes do not freeze earlier copy. |
| [my-app/apps/web/src/components/CheckoutModal.tsx](../my-app/apps/web/src/components/CheckoutModal.tsx) | M | Localize CheckoutModal interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/ConfirmCard.tsx](../my-app/apps/web/src/components/ConfirmCard.tsx) | M | Localize ConfirmCard interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/CoursesPanel.module.css](../my-app/apps/web/src/components/CoursesPanel.module.css) | M | Localize CoursesPanel interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/CoursesPanel.tsx](../my-app/apps/web/src/components/CoursesPanel.tsx) | M | Show retained scoped course facts, separate submission/learning progress and opt-in examples. |
| [my-app/apps/web/src/components/CustomPanelView.tsx](../my-app/apps/web/src/components/CustomPanelView.tsx) | M | Localize CustomPanelView interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/DailyBrief.tsx](../my-app/apps/web/src/components/DailyBrief.tsx) | M | Localize DailyBrief interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/DataSourceBuilder.tsx](../my-app/apps/web/src/components/DataSourceBuilder.tsx) | M | Localize DataSourceBuilder interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/GeneratedPanelView.tsx](../my-app/apps/web/src/components/GeneratedPanelView.tsx) | M | Localize GeneratedPanelView interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/InputPod.tsx](../my-app/apps/web/src/components/InputPod.tsx) | M | Read actual configured model names and localize input, attachment and accessibility copy. |
| [my-app/apps/web/src/components/KeyboardShortcutsHelp.tsx](../my-app/apps/web/src/components/KeyboardShortcutsHelp.tsx) | M | Localize KeyboardShortcutsHelp interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/layout/CalendarRail.tsx](../my-app/apps/web/src/components/layout/CalendarRail.tsx) | M | Localize CalendarRail interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/layout/ChatRail.tsx](../my-app/apps/web/src/components/layout/ChatRail.tsx) | M | Localize ChatRail interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/layout/GlobalSearch.tsx](../my-app/apps/web/src/components/layout/GlobalSearch.tsx) | M | Localize GlobalSearch interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/layout/NotesRail.tsx](../my-app/apps/web/src/components/layout/NotesRail.tsx) | M | Localize NotesRail interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/layout/TasksRail.tsx](../my-app/apps/web/src/components/layout/TasksRail.tsx) | M | Localize TasksRail interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/layout/TopBar.tsx](../my-app/apps/web/src/components/layout/TopBar.tsx) | M | Localize TopBar interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/mini-apps/FocusTimer.tsx](../my-app/apps/web/src/components/mini-apps/FocusTimer.tsx) | M | Localize FocusTimer interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/mini-apps/ShareCard.tsx](../my-app/apps/web/src/components/mini-apps/ShareCard.tsx) | M | Localize ShareCard interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/mini-apps/StatsApp.tsx](../my-app/apps/web/src/components/mini-apps/StatsApp.tsx) | M | Localize StatsApp interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/MiniAppsDrawer.tsx](../my-app/apps/web/src/components/MiniAppsDrawer.tsx) | M | Localize MiniAppsDrawer interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/NotesPanel.tsx](../my-app/apps/web/src/components/NotesPanel.tsx) | M | Localize NotesPanel interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/NotesPreview.tsx](../my-app/apps/web/src/components/NotesPreview.tsx) | M | Localize NotesPreview interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/OnboardingTour.tsx](../my-app/apps/web/src/components/OnboardingTour.tsx) | M | Localize OnboardingTour interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/panel-modules/Charts.tsx](../my-app/apps/web/src/components/panel-modules/Charts.tsx) | M | Localize Charts interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/panel-modules/ModuleRenderer.tsx](../my-app/apps/web/src/components/panel-modules/ModuleRenderer.tsx) | M | Localize ModuleRenderer interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/PreferencesPanel.tsx](../my-app/apps/web/src/components/PreferencesPanel.tsx) | M | Localize PreferencesPanel interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/ProcessingPipeline.tsx](../my-app/apps/web/src/components/ProcessingPipeline.tsx) | M | Localize ProcessingPipeline interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/QuotaWallModal.tsx](../my-app/apps/web/src/components/QuotaWallModal.tsx) | M | Localize QuotaWallModal interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/RecurringTasksManager.tsx](../my-app/apps/web/src/components/RecurringTasksManager.tsx) | M | Localize RecurringTasksManager interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/SchoolSettings.tsx](../my-app/apps/web/src/components/SchoolSettings.tsx) | A | Preview and confirm schools, semesters, course selection and daily preferences. |
| [my-app/apps/web/src/components/TaskDetailDrawer.tsx](../my-app/apps/web/src/components/TaskDetailDrawer.tsx) | M | Localize TaskDetailDrawer interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/TasksPanel.tsx](../my-app/apps/web/src/components/TasksPanel.tsx) | M | Localize TasksPanel interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/Toast.tsx](../my-app/apps/web/src/components/Toast.tsx) | M | Localize Toast interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/components/TodayHero.tsx](../my-app/apps/web/src/components/TodayHero.tsx) | M | Localize TodayHero interface/accessibility copy and preserve its existing behavior and data. |
| [my-app/apps/web/src/lib/ai-catalog.ts](../my-app/apps/web/src/lib/ai-catalog.ts) | A | Pin reviewed model file metadata and calculate capability/RAM/disk/context recommendations. |
| [my-app/apps/web/src/lib/ai-config.ts](../my-app/apps/web/src/lib/ai-config.ts) | A | Validate settings and loopback requests; store Windows DPAPI ciphertext separately from study data. |
| [my-app/apps/web/src/lib/ai-download.ts](../my-app/apps/web/src/lib/ai-download.ts) | A | Require consent; track, cancel, resume and verify model file transfers. |
| [my-app/apps/web/src/lib/ai-engine.ts](../my-app/apps/web/src/lib/ai-engine.ts) | A | Probe and supervise the Windows CPU engine on authenticated loopback. |
| [my-app/apps/web/src/lib/ai-hardware.ts](../my-app/apps/web/src/lib/ai-hardware.ts) | A | Read actual system RAM, disk and GPU inventory with explicit unknown values. |
| [my-app/apps/web/src/lib/ai-models.ts](../my-app/apps/web/src/lib/ai-models.ts) | M | Retain stored route IDs without falsely treating them as the actual configured model. |
| [my-app/apps/web/src/lib/ai-provider.ts](../my-app/apps/web/src/lib/ai-provider.ts) | A | Resolve the selected text provider/model consistently and redact provider failures. |
| [my-app/apps/web/src/lib/ai-tools.ts](../my-app/apps/web/src/lib/ai-tools.ts) | M | Use shared localized copy in ai-tools.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/api-language.ts](../my-app/apps/web/src/lib/api-language.ts) | A | Translate application status/error fields and AI-generated labels without translating user payloads. |
| [my-app/apps/web/src/lib/butler-asset.ts](../my-app/apps/web/src/lib/butler-asset.ts) | M | Use shared localized copy in butler-asset.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/chat-client.ts](../my-app/apps/web/src/lib/chat-client.ts) | M | Use shared localized copy in chat-client.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/connector-client.ts](../my-app/apps/web/src/lib/connector-client.ts) | M | Use shared localized copy in connector-client.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/course-context.ts](../my-app/apps/web/src/lib/course-context.ts) | M | Keep retrieved passages within the selected course; allow explicitly selected demo scope. |
| [my-app/apps/web/src/lib/course-copy.ts](../my-app/apps/web/src/lib/course-copy.ts) | M | Back the existing course-copy API with the shared language catalogs. |
| [my-app/apps/web/src/lib/course-demo.ts](../my-app/apps/web/src/lib/course-demo.ts) | M | Generate optional, explicitly fictional practice courses in the selected language. |
| [my-app/apps/web/src/lib/custom-panels.ts](../my-app/apps/web/src/lib/custom-panels.ts) | M | Use shared localized copy in custom-panels.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/db.ts](../my-app/apps/web/src/lib/db.ts) | M | Use shared localized copy in db.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/demo-data.ts](../my-app/apps/web/src/lib/demo-data.ts) | M | Use shared localized copy in demo-data.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/document-parser.ts](../my-app/apps/web/src/lib/document-parser.ts) | M | Use shared localized copy in document-parser.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/document-pipeline.ts](../my-app/apps/web/src/lib/document-pipeline.ts) | A | Use truthful document-processing stages and preview actual extracted changes. |
| [my-app/apps/web/src/lib/i18n.ts](../my-app/apps/web/src/lib/i18n.ts) | M | Default-English React subscription and persisted optional Chinese choice. |
| [my-app/apps/web/src/lib/ics-export.ts](../my-app/apps/web/src/lib/ics-export.ts) | M | Use shared localized copy in ics-export.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/ics-import.ts](../my-app/apps/web/src/lib/ics-import.ts) | M | Use shared localized copy in ics-import.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/json-export.ts](../my-app/apps/web/src/lib/json-export.ts) | M | Use shared localized copy in json-export.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/lms-auth.ts](../my-app/apps/web/src/lib/lms-auth.ts) | M | Enforce matching loopback protocol/port and reject cross-origin LMS requests. |
| [my-app/apps/web/src/lib/lms-profile-store.ts](../my-app/apps/web/src/lib/lms-profile-store.ts) | A | Persist/export nonsecret profiles, retained semesters and discovered course metadata. |
| [my-app/apps/web/src/lib/lms-profile.ts](../my-app/apps/web/src/lib/lms-profile.ts) | A | Validate confirmed school metadata, semester selection and course status. |
| [my-app/apps/web/src/lib/lms-schema.ts](../my-app/apps/web/src/lib/lms-schema.ts) | M | Validate school links and scoped incoming facts without inferring unknown submissions. |
| [my-app/apps/web/src/lib/lms-sync.ts](../my-app/apps/web/src/lib/lms-sync.ts) | M | Retain school/semester facts and learner work; localize newly generated sync copy. |
| [my-app/apps/web/src/lib/locales/en.ts](../my-app/apps/web/src/lib/locales/en.ts) | A | Central English interface catalog with matching dynamic parameter contracts. |
| [my-app/apps/web/src/lib/locales/zh.ts](../my-app/apps/web/src/lib/locales/zh.ts) | A | Central Chinese interface catalog with matching dynamic parameter contracts. |
| [my-app/apps/web/src/lib/messages.ts](../my-app/apps/web/src/lib/messages.ts) | A | Shared runtime copy, safe interpolation, locale dates, known errors and local API language headers. |
| [my-app/apps/web/src/lib/mock-pipeline.ts](https://github.com/frankrainrp/Hackathon/blob/3c6edab/my-app/apps/web/src/lib/mock-pipeline.ts) | D | Remove the unused random/fabricated document-processing implementation. |
| [my-app/apps/web/src/lib/model-endpoints.ts](../my-app/apps/web/src/lib/model-endpoints.ts) | M | Delegate legacy callers to the shared provider resolver. |
| [my-app/apps/web/src/lib/ocr/index.ts](../my-app/apps/web/src/lib/ocr/index.ts) | M | Use shared localized copy in index.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/ocr/providers.ts](../my-app/apps/web/src/lib/ocr/providers.ts) | M | Use shared localized copy in providers.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/panel-data.ts](../my-app/apps/web/src/lib/panel-data.ts) | M | Use shared localized copy in panel-data.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/panel-generator.ts](../my-app/apps/web/src/lib/panel-generator.ts) | M | Use shared localized copy in panel-generator.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/panel-schema.ts](../my-app/apps/web/src/lib/panel-schema.ts) | M | Start generated panels with an empty schema instead of seeded example data. |
| [my-app/apps/web/src/lib/recurring.ts](../my-app/apps/web/src/lib/recurring.ts) | M | Use shared localized copy in recurring.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/research-assembler.ts](../my-app/apps/web/src/lib/research-assembler.ts) | M | Use shared localized copy in research-assembler.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/research-client.ts](../my-app/apps/web/src/lib/research-client.ts) | M | Use shared localized copy in research-client.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/semantic-filter.ts](../my-app/apps/web/src/lib/semantic-filter.ts) | M | Use shared localized copy in semantic-filter.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/server-state.ts](../my-app/apps/web/src/lib/server-state.ts) | M | Use shared localized copy in server-state.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/streak.ts](../my-app/apps/web/src/lib/streak.ts) | M | Use shared localized copy in streak.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/theme.ts](../my-app/apps/web/src/lib/theme.ts) | M | Use shared localized copy in theme.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/tool-executor.ts](../my-app/apps/web/src/lib/tool-executor.ts) | M | Use shared localized copy in tool-executor.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/types.ts](../my-app/apps/web/src/lib/types.ts) | M | Retain profile/semester linkage and existing study-record contracts. |
| [my-app/apps/web/src/lib/usage.ts](../my-app/apps/web/src/lib/usage.ts) | M | Use shared localized copy in usage.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/lib/wallpaper.ts](../my-app/apps/web/src/lib/wallpaper.ts) | M | Use shared localized copy in wallpaper.ts while retaining schema keys, record content and actual values. |
| [my-app/apps/web/src/middleware.ts](../my-app/apps/web/src/middleware.ts) | M | Use the shared catalog for the existing server-side rate-limit error. |
| [my-app/apps/web/tests/ai-download-restart.integration.mjs](../my-app/apps/web/tests/ai-download-restart.integration.mjs) | A | Verify interrupted synthetic downloads resume across processes with integrity checks. |
| [my-app/apps/web/tests/ai-http.integration.mjs](../my-app/apps/web/tests/ai-http.integration.mjs) | A | Exercise six AI routes and scoped LMS briefs using local mocks in both languages. |
| [my-app/apps/web/tests/ai-local.test.mjs](../my-app/apps/web/tests/ai-local.test.mjs) | A | Test settings, loopback guards, DPAPI, transfer, recommendations, provider resolution and platform contracts. |
| [my-app/apps/web/tests/ai-native.integration.mjs](../my-app/apps/web/tests/ai-native.integration.mjs) | A | Test real native lifecycle using a locally generated untrained tiny GGUF. |
| [my-app/apps/web/tests/cloud-mock-preload.cjs](../my-app/apps/web/tests/cloud-mock-preload.cjs) | A | Intercept cloud provider traffic only in tests and route it to a loopback fixture. |
| [my-app/apps/web/tests/course-context.test.mjs](../my-app/apps/web/tests/course-context.test.mjs) | M | Regression/integration coverage for course-context using synthetic scoped records. |
| [my-app/apps/web/tests/lms-ai-scope.test.mjs](../my-app/apps/web/tests/lms-ai-scope.test.mjs) | A | Regression/integration coverage for lms-ai-scope using synthetic scoped records. |
| [my-app/apps/web/tests/lms-auth.test.mjs](../my-app/apps/web/tests/lms-auth.test.mjs) | A | Regression/integration coverage for lms-auth using synthetic scoped records. |
| [my-app/apps/web/tests/lms-profile.test.mjs](../my-app/apps/web/tests/lms-profile.test.mjs) | A | Regression/integration coverage for lms-profile using synthetic scoped records. |
| [my-app/apps/web/tests/lms-settings.integration.mjs](../my-app/apps/web/tests/lms-settings.integration.mjs) | A | Regression/integration coverage for lms-settings using synthetic scoped records. |
| [my-app/apps/web/tests/lms-sync.test.mjs](../my-app/apps/web/tests/lms-sync.test.mjs) | M | Regression/integration coverage for lms-sync using synthetic scoped records. |
| [my-app/apps/web/tests/localization.test.mjs](../my-app/apps/web/tests/localization.test.mjs) | A | Verify language defaults, persistence, parameter parity, actual values and unchanged user payloads. |
| [my-app/apps/web/tests/tiny-gguf.cjs](../my-app/apps/web/tests/tiny-gguf.cjs) | A | Construct a tiny untrained test GGUF locally; no downloaded model weights. |
| [my-app/docs/local-ai.md](../my-app/docs/local-ai.md) | A | Explain provider resolution, protected storage, explicit model transfers and packaging. |
| [my-app/ops/lms-sync/brightspace.py](../my-app/ops/lms-sync/brightspace.py) | M | Keep school/redirect access within the reviewed policy and confirmed scope. |
| [my-app/ops/lms-sync/collect_slides.py](../my-app/ops/lms-sync/collect_slides.py) | A | Collect archive slide materials safely while preserving collisions and incremental refresh. |
| [my-app/ops/lms-sync/config.example.json](../my-app/ops/lms-sync/config.example.json) | M | Nonsecret example for confirmed school/semester scope and default-English system exports. |
| [my-app/ops/lms-sync/core.py](../my-app/ops/lms-sync/core.py) | M | Preserve lesson/material mappings, submission states and localized export headings. |
| [my-app/ops/lms-sync/install-schedule.ps1](../my-app/ops/lms-sync/install-schedule.ps1) | M | Preview daily scheduling and require explicit installation for the confirmed profile. |
| [my-app/ops/lms-sync/lms_sync.py](../my-app/ops/lms-sync/lms_sync.py) | M | Sync only confirmed active courses and send scoped facts using the configured language. |
| [my-app/ops/lms-sync/package_windows.py](../my-app/ops/lms-sync/package_windows.py) | M | Keep legacy worker packaging instructions accurate and exclude private state. |
| [my-app/ops/lms-sync/portable-launch.ps1](../my-app/ops/lms-sync/portable-launch.ps1) | M | Open the local UI without automatic school login, synchronization or schedule activation. |
| [my-app/ops/lms-sync/prepare_build.py](../my-app/ops/lms-sync/prepare_build.py) | M | Detach generated standalone dependency junctions before Windows build cleanup. |
| [my-app/ops/lms-sync/PROFILE_WORKFLOW.md](../my-app/ops/lms-sync/PROFILE_WORKFLOW.md) | A | Document the actual PROFILE_WORKFLOW workflow, retention boundaries or verification scope. |
| [my-app/ops/lms-sync/README.md](../my-app/ops/lms-sync/README.md) | M | Document the actual README workflow, retention boundaries or verification scope. |
| [my-app/ops/lms-sync/requirements-ci.txt](../my-app/ops/lms-sync/requirements-ci.txt) | A | Pin Python CI dependency versions for reproducible worker regression checks. |
| [my-app/ops/lms-sync/school_profile.py](../my-app/ops/lms-sync/school_profile.py) | A | Resolve confirmed school scope, isolate sessions and generate explicit daily plans. |
| [my-app/ops/lms-sync/test_collect_slides.py](../my-app/ops/lms-sync/test_collect_slides.py) | A | Python regression coverage for collect_slides using isolated fixtures. |
| [my-app/ops/lms-sync/test_core.py](../my-app/ops/lms-sync/test_core.py) | M | Python regression coverage for core using isolated fixtures. |
| [my-app/ops/lms-sync/test_school_profile.py](../my-app/ops/lms-sync/test_school_profile.py) | A | Python regression coverage for school_profile using isolated fixtures. |
| [my-app/ops/lms-sync/test_ui_copy.py](../my-app/ops/lms-sync/test_ui_copy.py) | A | Python regression coverage for ui_copy using isolated fixtures. |
| [my-app/ops/lms-sync/ui_copy.py](../my-app/ops/lms-sync/ui_copy.py) | A | Default-English/optional-Chinese system export headings; preserve school/source text. |
| [my-app/ops/local-ai/check-catalog.mjs](../my-app/ops/local-ai/check-catalog.mjs) | A | Safely prepare generated Next standalone output without traversing dependency junctions. |
| [my-app/ops/local-ai/prepare-build.cjs](../my-app/ops/local-ai/prepare-build.cjs) | A | Safely prepare generated Next standalone output without traversing dependency junctions. |
| [my-app/pnpm-lock.yaml](../my-app/pnpm-lock.yaml) | M | Record the existing workspace scripts, exact dependency resolution or native runtime requirement. |
| [my-app/PROGRESS.md](../my-app/PROGRESS.md) | A | Document the actual PROGRESS workflow, retention boundaries or verification scope. |
| [README.md](../README.md) | M | English entry point for language, optional AI, school setup and current package building. |
| [README.zh-CN.md](../README.zh-CN.md) | M | Chinese usage guide matching the actual setup, language, retention and package behavior. |
| [runtime/licenses/LICENSE-BoringSSL-0.20260929.0.txt](../runtime/licenses/LICENSE-BoringSSL-0.20260929.0.txt) | A | Preserve the upstream attribution/license or required source notice for LICENSE-BoringSSL-0.20260929.0.txt. |
| [runtime/licenses/LICENSE-Cinzel-OFL.txt](../runtime/licenses/LICENSE-Cinzel-OFL.txt) | A | Preserve the upstream attribution/license or required source notice for LICENSE-Cinzel-OFL.txt. |
| [runtime/licenses/LICENSE-Inter-OFL.txt](../runtime/licenses/LICENSE-Inter-OFL.txt) | A | Preserve the upstream attribution/license or required source notice for LICENSE-Inter-OFL.txt. |
| [runtime/licenses/LICENSE-miniaudio.txt](../runtime/licenses/LICENSE-miniaudio.txt) | A | Preserve the upstream attribution/license or required source notice for LICENSE-miniaudio.txt. |
| [runtime/licenses/LICENSE-Node.js.txt](../runtime/licenses/LICENSE-Node.js.txt) | A | Preserve the upstream attribution/license or required source notice for LICENSE-Node.js.txt. |
| [runtime/licenses/LICENSE-Qwen-models.txt](../runtime/licenses/LICENSE-Qwen-models.txt) | A | Preserve the upstream attribution/license or required source notice for LICENSE-Qwen-models.txt. |
| [runtime/licenses/LICENSE-stb_image.txt](../runtime/licenses/LICENSE-stb_image.txt) | A | Preserve the upstream attribution/license or required source notice for LICENSE-stb_image.txt. |
| [runtime/licenses/licenses-LICENSE-jsonhpp](../runtime/licenses/licenses-LICENSE-jsonhpp) | A | Preserve the upstream attribution/license or required source notice for licenses-LICENSE-jsonhpp. |
| [runtime/licenses/tools-ui-src-lib-vendors-big-integer-LICENSE](../runtime/licenses/tools-ui-src-lib-vendors-big-integer-LICENSE) | A | Preserve the upstream attribution/license or required source notice for tools-ui-src-lib-vendors-big-integer-LICENSE. |
| [runtime/licenses/tools-ui-src-lib-vendors-nerdamer-prime-LICENSE](../runtime/licenses/tools-ui-src-lib-vendors-nerdamer-prime-LICENSE) | A | Preserve the upstream attribution/license or required source notice for tools-ui-src-lib-vendors-nerdamer-prime-LICENSE. |
| [runtime/licenses/vendor-cpp-httplib-LICENSE](../runtime/licenses/vendor-cpp-httplib-LICENSE) | A | Preserve the upstream attribution/license or required source notice for vendor-cpp-httplib-LICENSE. |
| [runtime/licenses/vendor-hash-rotate-bits-LICENSE.md](../runtime/licenses/vendor-hash-rotate-bits-LICENSE.md) | A | Preserve the upstream attribution/license or required source notice for vendor-hash-rotate-bits-LICENSE.md. |
| [runtime/licenses/vendor-hash-sha256-LICENSE](../runtime/licenses/vendor-hash-sha256-LICENSE) | A | Preserve the upstream attribution/license or required source notice for vendor-hash-sha256-LICENSE. |
| [runtime/licenses/vendor-hash-xxhash-LICENSE](../runtime/licenses/vendor-hash-xxhash-LICENSE) | A | Preserve the upstream attribution/license or required source notice for vendor-hash-xxhash-LICENSE. |
| [runtime/licenses/vendor-source-notices/miniaudio.h](../runtime/licenses/vendor-source-notices/miniaudio.h) | A | Preserve the upstream attribution/license or required source notice for miniaudio.h. |
| [runtime/licenses/vendor-source-notices/stb_image.h](../runtime/licenses/vendor-source-notices/stb_image.h) | A | Preserve the upstream attribution/license or required source notice for stb_image.h. |
| [runtime/llama/engine-host.cjs](../runtime/llama/engine-host.cjs) | A | Supervise the native engine and stop it when its owning app exits. |
| [runtime/llama/ggml-base.dll](../runtime/llama/ggml-base.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-base.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-alderlake.dll](../runtime/llama/ggml-cpu-alderlake.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-alderlake.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-cannonlake.dll](../runtime/llama/ggml-cpu-cannonlake.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-cannonlake.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-cascadelake.dll](../runtime/llama/ggml-cpu-cascadelake.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-cascadelake.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-cooperlake.dll](../runtime/llama/ggml-cpu-cooperlake.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-cooperlake.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-haswell.dll](../runtime/llama/ggml-cpu-haswell.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-haswell.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-icelake.dll](../runtime/llama/ggml-cpu-icelake.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-icelake.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-ivybridge.dll](../runtime/llama/ggml-cpu-ivybridge.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-ivybridge.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-piledriver.dll](../runtime/llama/ggml-cpu-piledriver.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-piledriver.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-sandybridge.dll](../runtime/llama/ggml-cpu-sandybridge.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-sandybridge.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-sapphirerapids.dll](../runtime/llama/ggml-cpu-sapphirerapids.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-sapphirerapids.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-skylakex.dll](../runtime/llama/ggml-cpu-skylakex.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-skylakex.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-sse42.dll](../runtime/llama/ggml-cpu-sse42.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-sse42.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-x64.dll](../runtime/llama/ggml-cpu-x64.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-x64.dll; package selection is documented. |
| [runtime/llama/ggml-cpu-zen4.dll](../runtime/llama/ggml-cpu-zen4.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-cpu-zen4.dll; package selection is documented. |
| [runtime/llama/ggml-rpc-server.exe](../runtime/llama/ggml-rpc-server.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-rpc-server.exe; package selection is documented. |
| [runtime/llama/ggml-rpc.dll](../runtime/llama/ggml-rpc.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml-rpc.dll; package selection is documented. |
| [runtime/llama/ggml.dll](../runtime/llama/ggml.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: ggml.dll; package selection is documented. |
| [runtime/llama/libomp.dll](../runtime/llama/libomp.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: libomp.dll; package selection is documented. |
| [runtime/llama/LICENSE-llama.cpp.txt](../runtime/llama/LICENSE-llama.cpp.txt) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: LICENSE-llama.cpp.txt; package selection is documented. |
| [runtime/llama/LICENSE-LLVM-OpenMP](../runtime/llama/LICENSE-LLVM-OpenMP) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: LICENSE-LLVM-OpenMP; package selection is documented. |
| [runtime/llama/llama-batched-bench-impl.dll](../runtime/llama/llama-batched-bench-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-batched-bench-impl.dll; package selection is documented. |
| [runtime/llama/llama-batched-bench.exe](../runtime/llama/llama-batched-bench.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-batched-bench.exe; package selection is documented. |
| [runtime/llama/llama-bench-impl.dll](../runtime/llama/llama-bench-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-bench-impl.dll; package selection is documented. |
| [runtime/llama/llama-bench.exe](../runtime/llama/llama-bench.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-bench.exe; package selection is documented. |
| [runtime/llama/llama-cli-impl.dll](../runtime/llama/llama-cli-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-cli-impl.dll; package selection is documented. |
| [runtime/llama/llama-cli.exe](../runtime/llama/llama-cli.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-cli.exe; package selection is documented. |
| [runtime/llama/llama-common.dll](../runtime/llama/llama-common.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-common.dll; package selection is documented. |
| [runtime/llama/llama-completion-impl.dll](../runtime/llama/llama-completion-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-completion-impl.dll; package selection is documented. |
| [runtime/llama/llama-completion.exe](../runtime/llama/llama-completion.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-completion.exe; package selection is documented. |
| [runtime/llama/llama-fit-params-impl.dll](../runtime/llama/llama-fit-params-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-fit-params-impl.dll; package selection is documented. |
| [runtime/llama/llama-fit-params.exe](../runtime/llama/llama-fit-params.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-fit-params.exe; package selection is documented. |
| [runtime/llama/llama-gemma3-cli.exe](../runtime/llama/llama-gemma3-cli.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-gemma3-cli.exe; package selection is documented. |
| [runtime/llama/llama-gguf-split.exe](../runtime/llama/llama-gguf-split.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-gguf-split.exe; package selection is documented. |
| [runtime/llama/llama-imatrix.exe](../runtime/llama/llama-imatrix.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-imatrix.exe; package selection is documented. |
| [runtime/llama/llama-llava-cli.exe](../runtime/llama/llama-llava-cli.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-llava-cli.exe; package selection is documented. |
| [runtime/llama/llama-minicpmv-cli.exe](../runtime/llama/llama-minicpmv-cli.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-minicpmv-cli.exe; package selection is documented. |
| [runtime/llama/llama-mtmd-cli.exe](../runtime/llama/llama-mtmd-cli.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-mtmd-cli.exe; package selection is documented. |
| [runtime/llama/llama-mtmd-debug.exe](../runtime/llama/llama-mtmd-debug.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-mtmd-debug.exe; package selection is documented. |
| [runtime/llama/llama-perplexity-impl.dll](../runtime/llama/llama-perplexity-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-perplexity-impl.dll; package selection is documented. |
| [runtime/llama/llama-perplexity.exe](../runtime/llama/llama-perplexity.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-perplexity.exe; package selection is documented. |
| [runtime/llama/llama-quantize-impl.dll](../runtime/llama/llama-quantize-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-quantize-impl.dll; package selection is documented. |
| [runtime/llama/llama-quantize.exe](../runtime/llama/llama-quantize.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-quantize.exe; package selection is documented. |
| [runtime/llama/llama-qwen2vl-cli.exe](../runtime/llama/llama-qwen2vl-cli.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-qwen2vl-cli.exe; package selection is documented. |
| [runtime/llama/llama-results.exe](../runtime/llama/llama-results.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-results.exe; package selection is documented. |
| [runtime/llama/llama-server-impl.dll](../runtime/llama/llama-server-impl.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-server-impl.dll; package selection is documented. |
| [runtime/llama/llama-server.exe](../runtime/llama/llama-server.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-server.exe; package selection is documented. |
| [runtime/llama/llama-tokenize.exe](../runtime/llama/llama-tokenize.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-tokenize.exe; package selection is documented. |
| [runtime/llama/llama-tts.exe](../runtime/llama/llama-tts.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama-tts.exe; package selection is documented. |
| [runtime/llama/llama.dll](../runtime/llama/llama.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama.dll; package selection is documented. |
| [runtime/llama/llama.exe](../runtime/llama/llama.exe) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: llama.exe; package selection is documented. |
| [runtime/llama/mtmd.dll](../runtime/llama/mtmd.dll) | A | Pinned official llama.cpp b11669 Windows CPU distribution member: mtmd.dll; package selection is documented. |
| [tools/audit-interface-copy.cjs](../tools/audit-interface-copy.cjs) | A | Audit catalog parity, required live parameters, visible literals and frozen module-time copy. |
| [tools/package-source.cjs](../tools/package-source.cjs) | A | Package source while excluding private state, build/dependency caches and model weights. |
| [tools/package-windows.cjs](../tools/package-windows.cjs) | A | Materialize a local Windows CPU package with licenses, no private state and no weights. |
| [tools/smoke-package.cjs](../tools/smoke-package.cjs) | A | Extract the exact ZIP and verify included runtime, English default, localized guards and restart persistence. |
