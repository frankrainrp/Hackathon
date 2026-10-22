# Your first course answer with Butler

[中文指南](GETTING-STARTED.zh-CN.md)

## 1. Start the app

Extract the **entire ZIP** into a writable local folder. Double-click **Butler.exe** and keep its console open. It starts the bundled runtime and opens Microsoft Edge when the app is ready. The address printed in the console defaults to `http://127.0.0.1:3000`; a configured `PORT` changes it. `Start-Hackathon.cmd` remains a manual-browser fallback. No Node installation is needed. Ctrl+C stops Butler and its managed engine. Keep the EXE beside its companion folders; it is a portable launcher, not a single-file installer.

English is the default. Choose **中文** in AI setup or **Settings → Language** to change the interface. Your own course names, notes and conversations keep their original text.

## 2. Connect AI, or skip it

The optional setup has four steps: **Choose → Prepare → Test → Use**. **Skip for now** keeps tasks, notes and school sync available. Reopen setup from **Settings → AI connection → Open AI setup**, or `/ai-setup`.

If you already run a local model, use it without downloading another one:

1. **Choose:** select **Local on this computer**.
2. **Prepare:** choose **I already run Ollama or an OpenAI-compatible local service**. Enter that service's loopback `/v1` URL, choose **Find installed models**, then select its actual model. Keep that service running; Butler does not manage it.
3. Continue to **Test** and choose **Test connection**. This checks the connection and available model.
4. To check actual generation, select **Send one sample request to my selected provider**, then **Send example: “Explain a study plan”**. A successful sample proves text generation, not course knowledge or reasoning accuracy. Leave optional cloud OCR off unless you separately want it.
5. Continue to **Use** and choose **Start using Butler**.

Other choices are optional:

- **Included Windows CPU engine:** device detection recommends eligible models using capability evidence and available RAM/disk. Models of 8B and below are excluded from new recommendations; devices without an eligible model are directed to API setup. The default folder follows the current account (`%LOCALAPPDATA%/Butler/models`), or `BUTLER_MODELS_DIR`. You can choose another folder. Context depends on the selected model and free RAM. Review size/license, explicitly consent and choose **Download selected model**, then **Start engine**. No weights download automatically. After restarting, start the engine again. GPU detection does not make this CPU package use the GPU.
- **DeepSeek API:** obtain your own key and review charges on the linked official platform. **Save protected key** stores it with Windows DPAPI for this Windows account. Sending a sample or question can incur provider charges. Choosing this mode does not create an account or payment.

Local mode has no cloud fallback. You can keep using an existing local service even if the device recommendation suggests API.

## 3. Connect school in Settings

Open **Settings → Connect your Singapore polytechnic**. On an empty Courses page, **School settings** opens this same section.

1. Paste your direct **School learning URL**, then choose **Recognise and save school**. You do not need to type a school name, platform, course ID or semester.
2. Choose **Sign in and find courses**. Complete your own SSO/MFA in the separate Edge window; choose “Stay signed in” if offered. The frozen connector needs no Python installation.
3. Butler finds the latest accessible semester from school evidence and lists its courses. First discovery selects all courses in that term; later refreshes preserve your choices and course statuses. Ambiguous terms stay pending rather than being guessed.
4. Login/refresh imports learning records for selected active courses. **Refresh semester and learning records** reuses the saved session while valid. **Download selected course files** is the separate action that saves and parses materials locally. Choose it when you want course-source answers.
5. Wait for the completion or error message. Saving, sign-in, refresh and download do not enable a daily schedule or request a cloud AI summary.

School setup, course selection, sync history and record export live in **Settings**. **Courses** is a compact overview: it shows the detected school/semester and every discovered course in the latest term, including courses whose files have not been downloaded. Historical imported courses remain available in its history filter. Existing manual deselections are retained and do not hide a discovered course from the overview.

To check for new unsubmitted work automatically, enable **Check for missing assignments weekly** in School settings. While the packaged app is running, it reads metadata for all active courses in the latest term every seven days, reuses its saved school session and updates Tasks without duplicates. It does not download their files, call cloud AI or submit assignments. If no work is missing, the result says so. A missed due check runs after the next app start. Closing Butler stops this in-app timer; no Windows scheduled task is installed. Fresh packages have this option off until enabled by their user.

URL recognition covers five Singapore polytechnics. Reviewed login adapters cover the exact TP/RP/SP Brightspace hosts (`tplms.polite.edu.sg`, `rplms.polite.edu.sg`, `splms.polite.edu.sg`). Other recognised URLs can be saved but cannot connect until their adapter is available. A shared POLITEMall URL alone does not identify your school.

