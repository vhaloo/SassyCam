import test from "node:test";
import assert from "node:assert/strict";
import {
  validateInput,
  systemPrompt,
  clampMood,
  voiceCommand,
} from "../server/contracts.mjs";
import {
  generateReply,
  generateImage,
  listModels,
  consumeResponsesSSE,
  endpoint,
} from "../server/providers.mjs";
const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const base = {
  provider: "openai",
  model: "personal-model",
  text: "Salut",
  image,
  mood: 35,
  language: "fr",
  apiKey: "visitor-key",
};
const response = (data) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
function sse(events, split = 11) {
  const bytes = new TextEncoder().encode(
    events.map((e) => "data: " + JSON.stringify(e) + "\r\n\r\n").join(""),
  );
  return new Response(
    new ReadableStream({
      start(c) {
        for (let i = 0; i < bytes.length; i += split)
          c.enqueue(bytes.slice(i, i + split));
        c.close();
      },
    }),
  );
}
test("input refuses active content, oversized images and malformed providers", () => {
  assert.throws(
    () => validateInput({ ...base, image: "data:image/svg+xml;base64,aaa" }),
    /Image JPEG/,
  );
  assert.throws(
    () => validateInput({ ...base, provider: "owner" }),
    /fournisseur/,
  );
  assert.throws(
    () => validateInput({ ...base, text: "x".repeat(4001) }),
    /4 000/,
  );
  assert.throws(
    () => validateInput({ ...base, apiKey: "key\nsecret" }),
    /invalide/,
  );
  assert.equal(clampMood(-500), -100);
  assert.equal(clampMood(Infinity), 0);
});
test("zero mood is neutral; no-photo prompts never claim vision", () => {
  assert.match(systemPrompt({ mood: 0, language: "fr" }), /Be factual/);
  assert.match(
    systemPrompt({ mood: -100, language: "fr" }),
    /theatrically admiring/,
  );
  assert.match(systemPrompt({ mood: 100, language: "fr" }), /sharpness/);
  assert.match(systemPrompt({ mood: 30, language: "fr" }), /never pretend/);
});
test("voice stop and photo commands are exact, normal speech is preserved", () => {
  assert.equal(voiceCommand("Arrête !").type, "stop");
  assert.equal(voiceCommand("Prends une photo").type, "capture");
  assert.equal(voiceCommand("Plus doux").delta, -25);
  assert.equal(voiceCommand("Ne dis pas stop pour moi").type, "reply");
});
test("hosted custom endpoints are blocked even when base is omitted", () => {
  assert.throws(() => endpoint(undefined, false, "http://127.0.0.1"), /bureau/);
  for (const u of [
    "file:///etc/passwd",
    "http://example.org",
    "https://key:secret@example.org",
    "https://example.org/?key=secret",
  ])
    assert.throws(() => endpoint(u, true, ""));
  assert.equal(
    endpoint("http://127.0.0.1:1234/v1", true, ""),
    "http://127.0.0.1:1234/v1",
  );
});
test("OpenAI uses only visitor credentials and preserves the attached image", async () => {
  let req;
  const out = await generateReply(base, {
    fetch: async (url, options) => {
      req = { url, ...options };
      return response({ choices: [{ message: { content: "Bonne mine." } }] });
    },
  });
  assert.equal(out.text, "Bonne mine.");
  assert.equal(req.headers.Authorization, "Bearer visitor-key");
  const b = JSON.parse(req.body);
  assert.equal(b.messages[1].content[0].image_url.url, image);
  assert.equal(req.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(req.redirect, "error");
});
test("missing personal key never falls back to a shared or environment key", async () => {
  await assert.rejects(
    generateReply(
      { ...base, apiKey: "" },
      { fetch: () => assert.fail("must not fetch") },
    ),
    (e) => e.code === "key_required",
  );
});
test("Gemini carries key in header and photo as inlineData", async () => {
  await generateReply(
    { ...base, provider: "gemini" },
    {
      fetch: async (url, o) => {
        assert.ok(!url.includes("visitor-key"));
        assert.equal(o.headers["x-goog-api-key"], "visitor-key");
        const b = JSON.parse(o.body);
        assert.equal(b.contents[0].parts[1].inlineData.mimeType, "image/png");
        return response({
          candidates: [{ content: { parts: [{ text: "Visible." }] } }],
        });
      },
    },
  );
});
test("Anthropic adapter sends multimodal content and native API version", async () => {
  await generateReply(
    { ...base, provider: "anthropic" },
    {
      fetch: async (url, o) => {
        assert.equal(o.headers["anthropic-version"], "2023-06-01");
        assert.equal(
          JSON.parse(o.body).messages[0].content[0].source.type,
          "base64",
        );
        return response({ content: [{ type: "text", text: "Hello" }] });
      },
    },
  );
});
test("ChatGPT plan sends only supported Responses fields and waits for completion", async () => {
  const out = await generateReply(
    { ...base, provider: "chatgpt" },
    {
      local: true,
      chatgptToken: "user-oauth",
      fetch: async (url, o) => {
        assert.equal(url, "https://api.openai.com/v1/responses");
        assert.equal(o.headers.Authorization, "Bearer user-oauth");
        const b = JSON.parse(o.body);
        assert.deepEqual(Object.keys(b).sort(), [
          "input",
          "instructions",
          "model",
          "store",
          "stream",
        ]);
        assert.equal(b.store, false);
        assert.equal(b.stream, true);
        return sse(
          [
            { type: "response.output_text.delta", delta: "Terminé." },
            { type: "response.completed" },
          ],
          1,
        );
      },
    },
  );
  assert.equal(out.text, "Terminé.");
});
test("ChatGPT stream rejects truncation, late quota errors and incomplete results", async () => {
  await assert.rejects(
    consumeResponsesSSE(
      sse([{ type: "response.output_text.delta", delta: "partial" }]),
    ),
    (e) => e.code === "interrupted_stream",
  );
  await assert.rejects(
    consumeResponsesSSE(
      sse([
        { type: "response.output_text.delta", delta: "partial" },
        {
          type: "response.failed",
          response: {
            error: { code: "subscription_sharing_usage_limit_exceeded" },
          },
        },
      ]),
    ),
    (e) => e.code === "subscription_sharing_usage_limit_exceeded",
  );
  await assert.rejects(
    consumeResponsesSSE(sse([{ type: "response.incomplete" }])),
    (e) => e.code === "incomplete_response",
  );
});
test("hosted requests cannot use local personal-plan credentials", async () => {
  await assert.rejects(
    generateReply(
      { ...base, provider: "chatgpt" },
      { local: false, chatgptToken: "never-use" },
    ),
    (e) => e.code === "chatgpt_local_required",
  );
});
test("ChatGPT models use the account catalog ordering and visibility", async () => {
  const models = await listModels(
    { provider: "chatgpt" },
    {
      local: true,
      chatgptToken: "account",
      fetch: async () =>
        response({
          models: [
            { slug: "hidden", visibility: "hide" },
            { slug: "second", display_name: "User model", visibility: "list" },
            { slug: "first", visibility: "list" },
          ],
        }),
    },
  );
  assert.deepEqual(
    models.map((m) => m.id),
    ["second", "first"],
  );
});
test("429 returns a technical error and retry timing, never a joke", async () => {
  await assert.rejects(
    generateReply(base, {
      fetch: async () =>
        new Response('{"error":{"code":"rate_limit"}}', {
          status: 429,
          headers: { "retry-after": "12" },
        }),
    }),
    (e) => e.code === "rate_limit" && e.retryAfter === "12",
  );
});
test("image edits send reference bytes and the image-specific model", async () => {
  const out = await generateImage(
    { ...base, imageProvider: "openai", imageModel: "image-model" },
    {
      fetch: async (url, o) => {
        assert.equal(url, "https://api.openai.com/v1/images/edits");
        assert.equal(o.body.get("model"), "image-model");
        assert.equal(o.body.get("image").type, "image/png");
        assert.equal(o.headers.Authorization, "Bearer visitor-key");
        return response({ data: [{ b64_json: "AA==" }] });
      },
    },
  );
  assert.equal(out.generated, true);
  assert.equal(out.image, "data:image/png;base64,AA==");
});
test("Gemini image generation includes photo, supports separate model, refuses missing images", async () => {
  const out = await generateImage(
    { ...base, imageProvider: "gemini", imageModel: "gemini-3.1-flash-image" },
    {
      fetch: async (url, o) => {
        assert.match(url, /gemini-3.1-flash-image:generateContent/);
        assert.deepEqual(
          JSON.parse(o.body).generationConfig.responseModalities,
          ["TEXT", "IMAGE"],
        );
        return response({
          candidates: [
            {
              content: {
                parts: [
                  { inlineData: { mimeType: "image/png", data: "AA==" } },
                ],
              },
            },
          ],
        });
      },
    },
  );
  assert.equal(out.generated, true);
  assert.throws(
    () =>
      validateInput(
        { ...base, imageProvider: "gemini", image: undefined },
        "image",
      ),
    (e) => e.code === "image_required",
  );
});
