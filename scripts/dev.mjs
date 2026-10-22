import { spawn } from "node:child_process";
import { startLocal } from "../server/local.mjs";
const service = await startLocal({ port: 4174, dev: true });
console.log("API: " + service.url);
const child = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--config", "studio/vite.config.ts"],
  { stdio: "inherit", windowsHide: true },
);
child.on("exit", () => service.close());
process.on("SIGINT", () => {
  child.kill();
  service.close();
});
