import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const script = fileURLToPath(new URL("../desktop/quit-guard.cjs", import.meta.url));
async function probe(pid, disconnect) {
  const child = spawn(process.execPath, [script, String(pid)], {
    stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true,
  });
  const deadline = setTimeout(() => child.kill(), 3000);
  if (disconnect) child.once("message", () => child.disconnect());
  try {
    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code) => resolve(code));
    });
  } finally { clearTimeout(deadline); child.kill(); }
}
test("exit guard rejects unrelated PIDs and stops when its IPC parent exits", async () => {
  assert.equal(await probe(process.pid + 1, false), 1);
  assert.equal(await probe(process.pid, true), 0);
});
