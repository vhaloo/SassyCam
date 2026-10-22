# SassyCam 1.0 verification

Date: 2026-10-21 (America/Toronto). Candidate release; this report distinguishes source coverage from executed integration evidence.

## Passed locally

- TypeScript checking and production Vite desktop build on Windows 11 / Node 25.8.
- 27 Node contract/security tests: provider payloads, photo forwarding, personal credentials only, quota errors, account-specific models, completed/truncated SSE, OAuth state/nonce/PKCE/JWT validation, atomic encrypted vault, concurrent refresh, loopback/Host/Origin checks, profile separation, stable origin after a full service restart, and bounded native image opening.
- Electron/Chromium UI scenario with **synthetic camera and synthetic pictures**: live preview, snapshot, import, local illustration, gallery, persistence after page reload, typed reply through a local mock provider with photo forwarding, worship -100, framing grid, and mobile navigation without horizontal overflow at a 374px content viewport.
- Real local browser model download and image inference, using SmolVLM-256M through the actual studio. Observed output for a geometric test picture: “On a blue background there is a black circle in the middle.” This demonstrates model execution, not French fluency, humor quality or measured visual accuracy.
- Sites/Vinext production builds and local preview. Simulated Sites sign-in resolves the test visitor `local_seedy`; this is local-preview evidence only.
- Windows x64 installer and portable packaging, with application icon and distinct filenames. Final artifact hashes and packaged-app verification are recorded in delivery evidence when complete.

## Delivery checks in progress

- Hosted private deployment and actual owner-identity display.
- Cross-platform CI packaging (Windows/macOS/Linux, x64/ARM64).
- Final packaged Windows application launch and exports.
- Optional local voice fixture transcription.

## Not established by these tests

- Physical webcam/microphone device behavior, camera drivers, live spoken commands, audible TTS quality, and physical Mac/Linux/ARM devices.
- A real user's ChatGPT OAuth approval, entitlement, personal-plan inference or quota accounting. The implementation and security contracts are tested; no existing Codex/ChatGPT credential was reused.
- Live paid OpenAI, Gemini, Claude or Pollinations requests. Provider adapters are exercised against contract fixtures; no creator key or paid request is used.
- Live ComfyUI checkpoint generation, Kokoro Python output, Python Whisper or ROS 2 delivery. They remain optional integrations requiring the documented local services.
- Hosted inference billed to a visitor's ChatGPT plan. That feature requires the separate approved hosted integration and is **not enabled**. Plan-route image generation/audio are unsupported by the documented current contract.

## Observed environment limits and repairs

The installed Ollama 0.22.0 did not produce usable output from the tried Qwen model within its bounded output budget and rejected the current Gemma model format. No global Ollama update was applied. The newly downloaded trial model was removed; existing user models were absent at preflight. Browser AI is the tested free default, and Ollama remains configurable with a compatible current server/model.

The first hosted attempt exceeded Sites' 25 MiB per-file asset limit because Vite emitted an unused 26.9 MB ONNX fallback. The hosted build now verifies the library's version-pinned runtime/CDN contract and excludes only that redundant generated asset. Browser inference still runs on the visitor's device. The runtime and model downloads require network access on first use and are cached thereafter.

Early integration runs exposed a blocked blob script/data URL, a changed Transformers.js processor argument order, and a missing reused reference photo. These were repaired and the complete browser inference scenario was rerun successfully. Partial or stale results are not used as proof of a new inference.

Machine-readable reports and PNG screenshots are retained under the ignored `.qa/` directory; only synthetic inputs are used in these reports. Automated test success is not a reliability percentage.
