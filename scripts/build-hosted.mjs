// Sites limits each static asset to 25 MiB. Transformers.js 4 loads the matching
// ONNX WASM factory and binary from its version-pinned jsDelivr URLs and caches
// them in the visitor's browser. Vite also emits an unused 26.9 MB fallback.
// Keep the official starter build; exclude only that redundant generated asset.
import { spawn } from "node:child_process";
import { readFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const runtime = JSON.parse(
  await readFile(
    path.join(root, "node_modules", "onnxruntime-web", "package.json"),
    "utf8",
  ),
);
if (runtime.version !== "1.31.0-dev.20260914-8d85527a0")
  throw new Error("Revalidate WASM URLs before changing the runtime version.");
const backend = await readFile(
  path.join(
    root,
    "node_modules",
    "@huggingface",
    "transformers",
    "src",
    "backends",
    "onnx.js",
  ),
  "utf8",
);
if (
  !backend.includes("https://cdn.jsdelivr.net/npm/onnxruntime-web@") ||
  !backend.includes("ONNX_ENV.wasm.wasmPaths = {")
)
  throw new Error(
    "External WASM contract changed; preserve generated assets and inspect before publishing.",
  );
const result = await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    ["scripts/run-framework.mjs", "build"],
    { stdio: "inherit", windowsHide: true },
  );
  child.once("error", reject);
  child.once("exit", (code) => resolve(code));
});
if (result !== 0) process.exit(Number(result) || 1);
const client = path.join(root, "dist", "client");
async function inspect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.resolve(dir, entry.name);
    if (!full.startsWith(client + path.sep))
      throw new Error("Unexpected output path.");
    if (entry.isDirectory()) {
      await inspect(full);
      continue;
    }
    if (entry.isSymbolicLink()) throw new Error("Unexpected output symlink.");
    const size = (await stat(full)).size;
    if (size > 25 * 1024 * 1024) {
      if (
        !/^ort-wasm-simd-threaded\.asyncify[.-][A-Za-z0-9_-]+\.wasm$/.test(
          entry.name,
        )
      )
        throw new Error("Static asset exceeds Sites limit: " + entry.name);
      await unlink(full);
      console.log(
        "Excluded redundant WASM fallback; runtime uses pinned cached CDN: " +
          entry.name,
      );
    }
  }
}
await inspect(client);
