# School material recovery

- `my-app/ops/lms-sync/core.py`: normalize school access dates separately from submission facts; recognize Brightspace Media Library video URNs without enabling arbitrary external navigation.
- `brightspace.py`: skip submission queries during explicit access restrictions, preserve unknown state, and stream downloads through the owned session.
- `school_download.py`: bounded disk streaming, exact response length checks, atomic replacement, disk-space check, no credential redirects, and incomplete-transfer cleanup.
- `school_media.py`: follow only GET relations published by the school viewer; check tenant, topic, course and download permission. Keep ephemeral bearer credentials in memory, and send no school credentials to the signed media delivery URL. Retrieve supported caption tracks when provided.
- `course_content.py`: read large Office ZIPs from disk, select bounded document XML before counting embedded assets, and parse local caption sidecars. Videos without captions remain unsupported for text retrieval.
- `lms_sync.py`: validate separate Office/video limits and commit ledger records only after completed file writes.
- Web `lms-schema.ts`, `lms-sync.ts`, `course-context.ts`: carry access facts through ingestion, notifications and AI reference metadata without inventing submission states.
- Web `course-reader.ts`, `CourseReader.tsx`, `CoursesPanel.tsx`, associated CSS and both locales: opening dates, upcoming counts, local MP4 playback and an explicit no-transcript state, retaining the three-color submission bar.
- Web `lms-material-file.ts` and material route: verify the MP4 container header and serve scoped local video byte ranges; retain attachment-only handling for other non-PDF files.
- Connector recovery tests and reader tests: restricted-versus-submission-only access, media authorization boundaries, failed transfers preserving previous files, media-heavy large decks and stale opening dates.
- English/Chinese READMEs and getting-started guides: describe the supported behavior and actual limits.
- `tools/package-school-worker.cjs`: include the installed Python SSL runtime's companion certificate data when present. This fixes frozen HTTPS construction while preserving certificate verification.
- Web `layout.tsx` and `public/fonts`: use the app's existing Latin WOFF2 assets and accompanying OFL licenses locally, so clean CI/source builds do not depend on live Google Fonts responses. Keep the established font families and system CJK fallbacks.

Validation uses synthetic regression fixtures plus authorized local school tests. School files, account sessions, local model configuration, browser recordings and private diagnostic reports remain outside Git and distribution archives. A video download does not imply transcription, and access expiration remains controlled by the school.
