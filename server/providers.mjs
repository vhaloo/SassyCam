import {
  AppError,
  splitImage,
  systemPrompt,
  imagePrompt,
} from "./contracts.mjs";

const DEFAULTS = {
  openai: "gpt-6.1-sol",
  gemini: "gemini-3.5-flash",
  anthropic: "claude-sonnet-4-6",
  pollinations: "openai",
};
export async function readProviderResponse(response) {
  if (!response.ok) {
    let code = "provider_error";
    try {
      const e = await response.json();
      code = String(e.error?.code || e.error?.status || code);
    } catch {}
    const status = response.status;
    throw new AppError(
      status === 429
        ? "rate_limit"
        : status === 401 || status === 403
          ? "provider_auth"
          : code,
      status === 429
        ? "Quota ou limite de débit du fournisseur atteint. Réessayez plus tard."
        : status === 401 || status === 403
          ? "Le fournisseur a refusé la clé ou cette autorisation. Vérifiez votre compte."
          : `Le fournisseur a refusé la requête (HTTP ${status}). Vérifiez le modèle et les capacités de votre compte.`,
      status === 429 ? 429 : 502,
      response.headers.get("retry-after"),
    );
  }
  return response;
}
function cleanText(t) {
  if (typeof t !== "string" || !t.trim())
    throw new AppError(
      "empty_response",
      "Le fournisseur a terminé sans produire de texte.",
      502,
    );
  return t.trim().slice(0, 12000);
}
export function endpoint(base, local, fallback) {
  if (!local)
    throw new AppError(
      "desktop_only",
      "Les adresses personnalisées sont disponibles dans l’application bureau.",
    );
  if (!base) return fallback;
  let u;
  try {
    u = new URL(base);
  } catch {
    throw new AppError("invalid_endpoint", "Adresse du fournisseur invalide.");
  }
  if (
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    (u.protocol === "http:" &&
      !["127.0.0.1", "localhost", "[::1]"].includes(u.hostname))
  )
    throw new AppError(
      "invalid_endpoint",
      "Utilisez HTTPS ou un serveur local sur 127.0.0.1.",
    );
  return u.href.replace(/\/$/, "");
}
function requireKey(key) {
  if (!key)
    throw new AppError(
      "key_required",
      "Ajoutez votre propre clé API dans les réglages. Aucune clé du créateur n’est utilisée.",
      401,
    );
  return key;
}
function userContent(b, format = "openai") {
  const text = b.text || "Give me your reaction to this scene.";
  if (!b.image)
    return format === "anthropic"
      ? [{ type: "text", text }]
      : [{ type: "text", text }];
  if (format === "anthropic") {
    const { mime, base64 } = splitImage(b.image);
    return [
      {
        type: "image",
        source: { type: "base64", media_type: mime, data: base64 },
      },
      { type: "text", text },
    ];
  }
  return [
    { type: "image_url", image_url: { url: b.image } },
    { type: "text", text },
  ];
}
export async function consumeResponsesSSE(response) {
  await readProviderResponse(response);
  if (!response.body) throw new AppError("empty_stream", "Flux vide.", 502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "",
    text = "",
    completed = false;
  function eventBlock(block) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;
    let e;
    try {
      e = JSON.parse(data);
    } catch {
      throw new AppError(
        "invalid_stream",
        "Flux du fournisseur invalide.",
        502,
      );
    }
    if (e.type === "response.output_text.delta") text += e.delta || "";
    if (["response.failed", "response.incomplete", "error"].includes(e.type)) {
      const code =
        e.response?.error?.code || e.error?.code || "incomplete_response";
      throw new AppError(
        code,
        code.startsWith("subscription_sharing")
          ? "Votre quota ChatGPT est indisponible ou atteint. Vérifiez les limites de cette application dans ChatGPT."
          : "La réponse a été interrompue par le fournisseur.",
        502,
      );
    }
    if (e.type === "response.completed") completed = true;
  }
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer = (buffer + decoder.decode(value, { stream: !done })).replace(
        /\r\n/g,
        "\n",
      );
      let ix;
      while ((ix = buffer.indexOf("\n\n")) >= 0) {
        eventBlock(buffer.slice(0, ix));
        buffer = buffer.slice(ix + 2);
      }
      if (done) break;
      if (buffer.length > 1_000_000 || text.length > 50000)
        throw new AppError("large_response", "Réponse trop volumineuse.", 502);
    }
    if (buffer.trim()) eventBlock(buffer);
    if (!completed)
      throw new AppError(
        "interrupted_stream",
        "Connexion interrompue avant la fin de la réponse. Aucun résultat incomplet n’a été enregistré.",
        502,
      );
    return cleanText(text);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function generateReply(b, context = {}) {
  const f = context.fetch || fetch;
  const signal = context.signal
    ? AbortSignal.any([context.signal, AbortSignal.timeout(120000)])
    : AbortSignal.timeout(120000);
  const p = b.provider;
  const model = b.model && b.model !== "auto" ? b.model : DEFAULTS[p];
  const instructions = systemPrompt(b);
  let text;
  const post = (url, body, headers = {}) =>
    f(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
      redirect: "error",
    });
  if (p === "chatgpt") {
    if (!context.local || !context.chatgptToken)
      throw new AppError(
        "chatgpt_local_required",
        "L’utilisation du quota ChatGPT est disponible dans SassyCam bureau après votre autorisation personnelle. La connexion au Site sert à vous identifier.",
        403,
      );
    if (!model)
      throw new AppError(
        "model_required",
        "Actualisez les modèles disponibles sur votre compte ChatGPT et choisissez-en un.",
      );
    const input = [
      {
        role: "user",
        content: [
          { type: "input_text", text: b.text || "React to this scene." },
          ...(b.image ? [{ type: "input_image", image_url: b.image }] : []),
        ],
      },
    ];
    text = await consumeResponsesSSE(
      await post(
        "https://api.openai.com/v1/responses",
        { model, instructions, input, store: false, stream: true },
        { Authorization: `Bearer ${context.chatgptToken}` },
      ),
    );
  } else if (p === "ollama") {
    if (!context.local)
      throw new AppError(
        "desktop_only",
        "Ollama est disponible dans l’application bureau. Sur le Site, choisissez l’IA locale du navigateur.",
      );
    const base = endpoint(b.endpoint, true, "http://127.0.0.1:11434");
    let selected = model;
    if (!selected) {
      const tags = await (
        await readProviderResponse(
          await f(`${base}/api/tags`, { signal, redirect: "error" }),
        )
      ).json();
      selected = tags.models?.[0]?.name;
    }
    if (!selected)
      throw new AppError(
        "model_required",
        "Installez un modèle de vision dans Ollama, puis actualisez les modèles.",
      );
    const data = await (
      await readProviderResponse(
        await post(`${base}/api/chat`, {
          model: selected,
          messages: [
            { role: "system", content: instructions },
            {
              role: "user",
              content: b.text || "React to this scene.",
              ...(b.image ? { images: [splitImage(b.image).base64] } : {}),
            },
          ],
          stream: false,
          ...(selected.startsWith("qwen3") ? { think: false } : {}),
          keep_alive: "2m",
          options: { num_predict: 200, num_ctx: 4096 },
        }),
      )
    ).json();
    text = data.message?.content;
  } else if (p === "gemini") {
    const parts = [{ text: b.text || "React to this scene." }];
    if (b.image) {
      const { mime, base64 } = splitImage(b.image);
      parts.push({ inlineData: { mimeType: mime, data: base64 } });
    }
    const data = await (
      await readProviderResponse(
        await post(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            systemInstruction: { parts: [{ text: instructions }] },
            contents: [{ role: "user", parts }],
            generationConfig: { maxOutputTokens: 600 },
          },
          { "x-goog-api-key": requireKey(b.apiKey) },
        ),
      )
    ).json();
    text = data.candidates?.[0]?.content?.parts
      ?.filter((x) => x.text && !x.thought)
      .map((x) => x.text)
      .join("\n");
  } else if (p === "anthropic") {
    const data = await (
      await readProviderResponse(
        await post(
          "https://api.anthropic.com/v1/messages",
          {
            model,
            system: instructions,
            max_tokens: 250,
            messages: [{ role: "user", content: userContent(b, "anthropic") }],
          },
          {
            "x-api-key": requireKey(b.apiKey),
            "anthropic-version": "2023-06-01",
          },
        ),
      )
    ).json();
    text = data.content
      ?.filter((x) => x.type === "text")
      .map((x) => x.text)
      .join("\n");
  } else if (["openai", "compatible", "pollinations"].includes(p)) {
    const base =
      p === "openai"
        ? "https://api.openai.com/v1"
        : p === "pollinations"
          ? "https://gen.pollinations.ai"
          : endpoint(b.endpoint, context.local, "http://127.0.0.1:1234/v1");
    if (!model)
      throw new AppError(
        "model_required",
        "Choisissez le nom du modèle dans les réglages.",
      );
    const authHeader =
      p === "compatible" &&
      !b.apiKey &&
      ["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname)
        ? {}
        : { Authorization: `Bearer ${requireKey(b.apiKey)}` };
    const data = await (
      await readProviderResponse(
        await post(
          `${base}/chat/completions`,
          {
            model,
            messages: [
              { role: "system", content: instructions },
              { role: "user", content: userContent(b) },
            ],
          },
          authHeader,
        ),
      )
    ).json();
    text = data.choices?.[0]?.message?.content;
  } else
    throw new AppError(
      "local_inference",
      "Ce fournisseur s’exécute directement dans le navigateur.",
    );
  return {
    text: cleanText(text),
    provider: p,
    model: model || "local",
    vision: !!b.image,
  };
}
export async function listModels(b, context = {}) {
  const f = context.fetch || fetch;
  const signal = context.signal
    ? AbortSignal.any([context.signal, AbortSignal.timeout(15000)])
    : AbortSignal.timeout(15000);
  let data;
  if (b.provider === "chatgpt") {
    if (!context.local || !context.chatgptToken)
      throw new AppError(
        "auth_required",
        "Connectez votre compte ChatGPT dans l’application bureau.",
        401,
      );
    data = await (
      await readProviderResponse(
        await f("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${context.chatgptToken}` },
          signal,
          redirect: "error",
        }),
      )
    ).json();
    return (data.models || [])
      .filter((m) => m.visibility === "list")
      .map((m) => ({ id: m.slug, name: m.display_name || m.slug }));
  }
  if (b.provider === "ollama") {
    if (!context.local)
      throw new AppError(
        "desktop_only",
        "Ollama nécessite l’application bureau.",
      );
    data = await (
      await readProviderResponse(
        await f(
          `${endpoint(b.endpoint, true, "http://127.0.0.1:11434")}/api/tags`,
          { signal, redirect: "error" },
        ),
      )
    ).json();
    return (data.models || []).map((m) => ({ id: m.name, name: m.name }));
  }
  if (b.provider === "gemini") {
    data = await (
      await readProviderResponse(
        await f(
          "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
          {
            headers: { "x-goog-api-key": requireKey(b.apiKey) },
            signal,
            redirect: "error",
          },
        ),
      )
    ).json();
    return (data.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({
        id: m.name.replace("models/", ""),
        name: m.displayName || m.name,
      }));
  }
  const base =
    b.provider === "openai"
      ? "https://api.openai.com/v1"
      : b.provider === "anthropic"
        ? "https://api.anthropic.com/v1"
        : b.provider === "pollinations"
          ? "https://gen.pollinations.ai"
          : endpoint(b.endpoint, context.local, "http://127.0.0.1:1234/v1");
  const headers =
    b.provider === "anthropic"
      ? { "x-api-key": requireKey(b.apiKey), "anthropic-version": "2023-06-01" }
      : b.provider === "compatible" &&
          !b.apiKey &&
          ["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname)
        ? {}
        : { Authorization: `Bearer ${requireKey(b.apiKey)}` };
  data = await (
    await readProviderResponse(
      await f(`${base}/models`, { headers, signal, redirect: "error" }),
    )
  ).json();
  return (data.data || data.models || [])
    .slice(0, 200)
    .map((m) => ({
      id: m.id || m.name,
      name: m.display_name || m.id || m.name,
    }));
}
export async function generateImage(b, context = {}) {
  const f = context.fetch || fetch,
    signal = context.signal
      ? AbortSignal.any([context.signal, AbortSignal.timeout(180000)])
      : AbortSignal.timeout(180000),
    p = b.imageProvider;
  const prompt = imagePrompt(b);
  let image;
  if (p === "gemini") {
    const { mime, base64 } = splitImage(b.image);
    const response = await f(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(b.imageModel || "gemini-3.1-flash-image")}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": requireKey(b.apiKey),
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mime, data: base64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal,
        redirect: "error",
      },
    );
    const data = await (await readProviderResponse(response)).json();
    const part = data.candidates?.[0]?.content?.parts?.find((x) =>
      x.inlineData?.mimeType?.startsWith("image/"),
    );
    if (part)
      image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } else if (p === "openai" || p === "compatible") {
    const base =
      p === "openai"
        ? "https://api.openai.com/v1"
        : endpoint(b.imageEndpoint, context.local, "http://127.0.0.1:1234/v1");
    const { mime, base64 } = splitImage(b.image);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.set("model", b.imageModel || "gpt-image-2.5-flare");
    form.set("prompt", prompt);
    form.set("size", "1024x1024");
    form.set(
      "image",
      new Blob([bytes], { type: mime }),
      "reference." + (mime === "image/jpeg" ? "jpg" : mime.split("/")[1]),
    );
    const data = await (
      await readProviderResponse(
        await f(`${base}/images/edits`, {
          method: "POST",
          headers: { Authorization: `Bearer ${requireKey(b.apiKey)}` },
          body: form,
          signal,
          redirect: "error",
        }),
      )
    ).json();
    if (data.data?.[0]?.b64_json)
      image = `data:image/png;base64,${data.data[0].b64_json}`;
    else if (data.data?.[0]?.url)
      throw new AppError(
        "image_format",
        "Ce fournisseur doit renvoyer les images en base64. Choisissez un modèle compatible.",
        502,
      );
  } else if (p === "pollinations") {
    // Only the text prompt leaves the device here: Pollinations reference URL workflows would expose private captures.
    throw new AppError(
      "reference_unsupported",
      "Pour préserver la photo de référence, choisissez OpenAI, Gemini ou ComfyUI. Pollinations reste disponible pour la conversation.",
    );
  } else
    throw new AppError(
      "local_image",
      "Utilisez le moteur local d’illustration ou ComfyUI dans l’application bureau.",
    );
  if (!image)
    throw new AppError(
      "empty_image",
      "Le fournisseur n’a renvoyé aucune image. Vérifiez le modèle et les filtres de votre compte.",
      502,
    );
  if (image.length > 25_000_000)
    throw new AppError("large_image", "Image générée trop volumineuse.", 502);
  return {
    image,
    provider: p,
    model:
      b.imageModel ||
      (p === "gemini" ? "gemini-3.1-flash-image" : "gpt-image-2.5-flare"),
    generated: true,
  };
}
