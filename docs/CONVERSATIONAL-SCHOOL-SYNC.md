# Conversational school connection and daily course refresh

Send a learning-site URL in Chat, or choose **Connect my school learning site**. Butler identifies the school before a user explicitly starts connection. The card opens Butler’s owned Edge sign-in session, discovers the latest semester and selected active courses, then downloads and extracts their materials. Microsoft sign-in and MFA remain user actions. Existing school sessions and course data are retained.

**Keep selected course files up to date daily** is opt-in and stored in SQLite. The portable launcher checks due plans every minute while running; an open source-mode page also ticks the same guarded route. The persisted due time and single worker prevent overlapping runs. Missed checks catch up on the next launch. Expired school sessions pause unattended collection until sign-in is revalidated. The schedule is not an always-on Windows service, does not submit school work and does not use cloud AI.

Supported authenticated connectors remain the exact TP/RP/SP Brightspace domains. Other school URLs do not gain arbitrary browsing, command execution or download access. User chat intent is parsed locally; a model response or school page cannot authorize a connection.

Files changed:

- `school-agent-intent.ts`, `types.ts`, `page.tsx`, `ChatCanvas.tsx`: user-requested, persistent connection cards before the AI quota gate; scheduled checks in source mode.
- `SchoolConnectionCard.tsx` and its CSS: visible scope, consent, owned sign-in, worker status and links to courses; responsive Retro styles.
- `learning-plan.ts`, `learning-sync.ts`, `lms-worker.ts`, LMS settings route: durable daily plans, expiry pause and manual revalidation, existing connector reuse.
- `SchoolSettings.tsx`, English/Chinese locales: controls, next-check time and pause/help copy in both languages.
- `learning-agent.test.mjs`, `lms-settings.integration.mjs`: intent/URL guards, consent, expiry and restart behavior, stored connection-card metadata.
- English and Chinese getting-started guides: conversational connection, daily refresh, resume/pause behavior and readable-text limits.

Validation on 23 October 2026:

- 79 Node regression tests passed; targeted intent/localization tests and isolated production HTTP integration passed again after the interrupted-job recovery change.
- Production build and type checks passed. Source portability audit found no machine-specific configuration.
- A live local-only walkthrough discovered six current-term courses, saved 47 files and extracted text from 37 materials. The course reader saved an actual PDF to the browser's local Downloads folder. The selected existing local service answered with clickable course sources, then proposed a note that was accepted and displayed in Notes.
- A second file refresh reused the saved school session without an interactive login. Daily refresh consent and the connection card remained after page navigation. Isolated HTTP tests verify server-restart persistence; pure plan tests verify expiry pause and interrupted-job retry.
- Desktop and 390px mobile layouts were inspected. Course overview, connection card and School settings fit the viewport without horizontal page overflow. Temporary viewport overrides were cleared.
- Partial results remain visible: 11 submission-status checks were unavailable to the school API, one PPT exceeded the configured 150 MB limit, and an external video was not downloaded. Empty instruction pages do not count as readable sources. These are not represented as successful reads.
- Captured UI footage, subtitles and final video remain outside Git, on the local computer. No model weights were downloaded and no paid provider or cloud OCR was used.
