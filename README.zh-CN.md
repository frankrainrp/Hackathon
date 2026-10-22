# Hackathon — Butler 学习工作流

基于 [Bulter](https://github.com/frankrainrp/Bulter)，提供课程记录、任务、笔记和带来源的 AI 问答。

[English](README.md) · [Windows 新手指南](distribution/GETTING-STARTED.zh-CN.md) · [AI 设置与存储](my-app/docs/local-ai.md)

## 完成第一次课程问答

1. 完整解压 Windows 包，运行 `Start-Hackathon.cmd`，保持控制台开启，在浏览器打开它打印的实际网址（默认 `http://127.0.0.1:3000`）。
2. 可选 AI 设置：接入已有本地 OpenAI 兼容服务，或明确批准后下载模型使用内置 CPU 引擎，或自备密钥使用 DeepSeek，也可以跳过。**Test connection** 检查连接；另行同意并发送示例才验证实际生成。本地模式不回退云端。
3. 打开 **Settings → Connect your Singapore polytechnic**，只提供学校直接学习网址，点击 **Recognise and save school**，再点 **Sign in and find courses**，自行完成 SSO/MFA。学校名称由网址识别，最新可访问学期和课程 ID/名称来自真实学校数据。
4. 新发现的当前学期课程默认选中，后续保留已有选择。登录/刷新导入已选课程学习记录，**Download selected course files** 才明确下载并解析文件。不会因此启用每日计划或云端摘要。
5. **Courses** 简洁显示已识别的学校、学期和该学期全部已发现课程。展开已下载课程，点击 **Ask course AI**，核对回答的实际来源。学校配置、下载课程选择、同步历史和导出放在 Settings。

界面默认英文，可在 AI 设置或 **Settings → Language** 切换中文；个人课程、笔记和历史对话保持原文。示例数据需主动打开并有标记，新面板为空。

网址识别涵盖新加坡五所 polytechnic；可登录适配器目前支持 TP/RP/SP 的明确 Brightspace 域名，其他已识别入口只保存元数据。普通 Edge 会话独立；Butler 加密保存自己的会话，未过期时跨运行复用。Microsoft/学校策略仍可能要求再次登录，软件不保存密码或修改凭证到期时间。

## Windows 源码启动

准备 Node 24、pnpm 9、Python 3.11+ 和 Edge。可选接入已有本地模型；学校确定性数据不依赖 AI。

```powershell
cd my-app
pnpm install --frozen-lockfile
python -m venv ops/lms-sync/.venv
./ops/lms-sync/.venv/Scripts/python.exe -m pip install -r ops/lms-sync/requirements.txt -c ops/lms-sync/requirements-ci.txt
$env:BUTLER_DB_PATH = "$PWD/ops/lms-sync/.private/butler.sqlite"
pnpm --filter @smart-hub/web dev --hostname 127.0.0.1
```

使用上述 Settings 流程即可。应用为自己的连接器提供本机桥接凭证，不必停止服务运行旧的手工 `setup` 命令。高级 CLI、访问范围及备份恢复见 [School profile workflow](my-app/ops/lms-sync/PROFILE_WORKFLOW.md)。

## 数据与验证

升级前备份现有数据。SQLite、学校档案、已提取资料和加密会话在重启后保留；浏览器待保存编辑还依赖原浏览器、配置文件和来源地址。学校设置可导出不含凭据的学习记录，目录见[新手指南](distribution/GETTING-STARTED.zh-CN.md#保留已有数据)。DPAPI 为当前 Windows 账户保护凭据，普通课件和 SQLite 本身不是加密保险箱。

作业日期和提交状态来自 Brightspace，缺少事实保留未知。课次勾选不提交学校作业。扫描件需要独立 OCR，Quiz/论坛/LTI 提交和 DeepTutor 尚未接入。AI 提议的任务修改需确认；服务商费用与本地账单演示分别处理。

GitHub Actions 在 Ubuntu 运行 Node 回归、类型检查和生产构建，在 Windows 运行 Python/DPAPI 测试；HTTP 测试使用隔离合成数据。真实学校和课程验收证据仅保留本机，不进入新包。另见[语言检查](LOCALIZATION.md)和[逐文件说明](docs/CHANGE-FILES-2026-10-22.md)。

## 构建 Windows 包

在 `my-app` 运行 `pnpm --filter @smart-hub/web build`，再于仓库根目录运行 `node tools/package-windows.cjs <新的绝对输出目录>`。打包使用本机已有固定引擎、冻结连接器和 Node，拒绝覆盖安装目录，包含中英文指南，不包含模型权重、私人数据库、密钥或学校会话。系统运行库要求与许可见新手指南。

推送 `main` 只更新源码，不替换旧的 [GitHub Releases](https://github.com/frankrainrp/Hackathon/releases) ZIP。每日计划需单独明确执行 `install-schedule.ps1 -Install`，`-DryRun` 仅预览。保留 Bulter 的原框架、美术归因与已有第三方许可声明。
