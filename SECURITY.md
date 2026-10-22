# Security and privacy

SassyCam is an entertainment and creative application, not an identity, health or psychological assessment tool.

- No creator-owned API key or subscription token is embedded in the application or hosted source.
- Desktop secrets use Electron safeStorage and are refused when its OS encryption is unavailable (including Linux basic_text). Browser API keys stay in tab memory and request scope.
- The local service binds only to 127.0.0.1, rejects unexpected Host/Origin values and requires a custom header on mutations. HTTP custom providers are limited to loopback; remote providers require HTTPS. Hosted custom provider URLs are not allowed.
- ChatGPT plan use follows documented public OAuth endpoints and user-granted scopes. It does not extract cookies, reuse Codex sessions or call undocumented backend APIs. Inference is accepted only after its stream completes.
- Images and replies stay in browser IndexedDB unless the user generates with a cloud provider or exports them. On a shared computer, use separate browser/OS profiles: local gallery separation is an application boundary, not encryption against someone controlling that same browser profile.
- Backgrounding or stopping the studio releases camera/microphone activity, pauses automatic requests, cancels generation and discards pending voice actions. A cloud provider may still finish a request already accepted; cancellation cannot undo provider-side billing.
- Cloud mode, optional browser speech services and their data flow are disclosed in settings. Provider retention and billing policies remain the visitor's responsibility.
- Gallery imports allow only bounded text and raster data URLs and are validated before a transaction. JSON exports contain private pictures and should be handled as personal files.

Report a security concern privately to the repository owner through GitHub's supported private reporting mechanism when available. Do not include API keys or private pictures in public issues.
