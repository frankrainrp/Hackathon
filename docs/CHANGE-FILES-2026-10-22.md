# Changes by file · 22 October 2026

## Live RP catalog follow-up

| File | Fix and verification |
| --- | --- |
| `my-app/apps/web/src/lib/lms-discovery.ts` | Recognise RP's structured `YYS1`/`YYS2` enrollment-code prefix (for example `26S2-C304`), retain the source term label, and rank its year/semester without optional offering metadata. Official semester metadata remains preferred. |
| `my-app/apps/web/src/lib/lms-discovery-ai.ts` | Skip local-model label extraction when the catalog already contains structured semester evidence. |
| `my-app/apps/web/tests/lms-discovery.test.mjs` | Reproduce missing term discovery from RP-shaped enrollment records; verify ordering, exact current membership, malformed codes, S3 rejection, official-metadata priority and no model request for a structured code. |
| `docs/CHANGE-FILES-2026-10-22.md` | Record the live-catalog parsing defect and per-file correction. |

The real authenticated RP catalog returned 30 enrollments with `25S1`, `25S2`, `26S1` and `26S2` codes and no optional semester/date fields. A fresh backend process successfully reused the encrypted login. The new term regression failed before the fix; all 57 Node regressions and the production build pass afterward. Real course downloads and model responses are recorded only in the local acceptance report, outside source and fresh packages.

## Session reuse and explicit course-file download follow-up

| File | Fix and verification |
| --- | --- |
| `my-app/ops/lms-sync/lms_sync.py` | Restore the encrypted session on repeat login, include IndexedDB, save rotated state before catalog returns, and compare expiry snapshots with the newer login timestamp. |
| `my-app/ops/lms-sync/school_profile.py` | Add encrypted session `savedAt` metadata while retaining school/profile isolation. |
| `my-app/ops/lms-sync/test_session_reuse.py` | Three regressions fail on the old worker and pass after the fix: repeat-login restoration, catalog rotation followed by a second process, and stale expiry after login. |
| `my-app/ops/lms-sync/requirements.txt` | Require Playwright 1.51+ for IndexedDB storage snapshots; the existing pinned runtime remains 1.64.0. |
| `my-app/ops/lms-sync/PROFILE_WORKFLOW.md` | Explain encrypted SSO retention, ordinary Edge isolation, explicit file download and Microsoft policy limits. |
| `my-app/apps/web/src/lib/school-workflow.ts` | Add explicit file sync after authenticated catalog, verified semester and selected-course checks; normal refresh remains metadata only. |
| `my-app/apps/web/src/lib/lms-worker.ts` | Launch the real `sync` command for file jobs with the server-owned bridge token and cloud brief disabled. |
| `my-app/apps/web/src/app/api/lms/settings/route.ts` | Accept the local, origin-checked `sync` action. |
| `my-app/apps/web/src/components/SchoolSettings.tsx` | Offer Download selected course files, disabled without a confirmed semester and active selection. |
| `my-app/apps/web/src/lib/locales/en.ts`, `zh.ts` | Matching download progress/completion and accurate session-retention instructions. |
| `my-app/apps/web/tests/school-workflow.test.mjs` | Prove explicit download calls sync rather than metadata-only inspect and propagates failures. |

Validation at this stage: 56 Node tests, 26 Python tests and production Next build pass. These regression results are separate from the live C304 backend/SSO acceptance evidence kept locally; no private course material, model output, session or credential is included in source or runtime archives.

New model onboarding scans the device automatically, ranks curated models by dated capability evidence, and recommends API when no eligible model above 8B fits. Paths are derived at runtime. School setup accepts one URL and discovers real courses and the latest accessible term after explicit login. Existing data and model files are preserved.


