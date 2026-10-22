# SassyCam 1.0 delivery plan

Starting point: 0.1.2, commit 2a8e160. Local recovery tag: checkpoint/pre-1.0-2026-10-21.
Indicative total: 2 h 15 min–4 h 25 min. Estimates are not measured effort or billing.

- [x] Audit original features and defects (10–15 min).
- [x] Verify Sites identity and official personal-plan inference contracts (5–10 min).
- [x] Implement shared studio, camera selection, framing, upload and capture (20–35 min).
- [x] Implement mood controls, typed replies, voice, subtitles, automatic sessions (20–35 min).
- [x] Implement provider adapters and genuinely local free inference (20–35 min).
- [x] Implement independent image generation, local illustrations and gallery (20–35 min).
- [x] Secure desktop credentials and personal ChatGPT OAuth (20–35 min).
- [x] Package Windows, macOS and Linux; retain optional legacy integrations (15–25 min).
- [x] Integrate Sites authentication and deploy owner-private review version (15–30 min).
- [x] Run provider, auth, storage, lifecycle, build and UI checks (20–40 min).
- [ ] Deliver source PR, binaries, parity matrix and honest verification report (10–20 min).

## Confirmed platform constraints

Sites sign-in supplies visitor identity, not an inference token. Remote ChatGPT plan use needs the separately approved commercial/hosted integration. The OSS dynamic-registration flow is for local/self-hosted tools, with a loopback callback. It is implemented only on desktop. Its Responses route requires streaming, store:false, terminal completion, account-specific model discovery, and separate user consent. It does not support image-generation tools or audio. Do not route requests through the owner's account, scrape ChatGPT sessions, or mislabel a local image filter as generative AI.

Sources checked on 2026-10-21:
- https://developers.openai.com/siwc/token-sharing-open-source
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
- https://learn.chatgpt.com/docs/sites?surface=app

