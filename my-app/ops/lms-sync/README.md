# Brightspace → Butler 学习工作流

每小时读取 RP 课程、下载新课件、生成 Markdown 目录，将学校作业和公告送到原有 Butler。网页内的任务、日历、课程笔记、学习提醒和 AI 聊天共用同一个数据入口。电脑需开机且当前 Windows 用户已登录；无需一直打开课程网站。

Windows 便携 ZIP 自带原生应用生产构建、Node 和 `ButlerSync.exe`。解压后双击 `Start-Butler.cmd`：自动创建本机配置、启动 Butler、首次登录学校、启用每小时计划。正式包不包含测试账号的课程、会话或数据库。便携版默认发现当前用户的全部 Brightspace 课程，可在 config.local.json 里限制课程列表。便携包使用生产服务器。

目录示例：

```text
courses/
  Republic Polytechnic/
    C245 Data Analytics with GenAI/
      index.md
      manifest.json
      Lesson 01/
        index.md
        C245 Lesson 1 Student [14185625].zip
      Lesson 02/
        ...
      Resources/
        ...
```

Module 使用学校原名，Windows 不允许的字符替换成 `_`。Package / Week 层级保存在索引中；支持 `Lesson 1`、`L01`、`Ll06` 和 `L23_L24`。学校将多课合在一个文件时保留 `Lesson 23-24`，不虚构拆分。没有课次的资料放在 Resources。PDF、PPTX、ZIP、HTML、MD 等保留原格式，默认不解压或运行下载内容。题目标题和来源 ID 同时出现在文件名，防止同名资料覆盖。

## 本机使用

