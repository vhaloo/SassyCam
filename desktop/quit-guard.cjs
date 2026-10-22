// Isolated exit watchdog. IPC closes when the original parent exits, so a later
// reused PID can never become a target. No renderer can configure this process.
const { execFile } = require("node:child_process");
const parent = Number(process.argv[2]);
if (!process.connected || parent !== process.ppid || parent < 2) process.exit(1);
process.once("disconnect", () => process.exit(0));
process.send({ ready: true });
setTimeout(() => {
  if (!process.connected) process.exit(0);
  if (process.platform === "win32") {
    execFile("taskkill.exe", ["/PID", String(parent), "/T", "/F"],
      { windowsHide: true }, () => process.exit(0));
  } else {
    try { process.kill(parent, "SIGKILL"); } catch {}
    process.exit(0);
  }
}, 8000);
