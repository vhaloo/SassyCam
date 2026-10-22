export async function loadImage(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  return img;
}
export async function normalizeImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 12_000_000
  )
    throw new Error("Choisissez une image JPEG, PNG ou WebP de 12 Mo maximum.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (img.width * img.height > 60_000_000)
      throw new Error("Image trop grande. Réduisez sa résolution.");
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function snapshot(video: HTMLVideoElement, mirror: boolean) {
  if (video.readyState < 2 || !video.videoWidth)
    throw new Error("La caméra n’est pas encore prête.");
  const width = Math.min(1280, video.videoWidth);
  const height = Math.round((width * 3) / 4);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d")!;
  const ratio = Math.max(width / video.videoWidth, height / video.videoHeight);
  const w = video.videoWidth * ratio,
    h = video.videoHeight * ratio;
  if (mirror) {
    g.translate(width, 0);
    g.scale(-1, 1);
  }
  g.drawImage(video, (width - w) / 2, (height - h) / 2, w, h);
  return c.toDataURL("image/jpeg", 0.88);
}
export async function illustrateLocal(
  image: string,
  style: string,
  mood: number,
) {
  const img = await loadImage(image);
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = mood < 0 ? "#f1d9f4" : "#f4e6bc";
  g.fillRect(0, 0, 1024, 1024);
  const box = 920;
  const ratio = Math.max(box / img.width, box / img.height);
  g.save();
  g.beginPath();
  g.roundRect(52, 52, box, box, 28);
  g.clip();
  g.filter =
    style === "Noir & blanc"
      ? "grayscale(1) contrast(1.3)"
      : style === "Rétro"
        ? "sepia(.45) saturate(1.25) contrast(1.2)"
        : "saturate(1.35) contrast(1.15)";
  g.drawImage(
    img,
    52 + (box - img.width * ratio) / 2,
    52 + (box - img.height * ratio) / 2,
    img.width * ratio,
    img.height * ratio,
  );
  g.filter = "none";
  const pixels = g.getImageData(52, 52, box, box);
  const original = new Uint8ClampedArray(pixels.data);
  const d = pixels.data;
  for (let y = 1; y < box - 1; y++)
    for (let x = 1; x < box - 1; x++) {
      const i = (y * box + x) * 4;
      const edge =
        Math.abs(original[i] - original[i + 4]) +
        Math.abs(original[i] - original[i + box * 4]);
      for (let channel = 0; channel < 3; channel++) {
        let v = original[i + channel];
        if (style === "Pop art" || style === "Éditorial")
          v = Math.round(v / 48) * 48;
        d[i + channel] = edge > 65 ? v * 0.35 : v;
      }
    }
  g.putImageData(pixels, 52, 52);
  g.restore();
  g.fillStyle = "#20251e";
  g.font = "600 16px system-ui";
  g.fillText("SASSYCAM / LOCAL EDITION", 58, 1004);
  return {
    image: c.toDataURL("image/png"),
    provider: "local",
    model: "Illustration locale · sans IA générative",
    generated: false,
  };
}
export async function shareCard(
  image: string | undefined,
  text: string,
  mood: number,
) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = image ? 1350 : 1080;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f5f3ed";
  g.fillRect(0, 0, c.width, c.height);
  if (image) {
    const img = await loadImage(image);
    const scale = Math.max(1000 / img.width, 920 / img.height);
    g.save();
    g.beginPath();
    g.roundRect(40, 40, 1000, 920, 30);
    g.clip();
    g.drawImage(
      img,
      40 + (1000 - img.width * scale) / 2,
      40 + (920 - img.height * scale) / 2,
      img.width * scale,
      img.height * scale,
    );
    g.restore();
  }
  let y = image ? 1040 : 300;
  g.fillStyle = "#23271f";
  g.font = "600 36px system-ui";
  const words = text.slice(0, 700).split(/\s+/);
  let line = "";
  for (const word of words) {
    const next = line + " " + word;
    if (g.measureText(next).width > 960 && line) {
      g.fillText(line.trim(), 60, y);
      y += 48;
      line = word;
    } else line = next;
    if (y > c.height - 120) break;
  }
  if (y <= c.height - 100) g.fillText(line.trim(), 60, y);
  g.font = "600 22px system-ui";
  g.fillText(
    `SASSYCAM  /  ${mood < 0 ? "WORSHIP" : mood === 0 ? "NEUTRAL" : "ROAST"} ${Math.abs(mood)}%`,
    60,
    c.height - 50,
  );
  return c.toDataURL("image/png");
}
