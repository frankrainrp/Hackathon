# 用 Butler 完成第一次课程问答

[English guide](GETTING-STARTED.md)

## 1. 启动软件

将 ZIP **完整解压**到可写文件夹，双击 **Butler.exe**，保持控制台开启。服务准备好后自动打开 Microsoft Edge，无需另装 Node。默认网址是 `http://127.0.0.1:3000`；设置过 `PORT` 时以控制台打印的实际地址为准。EXE 必须和随附文件夹放在一起，它是便携启动程序，不是单文件安装器。`Start-Hackathon.cmd` 保留为手工打开浏览器的备用入口。Ctrl+C 停止 Butler 和由它管理的推理引擎。

新浏览器默认使用 Retro，已有主题选择保留，可在 Settings 切换。壁纸由你自己提供本地图片。新工作区不会导入示例课程、任务或对话。

界面默认英文，在 AI 设置或 **Settings → Language** 中选择中文。你自己的课程、笔记和历史对话保持原文。下文使用英文按钮名称，方便对照默认界面。

尚未开放的作业显示学校公布的开放时间，不再报成提交状态故障。大型幻灯片下载后可直接读取提取文字；支持下载的学校媒体库视频可在本机播放。学校未提供字幕的视频会明确提示 AI 暂时无法读取其语音内容。

## 2. 接入已有模型，也可以跳过

AI 设置分为 **Choose → Prepare → Test → Use**。选择 **Skip for now** 后，仍可使用任务、笔记和学校同步。之后从 **Settings → AI connection → Open AI setup** 或 `/ai-setup` 返回。

已经有本地模型服务时，无需下载其他模型：

1. **Choose：**选择 **Local on this computer**。
2. **Prepare：**选择 **I already run Ollama or an OpenAI-compatible local service**，填写已有服务的本机回环 `/v1` 地址，点击 **Find installed models**，选择真实模型。服务只返回一个模型 ID 且尚未选择时自动保存；多个模型需选择，已有选择不被替换。保持该服务运行；Butler 不管理它的启动和停止。
3. 进入 **Test**，点击 **Test connection**，检查连接及可用模型。
4. 如需测试实际生成，勾选 **Send one sample request to my selected provider**，再点击 **Send example: “Explain a study plan”**。成功只代表可以生成文本，不代表已经读取课程或证明推理准确。此次无需开启云端 OCR。
5. 进入 **Use**，点击 **Start using Butler**。

其他可选路径：

- **内置 Windows CPU 引擎：**自动检测设备，根据能力依据和可用内存、磁盘推荐模型。新推荐不包含 8B 及以下模型；没有符合条件的模型时推荐 API。默认模型目录随当前账户计算（`%LOCALAPPDATA%/Butler/models`），也支持 `BUTLER_MODELS_DIR` 或自选目录。Context 根据模型和空闲内存计算。只有你明确确认体积、许可并点击 **Download selected model** 才下载，随后点击 **Start engine**。重启后需要再次启动引擎。检测到显卡不代表此 CPU 包会使用显卡。
- **DeepSeek API：**自行在官方平台获取密钥并了解费用，点击 **Save protected key** 后使用当前 Windows 账户的 DPAPI 保护。发送示例和问题可能收费。软件不会代你注册、充值或付款。

本地模式不会自动回退到云端。即使设备推荐 API，也可以继续接入你已有的本地服务。

## 3. 在 Chat 或 Settings 中连接学校

在 **Chat** 中发送学校的直接学习平台网址，例如“连接我的学校并持续更新课程资料：[学校学习网址]”。核对识别出的学校和授权范围，可选中 **Keep selected course files up to date daily**，再点击 **Connect and sign in**。在独立 Edge 窗口自行完成 Microsoft 登录与 MFA。软件会识别最新学期和课程，下载并解析所选在读课程的资料。连接卡会保留在聊天中。

每日资料更新需要主动启用，计划保存在本机，只在 Butler 运行时执行；错过或中断的检查在下次启动后补做。有效学校会话可复用，过期后自动采集暂停，重新登录后继续。不自动提交作业，不调用云端 AI。可在 **School settings** 调整课程或暂停更新。空白说明、扫描件、未支持的链接和超过大小限制的文件可能没有可提取文字。

