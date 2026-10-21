# Hackathon — Butler 学习工作流

[English](README.md) · 基于 [frankrainrp/Bulter](https://github.com/frankrainrp/Bulter) 原有框架。

界面默认英文，可在首次 AI 设置页或 **Preferences → Language** 选择中文；个人课程、笔记和历史对话保持原文。示例课程需主动打开，新面板为空数据。

首次启动可选择本机 AI、DeepSeek 或暂时跳过。仓库包含已固定版本的 Windows CPU 引擎，不包含模型权重；大模型下载需明确选择。DeepSeek 密钥通过设置页输入并使用 Windows DPAPI 保护，服务商费用与应用里的本地账单演示分别处理。

查看 [AI 设置与数据流程](my-app/docs/local-ai.md)、[Windows 运行包启动说明](distribution/GETTING-STARTED.md)、[语言检查](LOCALIZATION.md)与[逐文件变更说明](docs/CHANGE-FILES-2026-10-21.md)。

先到「课程 → 学校、学期与每日检查设置」填写学校名称、HTTPS LMS 入口，并预览确认最终域名、当前学期和课程。自由描述不会自动推断学校；TP／RP 按钮只是示例，不代表你的实际学校。

- 当前连接支持 TP／RP 的明确 Brightspace 域名及受限 Microsoft 登录域名。其他自定义学校可以保存档案、入口和学期历史；安全连接策略接入前，登录、同步和计划启用会被拒绝。不能把一次 DNS 预检当作任意网址的安全保证。
- 每日时间默认 09:00、Asia/Singapore，可修改时间或选择 UTC。保存配置不代表已启用后台访问；每日检查可能错过不足一天的新截止通知。
- 每个学期分别保存课程选择和在读／完成／暂停状态。只下载明确勾选的在读课程；切换学期保留旧记录，不自动删除历史任务和课件。
- 学校档案、学期、同步历史、任务、笔记和学习进度保存在本机，登录过期不清空。课程页可导出不含登录凭据的记录备份；磁盘故障或主动删除仍可能导致丢失，不保证不可摧毁的永久保存。
- 学校会话使用按学校档案和域名隔离的 DPAPI 加密文件，不保存密码输入框内容。同一 Windows 用户的其他进程仍可能读取这些数据；课件、普通元数据和 SQLite 本身不是加密保险箱。

## Windows 源码启动

准备 Node.js 24、pnpm 9、Python 3.11+ 和 Edge。AI 可另行配置 Ollama。

```powershell
cd my-app
pnpm install --frozen-lockfile
python -m venv ops/lms-sync/.venv
./ops/lms-sync/.venv/Scripts/python.exe -m pip install -r ops/lms-sync/requirements.txt -c ops/lms-sync/requirements-ci.txt
$env:BUTLER_DB_PATH = "$PWD/ops/lms-sync/.private/butler.sqlite"
pnpm --filter @smart-hub/web dev --hostname 127.0.0.1
```

打开[本机课程页面](http://127.0.0.1:3000/?view=courses)，先保存并确认档案。之后停止网页服务、运行 `lms_sync.py setup`，重启服务加载本机桥接配置；学校登录、课程目录发现、第一次下载仍需明确执行。完整步骤、会话范围、每日计划预览与备份恢复见 [School profile workflow](my-app/ops/lms-sync/PROFILE_WORKFLOW.md)。

重新打包后的便携启动器只打开本地界面，不自动登录、下载或注册计划。已有 [Release ZIP](https://github.com/frankrainrp/Hackathon/releases) 不会随源码提交自动升级。

`install-schedule.ps1 -DryRun` 只预览每日计划；只有后续明确使用 `-Install` 才注册。旧的小时任务不会被静默替换。当前源码变更没有启用真实学校访问、外部自动化或部署。

## 学校事实与 AI

学校作业截止时间和提交状态来自 Brightspace；缺少日期时保留未知，不让 AI 虚构。课程问答引用提取的 PDF／PPTX／DOCX／HTML／文本正文，普通对话保留确认草稿。手工勾选学习进度不会提交学校作业。扫描件尚无自动 OCR，Quiz、论坛、校外 LTI 提交和 DeepTutor 尚未接入。

GitHub Actions 在 Ubuntu 运行 Node 测试、类型检查和生产构建，在 Windows 运行 Python／DPAPI 测试。合成 HTTP 集成测试使用独立临时数据，不需要学校登录。真实 SSO／MFA、选课正确性和任务计划启用仍需另行批准并实测。

原框架和美术资源来自 Bulter，保留已有第三方许可声明；本次没有新增整体项目的许可证授权声明。


## 构建当前运行包

在 `my-app` 中运行 `pnpm --filter @smart-hub/web build`，然后在仓库根目录运行 `node tools/package-windows.cjs <新的绝对输出目录>`。打包工具使用本机已有的 Node 和仓库内的固定引擎，不会覆盖已有安装，也不包含私人资料或模型权重。系统运行库要求和使用方法见运行包启动说明。

推送 `main` 只更新源码，不会自动替换 GitHub Releases 中以前上传的 ZIP；二进制发布是另一项操作。
