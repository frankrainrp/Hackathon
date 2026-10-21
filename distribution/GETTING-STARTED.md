# Start Hackathon Butler on Windows

Extract the entire ZIP into a writable local folder. Double-click `Start-Hackathon.cmd`, keep the console open, and open **http://127.0.0.1:3000** in your browser. No Node installation is required. Ctrl+C stops the app and its managed inference engine.

The first screen is optional AI setup. Manual courses, tasks, calendar and notes remain available if you choose **Skip for now**. Resume using the banner or **Settings → AI connection → Open AI setup**. You can also open `/ai-setup` directly.

English is the default interface language. Select **中文** in the first AI setup screen or **Preferences → Language** to switch instantly; the choice is remembered in that browser. Your existing course titles, notes and conversation history keep their original language. Optional example courses and practice data are clearly labelled and appear only when requested. New panels start empty.

## Local on this computer

1. Choose **Local on this computer**, then the included Windows x64 CPU engine.
2. Click **Check this computer**. Recommendations consider current free RAM, selected context and disk space. GPU detection does not mean this CPU package uses the GPU.
3. Keep the default model folder, or paste a local folder path and click **Use this folder**. Choose a reviewed model. The model card gives its capabilities, limits and Apache-2.0 license.
4. Review the displayed size, explicitly check the download/license choice, then click **Download selected model**. Model weights are not in this ZIP and are never downloaded automatically. Partial files stay in this folder when canceled or interrupted. Select the same model/folder and choose **Resume** after restarting. SHA-256 verification runs before use.
5. Click **Start engine**, continue, **Test connection**, then explicitly send the sample. The sample proves that this connection can generate text; it does not measure reasoning or tool accuracy.
6. Start with a short lesson question in Chat. Review any proposed task changes before confirming them. After restarting Butler, reopen setup and start the engine again.

Already use Ollama or another local OpenAI-compatible service? Choose the existing-service option, enter a loopback `/v1` URL, click **Find installed models**, and choose one. Start/install models in that service yourself. Butler does not manage its lifecycle. Explicit legacy mode also preserves existing primary/alternate `OLLAMA_*` network routes. In Local mode there is no cloud fallback.

## DeepSeek API

Open the linked official platform yourself, obtain your own key and review pricing/balance. Paste it in the masked field and click **Save protected key**. The key is protected using Windows DPAPI for the current Windows account, separate from study exports and browser storage. Test connection before explicitly sending the sample, which may incur provider charges.

The official OpenAI-compatible base is `https://api.deepseek.com`; setup offers `deepseek-flash` and `deepseek-v4-pro`, verified on 21 October 2026. See [DeepSeek's first-call guide](https://api-docs.deepseek.com/). No account creation, login or payment is performed by Butler. Cloud requests contain your submitted prompt and selected course context, not hardware inventory.

## Recovery

- **Interrupted download:** select the original folder and model, confirm, then Resume. A damaged partial file is discarded after checksum failure. No automatic restart download occurs.
- **Disk full:** free space or use a larger local folder. To preserve partial bytes when moving, stop/cancel first and move the relevant `.gguf.part` file yourself; Butler never moves your files automatically.
- **Low RAM / stopped engine:** close other applications, select a smaller model or reduce context, then start again. This package uses system RAM, not GPU VRAM. Very small models have limited reasoning and tool reliability.
- **Invalid key (401):** replace the saved key using the official platform. **No balance (402):** review your account there yourself, or switch to Local. **Rate limit (429):** wait, then retry with fewer parallel requests. **Server overload (503):** retry later.
- **Offline:** verified local text inference can work without internet. Downloads, DeepSeek, school sync and cloud OCR need their respective connections. Optional browser semantic-model assets may need an initial download.
- **Key fails after copying the app:** DPAPI ciphertext belongs to its Windows account. Save the key again on the new account/computer. Do not copy it into text configuration.
- **Engine probe fails / missing DLL:** the official engine requires the Microsoft Visual C++ v14 x64 runtime and Windows 10/11 UCRT. The Microsoft runtime is a system prerequisite and is **not redistributed** here because the publisher's redistribution entitlement was not established. Obtain it yourself from [Microsoft's official downloads](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist). Butler does not install it or change drivers. Alternatively, use an already working local service or DeepSeek. This package was tested on the authorized computer with its existing runtime; a clean Windows installation was not tested.
- **Port in use:** close your other Butler console or start with a different `PORT`. The launcher never stops an unrelated process. The managed engine uses loopback port 18639.

## Scanned documents are separate

Mistral OCR is a separate cloud capability. It is off until you explicitly opt in within AI setup. It still requires `MISTRAL_API_KEY` in the server environment and uploads the selected scanned document. The included text model does not provide offline OCR. No local OCR adapter is shipped. Text PDFs and manual notes remain usable separately.

## Data and existing installations

This new folder starts with no personal records. `data/butler.sqlite` stores durable application state and the LMS inbox; `data/ai/` stores nonsecret setup, protected ciphertext and download journals; school profiles and separate session/archive directories are under `data/lms/`. Browser IndexedDB is scoped to its browser/origin. Models live in the chosen folder. Do not delete these when upgrading.

The original repair workspace was not reset, cleaned or overwritten. Do not overwrite an existing installation or its data with this package. Stop the old app and make your own backup before any future migration; no private database or school session was copied for this task. The profile, semester, submission-fact and confirmation-card code is retained. Existing task Active/history presentation behavior was not redesigned.

## Package limits and notices

Bundled target: Windows x64 **CPU**. Node, the actual pinned llama.cpp engine, LLVM OpenMP and notices are present. No CUDA/Vulkan/Metal runtime or model weights are bundled; other platforms can build the source and use a loopback compatible service, but no other-platform package was produced. See `THIRD-PARTY-NOTICES.md`, `licenses/` and `PACKAGE-MANIFEST.json`. Nothing is uploaded or published by these launch/package scripts.
