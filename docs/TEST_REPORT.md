# SassyCam 1.0 verification

Date: 2026-10-21 (America/Toronto). Candidate release; this report distinguishes source coverage from executed integration evidence.

## Passed locally

- TypeScript checking and production Vite desktop build on Windows 11 / Node 25.8.
- 28 Node contract/security tests: provider payloads, photo forwarding, personal credentials only, quota errors, account-specific models, completed/truncated SSE, OAuth state/nonce/PKCE/JWT validation, atomic encrypted vault, concurrent refresh, loopback/Host/Origin checks, profile separation, stable origin after a full service restart, bounded native image opening, and parent-scoped shutdown protection.
- Electron/Chromium UI scenario with **synthetic camera and synthetic pictures**: live preview, snapshot, import, local illustration, gallery, persistence after page reload, typed reply through a local mock provider with photo forwarding, worship -100, framing grid, and mobile navigation without horizontal overflow at a 374px content viewport.
- Real Qwen 3.5 0.8B WebGPU image inference through the studio, plus a text-only request with `vision:false`. French output was observed, with variable quality. The complete source scenario passes 18 checks, including cancellation, responsive controls while inference is running, and real Whisper tiny transcription of a synthetic system-TTS fixture (“Take a photo.”). No physical microphone recording was used.
- CPU/WASM model activation, image inference, text-only inference and cancellation: 17 checks passed using the automatic SmolVLM fallback. Initial French output from that small model was unusable; its final configuration explicitly uses English and the UI discloses that limitation.
- Sites/Vinext production builds and local preview. Simulated Sites sign-in resolves the test visitor `local_seedy`; this is local-preview evidence only.
- Private production Site deployed at https://sassycam-studio.vhaloo.chatgpt.site. Real owner sign-in and owner name display verified through the browser. The final hosted worker loaded Qwen, completed text-only and imported synthetic-image inference, and created a labelled non-generative illustration in its gallery. This demonstrates execution, not measured visual accuracy. Service-access checks returned page/status 200, no invented visitor identity or plan capability, and 401 on an anonymous cloud mutation. A service access header does not become a user.
- Windows x64 installer and portable packaging, with application icon and distinct filenames. Final artifact hashes and packaged-app verification are recorded in delivery evidence when complete.

## Final delivery checks (completed)

- Source `ee304e23f9ebbb675eca7960e3a024eee78f7780` passed all jobs in [CI run 39711874783](https://github.com/vhaloo/SassyCam/actions/runs/39711874783): 28 tests, type checking, production build, and Windows/macOS/Linux packages for x64/ARM64.
- The final Windows x64 packaged application passed all 18 UI/model/voice checks. The CPU fallback passed 17 checks, including actual English image/text replies and cancellation. Both use synthetic media.
- Closing the final AI session left zero application processes. Native teardown needed the eight-second exit guard on this machine; the test process consequently returned exit code 1 after its 18 successful checks. This is a bounded native-shutdown workaround, not evidence that the underlying Chromium/ONNX stall disappeared.
- The owner-private hosted deployment succeeded from Site source `501f57b9d0f7902295b7becfbca66844d2702517`, deployment `appgdep_6ad972e65ac08191871ce487f0cd0525`. Production browser and anonymous-isolation checks passed on that deployment.
- Exact artifact locations, source archive, SHA-256 hashes and machine-readable UI reports are retained in the local release delivery manifest. Packages are unsigned; physical cross-platform operation and signing/notarization are not established by CI.

## Not established by these tests

- Physical webcam/microphone device behavior, camera drivers, live spoken commands, audible TTS quality, and physical Mac/Linux/ARM devices.
- A real user's ChatGPT OAuth approval, entitlement, personal-plan inference or quota accounting. The implementation and security contracts are tested; no existing Codex/ChatGPT credential was reused.
- Live paid OpenAI, Gemini, Claude or Pollinations requests. Provider adapters are exercised against contract fixtures; no creator key or paid request is used.
- Live ComfyUI checkpoint generation, Kokoro Python output, Python Whisper or ROS 2 delivery. They remain optional integrations requiring the documented local services.
- Hosted inference billed to a visitor's ChatGPT plan. That feature requires the separate approved hosted integration and is **not enabled**. Plan-route image generation/audio are unsupported by the documented current contract.

## Observed environment limits and repairs

The installed Ollama 0.22.0 did not produce usable output from the tried Qwen model within its bounded output budget and rejected the current Gemma model format. No global Ollama update was applied. The newly downloaded trial model was removed; existing user models were absent at preflight. Browser AI is the tested free default, and Ollama remains configurable with a compatible current server/model.

The first hosted attempt exceeded Sites' 25 MiB per-file asset limit because Vite emitted an unused 26.9 MB ONNX fallback. The hosted build now verifies the library's version-pinned runtime/CDN contract and excludes only that redundant generated asset. Browser inference still runs on the visitor's device. The runtime and model downloads require network access on first use and are cached thereafter.

Production verification caught Vinext rewriting `import.meta.url` to a build-time file URL. The shared client now uses Vite's explicit worker import so the hosted URL stays relative to the production origin. CPU testing caught an unavailable Qwen `GatherBlockQuantized` kernel; CPU uses the smaller supported model instead of failing after download.

Native Chromium/ONNX teardown left hidden test processes after all UI checks had passed. Desktop shutdown now arms an isolated eight-second guard. Its IPC connection closes as soon as the original parent exits, avoiding PID reuse; it can terminate only that parent and its Windows child tree. Ordinary shutdown remains graceful, and macOS window closing keeps the standard app lifecycle.

Early integration runs exposed a blocked blob script/data URL, a changed Transformers.js processor argument order, and a missing reused reference photo. These were repaired and the complete browser inference scenario was rerun successfully. Partial or stale results are not used as proof of a new inference.

Machine-readable reports and PNG screenshots are retained under the ignored `.qa/` directory; only synthetic inputs are used in these reports. Automated test success is not a reliability percentage.
