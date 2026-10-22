# 用 Butler 完成第一次课程问答

[English guide](GETTING-STARTED.md)

## 1. 启动软件

将 ZIP **完整解压**到可写文件夹，双击 `Start-Hackathon.cmd`，保持控制台开启。在浏览器中打开控制台打印的网址，默认是 `http://127.0.0.1:3000`；设置过 `PORT` 时以实际地址为准。启动器不会自动打开浏览器，也不需要另装 Node。Ctrl+C 停止 Butler 和由它管理的推理引擎。

界面默认英文，在 AI 设置或 **Settings → Language** 中选择中文。你自己的课程、笔记和历史对话保持原文。下文使用英文按钮名称，方便对照默认界面。

## 2. 接入已有模型，也可以跳过

AI 设置分为 **Choose → Prepare → Test → Use**。选择 **Skip for now** 后，仍可使用任务、笔记和学校同步。之后从 **Settings → AI connection → Open AI setup** 或 `/ai-setup` 返回。

已经有本地模型服务时，无需下载其他模型：

1. **Choose：**选择 **Local on this computer**。
2. **Prepare：**选择 **I already run Ollama or an OpenAI-compatible local service**，填写已有服务的本机回环 `/v1` 地址，点击 **Find installed models**，选择真实模型。保持该服务运行；Butler 不管理它的启动和停止。
3. 进入 **Test**，点击 **Test connection**，检查连接及可用模型。
4. 如需测试实际生成，勾选 **Send one sample request to my selected provider**，再点击 **Send example: “Explain a study plan”**。成功只代表可以生成文本，不代表已经读取课程或证明推理准确。此次无需开启云端 OCR。
5. 进入 **Use**，点击 **Start using Butler**。

其他可选路径：

- **内置 Windows CPU 引擎：**自动检测设备，根据能力依据和可用内存、磁盘推荐模型。新推荐不包含 8B 及以下模型；没有符合条件的模型时推荐 API。默认模型目录随当前账户计算（`%LOCALAPPDATA%/Butler/models`），也支持 `BUTLER_MODELS_DIR` 或自选目录。Context 根据模型和空闲内存计算。只有你明确确认体积、许可并点击 **Download selected model** 才下载，随后点击 **Start engine**。重启后需要再次启动引擎。检测到显卡不代表此 CPU 包会使用显卡。
- **DeepSeek API：**自行在官方平台获取密钥并了解费用，点击 **Save protected key** 后使用当前 Windows 账户的 DPAPI 保护。发送示例和问题可能收费。软件不会代你注册、充值或付款。

本地模式不会自动回退到云端。即使设备推荐 API，也可以继续接入你已有的本地服务。

## 3. 在 Settings 中连接学校

打开 **Settings → Connect your Singapore polytechnic**。Courses 空页面或右上角的 **School settings** 也通向这里。

1. 在 **School learning URL** 粘贴学校的直接学习网址，点击 **Recognise and save school**。不用填写学校名称、平台、学期或课程 ID。
2. 点击 **Sign in and find courses**，在独立 Edge 窗口自行完成 SSO/MFA。若出现“保持登录”，可选择“是”。运行包自带连接器，不需要另装 Python。
3. 软件根据学校证据选择最新可访问学期并列出课程。首次发现默认选中该学期全部课程，之后刷新保留你的选择和课程状态；无法确认学期时显示待识别，不猜测。
4. 登录或 **Refresh semester and learning records** 会导入已选在读课程的学习记录。需要 AI 阅读课程资料时，再明确点击 **Download selected course files**，将文件保存并解析到本机。
5. 等待完成或错误提示。保存、登录、刷新和下载都不会启用每日计划，也不请求云端 AI 摘要。

学校连接、课程选择、同步历史和记录导出都在 **Settings**。**Courses** 只显示已识别的学校、学期和最新学期全部已发现课程；尚未下载的课程也列出来并说明状态。历史导入记录可用历史筛选查看。已有的手动取消选择会保留，不影响课程出现在总览中。

