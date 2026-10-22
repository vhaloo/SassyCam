# SassyCam 0.1.2 → 1.0

Implemented does not mean every physical device or provider has been exercised. See TEST_REPORT.md for execution evidence.

| Original capability | 1.0 desktop | Hosted ChatGPT Site |
|---|---|---|
| Live camera | Native Chromium camera permission, device picker, release on stop/background | HTTPS browser camera, subject to browser and embedding permissions |
| Photo used as context | Single frame or imported normalized photo | Same shared studio |
| Worship → roast | Continuous -100…+100, neutral at 0, five presets | Same |
| Spoken response | System voices; optional Kokoro local | Browser/system speech; availability varies |
| Voice input and commands | One-shot local Whisper; optional native Python | Browser recognition or local Whisper download |
| Typed reply | Keyboard input and Ctrl/Cmd+Enter | Same |
| Automatic reaction | 15–300 seconds; paused when hidden, inactive or busy | Same |
| Model/provider choice | Ollama, ChatGPT plan, OpenAI, Gemini, Claude, compatible endpoint, Pollinations | Browser AI, visitor's OpenAI/Gemini/Claude/Pollinations API |
| Free option | Qwen 3.5 browser worker on compatible GPU; English SmolVLM on CPU; configurable Ollama | Same local worker; explicit download and automatic GPU/CPU choice |
| Actual generated portraits | Reference-based OpenAI/Gemini; local ComfyUI; compatible image API | Visitor's OpenAI/Gemini image API |
| Free photo art | Explicitly labelled local illustration, not generative AI | Same |
| Gallery and history | IndexedDB, isolated per profile, stable origin across restarts | IndexedDB, isolated per signed-in visitor on each browser |
| Browse originals | Timeline, full image preview, image/card export | Same |
| Open in OS / folder | Downloads can be opened with the OS | Browser downloads / full preview |
| Subtitles / audio feedback | Persistent reaction card and speaking state | Same |
| Languages | French, English, Spanish, Japanese, Korean, Chinese responses | Same; provider/model language quality varies |
| Audio devices | Input selection; Kokoro output selection; system default for native speech | Browser-dependent input; system default speech |
| ROS 2 | Optional Python adapter | Requires desktop; browser has no rclpy runtime |
| Profiles and secrets | Separate local profiles; OS-encrypted key vault; no plaintext fallback | ChatGPT Sites identity; API keys stay in tab memory and request scope |
| Cross-platform | Electron Windows/macOS/Linux builds for x64/ARM64 | Current desktop/mobile browsers |

## ChatGPT identity and personal quota are separate

Sites supplies sign-in identity. It does **not** supply a visitor inference token. The hosted Site does not pretend to consume the visitor's subscription or use the owner's subscription behind the scenes.

The desktop implements the documented open-source public-client flow: persistent opaque host ID, dynamic registration, loopback listener, state and nonce, PKCE S256, signature/audience/issuer/expiry verification, user-granted plan scopes, encrypted credentials, rotating refresh token, account-specific model catalog, and streaming Responses requests with `store:false`. Only a completed response is accepted.

The hosted equivalent requires OpenAI approval for a remotely hosted integration. This is an external platform requirement, not a feature that can be enabled by adding a login button. Furthermore, the current plan route excludes image generation and audio. These remain independently selectable providers even on desktop.

Official sources checked 2026-10-21:

- [Hosted and OSS integration scope](https://developers.openai.com/siwc/token-sharing-open-source)
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Plan route limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Sites identity and sharing](https://learn.chatgpt.com/docs/sites?surface=app)

## Migration and recovery

Starting commit: `2a8e160`. Local checkpoint tag: `checkpoint/pre-1.0-2026-10-21`. The Git history and original Python implementation are retained. Gallery JSON exports contain photos and should be stored privately. Import is validated and transactional; originals and existing entries are preserved. No installer recursively deletes an earlier installation.