打开 **Settings → Connect your Singapore polytechnic**。Courses 空页面或右上角的 **School settings** 也通向这里。

1. 在 **School learning URL** 粘贴学校的直接学习网址，点击 **Recognise and save school**。不用填写学校名称、平台、学期或课程 ID。
2. 点击 **Sign in and find courses**，在独立 Edge 窗口自行完成 SSO/MFA。若出现“保持登录”，可选择“是”。运行包自带连接器，不需要另装 Python。
3. 软件根据学校证据选择最新可访问学期并列出课程。首次发现默认选中该学期全部课程，之后刷新保留你的选择和课程状态；无法确认学期时显示待识别，不猜测。
4. 登录或 **Refresh semester and learning records** 会导入已选在读课程的学习记录。需要 AI 阅读课程资料时，再明确点击 **Download selected course files**，将文件保存并解析到本机。
5. 等待完成或错误提示。保存、登录、刷新和下载都不会启用每日计划，也不请求云端 AI 摘要。

学校连接、课程选择、同步历史和记录导出都在 **Settings**。**Courses** 只显示已识别的学校、学期和最新学期全部已发现课程；尚未下载的课程也列出来并说明状态。历史导入记录可用历史筛选查看。已有的手动取消选择会保留，不影响课程出现在总览中。

学校设置中的 **Check for missing assignments weekly** 可启用每周检查：运行包开启期间每七天读取最新学期全部在读课程的作业记录，将未交作业更新到 Tasks，避免重复。没有未交作业时明确说明；关闭期间错过的到期检查在下次启动补做。不下载课件、不调用云端 AI、不自动交作业、不安装 Windows 计划任务。新包默认关闭，需使用者启用。

网址识别涵盖新加坡五所 polytechnic。当前可登录的明确 Brightspace 域名为 TP/RP/SP 的 `tplms.polite.edu.sg`、`rplms.polite.edu.sg`、`splms.polite.edu.sg`；其他可识别学校的入口可保存，但适配前无法连接。共用 POLITEMall 地址本身无法确定学校。

软件加密保存自己的学校会话，未过期时跨运行复用。普通 Edge 标签页使用另一份会话。Microsoft 或学校策略仍可能要求重新登录；软件不修改到期时间，也不保存密码。

## 4. 询问真实课程资料

打开 **Courses** 并展开课程，即可进入阅读器。在目录中选择一课，再切换本课的文档。PDF 使用浏览器文档查看器翻页、缩放；**Read text** 显示提取正文。资源包与页面说明按文档排版阅读。**Save a copy** 可另存已下载的本地文件。补充资料和 **Assignments** 有独立入口；通过 **Previous**／**Next lesson** 切换课次，完成后勾选已学习。窄屏会将目录折叠为课次选择框。

下载课程时，也会将已关联 Brightspace 作业页面上公布的说明保存为本地文本文件，并保留原页面链接。没有公布说明的页面保存为空，不计入可读资料；软件不会补造内容，也不会提交作业。

点击 **Ask course AI**，例如问：“解释这一课，并说明使用了哪些来源。”核对回答中的资料名称和学校链接。仅发现、尚未导入记录的课程会引导到学校设置，不会编造进度或资料。

也可在普通 Chat 直接说课程名或编号，例如“解释 C304 第一课”，软件会检索本机已提取的资料。回答末尾由软件提供可点击的 **Course sources**，点击后在 Edge 打开原始 HTTPS 来源，不要求模型自己正确生成链接。打开链接本身不调用 AI，支持所选本地或 API 模型。可让 AI 写课程笔记，再审核并确认它提出的笔记。

Courses 默认只看当前学期。已提交、未提交、未知三种状态使用蓝、红、琥珀色片段合并为同一条进度条，学习课次保留独立文字计数。新浏览器默认使用 Retro，Dark 保留中性透明质感；颜色、自选壁纸和其他个性化设置仍在 Settings。

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
