import { AppError, VERSION, validateInput } from "./contracts.mjs";
import { generateReply, generateImage, listModels } from "./providers.mjs";
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}
export async function handleAPI(request, context = {}) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/\/$/, "");
  try {
    if (route === "/api/status" && request.method === "GET")
      return json({
        version: VERSION,
        local: !!context.local,
        user: context.user || null,
        chatgpt: context.chatgptSummary || null,
        credentialProviders: context.credentialProviders || [],
        capabilities: {
          personalPlan: !!context.local,
          customEndpoints: !!context.local,
          localVoice: !!context.local,
          ros: !!context.local,
        },
        privacy: { ownerKey: false, cloudHistory: false },
      });
    if (request.method !== "POST")
      return json(
        {
          error: {
            code: "method_not_allowed",
            message: "Méthode non autorisée.",
          },
        },
        405,
        { Allow: "POST" },
      );
    const origin = request.headers.get("origin");
    if (
      !origin ||
      !(context.allowedOrigins || [url.origin]).includes(origin) ||
      request.headers.get("x-sassycam-request") !== "1"
    )
      throw new AppError(
        "invalid_origin",
        "Requête provenant d’une autre origine refusée.",
        403,
      );
    if (!context.local && !context.user)
      throw new AppError(
        "sign_in_required",
        "Connectez-vous avec ChatGPT avant d’utiliser un fournisseur en ligne.",
        401,
      );
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 9_000_000)
      throw new AppError("large_request", "Requête trop volumineuse.", 413);
    const raw = await request.text();
    if (raw.length > 9_000_000)
      throw new AppError("large_request", "Requête trop volumineuse.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError("invalid_json", "Requête JSON invalide.");
    }
    if (
      route === "/api/reply" ||
      route === "/api/image" ||
      route === "/api/models"
    ) {
      let b = validateInput(body, route === "/api/image" ? "image" : "reply");
      const provider = route === "/api/image" ? b.imageProvider : b.provider;
      if (context.loadKey && !b.apiKey)
        b = { ...b, apiKey: await context.loadKey(provider) };
      const token =
        provider === "chatgpt" && context.getChatGPTToken
          ? await context.getChatGPTToken()
          : undefined;
      const callContext = {
        ...context,
        chatgptToken: token,
        signal: request.signal,
      };
      if (route === "/api/reply")
        return json(await generateReply(b, callContext));
      if (
        route === "/api/image" &&
        b.imageProvider === "comfyui" &&
        context.comfyui
      )
        return json(await context.comfyui(b, request.signal));
      if (route === "/api/image")
        return json(await generateImage(b, callContext));
      return json({ models: await listModels(b, callContext) });
    }
    if (context.local && context.localAction)
      return json(await context.localAction(route, body, request.signal));
    throw new AppError("not_found", "Fonction introuvable.", 404);
  } catch (e) {
    if (e?.name === "AbortError")
      return json(
        { error: { code: "cancelled", message: "Opération annulée." } },
        499,
      );
    if (e instanceof AppError)
      return json(
        {
          error: { code: e.code, message: e.message, retryAfter: e.retryAfter },
        },
        e.status,
        e.retryAfter ? { "retry-after": String(e.retryAfter) } : {},
      );
    return json(
      {
        error: {
          code: "connection_error",
          message:
            "Connexion au fournisseur impossible. Vérifiez son adresse, son lancement et votre accès réseau.",
        },
      },
      502,
    );
  }
}