| File | Responsibility |
| --- | --- |
| `.gitignore` | 排除本机生成的冻结连接器与构建缓存。 |
| `distribution/GETTING-STARTED.md` | 记录能力推荐、默认目录、动态 context 与仅 URL 学校接入路径及实际限制。 |
| `distribution/Launch.cjs` | 向应用传递实际回环端口、数据目录和冻结学校连接器位置。 |
| `distribution/THIRD-PARTY-NOTICES.md` | 补充 Google／Unsloth 模型来源、冻结 Python 连接器依赖与许可证位置。 |
| `docs/CHANGE-FILES-2026-10-22.md` | 按文件记录本次问题、职责、验证与未执行的真实操作。 |
| `docs/MODEL-CAPABILITY-RESEARCH-2026-10-22.md` | 社区、独立评测、官方规格的分级证据和已确认的低配 API／高配本地策略。 |
| `my-app/apps/web/.env.local.example` | 提供可选的本机模型目录和源码连接器 Python 配置，不包含真实凭据。 |
| `my-app/apps/web/src/app/api/ai/setup/route.ts` | 返回当前路径与设备信息、执行来源型推荐和自动 context、切换目录时停止旧引擎。 |
| `my-app/apps/web/src/app/api/lms/ingest/route.ts` | 拒绝向尚未确认真实学期的待识别档案导入学校快照。 |
| `my-app/apps/web/src/app/api/lms/settings/route.ts` | 支持仅 URL 识别建档，以及用户主动登录、课程获取、取消与任务状态。 |
| `my-app/apps/web/src/components/AiSetup.module.css` | 让长模型目录和模型依据文本在窄视口内换行。 |
| `my-app/apps/web/src/components/AiSetup.tsx` | 进入配置即检测设备，展示 API／本地推荐、可选低资源档位、依据和动态 context。 |
| `my-app/apps/web/src/components/CoursesPanel.module.css` | 学校网址与识别结果的层级、焦点、窄屏输入字号及换行。 |
| `my-app/apps/web/src/components/SchoolSettings.tsx` | 删除手填学校、平台、学期、课程 ID／名称、时间及时区，改为 URL 与自动发现流程。 |
| `my-app/apps/web/src/lib/ai-catalog.ts` | 维护三条大于 8B 的固定量化清单；能力优先级与硬件准入分离，低配推荐 API。 |
| `my-app/apps/web/src/lib/ai-config.ts` | 持久化自动／自定义目录和自动／手动 context；保留旧权重目录并验证模型上限。 |
| `my-app/apps/web/src/lib/ai-context.ts` | 按各模型全注意力／滑窗 KV、基线缓冲、任务下限和空闲内存计算 context。 |
| `my-app/apps/web/src/lib/ai-download.ts` | 禁止旧清单的新下载；读历史日志不重新创建旧机器目录；保留受控续传。 |
| `my-app/apps/web/src/lib/ai-engine.ts` | 引擎启动采用同一套模型缓存与系统预留内存规则。 |
| `my-app/apps/web/src/lib/ai-hardware.ts` | 快速读取 CPU／RAM／磁盘和已有模型字节，可选检测 GPU，避免初始推荐被慢探测阻塞。 |
| `my-app/apps/web/src/lib/ai-legacy-catalog.ts` | 仅保留旧配置和中断日志所需的元数据，不进入新推荐／下载列表。 |
| `my-app/apps/web/src/lib/ai-paths.ts` | 默认模型目录在运行时根据当前账户或明确环境配置计算，避免固化构建机器路径。 |
| `my-app/apps/web/src/lib/ai-provider.ts` | 旧服务缺少真实模型名时提示配置，不再冒用固定的小模型名。 |
| `my-app/apps/web/src/lib/lms-discovery-ai.ts` | 仅用已选择的本机 AI 辅助非标准学期文本，并校验原文标签及真实课程 ID；不调用云模型。 |
| `my-app/apps/web/src/lib/lms-discovery.ts` | 识别新加坡 poly URL，按学校学期及开始时间选最新可访问学期，保留历史和课程状态。 |
| `my-app/apps/web/src/lib/lms-profile-store.ts` | 新自动档案不重复存储平台；读取时推导，保存时使用实际应用端口并保留备份。 |
| `my-app/apps/web/src/lib/lms-profile.ts` | 允许待发现学期，保留原档案／学期验证与精确 TP／RP／SP 连接策略。 |
| `my-app/apps/web/src/lib/lms-worker.ts` | 启动固定学校连接器命令、跟踪任务、取消自有进程，并在写回前复查档案范围。 |
| `my-app/apps/web/src/lib/locales/en.ts` | 为所有新增状态、动态参数、模型依据和学校流程补齐英文文案。 |
| `my-app/apps/web/src/lib/locales/zh.ts` | 与英文保持键及变量契约一致的可选中文文案。 |
| `my-app/apps/web/src/lib/server-db.ts` | 新源码安装使用可写数据目录；已有旧数据库优先保留，明确环境路径继续生效。 |
| `my-app/apps/web/tests/ai-adaptive.test.mjs` | 覆盖路径迁移、来源型排序胜过参数量、低配 API、低资源可选与模型级 context。 |
| `my-app/apps/web/tests/ai-http.integration.mjs` | 验证新接口不暴露 ≤8B 推荐、不允许旧模型新下载，并保留模拟提供方整链路。 |
| `my-app/apps/web/tests/ai-local.test.mjs` | 更新新推荐断言，保留旧模型历史配置、DPAPI、受控传输与桥接回归。 |
| `my-app/apps/web/tests/ai-native.integration.mjs` | 以未训练的微型 GGUF 验证实际引擎生命周期，并只还原测试修改的字节数与校验值。 |
| `my-app/apps/web/tests/lms-discovery.test.mjs` | 验证 URL 识别、学期排序、课程状态保留、平台派生和本机 AI 证据校验。 |
| `my-app/apps/web/tests/lms-settings.integration.mjs` | 生产 HTTP 测试仅 URL 建档与真实元数据结构的课程／学期发现。 |
| `my-app/ops/lms-sync/PROFILE_WORKFLOW.md` | 标明现行 URL-only 流程与历史 CLI 档案参考的区别。 |
| `my-app/ops/lms-sync/README.md` | 说明新流程、冻结连接器和已审核学校范围。 |
| `my-app/ops/lms-sync/brightspace.py` | 只读获取选课 ID／名称、可访问状态、开始结束时间和官方学期元数据。 |
| `my-app/ops/lms-sync/lms_sync.py` | 允许待识别档案先登录／获取 catalog；移除桥接配置时猜测模型的旧行为。 |
| `my-app/ops/lms-sync/school_profile.py` | 平台由已审核 URL 推导；待识别学期可登录但不能同步课程资料。 |
| `my-app/ops/lms-sync/test_discovery.py` | 合成选课 API 响应验证学期信息保留及待识别档案限制。 |
| `runtime/llama/engine-host.cjs` | 固定 F16 K／V 缓存参数，与内存估算保持一致。 |
| `tools/package-school-worker.cjs` | 冻结已安装的连接器依赖，保留许可证，排除 Microsoft 系统运行库并检查可执行文件。 |
| `tools/package-source.cjs` | 源码归档排除冻结产物、构建缓存和私有数据。 |
| `tools/package-windows.cjs` | 把冻结学校连接器及依赖许可证收入运行包，不包含浏览器或模型权重。 |
| `tools/smoke-package.cjs` | 解压最终 ZIP 验证连接器、推荐清单、回环服务、模拟推理及 SQLite 重启。 |

