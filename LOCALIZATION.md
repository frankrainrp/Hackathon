# Interface language and copy audit

English is the default for a fresh browser, missing preferences and invalid preferences. A deliberate saved Chinese choice remains valid. Select English or 中文 in AI setup or Preferences → Language. Switching updates the interface, page title, document language, known application errors and locale-aware dates. It does not rewrite saved course titles, school documents, notes or conversations.

Interface copy is in `my-app/apps/web/src/lib/locales/en.ts` and `zh.ts`. `messages.ts` supplies live parameters, formatting and request language; `i18n.ts` subscribes React components to the saved preference. API handlers translate application status/error fields without translating record payloads or schema keys. Generated AI labels follow the requested language, while names and quotations retain their original content. The local school worker defaults to English; its optional `language: "zh"` setting controls newly generated export headings and sync messages.

Model labels read the actual selected connection configuration. Hardware, context, disk, counts, progress and error details use their corresponding values. New custom panels contain no seeded data. Example courses and practice data are opt-in and labelled as fictional. The old random document pipeline and fabricated experiment result were removed; the extraction prompt leaves unavailable dates and data empty. Billing remains an explicitly labelled local demonstration and is separate from provider charges.

Run from the source root:

```powershell
node tools/audit-interface-copy.cjs
```

The audit checks both catalog key sets, parameter parity, literal key references, required live parameters, raw visible JSX/attributes, and client boundaries. It deliberately preserves protocol IDs, brands, URLs, input parser vocabulary, developer comments, tool schemas, quoted source content and user records. Source inspection also covered system messages, launcher copy, OCR metadata, AI output language and Python export headings. This is a source audit, not proof of browser layout or every possible third-party response.

Application tests (from `my-app/apps/web`):

```powershell
pnpm typecheck
node --test tests/localization.test.mjs tests/ai-local.test.mjs tests/course-context.test.mjs tests/lms-profile.test.mjs tests/lms-sync.test.mjs tests/lms-auth.test.mjs tests/lms-ai-scope.test.mjs
pnpm build
node tests/ai-http.integration.mjs
node tests/lms-settings.integration.mjs
```

Python tests (from `my-app/ops/lms-sync`, using an environment with the declared dependencies):

```powershell
python -m unittest test_ui_copy test_core test_course_content test_school_profile test_collect_slides
```

All integration credentials, provider responses and course records used for verification are synthetic and isolated. No real paid API, model-weight download, school login or scheduler activation is part of this verification. Browser automation at the authorized preview origin remains blocked by the desktop app's execution policy; desktop/mobile visual acceptance must not be reported as passed. Browser-native dialogs follow the operating system language; unknown provider errors and user-authored content are preserved.
