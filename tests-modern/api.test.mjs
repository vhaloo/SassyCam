import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { handleAPI } from "../server/api.mjs";
import { startLocal } from "../server/local.mjs";
const base = "https://site.example";
const request = (route, body, origin = base) =>
  new Request(base + route, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-sassycam-request": "1",
    },
    body: JSON.stringify(body),
  });
test("cloud API requires Sites identity and enforces same-origin mutations", async () => {
  const a = await handleAPI(request("/api/reply", { provider: "openai" }), {
    local: false,
  });
  assert.equal(a.status, 401);
  const b = await handleAPI(
    request("/api/reply", { provider: "openai" }, "https://evil.example"),
    { local: false, user: { id: "a" } },
  );
  assert.equal(b.status, 403);
  const c = await handleAPI(
    new Request(base + "/api/reply", {
      method: "POST",
      headers: { origin: base },
      body: "{}",
    }),
    { local: false, user: { id: "a" } },
  );
  assert.equal(c.status, 403);
});
test("cloud response uses caller identity only and has no credentials or inferred plan permission", async () => {
  const r = await handleAPI(new Request(base + "/api/status"), {
    local: false,
    user: { id: "user-A", name: "A" },
  });
  const d = await r.json();
  assert.equal(d.user.id, "user-A");
  assert.equal(d.capabilities.personalPlan, false);
  assert.equal(d.privacy.ownerKey, false);
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.ok(!JSON.stringify(d).includes("access_token"));
});
test("cloud client cannot invoke credential storage, local OAuth or local endpoints", async () => {
  for (const route of [
    "/api/credentials",
    "/api/chatgpt/connect",
    "/api/profile",
  ]) {
    assert.equal(
      (await handleAPI(request(route, {}), { local: false, user: { id: "u" } }))
        .status,
      404,
    );
  }
  const r = await handleAPI(
    request("/api/models", { provider: "compatible" }),
    {
      local: false,
      user: { id: "u" },
      fetch: () => assert.fail("must not access private network"),
    },
  );
  assert.equal(r.status, 400);
});
test("malformed payload and provider errors never expose keys in returned diagnostics", async () => {
  const r = await handleAPI(
    request("/api/reply", {
      provider: "openai",
      apiKey: "secret",
      text: "hello",
    }),
    {
      local: false,
      user: { id: "u" },
      fetch: async () => {
        throw new Error("secret credential");
      },
    },
  );
  assert.equal(r.status, 502);
  assert.ok(!(await r.text()).includes("secret"));
  const bad = await handleAPI(
    new Request(base + "/api/reply", {
      method: "POST",
      headers: { origin: base, "x-sassycam-request": "1" },
      body: "{broken",
    }),
    { local: false, user: { id: "u" } },
  );
  assert.equal(bad.status, 400);
});
test("desktop binds loopback, rejects forged hosts and keeps profiles separate", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sassycam-api-"));
  const service = await startLocal({ dataDir: dir });
  try {
    const status = await (await fetch(service.url + "/api/status")).json();
    assert.equal(status.local, true);
    const post = (url, body) =>
      fetch(service.url + url, {
        method: "POST",
        headers: {
          origin: service.url,
          "content-type": "application/json",
          "x-sassycam-request": "1",
        },
        body: JSON.stringify(body),
      });
    const bad = await new Promise((resolve) => {
      const req = http.get(
        service.url + "/api/status",
        { headers: { host: "attacker.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
    });
    assert.equal(bad, 403);
    assert.equal(
      (await post("/api/credentials", { provider: "openai", apiKey: "secret" }))
        .status,
      503,
    );
    await post("/api/profile", { create: true, name: "Second studio" });
    const second = await (await fetch(service.url + "/api/status")).json();
    assert.notEqual(second.user.id, status.user.id);
    assert.equal(second.user.name, "Second studio");
    assert.deepEqual(second.credentialProviders, []);
    const profiles = await (await post("/api/profiles", {})).json();
    assert.equal(profiles.profiles.length, 2);
    assert.equal((await fetch(service.url + "/server/vault.mjs")).status, 404);
  } finally {
    await service.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("desktop origin and host identity survive a complete service restart", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sassycam-restart-"));
  let service = await startLocal({ dataDir: dir });
  try {
    const firstURL = service.url;
    const first = await (await fetch(firstURL + "/api/status")).json();
    await service.close();
    service = await startLocal({ dataDir: dir });
    const second = await (await fetch(service.url + "/api/status")).json();
    assert.equal(service.url, firstURL);
    assert.equal(second.user.id, first.user.id);
  } finally {
    await service.close();
    assert.ok(dir.startsWith(path.join(os.tmpdir(), "sassycam-restart-")));
    await rm(dir, { recursive: true, force: true });
  }
});

test("native image opening writes only validated image data inside the configured pictures folder", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sassycam-pictures-"));
  const opened = [];
  const service = await startLocal({
    dataDir: path.join(dir, "host"),
    picturesDir: path.join(dir, "pictures"),
    openNative: async (p) => opened.push(p),
  });
  const post = (body) =>
    fetch(service.url + "/api/open-image", {
      method: "POST",
      headers: {
        origin: service.url,
        "x-sassycam-request": "1",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post({ image: "file:///etc/passwd" })).status, 400);
    assert.equal(opened.length, 0);
    assert.equal(
      (
        await post({
          image: "data:image/png;base64,AA==",
          path: "../../private.exe",
        })
      ).status,
      200,
    );
    assert.equal(opened.length, 1);
    assert.ok(opened[0].startsWith(path.join(dir, "pictures") + path.sep));
    assert.match(opened[0], /\.png$/);
  } finally {
    await service.close();
    assert.ok(dir.startsWith(path.join(os.tmpdir(), "sassycam-pictures-")));
    await rm(dir, { recursive: true, force: true });
  }
});
