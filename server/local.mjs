import http from "node:http";
import path from "node:path";
import os from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { handleAPI, json } from "./api.mjs";
import { Vault, atomicJSON } from "./vault.mjs";
import { ChatGPTAuth } from "./chatgpt-auth.mjs";
import { AppError } from "./contracts.mjs";
import { comfyImage } from "./comfyui.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".wasm": "application/wasm",
  ".json": "application/json",
};
export async function startLocal({
  port = 0,
  dataDir = path.join(os.homedir(), ".sassycam"),
  encryption = null,
  openExternal = null,
  openNative = null,
  picturesDir = null,
  dev = false,
  optionalAudioPath = path.join(root, "scripts", "optional_audio.py"),
} = {}) {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const configPath = path.join(dataDir, "host.v1.json");
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT")
      throw new Error(
        "SassyCam host settings could not be read. Original file preserved.",
      );
  }
  if (!config) {
    const id = randomUUID();
    config = {
      hostId: "urn:uuid:" + randomUUID(),
      activeProfile: id,
      profiles: [{ id, name: "Mon studio" }],
    };
    await atomicJSON(configPath, config);
  }
  const vault = new Vault(dataDir, encryption);
  await vault.load();
  const auths = new Map();
  const auth = () => {
    const id = config.activeProfile;
    if (!auths.has(id)) {
      const scoped = {
        get: (key) => vault.get(id + ":" + key),
        set: (key, value) => vault.set(id + ":" + key, value),
      };
      auths.set(
        id,
        new ChatGPTAuth({
          vault: scoped,
          hostId: config.hostId,
          openExternal: openExternal || systemOpen,
        }),
      );
    }
    return auths.get(id);
  };
  async function optional(action, body, signal) {
    const executable = process.env.SASSYCAM_PYTHON || "python";
    return new Promise((resolve, reject) => {
      const child = spawn(executable, [optionalAudioPath, action], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let output = "",
        errors = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(
          new AppError(
            "voice_timeout",
            "Le moteur vocal local a dépassé le délai. Vérifiez les modèles installés.",
            504,
          ),
        );
      }, 180000);
      const abort = () => child.kill();
      signal?.addEventListener("abort", abort, { once: true });
      child.stdout.on("data", (d) => {
        output += d;
        if (output.length > 12_000_000) child.kill();
      });
      child.stderr.on("data", (d) => {
        errors = (errors + d).slice(-1000);
      });
      child.once("error", () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        reject(
          new AppError(
            "python_missing",
            "Installez les modules vocaux facultatifs et configurez SASSYCAM_PYTHON. Consultez le guide de SassyCam.",
            503,
          ),
        );
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        if (signal?.aborted) return reject(signal.reason);
        try {
          const data = JSON.parse(output);
          if (code || data.error) throw new Error();
          resolve(data);
        } catch {
          reject(
            new AppError(
              "optional_unavailable",
              "Le module facultatif est indisponible. Consultez docs/LOCAL_AI.md pour installer Whisper, Kokoro ou ROS 2.",
              503,
            ),
          );
        }
      });
      child.stdin.end(JSON.stringify(body));
    });
  }
  const server = http.createServer(async (req, res) => {
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;
    const requestOrigin =
      dev && req.headers.origin === "http://127.0.0.1:4173"
        ? "http://127.0.0.1:4173"
        : origin;
    if (
      req.headers.host !== `127.0.0.1:${address.port}` &&
      !(dev && req.headers.host === "127.0.0.1:4173")
    ) {
      res.writeHead(403);
      res.end("Invalid host");
      return;
    }
    const url = new URL(req.url || "/", origin);
    const controller = new AbortController();
    res.once("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      if (url.pathname.startsWith("/api/")) {
        const parts = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 9_000_000) {
            res.writeHead(413);
            res.end();
            return;
          }
          parts.push(chunk);
        }
        const request = new Request(origin + url.pathname, {
          method: req.method,
          headers: req.headers,
          ...(req.method !== "GET" && req.method !== "HEAD"
            ? { body: Buffer.concat(parts) }
            : {}),
          signal: controller.signal,
        });
        const selected = config.profiles.find(
          (p) => p.id === config.activeProfile,
        );
        const currentAuth = auth();
        const profileId = selected.id;
        const response = await handleAPI(request, {
          local: true,
          allowedOrigins: [origin, ...(dev ? ["http://127.0.0.1:4173"] : [])],
          user: { id: profileId, name: selected.name },
          chatgptSummary: await currentAuth.summary(),
          credentialProviders: vault
            .keys()
            .filter((k) => k.startsWith(profileId + ":api:"))
            .map((k) => k.slice((profileId + ":api:").length)),
          loadKey: (p) => vault.get(profileId + ":api:" + p),
          getChatGPTToken: () => currentAuth.token(),
          comfyui: comfyImage,
          localAction: async (route, body, signal) => {
            if (route === "/api/credentials") {
              if (
                ![
                  "openai",
                  "gemini",
                  "anthropic",
                  "compatible",
                  "pollinations",
                ].includes(body.provider) ||
                typeof body.apiKey !== "string" ||
                body.apiKey.length > 8192 ||
                /[\r\n]/.test(body.apiKey)
              )
                throw new AppError("invalid_key", "Clé invalide.");
              await vault.set(
                profileId + ":api:" + body.provider,
                body.apiKey || null,
              );
              return { saved: true };
            }
            if (route === "/api/chatgpt/connect")
              return currentAuth.start({
                addAccount: body.addAccount === true,
              });
            if (route === "/api/chatgpt/disconnect") {
              await currentAuth.signOut();
              return { disconnected: true };
            }
            if (route === "/api/profiles") return { profiles: config.profiles };
            if (route === "/api/open-folder") {
              if (!picturesDir || !openNative)
                throw new AppError(
                  "desktop_only",
                  "Ouvrez le dossier depuis l’application bureau.",
                );
              await mkdir(picturesDir, { recursive: true });
              await openNative(picturesDir);
              return { opened: true };
            }
            if (route === "/api/open-image") {
              if (!picturesDir || !openNative)
                throw new AppError(
                  "desktop_only",
                  "Ouvrez l’image depuis l’application bureau.",
                );
              if (
                typeof body.image !== "string" ||
                body.image.length > 25_000_000 ||
                !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
                  body.image,
                )
              )
                throw new AppError("invalid_image", "Image invalide.");
              const [, mime, data] =
                /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(
                  body.image,
                );
              const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
              await mkdir(picturesDir, { recursive: true });
              const file = path.join(
                picturesDir,
                "SassyCam-" + randomUUID() + "." + ext,
              );
              await writeFile(file, Buffer.from(data, "base64"), {
                flag: "wx",
              });
              await openNative(file);
              return { opened: true };
            }
            if (route === "/api/profile") {
              if (body.create) {
                if (
                  typeof body.name !== "string" ||
                  !body.name.trim() ||
                  body.name.length > 80 ||
                  config.profiles.length >= 20
                )
                  throw new AppError(
                    "invalid_profile",
                    "Nom de profil invalide (20 profils maximum).",
                  );
                config.profiles.push({
                  id: randomUUID(),
                  name: body.name.trim(),
                });
                config.activeProfile = config.profiles.at(-1).id;
              } else {
                if (!config.profiles.some((p) => p.id === body.id))
                  throw new AppError("invalid_profile", "Profil introuvable.");
                config.activeProfile = body.id;
              }
              currentAuth.cancel();
              await atomicJSON(configPath, config);
              return { switched: true };
            }
            if (route === "/api/voice/transcribe") {
              if (
                typeof body.audio !== "string" ||
                body.audio.length > 8_000_000
              )
                throw new AppError(
                  "invalid_audio",
                  "Enregistrement trop volumineux.",
                );
              return optional("transcribe", body, signal);
            }
            if (route === "/api/voice/speak") {
              if (typeof body.text !== "string" || body.text.length > 4000)
                throw new AppError("invalid_audio", "Texte vocal invalide.");
              return optional("speak", body, signal);
            }
            if (route === "/api/ros") {
              if (
                typeof body.topic !== "string" ||
                !/^\/[a-zA-Z0-9_/]{1,150}$/.test(body.topic) ||
                typeof body.text !== "string" ||
                body.text.length > 12000
              )
                throw new AppError("invalid_topic", "Sujet ROS invalide.");
              return optional("ros", body, signal);
            }
            throw new AppError("not_found", "Fonction introuvable.", 404);
          },
        });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === "/" || !path.extname(pathname)) pathname = "/index.html";
      const dist = path.join(root, "dist");
      const file = path.resolve(dist, "." + pathname);
      if (!file.startsWith(dist + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let content;
      try {
        content = await readFile(file);
      } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Build SassyCam first: npm run build");
        return;
      }
      res.writeHead(200, {
        "content-type": MIME[path.extname(file)] || "application/octet-stream",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "permissions-policy": "camera=(self), microphone=(self)",
        "content-security-policy":
          "default-src 'self'; script-src 'self' blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://huggingface.co; media-src 'self' data: blob:; connect-src 'self' data: blob: https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net; worker-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
        "cache-control":
          pathname === "/index.html" ? "no-store" : "public, max-age=3600",
      });
      res.end(content);
    } catch {
      res.writeHead(500, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(
        JSON.stringify({
          error: {
            code: "local_error",
            message: "Erreur du service local. Aucun secret n’a été exposé.",
          },
        }),
      );
    }
  });
  // The browser storage origin must survive restarts; a fresh random port would lose access to the gallery.
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port || config.port || 0, "127.0.0.1", resolve);
  });
  if (!port && !config.port) {
    config.port = server.address().port;
    await atomicJSON(configPath, config);
  }
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        for (const a of auths.values()) a.cancel();
        server.close(resolve);
      }),
    server,
  };
}
async function systemOpen(url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.hostname !== "auth.openai.com")
    throw new Error("Invalid authorization URL");
  const [exe, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]]
        : ["xdg-open", [url]];
  const child = spawn(exe, args, { windowsHide: true, stdio: "ignore" });
  child.on("error", () => {});
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const instance = await startLocal({
    port: Number(process.env.PORT || 4174),
    dev: process.env.SASSYCAM_DEV === "1",
  });
  console.log("SassyCam: " + instance.url);
  process.on("SIGINT", async () => {
    await instance.close();
    process.exit();
  });
  process.on("SIGTERM", async () => {
    await instance.close();
    process.exit();
  });
}
