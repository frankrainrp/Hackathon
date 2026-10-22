# Third-party notices and distribution boundary

This local artifact does not assign a new license to the Hackathon application or its existing assets. The inference engine's MIT license does not cover model weights, every dependency, or the whole application.

| Component | Pinned source / license | Included notice and condition |
| --- | --- | --- |
| llama.cpp / ggml | Official `ggml-org/llama.cpp`, b11669, commit `620d2225cc436ab0b001e3200e590e3b286ef9ab`; MIT | `runtime/llama/LICENSE-llama.cpp.txt`. Preserve copyright and permission notice when copying/distributing the engine. |
| Official engine archive | `llama-b11669-bin-win-cpu-x64.zip`, SHA-256 `37b3efcf962847ca869745fd4ccf7f5e7e8dacfeff9fa3523b4ca8cdc66d632b` | Downloaded from the official GitHub release and checked against its published digest. The unmodified CPU DLLs and server executable are included; the local supervisor is application code. |
| LLVM OpenMP `libomp.dll` | Archive's `LICENSE-LLVM-OpenMP`: Apache-2.0 with LLVM exceptions and additional historical notices | Original license file kept next to the DLL. Preserve the complete file, including its additional terms/notices. |
| BoringSSL | Official build pins `0.20260929.0`; Apache-2.0 and file-specific historical notices referenced by its license | `licenses/LICENSE-BoringSSL-0.20260929.0.txt`. Official release workflow enables BoringSSL. |
| cpp-httplib, json.hpp and hash utilities | Their MIT/BSD/public-domain terms as stated in preserved official files | Corresponding `licenses/` files. Do not remove attribution or change upstream license text. |
| stb_image and miniaudio code used by multimodal support | stb_image: MIT/public domain; miniaudio: MIT-0/public domain | Original license sections and complete headers from b11669 preserved in `licenses/`, including their embedded decoder notices. Managed text inference does not imply multimodal/OCR capability. |
| Embedded engine UI vendor code | big-integer and nerdamer-prime notices from b11669 | Preserved in `licenses/`, even though the managed server disables the web UI. |
| Node.js 24.18.0 | MIT plus bundled dependency notices | `licenses/LICENSE-Node.js.txt`, copied from the matching official Node source tag; full combined text retained. |
| Inter and Cinzel fonts | SIL Open Font License 1.1 | Original Google Fonts OFL texts preserved in `licenses/`. Production font assets are self-hosted by Next's build output. |
| npm runtime/application dependencies | Their package-specific licenses | `licenses/npm-manifest.json` and preserved package license files. Next 14.2.35, React 18.3.1, OpenAI SDK 4.104.0 and better-sqlite3 12.11.1 are used by this lockfile/build. The collector includes development-package notices too; inclusion in that list is not a claim every package is executed at runtime. |
| GGUF catalog weights | Google Gemma 4 and Qwen official model cards, with identified Unsloth community quantizations; Apache-2.0 | Weights are not included. Their separate `LICENSE-Qwen-models.txt` is retained and the UI links each model card. Revision, byte count and SHA-256 are pinned per file. User download is explicit. |
| Microsoft Visual C++ / Windows UCRT | Microsoft system runtime prerequisite | **Not redistributed.** PE imports include MSVCP140.dll, VCRUNTIME140.dll and VCRUNTIME140_1.dll. Windows system DLLs are not copied. Microsoft's redistributable is subject to its license and licensed Visual Studio distribution rights. No entitlement for this publisher was established, so no Microsoft installer/DLL is bundled or silently installed. |

Official references reviewed on 21 October 2026:

- [llama.cpp b11669 release](https://github.com/ggml-org/llama.cpp/releases/tag/b11669), [MIT license](https://github.com/ggml-org/llama.cpp/blob/b11669/LICENSE), [release workflow](https://github.com/ggml-org/llama.cpp/blob/b11669/.github/workflows/release.yml).
- [Pinned HTTP/TLS build configuration](https://github.com/ggml-org/llama.cpp/blob/b11669/vendor/cpp-httplib/CMakeLists.txt), [BoringSSL license](https://github.com/google/boringssl/blob/0.20260929.0/LICENSE).
- [Microsoft runtime download and prerequisites](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist), [Microsoft redistribution terms](https://learn.microsoft.com/en-us/cpp/windows/redistributing-visual-cpp-files).

Packaging creates a local archive only. It does not publish a release, push repository commits, install system runtimes or download model weights. Repository source updates and binary release publication are separate actions.

School connector: a local PyInstaller 6.16.0 onedir build includes Python 3.12.14, Playwright 1.64.0, pypdf 6.21.1 and cryptography 47.0.0 with their runtime dependencies. Complete dependency notices are preserved under `ops/lms-sync/third-party-notices/manifest.json` and companion files. PyInstaller’s bootloader exception permits distribution of the frozen application under the application’s terms; it does not license the application itself. Playwright’s driver is included; Edge/browser binaries are not. Microsoft runtime DLLs are excluded, retaining the host prerequisite above. No Python installation or package manager is run by the distributed app.
