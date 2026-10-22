# Independent workflow audit · 22 October 2026

Three subagents received fresh contexts containing the task goals, paths and operation constraints, without the previous diagnosis or acceptance reports. Their roles covered browser access, runtime/distribution and the complete beginner journey. The parent reproduced actionable findings before fixing them. No model weights, paid requests or school sign-ins were used.

## Browser access evidence

The running loopback service returned HTTP 200, and all 23 referenced home-page assets were available. The exact previous ZIP also passed an independently extracted startup, native dependency, local mock-provider and persistence check. These observations do not demonstrate a successful rendered journey.

Normal Browser Use succeeded in a subagent's own thread context. The parent immediately stopped further subagent browser work and rechecked its own normal entry point; the parent still received the saved-permission/origin-gate denial before page observation. The difference narrows investigation toward thread-specific effective browser authority or integration state. It does not establish the exact cause, prove that all browser contexts are healthy, or authorize using the subagent as an alternate access path. The application cannot itself alter the parent tool's approval decision. No permission policy or client internals were changed.

## Reproduced software defects and changes

| Defect | Evidence before the fix | Resulting behavior |
| --- | --- | --- |
| School discovery stopped at settings | A real-shaped synthetic catalog confirmed one course, while the learning feed still contained zero courses, notes and tasks. The owned worker only ran `login/catalog`. | The workflow confirms the term, then runs metadata-only `inspect` for selected active courses. A private process token permits import without manual bridge setup. Cloud summaries are disabled for this operation. Cancellation, missing term, empty selection and import errors do not report a successful import. |
| Note drafts lost on fast navigation | An isolated harness transpiled the actual editor. Three of four checks failed when leaving before 500ms, switching notes or pinning then leaving. | Input updates parent state immediately. Network persistence is coalesced separately. The same four editor checks pass. |
| Server outage also prevented browser saving | All four persistence effects waited for HTTP success before updating IndexedDB. A synthetic 503 made local cache writes unreachable. | Cache and outbox are staged atomically before HTTP. Reopening overlays pending edits on server data. Serialized requests and revision-aware acknowledgement protect newer edits; failed requests retry and show status. Complete load failure cannot enable empty-state writes. |
| Private state API omitted the existing local-origin guard | A production HTTP fixture with a non-loopback Host returned 200 instead of the expected 403. | Both reads and writes use the same local Host/origin checks as AI routes; cross-site writes are rejected. |

## Validation and limits

The correction passes 55 Node regressions, 23 Python regressions, the production build, matched English/Chinese copy checks, isolated school/state HTTP tests and local-mock AI HTTP tests. The new school tests verify discovery→import ordering and the Python CLI's metadata-only/no-AI flags. They do not claim an authenticated real-school integration result. Browser IndexedDB upgrade and actual desktop/mobile input still need normal browser acceptance when parent access is restored; in-memory adapters and the editor hook harness are explicitly narrower evidence.

Runtime state can also explain unavailable AI: completing or skipping setup does not install a model or start an engine. The inspected installation had an empty selected model and stopped engine, so a synthetic chat request correctly failed on its configuration prerequisite. No model was installed to change this state.

The current package is local-only. Phone-sized viewport checks and a physical phone connecting over a LAN are different scopes; LAN access is not exposed. Five polytechnics are recognised, but reviewed login adapters cover exact TP/RP/SP Brightspace hosts. NP/NYP and arbitrary school homepage URLs do not yet provide a complete connection path. Clean-machine Microsoft runtime prerequisites and real model loading remain unverified in this audit.

Code review also identified keyboard/mobile items for rendered follow-up: clickable note rows, rail keyboard activation, focusability of the closed mobile drawer, and custom-panel access on mobile. These have not been presented as passed accessibility checks.

## User-assisted checks after updating

1. Create a disposable note, type a distinctive sentence, immediately switch to Courses and return; the sentence should remain. Repeat by selecting another note and by pinning first.
2. Reopen the workspace in the same browser and check the note remains. If a saving warning appears, use Retry and report the exact message.
3. School import needs the user's own SSO/MFA. Verify the confirmed term and course names before inspecting the imported learning records. This audit never performs that login.

The browser-authority discrepancy should be reviewed in the Codex client using the local reproduction report. The audit does not require broadening global browser permissions or activating cloud inference.
