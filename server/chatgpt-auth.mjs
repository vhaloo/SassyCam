import http from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AppError } from "./contracts.mjs";
const ISSUER = "https://auth.openai.com";
const RESOURCE = "https://api.openai.com/v1";
const TOKEN = ISSUER + "/api/accounts/oauth/token";
const JWKS = createRemoteJWKSet(new URL(ISSUER + "/.well-known/jwks.json"));
const random = (n = 32) => randomBytes(n).toString("base64url");
export function createAttempt(hostId, clientId, redirectUri, selected = null) {
  const verifier = random(64);
  return {
    state: random(),
    nonce: random(),
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    hostId,
    clientId: clientId || "dynamic_agent_client",
    redirectUri,
    selected,
    expiresAt: Date.now() + 600000,
  };
}
export function authorizationURL(a) {
  const u = new URL(ISSUER + "/api/accounts/authorize");
  u.search = new URLSearchParams({
    client_id: a.clientId,
    ext_agent_host_id: a.hostId,
    response_type: "code",
    redirect_uri: a.redirectUri,
    scope:
      "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
    resource: RESOURCE,
    state: a.state,
    nonce: a.nonce,
    code_challenge_method: "S256",
    code_challenge: a.challenge,
    ...(a.clientId === "dynamic_agent_client"
      ? { agent_name_hint: "SassyCam" }
      : {}),
    ...(a.selected?.id_token ? { id_token_hint: a.selected.id_token } : {}),
    ...(a.selected?.email ? { login_hint: a.selected.email } : {}),
  }).toString();
  return u.href;
}
export function consumeCallback(a, url) {
  const state = url.searchParams.get("state") || "";
  const aa = Buffer.from(a.state),
    bb = Buffer.from(state);
  if (
    a.consumed ||
    Date.now() > a.expiresAt ||
    aa.length !== bb.length ||
    !timingSafeEqual(aa, bb)
  )
    throw new AppError(
      "oauth_state",
      "Cette connexion a expiré ou ne correspond pas à la demande.",
      400,
    );
  a.consumed = true;
  if (url.searchParams.has("error"))
    throw new AppError(
      "oauth_denied",
      "Connexion ChatGPT annulée ou autorisation refusée.",
      400,
    );
  const clientId = url.searchParams.get("client_id") || a.clientId;
  if (
    clientId === "dynamic_agent_client" ||
    !/^oaiapp_[a-zA-Z0-9_-]+$/.test(clientId) ||
    (a.clientId !== "dynamic_agent_client" && clientId !== a.clientId)
  )
    throw new AppError(
      "oauth_client",
      "L’inscription ChatGPT n’a pas renvoyé le client attendu.",
      400,
    );
  const code = url.searchParams.get("code");
  if (!code)
    throw new AppError("oauth_code", "Code de connexion manquant.", 400);
  return { clientId, code };
}
export async function validateIdentity(token, clientId, nonce, keys = JWKS) {
  const { payload } = await jwtVerify(token, keys, {
    issuer: ISSUER,
    audience: clientId,
    requiredClaims: ["sub", "exp", "iat"],
    clockTolerance: 5,
    algorithms: ["RS256", "ES256"],
  });
  if (
    payload.nonce !== nonce ||
    typeof payload.sub !== "string" ||
    !payload.sub
  )
    throw new AppError(
      "oauth_identity",
      "Identité ChatGPT non vérifiable.",
      401,
    );
  return payload;
}
function credentials(tokens, identity, clientId, hostId) {
  const scopes = String(tokens.scope || "")
    .split(" ")
    .filter(Boolean);
  if (
    !scopes.includes("chatgpt.tokens.use.direct") ||
    !scopes.includes("resource.invoke")
  )
    throw new AppError(
      "plan_permission",
      "Votre compte est connecté, mais l’utilisation de son quota n’a pas été autorisée. Reconnectez-vous en autorisant cette permission.",
      403,
    );
  if (
    typeof tokens.access_token !== "string" ||
    typeof tokens.refresh_token !== "string"
  )
    throw new AppError(
      "oauth_tokens",
      "La connexion n’a pas fourni les autorisations renouvelables attendues.",
      401,
    );
  return {
    ...tokens,
    subject: identity.sub,
    email: identity.email || "",
    name: identity.name || "",
    client_id: clientId,
    ext_agent_host_id: hostId,
    issuer: ISSUER,
    scopes,
    expires_at: Date.now() + Number(tokens.expires_in || 3600) * 1000,
    saved_at: new Date().toISOString(),
  };
}
export class ChatGPTAuth {
  constructor({ vault, hostId, openExternal, fetch: fetcher = fetch }) {
    Object.assign(this, { vault, hostId, openExternal, fetch: fetcher });
    this.pending = null;
    this.refreshing = null;
    this.lastError = null;
  }
  async summary() {
    const c = await this.vault.get("chatgpt");
    return c
      ? {
          connected: true,
          name: c.name || c.email,
          email: c.email,
          clientId: c.client_id,
          planAuthorized: c.scopes?.includes("chatgpt.tokens.use.direct"),
          expired: Date.now() > c.expires_at,
          pending: !!this.pending,
          error: this.lastError,
        }
      : { connected: false, pending: !!this.pending, error: this.lastError };
  }
  async start({ addAccount = false } = {}) {
    if (this.pending) return { pending: true };
    this.lastError = null;
    const selected = addAccount ? null : await this.vault.get("chatgpt");
    const server = http.createServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    const redirectUri = `http://127.0.0.1:${address.port}/auth/callback`;
    const attempt = createAttempt(
      this.hostId,
      selected?.client_id,
      redirectUri,
      selected,
    );
    this.pending = { server, attempt };
    const timer = setTimeout(() => {
      this.lastError = "Connexion expirée. Réessayez.";
      this.cancel();
    }, 600000);
    timer.unref();
    this.pending.timer = timer;
    server.on("request", async (req, res) => {
      const url = new URL(req.url, redirectUri);
      if (url.pathname !== "/auth/callback") {
        res.writeHead(404);
        res.end();
        return;
      }
      // A mismatched callback cannot consume another pending attempt.
      if (url.searchParams.get("state") !== attempt.state) {
        res.writeHead(400);
        res.end("Invalid sign-in state.");
        return;
      }
      try {
        const { clientId, code } = consumeCallback(attempt, url);
        const response = await this.fetch(TOKEN, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            code,
            code_verifier: attempt.verifier,
            redirect_uri: attempt.redirectUri,
            resource: RESOURCE,
          }),
          signal: AbortSignal.timeout(20000),
          redirect: "error",
        });
        if (!response.ok)
          throw new AppError(
            "oauth_exchange",
            "La connexion n’a pas pu être finalisée. Réessayez depuis SassyCam.",
            401,
          );
        const tokens = await response.json();
        const identity = await validateIdentity(
          tokens.id_token,
          clientId,
          attempt.nonce,
        );
        if (selected && identity.sub !== selected.subject)
          throw new AppError(
            "account_mismatch",
            "Ce compte ne correspond pas au compte sélectionné. Utilisez « Ajouter un autre compte ».",
          );
        await this.vault.set(
          "chatgpt",
          credentials(tokens, identity, clientId, this.hostId),
        );
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy":
            "default-src 'none'; style-src 'unsafe-inline'",
          "cache-control": "no-store",
        });
        res.end(
          '<!doctype html><html lang="fr"><meta charset="utf-8"><title>SassyCam</title><body style="font:20px system-ui;background:#f5f3ed;color:#242720;padding:12vw"><h1>Vous êtes connecté.</h1><p>Retournez dans SassyCam. Votre propre quota ChatGPT sera utilisé pour la conversation.</p></body></html>',
        );
      } catch (e) {
        this.lastError =
          e instanceof AppError
            ? e.message
            : "La vérification sécurisée de la connexion ChatGPT a échoué.";
        res.writeHead(400, {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        });
        res.end(this.lastError);
      } finally {
        this.cancel();
      }
    });
    try {
      await this.openExternal(authorizationURL(attempt));
    } catch {
      this.cancel();
      throw new AppError(
        "browser_unavailable",
        "Impossible d’ouvrir le navigateur système.",
        503,
      );
    }
    return { pending: true };
  }
  cancel() {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.server.close();
      this.pending = null;
    }
  }
  async signOut() {
    this.cancel();
    this.lastError = null;
    await this.vault.set("chatgpt", null);
  }
  async token() {
    const c = await this.vault.get("chatgpt");
    if (!c)
      throw new AppError(
        "chatgpt_connect",
        "Connectez votre compte ChatGPT personnel.",
        401,
      );
    if (Date.now() < c.expires_at - 30000) return c.access_token;
    if (!this.refreshing)
      this.refreshing = this.refresh(c).finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }
  async refresh(c) {
    const earliest = Number(c.earliest_refresh_at);
    if (Number.isFinite(earliest) && earliest * 1000 > Date.now())
      throw new AppError(
        "refresh_wait",
        "Le compte ne peut pas encore être renouvelé. Réessayez dans un instant.",
        429,
      );
    const response = await this.fetch(TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: c.client_id,
        refresh_token: c.refresh_token,
        resource: RESOURCE,
      }),
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
    if (!response.ok)
      throw new AppError(
        "reauthentication_required",
        "Reconnectez votre compte ChatGPT pour renouveler son autorisation.",
        401,
      );
    const tokens = await response.json();
    const scopes =
      typeof tokens.scope === "string" ? tokens.scope.split(" ") : c.scopes;
    if (
      !tokens.access_token ||
      !tokens.refresh_token ||
      !scopes.includes("chatgpt.tokens.use.direct")
    )
      throw new AppError(
        "plan_permission",
        "L’autorisation d’utiliser le quota ChatGPT n’est plus disponible.",
        403,
      );
    // Replace all rotating credentials in one encrypted atomic write; never auto-replay inference.
    const next = {
      ...c,
      ...tokens,
      scopes,
      expires_at: Date.now() + Number(tokens.expires_in || 3600) * 1000,
      saved_at: new Date().toISOString(),
    };
    await this.vault.set("chatgpt", next);
    return next.access_token;
  }
}
