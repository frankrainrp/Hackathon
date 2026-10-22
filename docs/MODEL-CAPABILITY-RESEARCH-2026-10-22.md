# 模型能力与设备推荐调研

核查日期：2026-10-22。范围：学习助手的中英解释、结构化提取与真实工具调用；仅调研总参数大于 8B 的候选。未下载权重、未运行付费推理、未登录学校。用户已确认：低配设备推荐 API；能运行更强模型的设备继续推荐本地模型；8B 及以下退出新推荐与下载清单。

## 结论

推荐顺序应为“产品任务能力通过 → 运行时兼容 → 实际可用资源与时延通过 → 对通过者排序”。参数量、下载大小、厂商宣传分、社区点赞，都不能单独决定推荐。当前有理由优先评测 Qwen3.8-27B 的复杂解释及工具任务，同时保留 Gemma 4 12B、26B-A4B 和 Qwen3.6-35B-A3B 的资源/交互取舍；证据不足以宣布每个设备档位已有确定冠军。

现有包的 `runtime/llama/engine-host.cjs` 明确传入 `--n-gpu-layers 0`，`tools/package-windows.cjs` 固定 b11669。因此“扫描到独显”不能变成“当前包已能用显卡”。上游同一版本分别提供 Windows CPU、CUDA、Vulkan 等资产，必须核对实际后端，不能把型号识别当成后端验证。[上游 b11669 发行页](https://github.com/ggml-org/llama.cpp/releases/tag/b11669)

## 候选与证据等级

下表是评测优先级，并非已经通过本产品验收的下载清单。MoE 的 A3B/A4B 是激活参数，不代表只需存储 3B/4B 权重。

| 候选 | 可核实的能力依据 | 本产品优先验证项与限制 |
| --- | --- | --- |
| Qwen3.8-27B | 官方：27B dense、原生 262,144 context、可控思考，强调 agent 与工具栈适配。[官方模型卡](https://huggingface.co/Qwen/Qwen3.8-27B) | 复杂中英解释、跨页依据整合、连续工具任务的质量候选。官方成绩属于厂商自评；须在实际量化、chat template、思考预算下复测。 |
| Qwen3.6-35B-A3B | 官方：总 35B、激活 3B、原生 262,144 context；工具服务示例配置专门 parser。官方建议复杂思考保持至少 128K context。[官方模型卡](https://huggingface.co/Qwen/Qwen3.6-35B-A3B) | MoE 吞吐取向候选。不能按 3B 估算驻留内存，也不能把压到 4K/8K 后能加载视为保持官方能力。需重点测长输入首字延迟。 |
| Gemma 4 12B Unified | 官方：11.95B、256K context，支持多语言与原生 function calling；统一多模态结构。[官方模型卡](https://huggingface.co/google/gemma-4-12B-it) | 大于 8B 的有限资源候选；重点测中文解释、课程/截止日抽取、缺失值处理。支持多模态不代表当前应用已经接通视觉链路。 |
| Gemma 4 26B-A4B | 官方：25.2B 总参数、3.8B 激活、256K context。[官方模型卡](https://huggingface.co/google/gemma-4-26B-A4B-it) | 中等资源的 MoE 交互候选，需与 12B/27B 比较真实完成时间与工具成功率；不能只比较 decode tokens/s。 |
| Gemma 4 31B | 官方支持 function calling、多语言与思考模式。[官方模型卡](https://huggingface.co/google/gemma-4-31B-it) | 作为中高资源对照模型；若相同资源下质量/速度均无优势，不应因参数更多默认置顶。 |

独立评估者 Artificial Analysis 的当前 **Intelligence Index v4.3.2** 页面给出：Qwen3.8-27B **xhigh 34**、Qwen3.6-35B-A3B **18**、Gemma 4 31B **15**。它们是综合基准与特定推理设置的结果，不能直接称为本产品学习任务分，也不能把云端 API 吞吐当作 Windows CPU 速度。[Qwen3.8 结果](https://artificialanalysis.ai/models/qwen3-8-27b)、[Qwen3.6 结果](https://artificialanalysis.ai/models/qwen3-6-35b-a3b/)、[Gemma 31B 结果](https://artificialanalysis.ai/models/gemma-4-31b)、[评估方法](https://artificialanalysis.ai/methodology/intelligence-benchmarking)

AA 的 Gemma 4 26B-A4B **17** 与 12B **14** 均带星号，页面明确是 **Estimated / independent evaluation forthcoming**。清单必须保留这个状态，不能混写成独立实测后再据此宣称档位最强。[26B-A4B 页面](https://artificialanalysis.ai/models/gemma-4-26b-a4b)、[12B 页面](https://artificialanalysis.ai/models/gemma-4-12b)

## 社区的一手体验告诉我们什么

LocalLLaMA 的 2026 年 8 月帖中，一名 M4 Pro 48GB 用户报告 Qwen3.8-27B 在 Claude Code 完成文件工具任务、同模型在 Codex 停滞；另一名用户报告 Qwen3.6-35B-A3B 的 128K 配置占用约 45GB、生成尚可但预填充等待明显。这是特定硬件和软件的一手自述，未控制变量；只能支持“工具适配与首字延迟必须实测”，不能变成 Windows CPU 的速度承诺或通用内存门槛。[原始社区讨论](https://www.reddit.com/r/LocalLLaMA/comments/1vkmhyl/best_local_llms_august_2026/)

同一模型的工具效果还受模板影响：本包对应的 llama.cpp b11669 文档区分 native 与 generic handler，generic 可能额外消耗 tokens，部分并行调用默认关闭。能聊天、能输出 JSON、能可靠完成工具协议是三个不同的验收项。[固定版本 function-calling 文档](https://raw.githubusercontent.com/ggml-org/llama.cpp/b11669/docs/function-calling.md)

## 清单维护与准入方案

以下是建议的工程验收规则，尚未代表模型已经通过测试。

1. **版本化证据。** 每条记录保存原始模型 ID/revision、量化来源与 SHA256、许可证、实际字节数、架构、chat template/parser、后端版本、原生/验证 context、核查日期。分开标记 `vendor`、`independent-measured`、`estimated`、`community-anecdote` 与 `product-tested`。失效或仅有传闻的记录进入候选区，不能静默晋升为推荐。
2. **先过任务能力。** 同一套去身份化材料覆盖中英讲解、日期/时区/课程列表提取、缺失信息拒绝编造、源文依据、真实多轮工具往返。预设严格 schema 与工具协议通过条件，分别记录事实正确率、字段召回、工具完成率；有 schema 不等于内容正确。可借鉴 ExtractBench 的“字段值 + 来源证据 + 缺失值”评法，但该企业文档数据集不能替代本产品课程样本。[ExtractBench 作者数据集与评法](https://huggingface.co/datasets/llamaindex/ExtractBench)
3. **再验运行时。** 固定权重与当前启动参数，验证加载、思考内容解析、工具名/参数/结果回传、流式响应、取消与超时。CPU 后端只使用可用系统内存预算；GPU 后端先实际验证驱动、架构、显存与 offload，再使用显存预算。混合内存与统一内存应分别建模。
4. **最后过滤资源。** 预算包括实际量化权重、KV/状态缓存、计算缓冲、系统及应用余量；磁盘需留下载临时文件与最终文件空间。记录冷启动、短/长 prompt 首字延迟、完整任务 p50/p95、峰值内存及是否发生 swap。仅总 RAM 或“模型文件能放下”不足以判定可用。
5. **Context 随模型与任务。** 区分模型原生上限、运行时验证上限、任务最低需求和当前设备安全上限。自动值取满足任务需求的可用档位，超出时分段/检索或解释限制；若降 context 会破坏已验证任务能力，应判为该设备未通过，不能强行缩小后继续标“最佳”。
6. **推荐的呈现。** 扫描完成即显示通过者中的首选及理由，用户可选同样通过准入的较低资源候选。暂无通过者时明确“尚无合格本地推荐”，引导用户查看 API 方案；不回退到已排除的 ≤8B 模型，也不自动下载或发起付费测试。按用户确认保留高配本地入口；推荐 API 只展示配置入口，不会自动切换提供方或发起收费请求。

## 暂定设备档位的验证队列

| 实际可用运行环境 | 优先验证队列 | 现在可以承诺的结果 |
| --- | --- | --- |
| 当前 Windows CPU 包 | 先评 Gemma 4 12B 的任务质量与完整时延；较大 MoE 只有在余量、上下文和时延均通过后加入 | 当前未下载权重，没有实测合格者；不能仅凭 RAM 承诺“最佳本地模型” |
| 已验证 GPU 后端，资源中等 | Gemma 4 12B / 26B-A4B，按实际量化与 context 测试 | 不硬编码“16GB 一定能跑”；系统 RAM 与独立 VRAM 分开计算 |
| 已验证 GPU/统一内存后端，资源充足 | Qwen3.8-27B 质量候选；Qwen3.6-35B-A3B 及 Gemma 4 26B-A4B 做速度对照；Gemma 4 31B 做质量对照 | 先比相同任务和思考预算，再给首选；保留经过验证的较低资源选项 |

本次落地提供明确标记为 public-evidence 的来源型推荐，而非 product-tested 认证。没有权重和本机实测数据时，必须显示性能及工具适配仍待本机确认；不得宣称已认证或绝对最强。用户主动下载后再测试连接与样例。

## 已落实的产品策略

- 新清单：Gemma 4 12B 官方 QAT Q4_0（资源较少的候选）、Qwen3.8-27B Unsloth UD Q4_K_M（讲解与工具任务质量优先）、Qwen3.6-35B-A3B Unsloth UD Q4_K_M（MoE 备选）。27B 优先级高于 35B，排序不取文件大小或参数量。其他研究候选仍保留在研究表中，不自动进入下载列表。
- 量化仓库、不可变 revision、字节数和 SHA256 固定在 ai-catalog.ts；Unsloth 量化明确标为社区量化。仅核查了仓库元数据，没有下载权重。
- 当前 CPU 后端使用系统空闲 RAM，预留 max(1 GiB, 8% total RAM)；至少四个可用线程是本包的保守交互准入规则，不是社区测得的性能阈值。已有完整或部分模型字节会从下载空间预算扣除。
- Gemma 的全注意力与 1024-token 滑动窗口分开估算；Qwen 混合架构只对全注意力层计算随 context 增长的 KV，状态与计算缓冲包括在保守基线中。所有内存数字仍为估算。
- Context 底线分别为 8K、16K、128K，自动目标分别为 16K、32K、128K；内存不足时只在各自任务底线以上选择，无法满足则推荐 API。手动上限不超过模型原生 256K。
- 旧 0.6B/4B/8B/14B/32B 元数据仅用于历史设置和下载日志兼容，不进入新推荐/下载列表，不删除用户模型文件。

核查的量化来源：[Gemma 4 12B](https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-gguf)、[Qwen3.8 27B](https://huggingface.co/unsloth/Qwen3.8-27B-GGUF)、[Qwen3.6 35B-A3B](https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF)。架构来源为各官方 config.json；固定引擎架构映射见 [b11669 llama-arch.cpp](https://raw.githubusercontent.com/ggml-org/llama.cpp/b11669/src/llama-arch.cpp)。架构名称存在不等于已完成这些权重的实际推理验收。