Validation: 41 Node regressions, 22 Python tests, production Next build, selected-provider HTTP tests, URL-only school HTTP tests, real native-engine lifecycle with a synthetic 115 KiB untrained GGUF, and synthetic interrupted-transfer restart. Exact ZIP checks are recorded in the local acceptance report after packaging. No large weights, live paid inference, school sign-in or scheduler activation were performed. Browser inspection remains blocked by the saved browser origin permission, so desktop/mobile visual acceptance is not claimed.

## Responsive follow-up

| File | Fix and verification |
| --- | --- |
| `my-app/apps/web/src/components/CoursesPanel.module.css` | Move the mobile school-input font rule after the base `font: inherit` declaration so it actually resolves to 16px on phones. |
| `my-app/apps/web/src/components/AiSetup.module.css` | Match the desktop choice-card selector specificity in the mobile override so the intended compact height, padding and gap apply. |
| `docs/CHANGE-FILES-2026-10-22.md` | Record these two cascade regressions and distinguish stylesheet checks from browser acceptance. |

PostCSS analysis reproduces both failures in the previous commit and verifies the corrected rules at 320, 390, 768 and 1440px. School inputs now resolve to 16px through 768px; AI choice cards use content height through 760px and retain their desktop minimum height above that breakpoint. The production build passes. These are source-level cascade checks; rendered desktop/mobile beginner-path acceptance remains pending because Browser Use rejects the origin despite its saved allow settings. No browser permission was expanded or bypassed.

