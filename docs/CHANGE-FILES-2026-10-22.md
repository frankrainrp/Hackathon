# Changes by file · 22 October 2026

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
