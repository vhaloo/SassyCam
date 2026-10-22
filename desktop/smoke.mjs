import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
const output =
  process.env.SASSYCAM_QA_DIR ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".qa");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export async function runSmoke(win, app, closeService) {
  await mkdir(output, { recursive: true });
  const report = {
    date: new Date().toISOString(),
    checks: [],
    console: [],
    network: [],
    syntheticMedia: true,
  };
  win.webContents.on("console-message", (event) => {
    if (event?.level === "error" || event?.level === "warning")
      report.console.push({ level: event.level, message: event.message });
  });
  const evaluate = (code) => win.webContents.executeJavaScript(code, true);
  const check = (name, condition, details) => {
    report.checks.push({ name, passed: !!condition, details });
    if (!condition)
      throw new Error(name + " failed: " + JSON.stringify(details));
  };
  const waitFor = async (code, timeout = 12000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(code)) return;
      await pause(150);
    }
    throw new Error("Timed out waiting for: " + code);
  };
  const clickText = async (text) =>
    evaluate(
      `(()=>{const e=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Button missing: '+${JSON.stringify(text)});e.click();})()`,
    );
  const mock = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = JSON.parse(raw || "{}");
    report.network.push({
      path: req.url,
      hasImage: body.messages?.some(
        (m) =>
          Array.isArray(m.content) &&
          m.content.some((c) => c.type === "image_url"),
      ),
      userText: body.messages?.at(-1)?.content?.find?.((c) => c.type === "text")
        ?.text,
    });
    res.writeHead(200, { "content-type": "application/json" });
    if (req.url.endsWith("/models"))
      res.end(JSON.stringify({ data: [{ id: "sassycam-test-vision" }] }));
    else
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "Ton cadrage est si carré que même ta caméra se tient droite.",
              },
            },
          ],
        }),
      );
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  try {
    await waitFor(
      `document.querySelector('.sidebar-bottom strong')?.textContent==='Mon studio'`,
    );
    const initialStatus = await evaluate(
      `fetch('/api/status').then(r=>r.json())`,
    );
    await evaluate(
      `localStorage.setItem('sassycam-settings:'+${JSON.stringify(initialStatus.user.id)},'{}')`,
    );
    await win.webContents.reload();
    await waitFor(
      `document.querySelector('.provider-pill')?.textContent.includes('IA du navigateur')`,
    );
    const initial = await evaluate(
      `({title:document.title,heading:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,buttons:document.querySelectorAll('button').length})`,
    );
    check(
      "desktop loads without horizontal overflow",
      !initial.overflow,
      initial,
    );
    await writeFile(
      path.join(output, "studio-desktop.png"),
      (await win.webContents.capturePage()).toPNG(),
    );
    await clickText("Ouvrir la caméra");
    await waitFor(
      `document.querySelector('video')?.videoWidth>0&&document.querySelector('.camera-stage').classList.contains('is-live')`,
    );
    check("camera preview opens with synthetic device", true);
    await clickText("Capturer");
    await waitFor(`!!document.querySelector('.timeline-item')`);
    check("camera snapshot enters gallery", true);
    await evaluate(
      `(()=>{const input=document.querySelector('input[type=file][accept^="image/"]');const canvas=document.createElement('canvas');canvas.width=800;canvas.height=600;const g=canvas.getContext('2d');g.fillStyle='#acd6d5';g.fillRect(0,0,800,600);g.fillStyle='#f19b65';g.fillRect(130,120,220,340);g.fillStyle='#5a614c';g.beginPath();g.arc(540,300,130,0,Math.PI*2);g.fill();canvas.toBlob(blob=>{const dt=new DataTransfer();dt.items.add(new File([blob],'synthetic-studio.png',{type:'image/png'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},'image/png');})()`,
    );
    await waitFor(`!!document.querySelector('.source-photo')`);
    check(
      "photo import keeps a normalized local image",
      await evaluate(
        `document.querySelector('.source-photo').src.startsWith('data:image/jpeg')`,
      ),
    );
    await clickText("Créer mon portrait");
    await waitFor(`!!document.querySelector('.portrait-preview img')`);
    check(
      "local illustration is labelled honestly",
      await evaluate(
        `document.querySelector('.portrait-preview').textContent.includes('ILLUSTRATION LOCALE')`,
      ),
    );
    await writeFile(
      path.join(output, "studio-portrait.png"),
      (await win.webContents.capturePage()).toPNG(),
    );
    await clickText("Toute la galerie");
    await waitFor(`document.querySelectorAll('.gallery-card').length>=2`);
    check(
      "gallery holds captures and portraits",
      await evaluate(`document.querySelectorAll('.gallery-card').length>=2`),
    );
    await win.webContents.reload();
    await waitFor(
      `document.querySelector('.sidebar-bottom strong')?.textContent==='Mon studio'`,
    );
    await evaluate(
      `(()=>{const b=[...document.querySelectorAll('.sidebar nav button')].find(x=>x.textContent.includes('La galerie'));b.click();})()`,
    );
    await waitFor(`document.querySelectorAll('.gallery-card').length>=2`);
    check("gallery persists after relaunch", true);
    await evaluate(
      `(()=>{const b=[...document.querySelectorAll('.sidebar nav button')].find(x=>x.textContent.includes('Les réglages'));b.click();})()`,
    );
    await waitFor(`!!document.querySelector('.settings-content')`);
    const status = await evaluate(`fetch('/api/status').then(r=>r.json())`);
    await evaluate(
      `localStorage.setItem('sassycam-settings:'+${JSON.stringify(status.user.id)},JSON.stringify({provider:'compatible',models:{compatible:'sassycam-test-vision'},endpoints:{compatible:'http://127.0.0.1:${mock.address().port}/v1'},speak:false}))`,
    );
    await win.webContents.reload();
    await waitFor(
      `document.querySelector('.provider-pill')?.textContent.includes('API compatible')`,
    );
    await evaluate(
      `(()=>{const a=document.querySelector('textarea');const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(a,'Réplique de test saisie au clavier');a.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await clickText("Roast me");
    await waitFor(
      `document.querySelector('.settings-content')?.textContent.includes('Chez vous')`,
    );
    await evaluate(
      `(()=>{const e=[...document.querySelectorAll('.toggle-row')].find(x=>x.textContent.includes('Autoriser mon fournisseur'));e.querySelector('input').click();})()`,
    );
    await evaluate(`document.querySelector('.sidebar nav button').click()`);
    await waitFor(`!document.querySelector('.studio-page').hidden`);
    // A persisted gallery image is reused by explicitly selecting its capture for the reply.
    await evaluate(
      `[...document.querySelectorAll('.timeline-item')].find(x=>x.textContent.includes('Capture'))?.click()`,
    );
    await waitFor(`!!document.querySelector('.source-photo')`);
    await clickText("Roast me");
    await waitFor(
      `document.querySelector('.reaction-text')?.textContent.includes('Ton cadrage')`,
    );
    check("typed response uses configured personal provider", true);
    check(
      "API receives typed words",
      report.network.some(
        (n) => n.userText === "Réplique de test saisie au clavier",
      ),
      report.network,
    );
    await evaluate(`document.querySelector('.mood-presets button').click()`);
    check(
      "worship preset reaches minus 100",
      await evaluate(
        `document.querySelector('.mood-number').textContent==='-100'`,
      ),
    );
    await writeFile(
      path.join(output, "studio-response.png"),
      (await win.webContents.capturePage()).toPNG(),
    );
    await evaluate(
      `document.querySelector('button[aria-label="Grille de cadrage"]').click()`,
    );
    await waitFor(`!!document.querySelector('.composition-grid')`);
    check("framing grid toggles", true);
    win.setSize(390, 844);
    await pause(400);
    const mobile = await evaluate(
      `({width:innerWidth,scroll:document.documentElement.scrollWidth,nav:getComputedStyle(document.querySelector('.mobile-nav')).display})`,
    );
    check(
      "mobile has navigation and no horizontal overflow",
      mobile.scroll <= mobile.width && mobile.nav === "flex",
      mobile,
    );
    await writeFile(
      path.join(output, "studio-mobile.png"),
      (await win.webContents.capturePage()).toPNG(),
    );
    win.setSize(1480, 1000);
    await pause(300);
    if (process.env.SASSYCAM_AI_SMOKE === "1") {
      await evaluate(
        `document.querySelector('.sidebar nav button:last-child').click()`,
      );
      await waitFor(`!!document.querySelector('.settings-content')`);
      await clickText("Intelligence artificielle");
      await evaluate(
        `(()=>{const e=[...document.querySelectorAll('.settings-content select')][0];const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(e,'browser');e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
      if(process.env.SASSYCAM_CPU_SMOKE==='1'){await evaluate(`(()=>{const e=[...document.querySelectorAll('.local-ai-panel select')].find(s=>[...s.options].some(o=>o.value==='wasm'));Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'wasm');e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
      await evaluate(`document.querySelector('.toast button')?.click()`);
      await pause(150);
      await clickText("Activer l’IA gratuite");
      await waitFor(
        `(()=>{const error=document.querySelector('.toast.error');if(error?.textContent.includes('Chargement du modèle local impossible'))throw Error(error.textContent);return document.querySelector('.local-ai-panel .primary-button')?.textContent.includes('Modèle prêt');})()`,
        240000,
      );
      check("real browser AI model loads", true);
      await evaluate(`document.querySelector('.sidebar nav button').click()`);
      await clickText("Adore-moi");
      const responsiveStart = Date.now();
      await evaluate(
        `({busy:document.querySelector('.primary-actions .primary-button').disabled,cancelAvailable:!!document.querySelector('.progress-line button')})`,
      );
      check(
        "UI stays responsive during real local inference",
        Date.now() - responsiveStart < 3000,
        { elapsedMs: Date.now() - responsiveStart },
      );
      await waitFor(
        `!document.querySelector('.primary-actions .primary-button').disabled`,
        180000,
      );
      const local = await evaluate(
        `({text:document.querySelector('.reaction-text')?.textContent,provider:document.querySelector('.reaction-meta')?.textContent,error:document.querySelector('.toast.error')?.textContent})`,
      );
      check(
        "browser AI completes real inference",
        !!local.text &&
          local.provider?.includes("IA du navigateur") &&
          !local.error,
        local,
      );
      report.localInference = local;
      const appRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
      );
      const localChunk = (
        await readdir(path.join(appRoot, "dist", "assets"))
      ).find((name) => /^local-ai-.+\.js$/.test(name));
      const typed = await evaluate(
        `(async()=>{const {localReply}=await import('/assets/'+${JSON.stringify(localChunk)});return localReply(undefined,'Je prépare mon grand retour au studio.',-35,'fr',new AbortController().signal);})()`,
      );
      check(
        "local typed-only reply completes without claiming vision",
        !!typed.text && typed.vision === false,
        {
          text: typed.text,
          model: typed.model,
          device: typed.device,
          vision: typed.vision,
        },
      );
      report.textOnlyInference = typed;
      await clickText("Adore-moi");
      await evaluate(
        `document.querySelector('.progress-line button')?.click()`,
      );
      await waitFor(
        `!document.querySelector('.primary-actions .primary-button').disabled`,
        5000,
      );
      check("local inference cancellation returns control promptly", true);
    }
    if (process.env.SASSYCAM_VOICE_SMOKE === "1") {
      const appRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
      );
      const chunk = (await readdir(path.join(appRoot, "dist", "assets"))).find(
        (name) => /^local-ai-.+\.js$/.test(name),
      );
      const wav = (
        await readFile(
          process.env.SASSYCAM_VOICE_FILE ||
            path.join(output, "voice-fixture.wav"),
        )
      ).toString("base64");
      const transcript = await evaluate(
        `(async()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(wav)}),c=>c.charCodeAt(0));const context=new AudioContext();const decoded=await context.decodeAudioData(bytes.buffer);await context.close();const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const samples=(await offline.startRendering()).getChannelData(0);const {transcribeLocal}=await import('/assets/'+${JSON.stringify(chunk)});return transcribeLocal(samples,'en',()=>{});})()`,
      );
      check(
        "real local Whisper transcribes generated speech",
        typeof transcript === "string" &&
          transcript.toLowerCase().includes("photo"),
        { transcript },
      );
      report.voiceInference = {
        text: transcript,
        input: "Windows system TTS fixture: Take a photo.",
        physicalMicrophone: false,
      };
    }
    report.passed = true;
  } catch (e) {
    report.passed = false;
    report.failure = e.message;
    await writeFile(
      path.join(output, "failure.png"),
      (await win.webContents.capturePage()).toPNG(),
    );
  } finally {
    mock.close();
    await writeFile(
      path.join(output, "smoke-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
    // A failed browser/native session can leave executeJavaScript unresolved.
    // Test teardown must remain bounded even after that renderer failure.
    setTimeout(() => process.exit(report.passed ? 0 : 1), 5000);
    try {
      const appRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
      );
      const chunk = (await readdir(path.join(appRoot, "dist", "assets"))).find(
        (name) => /^local-ai-.+\.js$/.test(name),
      );
      if (chunk)
        await evaluate(
          `import('/assets/'+${JSON.stringify(chunk)}).then(m=>m.disposeLocalAI())`,
        );
    } catch {}
    setTimeout(() => process.exit(report.passed ? 0 : 1), 1000);
    await closeService?.();
    app.exit(report.passed ? 0 : 1);
  }
}
