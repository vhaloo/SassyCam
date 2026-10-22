import { useEffect, useRef, useState } from "react";
export function useCamera() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  async function refreshDevices() {
    if (navigator.mediaDevices)
      setDevices(await navigator.mediaDevices.enumerateDevices());
  }
  function stop() {
    generation.current++;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setActive(false);
    setStarting(false);
  }
  async function start(id = "") {
    stop();
    const attempt = ++generation.current;
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "La caméra nécessite HTTPS et un navigateur compatible. Ouvrez le Site dans un nouvel onglet.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(id ? { deviceId: { exact: id } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      if (attempt !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      media.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (stream.current === media) stop();
      });
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
      setActive(true);
      await refreshDevices();
    } catch (e: any) {
      if (attempt !== generation.current) return;
      if (e.name === "NotAllowedError")
        throw new Error(
          "Accès à la caméra refusé. Autorisez-la dans les réglages du navigateur, puis réessayez.",
        );
      if (e.name === "NotFoundError" || e.name === "OverconstrainedError")
        throw new Error(
          "Caméra introuvable. Choisissez un autre périphérique.",
        );
      if (e.name === "NotReadableError")
        throw new Error("Cette caméra est occupée par une autre application.");
      throw e;
    } finally {
      if (attempt === generation.current) setStarting(false);
    }
  }
  useEffect(() => {
    refreshDevices().catch(() => {});
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);
    return () => {
      stop();
      navigator.mediaDevices?.removeEventListener(
        "devicechange",
        refreshDevices,
      );
    };
  }, []);
  return { video, active, starting, devices, start, stop, refreshDevices };
}
export async function decodeAudio(blob: Blob) {
  const audio = new AudioContext();
  try {
    const decoded = await audio.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * 16000),
      16000,
    );
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    await audio.close();
  }
}
export function dataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