网址识别涵盖新加坡五所 polytechnic。当前可登录的明确 Brightspace 域名为 TP/RP/SP 的 `tplms.polite.edu.sg`、`rplms.polite.edu.sg`、`splms.polite.edu.sg`；其他可识别学校的入口可保存，但适配前无法连接。共用 POLITEMall 地址本身无法确定学校。

软件加密保存自己的学校会话，未过期时跨运行复用。普通 Edge 标签页使用另一份会话。Microsoft 或学校策略仍可能要求重新登录；软件不修改到期时间，也不保存密码。

## 4. 询问真实课程资料

打开 **Courses**，展开已下载课程，查看资料列表。**Archived locally** 表示文件已保存；可读文本数量表示 AI 是否提取到正文。扫描件和图片 ZIP 可以保存成功但没有文本。

点击 **Ask course AI**，例如问：“解释这一课，并说明使用了哪些来源。”核对回答中的资料名称和学校链接。仅发现、尚未导入记录的课程会引导到学校设置，不会编造进度或资料。

课次勾选只记录学习进度，不会提交学校作业。学校截止时间和提交状态来自 Brightspace，缺少信息时保留未知；Quiz、论坛及校外 LTI 提交状态尚未覆盖。

## 常见问题

| 现象 | 处理方法 |
| --- | --- |
| 本地网址打不开 | 保持启动器控制台开启，使用它打印的实际地址，先检查启动错误。 |
| 端口被占用 | 关闭另一个 Butler 控制台或换 `PORT`。启动器不会终止无关进程。 |
| 模型连接失败 | 检查已有服务是否运行、本机 `/v1` 地址是否正确、是否选中真实模型。冷启动模型可能需要加载时间。 |
| 学校要求登录 | 再点 **Sign in and find courses**；已有记录和文件仍保留。 |
| 下载后本地交付失败 | 保持 Butler 运行并重试；不一定是学校会话过期。 |
| 学期待识别或没有课程 | 核对学校直接网址和登录结果，再刷新；软件需要真实学期证据。 |
| 有课程但无可读资料 | 在学校设置下载文件；图片或扫描件需要独立 OCR。 |
| 模型下载中断 | 选择同一模型和目录，明确确认后点 **Resume**，使用前会校验。 |
| 内存或磁盘不足 | 关闭其他程序、选择符合条件的低资源模型/context 或已有服务；清理磁盘或换本机目录。 |
| 引擎缺 DLL | 从 [Microsoft](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) 安装 Visual C++ v14 x64 运行库，或使用已有服务。包内不分发 Microsoft 运行库，也不自动安装驱动。 |
| 工作区保存警告 | 保持同一浏览器和配置文件，点击 Retry。编辑先进入本机重试队列；两个存储都失败时先不要离开。 |
| API 密钥、余额或限流错误 | 自行检查服务商账户，或切回本地；软件不会购买额度。 |

## 保留已有数据

`data/butler.sqlite` 保存工作区和学校收件箱；`data/ai/` 保存模型设置、受保护密钥与下载日志；`data/lms/` 保存学校档案、加密会话和课程文件。模型在所选模型目录，浏览器待保存编辑与当前浏览器、配置文件和来源地址相关。升级前先停止软件并备份，不能用新包的空数据替换旧目录。学校设置可导出不含登录凭据的学习记录。密钥和会话密文属于原 Windows 账户，复制到另一个账户不代表可继续使用。

云端 OCR 独立于文本模型，默认不开启；需要另配 Mistral 密钥并会上传选中的扫描文件。此包没有离线 OCR 适配器。可选浏览器语义模型资源首次使用可能需要下载。

此包针对 Windows x64 CPU，包含固定 llama.cpp 引擎和 Node，不包含模型权重、私人数据、浏览器或 Microsoft 系统运行库。没有验证全新 Windows 安装。许可见 `THIRD-PARTY-NOTICES.md`、`licenses/` 和 `PACKAGE-MANIFEST.json`。启动和打包脚本不会上传或发布资料。
