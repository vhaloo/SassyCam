# Hosted personal-plan integration: external prerequisite

The Site is implemented and usable with local browser AI and visitor-owned provider keys. Its ChatGPT login provides visitor identity. No creator-owned inference credentials are configured.

The exact requested experience — fully hosted inference charged to each visitor's ChatGPT subscription — is **not enabled**. Official open-source plan registration permits local/self-hosted tools with loopback callbacks. OpenAI directs remote/paid apps to its hosted integration approval process. The Site's identity client is not an inference entitlement.

To complete this extension, the owner must obtain an OpenAI-approved hosted plan integration for SassyCam and its deployed origin. Required deliverables from the platform are the supported inference authorization flow, client registration, scopes, callback contract and allowed modalities. This application must then obtain each visitor's explicit permission and keep tokens isolated server-side. Existing Site identity and sharing must be preserved.

Do not copy the desktop token into the hosted environment, request a ChatGPT cookie, reuse Codex credentials, forward the owner's session, or use unsupported backend endpoints. The current application does none of these.

An approval request can describe the project as: “SassyCam is an MIT-licensed creative webcam companion. Users explicitly request individual-frame vision reactions, control admiration/roast intensity and choose their own providers. We request supported per-visitor ChatGPT plan authorization for the hosted Site. We will separate identity from inference consent, enforce per-user token isolation and limits, and disclose that image generation/audio may need independent providers.”

See [official integration overview](https://developers.openai.com/siwc/token-sharing-open-source), [quickstart](https://developers.openai.com/siwc/quickstart) and [modality limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).