## Independent workflow audit follow-up

| File | Change |
| --- | --- |
| `distribution/GETTING-STARTED.md` | Explain cache-first saving, retry and the completed metadata-import path. |
| `docs/INDEPENDENT-JOURNEY-AUDIT-2026-10-22.md` | Record three fresh-context audits, reproduced issues, corrections, validation limits and user-assisted checks. |
| `my-app/apps/web/src/app/api/state/route.ts` | Enforce local Host/origin checks for private state reads and writes. |
| `my-app/apps/web/src/app/page.tsx` | Use the durable workspace queue, show saving/retry failures and block empty writes after a complete hydration failure. |
| `my-app/apps/web/src/components/NotesPanel.tsx` | Commit text drafts to parent state immediately before navigation can unmount them. |
| `my-app/apps/web/src/lib/db.ts` | Add an outbox table without removing existing IndexedDB stores. |
| `my-app/apps/web/src/lib/state-sync.ts` | Stage edits before HTTP, coalesce and serialize writes, overlay pending data during load and acknowledge only the matching revision. |
| `my-app/apps/web/src/lib/workspace-state.ts` | Adapt the queue to atomic Dexie cache/outbox transactions. |
| `my-app/apps/web/src/lib/server-state.ts` | Bound load/save requests so a hung connection cannot indefinitely stall retries. |
| `my-app/apps/web/src/lib/school-workflow.ts` | Join confirmed catalog discovery to metadata import with cancellation and empty-selection checks. |
| `my-app/apps/web/src/lib/lms-worker.ts` | Run the owned metadata worker with no-AI flags and its private process credential. |
| `my-app/apps/web/src/lib/lms-auth.ts` | Authenticate owned workers while retaining configured CLI tokens; compare token bytes safely. |
| `my-app/apps/web/src/lib/locales/en.ts`, `my-app/apps/web/src/lib/locales/zh.ts` | Match saving, failure, retry and school-import copy and variables. |
| `my-app/apps/web/tests/notes-editor.test.mjs` | Exercise the actual editor with isolated hook/timer navigation and pinning cases. |
| `my-app/apps/web/tests/state-sync.test.mjs` | Cover outages, reopening, coalescing, stale requests, cache failure and hydration/reconnect ordering. |
| `my-app/apps/web/tests/school-workflow.test.mjs` | Cover discovery/import order, cancellation, missing term, empty selection and import failure. |
| `my-app/apps/web/tests/lms-auth.test.mjs` | Validate the owned worker credential and malformed token handling. |
| `my-app/apps/web/tests/lms-settings.integration.mjs` | Reproduce and verify non-loopback state reads and cross-site write rejection. |
| `my-app/ops/lms-sync/lms_sync.py` | Add the explicit no-AI-brief flag used by metadata imports. |
| `my-app/ops/lms-sync/test_discovery.py` | Verify the real CLI passes metadata-only and no-cloud-summary configuration to the worker. |

Validation: 55 Node and 23 Python checks pass, with production build, copy audit and isolated HTTP contracts. The frozen worker is rebuilt for the changed CLI. Exact package checks and preserved-data live restart are recorded locally after packaging. Parent-thread rendered browser acceptance remains blocked and is not claimed.
