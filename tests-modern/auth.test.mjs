import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  createAttempt,
  authorizationURL,
  consumeCallback,
  validateIdentity,
  ChatGPTAuth,
} from "../server/chatgpt-auth.mjs";
import { Vault } from "../server/vault.mjs";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
test("OAuth has fresh nonce/state/PKCE, stable host and correct OSS scopes", () => {
  const a = createAttempt(
    "urn:uuid:host",
    null,
    "http://127.0.0.1:7654/auth/callback",
  );
  const b = createAttempt("urn:uuid:host", null, a.redirectUri);
  assert.notEqual(a.state, b.state);
  assert.notEqual(a.nonce, b.nonce);
  assert.notEqual(a.verifier, b.verifier);
  const u = new URL(authorizationURL(a));
  assert.equal(u.searchParams.get("ext_agent_host_id"), "urn:uuid:host");
  assert.equal(u.searchParams.get("client_id"), "dynamic_agent_client");
  assert.match(u.searchParams.get("scope"), /chatgpt.tokens.use.direct/);
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(u.searchParams.get("agent_name_hint"), "SassyCam");
});
test("callback rejects wrong state, replay, missing issued client and unexpected account client", () => {
  const a = createAttempt("host", null, "http://127.0.0.1:7654/auth/callback");
  assert.throws(() =>
    consumeCallback(
      a,
      new URL(a.redirectUri + "?state=wrong&code=x&client_id=oaiapp_x"),
    ),
  );
  assert.equal(a.consumed, undefined);
  const good = new URL(
    a.redirectUri + "?state=" + a.state + "&code=one&client_id=oaiapp_new",
  );
  assert.equal(consumeCallback(a, good).clientId, "oaiapp_new");
  assert.throws(() => consumeCallback(a, good));
  const returning = createAttempt("host", "oaiapp_saved", a.redirectUri);
  assert.throws(() =>
    consumeCallback(
      returning,
      new URL(
        a.redirectUri +
          "?state=" +
          returning.state +
          "&code=one&client_id=oaiapp_other",
      ),
    ),
  );
  const missing = createAttempt("host", null, a.redirectUri);
  assert.throws(() =>
    consumeCallback(
      missing,
      new URL(a.redirectUri + "?state=" + missing.state + "&code=one"),
    ),
  );
});
test("ID-token verification checks signature, issuer, audience, nonce and expiry", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test";
  const keys = createLocalJWKSet({ keys: [jwk] });
  const make = (
    payload = {},
    aud = "oaiapp_test",
    issuer = "https://auth.openai.com",
    expiry = "1h",
  ) =>
    new SignJWT({ sub: "person", nonce: "nonce", ...payload })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(issuer)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(privateKey);
  assert.equal(
    (await validateIdentity(await make(), "oaiapp_test", "nonce", keys)).sub,
    "person",
  );
  await assert.rejects(
    validateIdentity(
      await make({ nonce: "other" }),
      "oaiapp_test",
      "nonce",
      keys,
    ),
  );
  await assert.rejects(
    validateIdentity(await make({}, "other"), "oaiapp_test", "nonce", keys),
  );
  await assert.rejects(
    validateIdentity(
      await make({}, "oaiapp_test", "https://evil.example"),
      "oaiapp_test",
      "nonce",
      keys,
    ),
  );
  await assert.rejects(
    validateIdentity(
      await make({}, "oaiapp_test", "https://auth.openai.com", "-1h"),
      "oaiapp_test",
      "nonce",
      keys,
    ),
  );
});
test("vault encrypts atomically, serializes concurrent writes and refuses plaintext fallback", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sassycam-vault-"));
  const key = randomBytes(32);
  const encryption = {
    available: () => true,
    encrypt: (s) => {
      const iv = randomBytes(12),
        c = createCipheriv("aes-256-gcm", key, iv);
      return Buffer.concat([iv, c.update(s), c.final(), c.getAuthTag()]);
    },
    decrypt: (b) => {
      const d = createDecipheriv("aes-256-gcm", key, b.subarray(0, 12));
      d.setAuthTag(b.subarray(-16));
      return Buffer.concat([
        d.update(b.subarray(12, -16)),
        d.final(),
      ]).toString();
    },
  };
  try {
    const vault = new Vault(dir, encryption);
    await vault.load();
    await Promise.all([
      vault.set("a", "sensitive-secret"),
      vault.set("b", { token: "another-secret" }),
    ]);
    const raw = await readFile(vault.file, "utf8");
    assert.ok(!raw.includes("sensitive-secret"));
    assert.ok(!raw.includes("another-secret"));
    const restored = new Vault(dir, encryption);
    await restored.load();
    assert.equal(await restored.get("a"), "sensitive-secret");
    assert.equal((await restored.get("b")).token, "another-secret");
    const locked = new Vault(dir, null);
    await locked.load();
    await assert.rejects(locked.get("a"), (e) => e.code === "vault_locked");
    await assert.rejects(
      locked.set("x", "secret"),
      (e) => e.code === "vault_unavailable",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("token refresh is single-flight and rotates all credentials together", async () => {
  let record = {
    access_token: "old",
    refresh_token: "refresh-old",
    client_id: "oaiapp_saved",
    expires_at: 0,
    scopes: ["chatgpt.tokens.use.direct", "resource.invoke"],
  };
  let calls = 0;
  const auth = new ChatGPTAuth({
    hostId: "host",
    vault: {
      get: async () => record,
      set: async (k, v) => {
        record = v;
      },
    },
    fetch: async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return new Response(
        JSON.stringify({
          access_token: "new",
          refresh_token: "rotated",
          expires_in: 3600,
          scope: "chatgpt.tokens.use.direct resource.invoke",
        }),
      );
    },
  });
  const [a, b] = await Promise.all([auth.token(), auth.token()]);
  assert.equal(a, "new");
  assert.equal(b, "new");
  assert.equal(calls, 1);
  assert.equal(record.refresh_token, "rotated");
  assert.ok(record.expires_at > Date.now());
});
