# Hackathon — Butler 学习工作流

基于 [Bulter](https://github.com/frankrainrp/Bulter)，提供课程记录、任务、笔记和带来源的 AI 问答。

[English](README.md) · [Windows 新手指南](distribution/GETTING-STARTED.zh-CN.md) · [AI 设置与存储](my-app/docs/local-ai.md)

## 完成第一次课程问答

1. 完整解压 Windows 包，双击 **Butler.exe**，内置运行时启动后自动打开 Edge。保持控制台开启，默认网址为 `http://127.0.0.1:3000`。EXE 需和随附文件夹放在一起，`Start-Hackathon.cmd` 保留为手工打开浏览器的备用入口。
2. 可选 AI 设置：接入已有本地 OpenAI 兼容服务，或明确批准后下载模型使用内置 CPU 引擎，或自备密钥使用 DeepSeek，也可以跳过。**Test connection** 检查连接；另行同意并发送示例才验证实际生成。本地模式不回退云端。
3. 打开 **Settings → Connect your Singapore polytechnic**，只提供学校直接学习网址，点击 **Recognise and save school**，再点 **Sign in and find courses**，自行完成 SSO/MFA。学校名称由网址识别，最新可访问学期和课程 ID/名称来自真实学校数据。
4. 新发现的当前学期课程默认选中，后续保留已有选择。登录/刷新导入已选课程学习记录，**Download selected course files** 才明确下载并解析文件。不会因此启用每日计划或云端摘要。
5. **Courses** 简洁显示已识别的学校、学期和该学期全部已发现课程。展开已下载课程，点击 **Ask course AI**，核对回答的实际来源。学校配置、下载课程选择、同步历史和导出放在 Settings。

界面默认英文，可在 AI 设置或 **Settings → Language** 切换中文；个人课程、笔记和历史对话保持原文。新对话、课程、任务、笔记和面板均从空数据开始，不包含虚构数据导入入口。

新浏览器默认使用 Retro；已有主题选择保留，Settings 仍可切换中性透明 Dark。壁纸由用户自行提供本地图片。Courses 默认当前学期，已交、未交、未知合在同一条三色进度条。普通 Chat 可按课程名或编号检索，软件提供可点击来源并用 Edge 打开。笔记写入仍先审核建议、确认后保存。

学校设置可选择启用每周检查，读取最新学期全部在读课程，只将确认未交的作业加入 Tasks，不下载课件或调用云端 AI。未知状态不当作未交作业，不进入当前任务队列；没有未交作业时明确说明。运行包开启期间自动检查，错过到期检查时下次启动补做，不安装 Windows 计划任务。新包默认关闭，需使用者启用。

网址识别涵盖新加坡五所 polytechnic；可登录适配器目前支持 TP/RP/SP 的明确 Brightspace 域名，其他已识别入口只保存元数据。普通 Edge 会话独立；Butler 加密保存自己的会话，未过期时跨运行复用。Microsoft/学校策略仍可能要求再次登录，软件不保存密码或修改凭证到期时间。

## Windows 源码启动

先根据文件判断你拿到的是哪一种包：

| 文件夹中的内容 | 启动方式 |
| --- | --- |
| `Butler.exe`、`Launch.cjs`、`app/`、`runtime/` | 运行包：直接双击 **Butler.exe**，不需要执行 pnpm 或源码安装命令。 |
| `README.md`、`Start-Source.cmd`、`my-app/`、`tools/` | 源码仓库或源码 ZIP：使用 **Start-Source.cmd**。 |

GitHub ZIP 和源码 ZIP 都会带一层外部文件夹。请进入**同时包含 `README.md` 与 `my-app` 的内层项目目录**，不要停在解压的上一层。例如项目在 `demo/Hackathon` 时，`demo` 本身不是项目目录。前一步报错后，必须停止，不能继续执行后面的命令。

准备 Node.js **24**、pnpm **9**、Python **3.11 或 3.12** 和 Microsoft Edge，然后双击 **Start-Source.cmd**。启动器会自行定位项目，首次安装锁定的 Node/Python 程序依赖，检查 SQLite 原生模块，服务就绪后再打开 Edge。保持控制台开启。首次缺少程序依赖时需要联网，不下载模型权重，也不发送 AI 请求。

如果已经在内层项目目录打开 PowerShell，只需执行：

```powershell
.\Start-Source.cmd
```

也可以从其他目录用完整路径调用启动器。仅诊断依赖、不启动服务时使用 `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-source.ps1 -Check`。需要更换端口时，在 `Start-Source.cmd` 后添加 `-Port 3001`。源码入口用于开发；自动每周检查计时器由 Windows 运行包提供。

使用上述 Settings 流程即可。应用为自己的连接器提供本机桥接凭证，不必停止服务运行旧的手工 `setup` 命令。高级 CLI、访问范围及备份恢复见 [School profile workflow](my-app/ops/lms-sync/PROFILE_WORKFLOW.md)。

## 数据与验证

升级前备份现有数据。SQLite、学校档案、已提取资料和加密会话在重启后保留；浏览器待保存编辑还依赖原浏览器、配置文件和来源地址。学校设置可导出不含凭据的学习记录，目录见[新手指南](distribution/GETTING-STARTED.zh-CN.md#保留已有数据)。DPAPI 为当前 Windows 账户保护凭据，普通课件和 SQLite 本身不是加密保险箱。

作业日期和提交状态来自 Brightspace，缺少事实保留未知。课次勾选不提交学校作业。扫描件需要独立 OCR，Quiz/论坛/LTI 提交和 DeepTutor 尚未接入。AI 提议的任务修改需确认；服务商费用与本地账单演示分别处理。

GitHub Actions 在 Ubuntu 运行 Node 回归、类型检查和生产构建，在 Windows 运行 Python/DPAPI 测试；HTTP 测试使用隔离合成数据。真实学校和课程验收证据仅保留本机，不进入新包。另见[语言检查](LOCALIZATION.md)和[逐文件说明](docs/CHANGE-FILES-2026-10-22.md)。

## 构建 Windows 包

打包不仅需要 `pnpm build`，还必须先构建**冻结的学校连接器**。完整步骤见 [Windows 构建指南](docs/BUILD-WINDOWS.md)，包括锁定连接器依赖、PyInstaller、前置条件与最终 ZIP 验证。新包不包含模型权重、私人数据库、密钥或学校会话。

推送 `main` 只更新源码，不替换旧的 [GitHub Releases](https://github.com/frankrainrp/Hackathon/releases) ZIP。每日计划需单独明确执行 `install-schedule.ps1 -Install`，`-DryRun` 仅预览。保留 Bulter 的原框架、美术归因与已有第三方许可声明。

`node tools/audit-portability.cjs --source` 检查源码；`node tools/audit-portability.cjs <新包目录>` 检查包内全部普通文件。打包清除应用编译产物中的本项目绝对路径，检测私人状态、权重和常见凭据格式。未修改的第三方二进制里的编译源码/调试位置单独列出，不作为个人配置或构建电脑的运行依赖。扫描不解码压缩的第三方内部载荷，也不宣称能识别所有秘密格式。