Butler retains its own encrypted school session and reuses it across runs until expired. Your normal Edge tabs use a separate session. Microsoft/school policy can require another login; Butler does not change token expiry or save your password.

## 4. Ask about an actual course

Open **Courses** and expand a course to enter its reader. Choose one lesson in the contents, then switch between that lesson's documents. PDFs use the browser's document viewer for paging and zoom; **Read text** provides the extracted version. Resource archives and page instructions use a readable text layout. **Save a copy** downloads the already saved local file. Supporting resources and **Assignments** have their own entries. Use **Previous** / **Next lesson** to continue, and mark a lesson as learned when finished. On narrow screens, the contents become a lesson selector.

Course downloads also save the published instructions of linked Brightspace assignment pages as local text files. Original page links stay available. Pages with no published instructions are saved as empty and do not count as readable sources; the app never fills in missing content or submits the assignment.

Choose **Ask course AI** and ask, for example: “Explain this lesson and tell me which source you used.” Check the named source and school link in the answer. A discovered course without imported records directs you back to School settings; it does not fabricate progress or materials.

You can also name the course directly in ordinary Chat, for example “Explain C304 lesson one”. Butler retrieves its locally extracted sources. App-supplied **Course sources** are clickable even when the model omits Markdown links; selecting a source opens its original HTTPS page in Microsoft Edge. This works with the chosen local or API provider and does not require a provider call just to open a link. You may ask the AI to save course notes; review its proposed note before confirming.

Courses defaults to the current semester. Submitted, missing and unknown assignment states share one bar, using blue, red and amber segments. Lesson completion remains a separate text count. The default dark theme uses neutral translucent surfaces; colour and other personalisation controls remain in Settings.

Lesson checkboxes record your learning progress. They do not submit school assignments. School submission status and dates come from Brightspace; missing information stays unknown. Quiz, forum and external LTI submission tracking is not covered.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| Local address will not open | Keep the launcher console open and use its printed address. Check its startup error before changing browser permissions. |
| Port already in use | Close your other Butler console or choose another `PORT`. The launcher never stops unrelated processes. |
| Model connection fails | Ensure your existing service is running, its loopback `/v1` URL is right and its actual model is selected. A cold model may need time to load. |
| School asks you to sign in | Use **Sign in and find courses** again. Existing records and files remain. |
| Delivery failed after download | Retry the operation with Butler running. This does not necessarily mean the school session expired. |
| No courses / pending semester | Check the direct school URL and sign-in result, then refresh. Butler needs authenticated semester evidence. |
| Course visible but no readable sources | Download its files in Settings. Image-only archives/scans need a separate OCR step. |
| Interrupted model download | Select the same folder/model, explicitly consent and choose **Resume**. Verification runs before use. |
| Low RAM or disk full | Close other apps, choose an eligible lower-resource model/context, or use an existing service. Free disk space or select another local folder. |
| Missing engine DLL | Install the required Visual C++ v14 x64 runtime from [Microsoft](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist), or use an existing service. The Microsoft runtime is not redistributed here. No driver/runtime installer runs automatically. |
| Workspace save warning | Keep the same browser/profile open and choose Retry. Edits enter a local retry queue before server sync; if both stores fail, do not leave until saved. |
| API key/balance/rate error | Review the provider account yourself or return to Local. Butler does not purchase credits. |

## Keep your data

`data/butler.sqlite` holds durable workspace/LMS state, `data/ai/` holds AI settings/protected keys/download journals, and `data/lms/` holds school profiles, encrypted sessions and course files. Models live in the chosen model folder. Browser pending edits are tied to that browser/profile and origin. Stop the app and back up existing data before upgrading; never replace an existing data folder with a fresh package's empty state. Export non-secret learning records from School settings. Session files are separate from exports; copying encrypted keys/sessions to another Windows account does not make them usable there.

Cloud OCR is separate and off until explicitly enabled. It requires a configured Mistral key and uploads the selected scanned document; the text model does not provide offline OCR. No local OCR adapter is bundled. Optional browser semantic-model assets may need an initial download.

This package targets Windows x64 CPU with the pinned llama.cpp engine and Node. It includes no model weights, private state, browser or Microsoft runtime. A clean Windows installation has not been tested. Read `THIRD-PARTY-NOTICES.md`, `licenses/` and `PACKAGE-MANIFEST.json`. The scripts do not upload or publish anything.
