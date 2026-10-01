# Hackathon — Butler 学习工作流

[English](README.md) · 基于 [frankrainrp/Bulter](https://github.com/frankrainrp/Bulter) 原有整体框架

保留 Bulter 原生 Next.js / React 界面、SQLite、Ollama 双端点和任务确认卡，把 Brightspace 学校课程接入同一个学习管家。

- 每个 module 一行进度条，分别展示学校作业提交和自己记录的课次学习。
- 课程页面支持中文 / English，AI 按所选语言回答，module 保留原名。
- 每小时增量同步，资料按「学校 → module → Lesson 01、02…」保存，并生成 Markdown 索引。
- AI 读取已下载 PDF、PPTX、DOCX、HTML、文本和 ZIP 内支持的正文，回答引用资料标题与来源链接。
- 课程更新、截止时间和未交作业进入原有任务、日历、笔记及管家对话。
- Windows 登录会话由 DPAPI 加密。公开演示是虚构课程，不包含个人学校记录。

## 便携版

在 [Releases](https://github.com/frankrainrp/Hackathon/releases) 下载 **Butler-LMS-Windows.zip** 并完整解压到固定目录。

1. 双击 `Start-Butler-Demo.cmd`：体验虚构课程，不登录学校、不注册小时计划。
2. 正式使用时双击 `Start-Butler.cmd`，在专用 Edge 窗口登录学校，启动每小时同步。
3. 打开 [本机课程页面](http://127.0.0.1:3000/?view=courses)，展开 module，点击「问课程 AI」。

包内自带 Node 和 Python 同步器，系统需安装 Edge。AI 需要本机 Ollama 已启动并安装聊天模型；AI 离线时学校事实和确定性提醒仍可用。

## Windows 源码运行

准备 Node.js 24、pnpm 9、Python 3.11+、Edge，以及用于 AI 的 Ollama 聊天模型。

```powershell
git clone https://github.com/frankrainrp/Hackathon.git
cd Hackathon/my-app
pnpm install --frozen-lockfile
python -m venv ops/lms-sync/.venv
./ops/lms-sync/.venv/Scripts/python.exe -m pip install -r ops/lms-sync/requirements.txt
Copy-Item ops/lms-sync/config.example.json ops/lms-sync/config.local.json
./ops/lms-sync/.venv/Scripts/python.exe ops/lms-sync/lms_sync.py setup
pnpm --filter @smart-hub/web dev --hostname 127.0.0.1
```

`setup` 生成被 Git 忽略的本机环境、桥接令牌，并发现 Ollama 已安装模型；不会登录学校或下载资料。进入课程页点击「查看演示课程」，可以先体验界面与问答。

真实课程需保持网页服务运行，在另一个终端执行：

```powershell
cd my-app/ops/lms-sync
./.venv/Scripts/python.exe lms_sync.py login
./.venv/Scripts/python.exe lms_sync.py sync
./install-schedule.ps1
```

公开配置默认自动发现当前用户的选课，不包含测试账号的课程名单。可编辑 `config.local.json` 限制课程、修改频率或保存位置。登录可能到期或要求 MFA，届时需重新登录。其他 Brightspace 学校需修改网址、时区和允许来源；其他 LMS 需编写适配器。

## AI 能读到什么

课程下载 → 正文提取 → 带令牌的本机桥接 → SQLite → 检索相关正文 → 原有 Ollama 对话。聊天显示当前课程范围，回答附资料标题和学校链接。课程问答不提供写入工具；普通任务对话保留原有确认卡。勾选学习进度不会提交学校作业。

每份资料最多提取 20,000 字符，每轮同步正文总预算 1,200,000 字符，问答检索最多八段。扫描件尚未接入自动 OCR；图片、公式、复杂表格可能丢失。没有正文的资料会明确提示，不能声称已读。当前同步 Assignments/Dropbox，尚不覆盖 Quiz、论坛和校外 LTI 提交。

这是绑定 `127.0.0.1` 的本机单用户应用。使用本机 Ollama 时相关正文留在本机；配置远端模型时会发送到该模型服务。设 `LMS_CONTENT_AI_ENABLED=false` 可关闭课程正文进入 AI。公开仓库及便携包排除课程文件、登录会话、密钥、数据库、日志和本机配置。公开源码不等于对外部署个人学习网页。

## 验证、打包与后续

已通过 Python 六项测试、Node 七项测试、TypeScript 检查和 Next 生产构建。真实 Ollama 联调从临时 PPTX 读到「80 次实验、61 次成功、76.25% 成功率」，中英文回答均引用资料来源；临时资料与测试数据库已删除。

测试命令、重新打包和 Windows junction 处理见 [同步器说明](my-app/ops/lms-sync/README.md)。

[HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) 后续可通过独立服务接入课程知识库和深度辅导；本版尚未安装或集成 DeepTutor，目前问答使用本地正文检索与 Bulter 原有 AI 连接。

原框架和美术资源来自 Bulter，保留已有第三方许可声明；本次没有新增整体项目的许可证授权声明。