在此目录执行（Python 3.11+，系统需安装 Edge）：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item config.example.json config.local.json
.\.venv\Scripts\python.exe lms_sync.py setup
.\.venv\Scripts\python.exe lms_sync.py login
.\start-butler.ps1
.\.venv\Scripts\python.exe lms_sync.py sync
.\install-schedule.ps1
```

首次需要在同步器打开的 Edge 中登录学校；到达 My Courses 后自动保存加密会话。普通 Edge 的个人浏览记录和密码不会被复制。Windows 使用 DPAPI，只有同一 Windows 用户可解密。其他系统需通过主机密钥管理设置 `LMS_STATE_KEY`（Fernet key）。学校会话到期或要求 MFA 时重新运行 `login`；该程序不能使学校凭证永不过期。

Butler 工作区依赖先在 `my-app` 安装：`pnpm install --frozen-lockfile`。打开 [本机 Butler](http://127.0.0.1:3000)，在左侧历史会话选择「Republic Polytechnic · 学习提醒」。应用打开时每 30 秒拉取新消息，系统通知使用已有浏览器授权。应用关闭时消息仍会存入 SQLite，下次打开可读。后台计划会在 Windows 登录时启动本机 Butler；源码环境使用开发服务器。

`setup` 自动创建本地 `.env.local` 的桥接令牌和数据库地址（不会输出令牌），并将客户端令牌加密存放在 `.private/bridge.enc`。课程、会话、日志、SQLite、`.env.local` 和本地配置均被 Git 忽略。

## AI、任务和提醒

- 课程、作业截止和提交状态来自学校接口；AI 只生成简短学习安排，不决定是否已交作业。
- 提交状态区分 missing / submitted / unknown。读取失败保留此前确认状态，并展示本轮待核实。作业任务同时进入现有日历。
- 未提交的作业在 24 小时、6 小时和逾期阶段提醒，同一阶段同一天去重。网站公告、课件更新和作业日期变化触发同步消息；无变化不重复调用 AI。
- 复用原聊天的 Ollama 地址及回退逻辑。可设置 `OLLAMA_SERVER_MODEL` / `OLLAMA_WINDOWS_MODEL` 使用实际已安装的模型。AI 离线时仍导入资料与事实提醒，日志记录 `AI=unavailable`。
- 用户在 Butler 中勾选完成不会提交到学校。只有学校确认 submitted 才改为「网站已确认提交」。学习建议不调用写入工具；聊天的 AI 写入仍走原有确认卡。

## 运维和扩展

```powershell
.\.venv\Scripts\python.exe lms_sync.py status
.\.venv\Scripts\python.exe lms_sync.py retry   # Butler 离线后重送已保留快照
Get-ScheduledTask -TaskName 'Butler-LMS-*'
Disable-ScheduledTask -TaskName 'Butler-LMS-Sync-RP'
```

同步失败只更新状态，不删已下载课件。同步进程使用独占锁；文件写入成功后才更新下载账本。下载按学校修改时间更新，无修改时间时重新抓取。HTTP 429 / 5xx 有限退避；401 / 登录重定向要求重新登录。课程权限不足显示 partial，不将 403 当成没有作业。

默认 `courses` 为空数组，通过 enrollments API 发现当前用户的全部课程（可能包括旧学期）。可在本机 config.local.json 填入课程 ID 限制范围。不同学校使用独立配置、private_dir、output_dir，并在 Butler 服务端明确配置学校域名。目前适配 Brightspace；其他 LMS 需要实现新的只读适配器。默认提醒覆盖 Assignments/Dropbox，Quiz、论坛提交和校外 LTI 作业尚未接入。

新桥接接口仅接受 localhost；POST 还验证独立令牌及学校来源域，GET 禁止跨站请求。公开部署需先为整个应用补账户认证，不应直接暴露当前单用户开发服务。

接口依据：[Brightspace 内容](https://docs.valence.desire2learn.com/res/content.html)、[个人作业提交](https://docs.valence.desire2learn.com/res/dropbox.html)、[课程注册](https://docs.valence.desire2learn.com/res/enroll.html)、[Playwright 共享登录会话](https://playwright.dev/python/docs/api-testing)。API 版本从学校 `/d2l/api/versions/` 动态发现。学校禁止浏览器会话访问 API 时，需要学校签发只读 OAuth token（`LMS_ACCESS_TOKEN`），不会绕过权限。

## 验证

```powershell
.\.venv\Scripts\python.exe -m unittest discover -v
node --test ../../apps/web/tests/*.test.mjs
```

测试覆盖真实 Package / Week / Lesson 结构、合并课次、提交状态、目录安全、会话加密、重复同步、用户备注保留、时区与过期登录。TypeScript 使用工作区的 `tsc --noEmit` 验证。

## 重新打包

在 Windows x64、已安装工作区依赖的源码目录完成以下步骤。冻结同步器需在虚拟环境另装 `pyinstaller`。重复构建 Next 14 前先运行 `prepare_build.py`，避免旧 standalone 中的 Windows junction 影响原依赖目录。

```powershell
# 在 my-app/ops/lms-sync 中
.\.venv\Scripts\python.exe prepare_build.py
pnpm --dir ../../apps/web build
.\.venv\Scripts\python.exe -m PyInstaller --noconfirm --onedir --name ButlerSync --distpath .private/freeze --workpath .private/build --specpath .private --collect-all playwright --collect-all pypdf lms_sync.py
.\.venv\Scripts\python.exe package_windows.py --replace
```

产物是仓库根目录 `release/Butler-LMS-Windows.zip`。打包器将 pnpm 运行依赖转成便携目录，自动排除个人数据，并校验 ZIP 中没有会话、桥接密钥、课程、SQLite 或本机配置。测试用的小时计划已经移除，正式使用时由 `Start-Butler.cmd` 注册。

## 课程进度与 AI 阅读 / Course progress and AI reading

在课程页面切换中文 / English，展开 module 后点击「问课程 AI」。聊天顶部显示当前课程，回答附课程资料标题和来源链接。作业提交进度依据学校接口，课次学习进度由用户勾选；两者分别显示。

同步器从已下载 PDF、PPTX、DOCX、HTML、文本和 ZIP 内资料提取正文（ZIP 只在内存读取，不解压运行）。每份最多 20,000 字符，每次同步正文总预算 1,200,000 字符；问答检索最多八段相关正文。界面显示可读资料数量，空扫描 PDF 不会被标记成已读取。扫描件/图片没有接入自动 OCR，公式、图片和复杂表格可能丢失。没有正文时 AI 必须说明缺少资料。课程问答禁用写入工具；普通任务对话仍使用原确认卡。

学校文件和正文只保存在当前用户的归档与 SQLite。使用本机 Ollama 时正文发送到本机模型；配置远端模型时，相关正文会发到该模型服务。`LMS_CONTENT_AI_ENABLED=false` 可以关闭课程正文进入 AI。公开演示使用虚构课程和双语笔记，不读取或写入个人学习进度。

Switch Chinese / English on the Courses page, expand a module, and select **Ask course AI**. The chat keeps that course's scope and cites the material title and source URL. School submissions and self-reported lesson learning have separate progress bars.

The sync worker reads downloaded PDF, PPTX, DOCX, HTML, text and supported files inside ZIP archives. Archives stay in memory. Text is bounded to 20,000 characters per file and 1,200,000 per snapshot; chat retrieves up to eight relevant passages. Scanned pages need OCR, which is not connected to automatic course sync yet. Images, formulas and complex tables may be lost. Missing text is reported instead of invented. Course chat has no write tools; normal task chat retains the existing confirmation cards.

Files and extracted text stay in the user's local archive and SQLite. A local Ollama endpoint receives text locally; an explicitly configured remote endpoint receives the selected passages. Set `LMS_CONTENT_AI_ENABLED=false` to disable course context. Public demos contain fictional bilingual notes only.
