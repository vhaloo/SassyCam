const {
  app,
  BrowserWindow,
  session,
  safeStorage,
  shell,
  dialog,
} = require("electron");
const path = require("node:path");
let service, window;
let quitGuard;
function armQuitGuard() {
  if (quitGuard) return;
  // Native ONNX/media teardown can stall Chromium after its last window closes.
  // Normal exits disconnect IPC immediately; the guard acts only after 8 s.
  quitGuard = require("node:child_process").spawn(
    process.execPath,
    [path.join(__dirname, "quit-guard.cjs"), String(process.pid)],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      windowsHide: true, detached: true,
      stdio: ["ignore", "ignore", "ignore", "ipc"] },
  );
  quitGuard.on("error", () => {});
  quitGuard.unref();
  quitGuard.channel?.unref();
}
if (process.env.SASSYCAM_SMOKE === "1") {
  app.commandLine.appendSwitch("use-fake-device-for-media-stream");
  app.commandLine.appendSwitch("use-fake-ui-for-media-stream");
}
if (process.env.SASSYCAM_SMOKE === "1")
  app.setPath(
    "userData",
    process.env.SASSYCAM_SMOKE_PROFILE ||
      path.join(__dirname, "..", ".qa", "electron-profile-current"),
  );
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
app.on("second-instance", () => {
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});
app
  .whenReady()
  .then(async () => {
    const { startLocal } = await import("../server/local.mjs");
    const picturesDir = path.join(app.getPath("pictures"), "SassyCam");
    const encryption = {
      available: () =>
        safeStorage.isEncryptionAvailable() &&
        (process.platform !== "linux" ||
          safeStorage.getSelectedStorageBackend() !== "basic_text"),
      encrypt: (s) => safeStorage.encryptString(s),
      decrypt: (b) => safeStorage.decryptString(b),
    };
    service = await startLocal({
      dataDir: app.getPath("userData"),
      encryption,
      openExternal: (url) => shell.openExternal(url),
      openNative: async (file) => {
        const error = await shell.openPath(file);
        if (error) throw new Error("Le système ne peut pas ouvrir ce fichier.");
      },
      picturesDir,
      optionalAudioPath: app.isPackaged
        ? path.join(process.resourcesPath, "optional_audio.py")
        : path.join(__dirname, "..", "scripts", "optional_audio.py"),
    });
    session.defaultSession.on("will-download", (_event, item) => {
      try {
        require("node:fs").mkdirSync(picturesDir, { recursive: true });
        const safe = path
          .basename(item.getFilename())
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const extension = path.extname(safe);
        const name =
          path.basename(safe, extension) +
          "-" +
          require("node:crypto").randomUUID().slice(0, 8) +
          extension;
        item.setSavePath(path.join(picturesDir, name));
      } catch {
        item.cancel();
      }
    });
    session.defaultSession.setPermissionRequestHandler(
      (contents, permission, callback, details) => {
        const allowed =
          contents === window?.webContents &&
          new URL(contents.getURL()).origin === service.url &&
          ["media", "clipboard-sanitized-write", "speaker-selection"].includes(
            permission,
          );
        callback(allowed);
      },
    );
    session.defaultSession.setPermissionCheckHandler(
      (contents, permission, origin) =>
        contents === window?.webContents &&
        origin === service.url &&
        ["media", "clipboard-sanitized-write", "speaker-selection"].includes(
          permission,
        ),
    );
    async function create() {
      window = new BrowserWindow({
        width: 1480,
        height: 1000,
        minWidth: process.env.SASSYCAM_SMOKE === "1" ? 360 : 850,
        minHeight: 680,
        show: process.env.SASSYCAM_SMOKE !== "1",
        backgroundColor: "#f5f3ed",
        title: "SassyCam 1.0",
        autoHideMenuBar: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        },
      });
      window.on("close", () => {
        if (process.platform !== "darwin") armQuitGuard();
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https:\/\//.test(url)) shell.openExternal(url);
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (new URL(url).origin !== service.url) {
          event.preventDefault();
          if (/^https:\/\//.test(url)) shell.openExternal(url);
        }
      });
      await window.loadURL(service.url);
      if (process.env.SASSYCAM_SMOKE === "1") {
        const { runSmoke } = await import("./smoke.mjs");
        await runSmoke(window, app, () => service.close());
      }
    }
    await create();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) create();
    });
  })
  .catch((error) => {
    dialog.showErrorBox("SassyCam", error.message);
    app.quit();
  });
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  armQuitGuard();
  service?.close();
});
