import { AppError, splitImage, imagePrompt } from "./contracts.mjs";
import { endpoint, readProviderResponse } from "./providers.mjs";
export async function comfyImage(b, signal) {
  const base = endpoint(b.imageEndpoint, true, "http://127.0.0.1:8188");
  const f = (p, init = {}) =>
    fetch(base + p, { ...init, signal, redirect: "error" });
  const object = await (
    await readProviderResponse(await f("/object_info/CheckpointLoaderSimple"))
  ).json();
  const checkpoints =
    object.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
  const checkpoint =
    b.imageModel && b.imageModel !== "auto" ? b.imageModel : checkpoints[0];
  if (!checkpoint || !checkpoints.includes(checkpoint))
    throw new AppError(
      "checkpoint_required",
      "Installez un checkpoint compatible dans ComfyUI et indiquez son nom exact.",
    );
  const { mime, base64 } = splitImage(b.image);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.set(
    "image",
    new Blob([bytes], { type: mime }),
    "sassycam-" +
      crypto.randomUUID() +
      "." +
      (mime === "image/jpeg" ? "jpg" : mime.split("/")[1]),
  );
  form.set("type", "input");
  const uploaded = await (
    await readProviderResponse(
      await f("/upload/image", { method: "POST", body: form }),
    )
  ).json();
  const graph = {
    1: {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    2: {
      class_type: "LoadImage",
      inputs: {
        image: uploaded.subfolder
          ? uploaded.subfolder + "/" + uploaded.name
          : uploaded.name,
      },
    },
    3: {
      class_type: "ImageScale",
      inputs: {
        image: ["2", 0],
        upscale_method: "lanczos",
        width: 768,
        height: 768,
        crop: "center",
      },
    },
    4: { class_type: "VAEEncode", inputs: { pixels: ["3", 0], vae: ["1", 2] } },
    5: {
      class_type: "CLIPTextEncode",
      inputs: { text: imagePrompt(b), clip: ["1", 1] },
    },
    6: {
      class_type: "CLIPTextEncode",
      inputs: { text: "text, watermark, blurry, disfigured", clip: ["1", 1] },
    },
    7: {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0],
        seed: Math.floor(Math.random() * 2 ** 32),
        steps: 24,
        cfg: 6,
        sampler_name: "euler",
        scheduler: "normal",
        positive: ["5", 0],
        negative: ["6", 0],
        latent_image: ["4", 0],
        denoise: 0.55,
      },
    },
    8: {
      class_type: "VAEDecode",
      inputs: { samples: ["7", 0], vae: ["1", 2] },
    },
    9: {
      class_type: "SaveImage",
      inputs: { filename_prefix: "SassyCam", images: ["8", 0] },
    },
  };
  const queued = await (
    await readProviderResponse(
      await f("/prompt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: graph, client_id: crypto.randomUUID() }),
      }),
    )
  ).json();
  const id = queued.prompt_id;
  if (!id)
    throw new AppError(
      "comfy_error",
      "ComfyUI n’a pas accepté le workflow.",
      502,
    );
  const expires = Date.now() + 180000;
  while (Date.now() < expires) {
    signal?.throwIfAborted();
    const history = await (
      await readProviderResponse(await f("/history/" + encodeURIComponent(id)))
    ).json();
    const entry = history[id];
    if (entry?.status?.status_str === "error")
      throw new AppError(
        "comfy_workflow",
        "Le workflow ComfyUI a échoué. Vérifiez que le checkpoint est compatible avec VAE et CLIP.",
        502,
      );
    const img = entry?.outputs?.["9"]?.images?.[0];
    if (img) {
      const q = new URLSearchParams({
        filename: img.filename,
        subfolder: img.subfolder || "",
        type: img.type || "output",
      });
      const response = await readProviderResponse(await f("/view?" + q));
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 18_000_000)
        throw new AppError("large_image", "Image trop volumineuse.", 502);
      return {
        image: `data:image/png;base64,${buffer.toString("base64")}`,
        provider: "comfyui",
        model: checkpoint,
        generated: true,
      };
    }
    await new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, 1000);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  throw new AppError(
    "comfy_timeout",
    "Le portrait est encore dans la file ComfyUI. Consultez ComfyUI avant de relancer pour éviter un doublon.",
    504,
  );
}
