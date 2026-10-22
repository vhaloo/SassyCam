"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Sparkles,
  Images,
  SlidersHorizontal,
  History,
  ArrowUpRight,
  ArrowRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Upload,
  Download,
  X,
  Check,
  Plus,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  FlipHorizontal,
  Grid2X2,
  Timer,
  ShieldCheck,
  Monitor,
  Globe,
  Flame,
  Heart,
  MoveUpRight,
  Square,
  Play,
  Pause,
  Copy,
  Trash2,
  Maximize2,
  Sun,
  Moon,
  Settings2,
  FolderOpen,
  MessageCircle,
  LogOut,
  Keyboard,
  Info,
  AlertCircle,
} from "lucide-react";
import { api, APIError } from "./api";
import {
  DEFAULT_PREFS,
  PROVIDER_NAMES,
  IMAGE_NAMES,
  type Status,
  type Preferences,
  type Provider,
  type ImageProvider,
  type Entry,
} from "./types";
import {
  guestId,
  usePreferences,
  getEntries,
  putEntry,
  removeEntry,
  importEntries,
  download,
} from "./storage";
import {
  loadImage,
  normalizeImage,
  snapshot,
  illustrateLocal,
  shareCard,
} from "./images";
import { useCamera, decodeAudio, dataURL } from "./media";
import { clampMood, moodLabel, voiceCommand } from "../../server/contracts.mjs";

type Tab = "studio" | "gallery" | "history" | "settings";
const LANGS = [
  ["fr", "Français"],
  ["en", "English"],
  ["es", "Español"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["zh", "中文"],
];
const STYLES = [
  "Éditorial",
  "Pop art",
  "Aquarelle",
  "Rétro",
  "Noir & blanc",
  "Bande dessinée",
];
const cloud = (p: string) =>
  !["browser", "ollama", "local", "comfyui"].includes(p);
const fmtDate = (s: string) =>
  new Date(s).toLocaleString("fr-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function IconButton({
  label,
  children,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      {...props}
      type="button"
      className={`icon-button ${active ? "active" : ""} ${props.className || ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? "disabled" : ""}`}>
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <span className="brand-mark">
        <Camera size={small ? 20 : 25} />
        <i>✦</i>
      </span>
      {!small && (
        <span>
          SassyCam<span className="brand-dot">®</span>
        </span>
      )}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null),
    [statusError, setStatusError] = useState("");
  const [guest] = useState(guestId);
  const scope = status?.user?.id || guest;
  const [p, setP] = usePreferences(scope, !!status?.local);
  const [tab, setTab] = useState<Tab>("studio"),
    [settingsTab, setSettingsTab] = useState("ai");
  const [entries, setEntries] = useState<Entry[]>([]),
    [selected, setSelected] = useState<Entry | null>(null),
    [lightbox, setLightbox] = useState<Entry | null>(null);
  const [photo, setPhoto] = useState<string>(),
    [sourceName, setSourceName] = useState(""),
    [text, setText] = useState("");
  const [busy, setBusy] = useState(""),
    [progress, setProgress] = useState(""),
    [count, setCount] = useState(0);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
      null,
    ),
    [keys, setKeys] = useState<Record<string, string>>({});
  const [modelList, setModelList] = useState<{ id: string; name: string }[]>(
      [],
    ),
    [modelsBusy, setModelsBusy] = useState(false);
  const [localReady, setLocalReady] = useState(false),
    [localLoading, setLocalLoading] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [listening, setListening] = useState(false),
    [voiceBusy, setVoiceBusy] = useState(false),
    [voiceState, setVoiceState] = useState(""),
    [authPending, setAuthPending] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [confirmDelete, setConfirmDelete] = useState<Entry | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]),
    [profileName, setProfileName] = useState("");
  const [speakerTest, setSpeakerTest] = useState(false);
  const camera = useCamera();
  const uploadRef = useRef<HTMLInputElement>(null),
    importRef = useRef<HTMLInputElement>(null),
    textRef = useRef<HTMLTextAreaElement>(null);
  const controller = useRef<AbortController | null>(null),
    locked = useRef(false),
    recognizer = useRef<any>(null),
    recorder = useRef<MediaRecorder | null>(null),
    micStream = useRef<MediaStream | null>(null),
    micTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    audio = useRef<HTMLAudioElement | null>(null);
  const current = useRef({ p, scope });
  current.current = { p, scope };
  const voiceSequence = useRef(0),
    speechSequence = useRef(0);
  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );
  const refreshStatus = useCallback(async () => {
    try {
      const s = await api<Status>("status");
      setStatus(s);
      setStatusError("");
      if (s.chatgpt?.error) setAuthPending(false);
    } catch (e: any) {
      setStatusError(e.message);
    }
  }, []);
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = p.dark ? "dark" : "light";
  }, [p.dark]);
  useEffect(() => {
    let cancelled = false;
    setEntries([]);
    setSelected(null);
    setPhoto(undefined);
    setKeys({});
    getEntries(scope)
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch(() => {
        if (!cancelled)
          notify(
            "Le stockage local est indisponible. Les résultats restent affichés, mais ne seront pas conservés.",
            true,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [scope, notify]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoices(speechSynthesis.getVoices());
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  useEffect(() => {
    if (status?.local)
      api("profiles", {})
        .then((d) => setProfiles(d.profiles))
        .catch(() => {});
  }, [status?.local, status?.user?.id]);
  useEffect(() => {
    if (!authPending) return;
    const timer = setInterval(async () => {
      try {
        const s = await api<Status>("status");
        setStatus(s);
        if (s.chatgpt?.connected && !s.chatgpt.pending && !s.chatgpt.error) {
          setAuthPending(false);
          notify(
            "Compte ChatGPT connecté. Actualisez les modèles pour choisir le vôtre.",
          );
        }
        if (s.chatgpt?.error) {
          setAuthPending(false);
          notify(s.chatgpt.error, true);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(timer);
  }, [authPending, notify]);

  function stopSpeech() {
    speechSequence.current++;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (audio.current) {
      audio.current.pause();
      audio.current.src = "";
      audio.current = null;
    }
    setSpeaking(false);
  }
  function stopVoice() {
    voiceSequence.current++;
    recognizer.current?.abort();
    recognizer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    micStream.current?.getTracks().forEach((t) => t.stop());
    micStream.current = null;
    if (micTimer.current) clearTimeout(micTimer.current);
    setListening(false);
    setVoiceBusy(false);
  }
  function cancel() {
    controller.current?.abort();
    stopSpeech();
    stopVoice();
    setP({ auto: false });
    setProgress("");
  }
  function stopAll() {
    cancel();
    camera.stop();
    setVoiceState("");
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        controller.current?.abort();
        camera.stop();
        stopVoice();
        stopSpeech();
        setP({ auto: false });
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      controller.current?.abort();
      stopVoice();
      stopSpeech();
    };
  }, [scope]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "Escape") {
        setLightbox(null);
        setConfirmDelete(null);
        cancel();
        return;
      }
      if (
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName) ||
        target.isContentEditable
      )
        return;
      if (e.code === "Space" && tab === "studio") {
        e.preventDefault();
        void reactNow();
      }
      if (e.key.toLowerCase() === "c" && tab === "studio") {
        e.preventDefault();
        void takePhoto();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  });

  useEffect(()=>{
    if(!lightbox&&!confirmDelete)return;
    const dialog=document.querySelector<HTMLElement>('[role="dialog"]');
    const previous=document.activeElement as HTMLElement|null;
    const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const focusable=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex="0"]')||[]).filter(el=>!el.hasAttribute('disabled'));
    focusable()[0]?.focus();
    const trap=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const items=focusable();if(!items.length){event.preventDefault();return;}const first=items[0],last=items[items.length-1];if(event.shiftKey&&(document.activeElement===first||!dialog?.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog?.contains(document.activeElement))){event.preventDefault();first.focus();}};
    document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);document.body.style.overflow=oldOverflow;if(previous?.isConnected)previous.focus();};
  },[!!lightbox,!!confirmDelete]);

  async function persist(entry: Entry): Promise<boolean> {
    if (current.current.scope !== entry.scope) return false;
    setEntries((items) => [entry, ...items]);
    try {
      await putEntry(entry);
      return true;
    } catch (e: any) {
      notify(
        e.message ||
          "Stockage impossible. Téléchargez ce résultat pour le conserver.",
        true,
      );
      return false;
    }
  }
  function makeEntry(kind: Entry["kind"], data: Partial<Entry> = {}): Entry {
    return {
      id: crypto.randomUUID(),
      scope,
      kind,
      text: "",
      mood: p.mood,
      date: new Date().toISOString(),
      provider: "local",
      ...data,
    };
  }
  async function enableCamera() {
    try {
      await camera.start(p.cameraId);
      setPhoto(undefined);
      setSourceName("Caméra en direct");
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  async function takePhoto() {
    if (locked.current) return;
    try {
      const image = camera.active
        ? snapshot(camera.video.current!, p.mirror)
        : photo;
      if (!image) {
        notify("Activez la caméra ou importez une photo.", true);
        return;
      }
      setPhoto(image);
      setSourceName("Capture du studio");
      const entry = makeEntry("capture", { image });
      const saved = await persist(entry);
      setSelected(entry);
      if(saved) notify("Photo conservée sur cet appareil.");
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  async function imported(file: File) {
    try {
      const image = await normalizeImage(file);
      setPhoto(image);
      setSourceName(file.name);
      camera.stop();
      setP({ auto: false });
      const entry = makeEntry("capture", { image });
      const saved = await persist(entry);
      setSelected(entry);
      if(saved) notify(
        "Photo importée. Elle reste sur cet appareil jusqu’à une demande en ligne.",
      );
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  function captureNow() {
    return camera.active ? snapshot(camera.video.current!, p.mirror) : photo;
  }
  async function countdown(seconds: number, signal: AbortSignal) {
    for (let n = seconds; n > 0; n--) {
      signal.throwIfAborted();
      setCount(n);
      await new Promise<void>((resolve, reject) => {
        const aborted = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", aborted);
          resolve();
        }, 1000);
        signal.addEventListener("abort", aborted, { once: true });
      });
    }
    setCount(0);
  }
  function needsCloud(provider: string) {
    if (!cloud(provider)) return false;
    if (!p.cloudConsent) {
      setTab("settings");
      setSettingsTab("privacy");
      notify(
        "Autorisez l’envoi à votre fournisseur personnel pour cette session, ou choisissez une IA locale.",
        true,
      );
      return true;
    }
    if (!status?.local && !status?.user) {
      notify(
        "Connectez-vous au Site avec ChatGPT avant d’utiliser votre fournisseur.",
        true,
      );
      return true;
    }
    return false;
  }
  async function say(value: string) {
    if (!p.speak || !value) return;
    stopSpeech();
    stopVoice();
    const sequence = speechSequence.current;
    setSpeaking(true);
    try {
      if (p.voiceEngine === "kokoro" && status?.local) {
        const result = await api("voice/speak", {
          text: value,
          language: p.language,
          voice: p.voice || "ff_siwis",
        });
        if (sequence !== speechSequence.current) return;
        const player = new Audio(result.audio);
        audio.current = player;
        player.volume = p.volume;
        player.playbackRate = p.rate;
        player.onended = () => {
          if (sequence === speechSequence.current) setSpeaking(false);
        };
        player.onerror = () => {
          setSpeaking(false);
          notify("Lecture audio impossible.", true);
        };
        if (p.outputId && (player as any).setSinkId)
          await (player as any).setSinkId(p.outputId);
        if (sequence !== speechSequence.current) return;
        await player.play();
        return;
      }
      if (!("speechSynthesis" in window))
        throw new Error(
          "La synthèse vocale n’est pas disponible dans ce navigateur.",
        );
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = p.language;
      utterance.volume = p.volume;
      utterance.rate = p.rate;
      utterance.voice =
        voices.find((v) => v.voiceURI === p.voice) ||
        voices.find((v) => v.lang.startsWith(p.language)) ||
        null;
      utterance.onend = () => {
        if (sequence === speechSequence.current) setSpeaking(false);
      };
      utterance.onerror = () => {
        if (sequence === speechSequence.current) setSpeaking(false);
      };
      speechSynthesis.speak(utterance);
    } catch (e: any) {
      setSpeaking(false);
      notify(e.message, true);
    }
  }
  async function reactNow(override?: string, automatic = false) {
    if (locked.current || voiceBusy || (!automatic && busy)) return;
    if (needsCloud(p.provider)) return;
    if (p.provider === "browser" && !localReady) {
      setTab("settings");
      setSettingsTab("ai");
      notify(
        "Activez l’IA gratuite pour télécharger le modèle local, ou choisissez votre fournisseur.",
      );
      return;
    }
    const c = new AbortController();
    controller.current = c;
    locked.current = true;
    setBusy("reply");
    setProgress("Le studio prépare sa réplique…");
    stopSpeech();
    stopVoice();
    try {
      if (!automatic) await countdown(p.countdown, c.signal);
      const image = captureNow();
      const words = override ?? text;
      if (!image && !words.trim())
        throw new Error("Ajoutez une photo ou une réplique pour commencer.");
      const result =
        p.provider === "browser"
          ? await (
              await import("./local-ai")
            ).localReply(image, words, p.mood, p.language, c.signal)
          : await api(
              "reply",
              {
                provider: p.provider,
                model: p.models[p.provider],
                endpoint: p.endpoints[p.provider],
                apiKey: keys[p.provider] || undefined,
                image,
                text: words,
                mood: p.mood,
                language: p.language,
              },
              c.signal,
            );
      c.signal.throwIfAborted();
      const entry = makeEntry("reply", {
        ...result,
        image,
        text: result.text,
        sourceId: selected?.id,
      });
      await persist(entry);
      if (current.current.scope !== scope) return;
      setSelected(entry);
      setPhoto(image);
      setText("");
      void say(result.text);
      if (p.ros && status?.local)
        api("ros", { topic: p.rosTopic, text: result.text }).catch((e) =>
          notify(e.message, true),
        );
      if (p.autoPortrait && image) {
        setProgress("La réplique est prête. Création du portrait…");
        await createPortraitInternal(image, result.text, c.signal);
      }
    } catch (e: any) {
      if (!c.signal.aborted) {
        notify(e.message || "Réplique impossible.", true);
        if (automatic) setP({ auto: false });
      }
    } finally {
      setCount(0);
      setBusy("");
      setProgress("");
      locked.current = false;
      if (controller.current === c) controller.current = null;
    }
  }
  async function createPortraitInternal(
    image: string,
    words: string,
    signal: AbortSignal,
  ) {
    if (needsCloud(p.imageProvider)) return;
    const result =
      p.imageProvider === "local"
        ? await illustrateLocal(image, p.style, p.mood)
        : await api(
            "image",
            {
              image,
              imageProvider: p.imageProvider,
              imageModel: p.imageModels[p.imageProvider],
              imageEndpoint: p.endpoints[p.imageProvider],
              apiKey: keys[p.imageProvider] || undefined,
              text: words,
              mood: p.mood,
              language: p.language,
              style: p.style,
            },
            signal,
          );
    signal.throwIfAborted();
    const entry = makeEntry("portrait", {
      ...result,
      text: words,
      sourceId: selected?.id,
    });
    const saved=await persist(entry);
    if (current.current.scope === scope) {
      setSelected(entry);
      if(saved) notify(
        result.generated
          ? "Portrait IA créé et conservé sur cet appareil."
          : "Illustration locale créée · traitement photo sans IA générative.",
      );
    }
  }
  async function createPortrait() {
    if (locked.current || needsCloud(p.imageProvider)) return;
    const c = new AbortController();
    controller.current = c;
    locked.current = true;
    setBusy("portrait");
    setProgress(
      p.imageProvider === "local"
        ? "L’atelier illustre votre photo…"
        : "Votre fournisseur crée le portrait…",
    );
    try {
      await countdown(p.countdown, c.signal);
      const image = captureNow();
      if (!image)
        throw new Error("Prenez ou importez une photo pour créer un portrait.");
      await createPortraitInternal(image, selected?.text || text, c.signal);
    } catch (e: any) {
      if (!c.signal.aborted) notify(e.message, true);
    } finally {
      setCount(0);
      setBusy("");
      setProgress("");
      locked.current = false;
      controller.current = null;
    }
  }
  const reactRef = useRef(reactNow);
  reactRef.current = reactNow;
  useEffect(() => {
    if (!p.auto || tab !== "studio" || !camera.active) return;
    const timer = setInterval(
      () => {
        if (
          !document.hidden &&
          !locked.current &&
          !speaking &&
          !listening &&
          !voiceBusy
        )
          void reactRef.current(undefined, true);
      },
      Math.max(15, p.interval) * 1000,
    );
    return () => clearInterval(timer);
  }, [p.auto, p.interval, tab, camera.active, speaking, listening, voiceBusy]);

  async function voiceResult(value: string) {
    const command = voiceCommand(value);
    setVoiceState(value);
    if (command.type === "stop") {
      cancel();
      return;
    }
    if (command.type === "capture") {
      await takePhoto();
      return;
    }
    if (command.type === "portrait") {
      await createPortrait();
      return;
    }
    if (command.type === "mood") {
      setP({ mood: command.value ?? clampMood(p.mood + (command.delta || 0)) });
      notify("Personnalité ajustée.");
      return;
    }
    setText(value);
    await reactNow(value);
  }
  async function toggleVoice() {
    if (listening) {
      if (recorder.current?.state === "recording") {
        recorder.current.stop();
        if (micTimer.current) clearTimeout(micTimer.current);
      } else recognizer.current?.stop();
      return;
    }
    if (locked.current || voiceBusy) return;
    stopSpeech();
    stopVoice();
    const sequence = voiceSequence.current;
    try {
      const Recognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (p.voiceInput === "browser" && Recognition && !status?.local) {
        const r = new Recognition();
        r.lang = p.language;
        r.continuous = false;
        r.interimResults = true;
        recognizer.current = r;
        r.onresult = (event: any) => {
          if (sequence !== voiceSequence.current) return;
          let value = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            value += event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setListening(false);
              r.stop();
              void voiceResult(value);
              return;
            }
          }
          setVoiceState(value);
        };
        r.onerror = (e: any) => {
          if (sequence !== voiceSequence.current) return;
          setListening(false);
          notify(
            e.error === "not-allowed"
              ? "Accès au micro refusé."
              : "Reconnaissance vocale indisponible. Choisissez Whisper local dans les réglages.",
            true,
          );
        };
        r.onend = () => {
          if (sequence === voiceSequence.current) setListening(false);
        };
        r.start();
        setListening(true);
        setVoiceState("Je vous écoute…");
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({
        audio: p.micId ? { deviceId: { exact: p.micId } } : true,
        video: false,
      });
      if (sequence !== voiceSequence.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      micStream.current = media;
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = async () => {
        media.getTracks().forEach((t) => t.stop());
        setListening(false);
        if (
          !chunks.length ||
          document.hidden ||
          sequence !== voiceSequence.current
        )
          return;
        setVoiceBusy(true);
        setVoiceState("Transcription locale…");
        try {
          const blob = new Blob(chunks, { type: rec.mimeType });
          let value: string;
          if (status?.local && p.voiceInput === "whisper") {
            const result = await api("voice/transcribe", {
              audio: await dataURL(blob),
              language: p.language,
              model: p.whisperModel,
            });
            value = result.text;
          } else {
            const { transcribeLocal } = await import("./local-ai");
            value = await transcribeLocal(
              await decodeAudio(blob),
              p.language,
              setVoiceState,
            );
          }
          if (sequence !== voiceSequence.current || document.hidden) return;
          setVoiceBusy(false);
          if (value.trim()) await voiceResult(value);
          else notify("Aucune parole reconnue.");
        } catch (e: any) {
          if (sequence === voiceSequence.current) {
            setVoiceBusy(false);
            notify(e.message, true);
          }
        }
      };
      rec.start();
      setListening(true);
      setVoiceState("Je vous écoute · cliquez pour terminer");
      await camera.refreshDevices();
      micTimer.current = setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 15000);
    } catch (e: any) {
      stopVoice();
      notify(
        e.name === "NotAllowedError"
          ? "Accès au micro refusé. Vérifiez les permissions du navigateur."
          : e.message,
        true,
      );
    }
  }
  async function enableLocal() {
    if (localLoading) return;
    setLocalLoading(true);
    try {
      const { loadLocalAI } = await import("./local-ai");
      await loadLocalAI(setProgress, p.device);
      setLocalReady(true);
      notify(
        "IA locale prête. Le premier résultat peut demander quelques instants.",
      );
    } catch (e: any) {
      notify("Chargement du modèle local impossible : " + e.message, true);
    } finally {
      setLocalLoading(false);
      setProgress("");
    }
  }
  async function refreshModels() {
    setModelsBusy(true);
    try {
      if (p.provider === "browser") {
        setModelList([
          { id: DEFAULT_PREFS.models.browser, name: "SmolVLM · 256M · local" },
        ]);
        return;
      }
      const result = await api("models", {
        provider: p.provider,
        apiKey: keys[p.provider] || undefined,
        endpoint: p.endpoints[p.provider],
        language: p.language,
      });
      setModelList(result.models);
      if (
        result.models.length &&
        (!p.models[p.provider] || p.models[p.provider] === "auto")
      )
        setP({ models: { ...p.models, [p.provider]: result.models[0].id } });
      if (!result.models.length)
        notify(
          "Aucun modèle trouvé pour ce compte ou ce serveur. Installez-en un ou indiquez son nom.",
          true,
        );
      else notify(`${result.models.length} modèles disponibles.`);
    } catch (e: any) {
      notify(e.message, true);
    } finally {
      setModelsBusy(false);
    }
  }
  async function connectChatGPT(addAccount = false) {
    try {
      await api("chatgpt/connect", { addAccount });
      setAuthPending(true);
      notify(
        "Autorisez SassyCam dans votre navigateur. Votre compte reste personnel.",
      );
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  async function storeKey(provider: string) {
    try {
      await api("credentials", { provider, apiKey: keys[provider] || "" });
      setKeys((k) => ({ ...k, [provider]: "" }));
      await refreshStatus();
      notify("Clé enregistrée dans le trousseau chiffré de cet ordinateur.");
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  async function deleteItem(entry: Entry) {
    try {
      await removeEntry(entry.id, scope);
      setEntries((items) => items.filter((e) => e.id !== entry.id));
      if (selected?.id === entry.id) setSelected(null);
      setLightbox(null);
      setConfirmDelete(null);
      notify("Élément retiré de la galerie locale.");
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  async function exportCard(entry: Entry) {
    try {
      download(
        "SassyCam-" + entry.id.slice(0, 8) + ".png",
        await shareCard(entry.image, entry.text, entry.mood),
      );
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  async function openOriginal(entry: Entry) {
    if (status?.local && entry.image) {
      try {
        await api("open-image", { image: entry.image });
        notify("Image ouverte dans votre application système.");
      } catch (e: any) {
        notify(e.message, true);
      }
    } else setLightbox(entry);
  }
  async function openFolder() {
    try {
      await api("open-folder", {});
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  function navigate(next: Tab) {
    if (next !== tab) {
      stopVoice();
      stopSpeech();
      setP({ auto: false });
    }
    setTab(next);
  }
  function selectEntry(entry: Entry) {
    setSelected(entry);
    if (entry.image && entry.kind !== "portrait") {
      camera.stop();
      setP({ auto: false });
      setPhoto(entry.image);
      setSourceName("Photo de la galerie");
    }
  }
  async function switchProfile(id?: string) {
    stopAll();
    try {
      await api("profile", id ? { id } : { create: true, name: profileName });
      await refreshStatus();
      setProfileName("");
      notify("Profil chargé. La galerie et les clés sont séparées.");
    } catch (e: any) {
      notify(e.message, true);
    }
  }
  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify("Réplique copiée.");
    } catch {
      notify("Copie impossible. Sélectionnez le texte pour le copier.", true);
    }
  }
  const artworks = entries.filter((e) => e.kind === "portrait");
  const filtered = entries.filter(
    (e) =>
      (galleryFilter === "all" || e.kind === galleryFilter) &&
      (!search ||
        `${e.text} ${moodLabel(e.mood)}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const reaction = selected?.text || "";
  const isCloud = cloud(p.provider);
  const resultImage = selected?.kind === "portrait" ? selected.image : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="edition">
          LE STUDIO À PERSONNALITÉ <span>1.0</span>
        </div>
        <nav aria-label="Navigation principale">
          {(
            [
              { id: "studio", label: "Le studio", icon: Camera },
              { id: "gallery", label: "La galerie", icon: Images },
              { id: "history", label: "Les répliques", icon: History },
              {
                id: "settings",
                label: "Les réglages",
                icon: SlidersHorizontal,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "selected" : ""}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === "gallery" && artworks.length > 0 && (
                <small>{artworks.length}</small>
              )}
              {tab === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="star-doodle">✳</span>
          <p>
            Un peu de piquant.
            <br />
            Beaucoup de vous.
          </p>
          <small>
            Vos images. Votre IA.
            <br />
            Votre sens de l’humour.
          </small>
        </div>
        <div className="sidebar-bottom">
          <div className="account-avatar">
            {(status?.user?.name || "S").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{status?.user?.name || "Votre studio"}</strong>
            <span>
              {status?.local
                ? "Sur cet ordinateur"
                : status?.user
                  ? "Connecté avec ChatGPT"
                  : "Version web"}
            </span>
          </div>
          <IconButton
            label="Réglages du compte"
            onClick={() => {
              setSettingsTab("privacy");
              navigate("settings");
            }}
          >
            <Settings2 size={17} />
          </IconButton>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand small />
          </div>
          <div className="breadcrumb">
            Votre espace créatif <span>/</span>{" "}
            <strong>
              {tab === "studio"
                ? "Studio"
                : tab === "gallery"
                  ? "Galerie"
                  : tab === "history"
                    ? "Répliques"
                    : "Réglages"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="privacy-badge">
              <ShieldCheck size={15} />
              {isCloud ? "Votre fournisseur personnel" : "Traitement local"}
            </span>
            <IconButton
              label={
                p.dark ? "Passer au thème clair" : "Passer au thème sombre"
              }
              onClick={() => setP({ dark: !p.dark })}
            >
              {p.dark ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
            {!status?.local && (
              <a
                className="signin-button"
                href={
                  status?.user
                    ? "/signout-with-chatgpt"
                    : "/signin-with-chatgpt"
                }
                target="_top"
              >
                {status?.user ? (
                  <>
                    <LogOut size={15} />
                    Déconnexion
                  </>
                ) : (
                  <>
                    Continue with ChatGPT <ArrowUpRight size={15} />
                  </>
                )}
              </a>
            )}
          </div>
        </header>
        <main>
          {statusError && (
            <div className="notice error">
              <AlertCircle size={18} />
              <span>{statusError}</span>
              <button onClick={refreshStatus}>Réessayer</button>
            </div>
          )}
          <section className="studio-page" hidden={tab !== "studio"}>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span /> PRÊT POUR VOTRE GROS PLAN ?
                </div>
                <h1>
                  Vous avez bonne <em>mine.</em>
                  <span className="heading-star">✧</span>
                </h1>
                <p>On vous adore. On vous taquine. C’est vous qui dosez.</p>
              </div>
              <button
                className="quiet-button provider-pill"
                onClick={() => {
                  setSettingsTab("ai");
                  navigate("settings");
                }}
              >
                <span
                  className={`connection-dot ${p.provider === "browser" && !localReady ? "muted" : ""}`}
                />
                {PROVIDER_NAMES[p.provider]}
                <ChevronDown size={15} />
              </button>
            </div>
            <div className="studio-layout">
              <div className="camera-column">
                <div className="camera-card">
                  <div className="card-topline">
                    <span>
                      <span
                        className={`record-dot ${camera.active ? "live" : ""}`}
                      />
                      {camera.active
                        ? "EN DIRECT"
                        : photo
                          ? "PHOTO IMPORTÉE"
                          : "VOTRE CADRE"}
                    </span>
                    <span className="camera-resolution">
                      4:3 <span>·</span> {camera.active ? "HD" : "STUDIO"}
                    </span>
                  </div>
                  <div
                    className={`camera-stage ${camera.active ? "is-live" : ""}`}
                  >
                    <video
                      ref={camera.video}
                      autoPlay
                      playsInline
                      muted
                      className={p.mirror ? "mirror" : ""}
                      style={{
                        visibility: camera.active ? "visible" : "hidden",
                      }}
                      aria-label="Aperçu de votre caméra"
                    />
                    {!camera.active && photo && (
                      <img
                        className="source-photo"
                        src={photo}
                        alt={sourceName || "Votre photo de référence"}
                      />
                    )}
                    {!camera.active && !photo && (
                      <div className="camera-empty">
                        <div className="viewfinder">
                          <span className="finder-corner a" />
                          <span className="finder-corner b" />
                          <span className="finder-corner c" />
                          <span className="finder-corner d" />
                          <Camera size={50} strokeWidth={1.2} />
                          <span className="finder-spark">✦</span>
                        </div>
                        <h2>La vedette, c’est vous.</h2>
                        <p>
                          Allumez la caméra.
                          <br />
                          On s’occupe de la personnalité.
                        </p>
                        <button
                          className="lime-button"
                          onClick={enableCamera}
                          disabled={camera.starting}
                        >
                          {camera.starting ? (
                            <LoaderCircle className="spin" size={18} />
                          ) : (
                            <Camera size={18} />
                          )}{" "}
                          {camera.starting ? "Connexion…" : "Ouvrir la caméra"}
                          <ArrowUpRight size={17} />
                        </button>
                        <button
                          className="upload-link"
                          onClick={() => uploadRef.current?.click()}
                        >
                          <Upload size={15} />
                          ou importer une photo
                        </button>
                      </div>
                    )}
                    {p.grid && (camera.active || photo) && (
                      <div className="composition-grid" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    )}
                    {count > 0 && (
                      <div className="countdown-overlay" aria-live="assertive">
                        {count}
                      </div>
                    )}
                    {camera.active && (
                      <div className="camera-live-hint">
                        <span /> La caméra reste sur votre appareil
                      </div>
                    )}
                    <div className="stage-watermark">
                      SASSYCAM<span>✦</span>
                    </div>
                  </div>
                  <div className="camera-toolbar">
                    <div className="camera-picker">
                      <Camera size={16} />
                      <select
                        aria-label="Choisir la caméra"
                        value={p.cameraId}
                        onChange={(e) => {
                          setP({ cameraId: e.target.value });
                          if (camera.active)
                            camera
                              .start(e.target.value)
                              .catch((e) => notify(e.message, true));
                        }}
                      >
                        <option value="">Caméra par défaut</option>
                        {camera.devices
                          .filter((d) => d.kind === "videoinput")
                          .map((d, i) => (
                            <option value={d.deviceId} key={d.deviceId || i}>
                              {d.label || `Caméra ${i + 1}`}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="toolbar-icons">
                      <IconButton
                        label="Effet miroir"
                        active={p.mirror}
                        onClick={() => setP({ mirror: !p.mirror })}
                      >
                        <FlipHorizontal size={18} />
                      </IconButton>
                      <IconButton
                        label="Grille de cadrage"
                        active={p.grid}
                        onClick={() => setP({ grid: !p.grid })}
                      >
                        <Grid2X2 size={17} />
                      </IconButton>
                      <label className="timer-select" title="Retardateur">
                        <Timer size={17} />
                        <select
                          aria-label="Retardateur"
                          value={p.countdown}
                          onChange={(e) =>
                            setP({ countdown: Number(e.target.value) })
                          }
                        >
                          {[0, 3, 5, 10].map((n) => (
                            <option key={n} value={n}>
                              {n ? n + " s" : "0 s"}
                            </option>
                          ))}
                        </select>
                      </label>
                      {camera.active && (
                        <IconButton
                          label="Éteindre la caméra"
                          onClick={() => {
                            camera.stop();
                            setP({ auto: false });
                          }}
                        >
                          <Square size={16} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
                <div className="input-card">
                  <div className="input-header">
                    <span>
                      <MessageCircle size={16} /> Votre réplique
                    </span>
                    <span>FACULTATIF</span>
                  </div>
                  <textarea
                    ref={textRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={4000}
                    placeholder="Un mot à dire pour votre défense ?"
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        void reactNow();
                      }
                    }}
                  />
                  <div className="input-footer">
                    <span>
                      {voiceBusy ? (
                        <>
                          <LoaderCircle size={14} className="spin" />
                          {voiceState}
                        </>
                      ) : listening ? (
                        <>
                          <span className="listening-dot" />
                          {voiceState}
                        </>
                      ) : voiceState ? (
                        <span className="transcript">« {voiceState} »</span>
                      ) : (
                        <>
                          <Keyboard size={14} /> Ctrl + Entrée pour lancer
                        </>
                      )}
                    </span>
                    <IconButton
                      label={
                        listening
                          ? "Terminer l’enregistrement"
                          : "Parler ou donner une commande"
                      }
                      active={listening}
                      disabled={!!busy || voiceBusy}
                      onClick={toggleVoice}
                    >
                      {voiceBusy ? (
                        <LoaderCircle size={19} className="spin" />
                      ) : listening ? (
                        <MicOff size={19} />
                      ) : (
                        <Mic size={19} />
                      )}
                    </IconButton>
                  </div>
                </div>
              </div>
              <div className="personality-column">
                <section className="personality-card">
                  <div className="section-kicker">
                    <span>01 / L’ATTITUDE</span>
                    <Sparkles size={18} />
                  </div>
                  <div className="mood-title">
                    <h2>Le ton est donné.</h2>
                    <span
                      className={`mood-number ${p.mood < 0 ? "sweet" : "spicy"}`}
                    >
                      {p.mood > 0 ? "+" : ""}
                      {p.mood}
                    </span>
                  </div>
                  <p className="muted">
                    De la déclaration d’amour au petit incendie.
                  </p>
                  <div className="mood-labels">
                    <span>
                      <Heart size={16} />
                      Worship
                    </span>
                    <span>
                      Roast
                      <Flame size={16} />
                    </span>
                  </div>
                  <input
                    className="mood-slider"
                    type="range"
                    aria-label="Intensité du worship ou du roast"
                    min={-100}
                    max={100}
                    value={p.mood}
                    style={
                      {
                        "--position": `${(p.mood + 100) / 2}%`,
                      } as React.CSSProperties
                    }
                    onChange={(e) => setP({ mood: Number(e.target.value) })}
                  />
                  <div className="slider-ticks">
                    <span>−100</span>
                    <button onClick={() => setP({ mood: 0 })}>Neutre</button>
                    <span>+100</span>
                  </div>
                  <div className="mood-presets">
                    {[-100, -35, 0, 35, 85].map((v, i) => (
                      <button
                        key={v}
                        className={p.mood === v ? "selected" : ""}
                        onClick={() => setP({ mood: v })}
                      >
                        {
                          [
                            "Adoration",
                            "Douceur",
                            "Neutre",
                            "Taquin",
                            "Ça pique",
                          ][i]
                        }
                      </button>
                    ))}
                  </div>
                  <div className="current-mood">
                    <span className="mood-tag">{moodLabel(p.mood)}</span>
                    <span>
                      {p.mood === 0
                        ? "Une réaction tout en simplicité."
                        : p.mood < 0
                          ? "Votre fan club tient dans une caméra."
                          : p.mood < 75
                            ? "Ça chambre, avec le sourire."
                            : "La répartie passe à feu vif."}
                    </span>
                  </div>
                </section>
                <section
                  className={`reaction-card ${speaking ? "is-speaking" : ""}`}
                >
                  <div className="section-kicker">
                    <span>02 / LA RÉPARTIE</span>
                    <IconButton
                      label={p.speak ? "Désactiver la voix" : "Activer la voix"}
                      active={p.speak}
                      onClick={() => {
                        setP({ speak: !p.speak });
                        stopSpeech();
                      }}
                    >
                      {p.speak ? <Volume2 size={17} /> : <VolumeX size={17} />}
                    </IconButton>
                  </div>
                  {resultImage ? (
                    <button
                      className="portrait-preview"
                      onClick={() => setLightbox(selected)}
                    >
                      <img
                        src={resultImage}
                        alt={
                          selected?.generated
                            ? "Votre portrait généré par IA"
                            : "Votre illustration locale"
                        }
                      />
                      <span>
                        <Maximize2 size={14} />{" "}
                        {selected?.generated
                          ? "PORTRAIT IA"
                          : "ILLUSTRATION LOCALE"}
                      </span>
                    </button>
                  ) : (
                    <>
                      <div className="quote-mark">“</div>
                      <div
                        className={`reaction-text ${!reaction ? "placeholder" : ""}`}
                        aria-live="polite"
                      >
                        {reaction || (
                          <>
                            Votre prochaine
                            <br />
                            réplique culte
                            <br />
                            se prépare ici.
                          </>
                        )}
                      </div>
                    </>
                  )}
                  {selected && (
                    <div className="reaction-meta">
                      <span>
                        {selected.generated
                          ? "Création IA"
                          : selected.kind === "portrait"
                            ? "Effet photo · sans IA"
                            : PROVIDER_NAMES[selected.provider as Provider] ||
                              selected.provider}{" "}
                        <span>·</span> {fmtDate(selected.date)}
                      </span>
                      <div>
                        {reaction && (
                          <>
                            <IconButton
                              label="Écouter la réplique"
                              onClick={() => say(reaction)}
                            >
                              <Volume2 size={16} />
                            </IconButton>
                            <IconButton
                              label="Copier la réplique"
                              onClick={() => copyText(reaction)}
                            >
                              <Copy size={15} />
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          label="Télécharger une carte"
                          onClick={() => exportCard(selected)}
                        >
                          <Download size={16} />
                        </IconButton>
                      </div>
                    </div>
                  )}
                  {!selected && (
                    <div className="reaction-empty-label">
                      <span className="tiny-star">✳</span> Une personnalité.
                      Zéro jugement sérieux.
                    </div>
                  )}
                </section>
                <div className="primary-actions">
                  <button
                    className="primary-button"
                    onClick={() => reactNow()}
                    disabled={!!busy || voiceBusy || localLoading}
                  >
                    {busy === "reply" ? (
                      <LoaderCircle size={20} className="spin" />
                    ) : (
                      <Sparkles size={20} />
                    )}
                    <span>
                      {busy === "reply"
                        ? "Une seconde…"
                        : p.mood < 0
                          ? "Adore-moi"
                          : p.mood === 0
                            ? "À vous de jouer"
                            : "Roast me"}
                    </span>
                    {!busy && <ArrowUpRight size={20} />}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={createPortrait}
                    disabled={!!busy || voiceBusy}
                  >
                    <Images size={19} />
                    {busy === "portrait" ? "Création…" : "Créer mon portrait"}
                  </button>
                </div>
                {(busy || progress) && (
                  <div className="progress-line" role="status">
                    <LoaderCircle size={14} className="spin" />
                    <span>{progress}</span>
                    {busy && <button onClick={cancel}>Annuler</button>}
                  </div>
                )}
                <div className="auto-row">
                  <button
                    className={p.auto ? "auto-toggle on" : "auto-toggle"}
                    onClick={() => {
                      if (!camera.active) {
                        notify(
                          "Activez la caméra pour lancer une séance automatique.",
                          true,
                        );
                        return;
                      }
                      if (needsCloud(p.provider)) return;
                      setP({ auto: !p.auto });
                    }}
                    aria-pressed={p.auto}
                  >
                    {p.auto ? <Pause size={15} /> : <Play size={15} />}Séance
                    auto
                  </button>
                  <span>toutes les {p.interval} s</span>
                  <IconButton
                    label="Réglages de la séance"
                    onClick={() => {
                      setSettingsTab("session");
                      navigate("settings");
                    }}
                  >
                    <Settings2 size={16} />
                  </IconButton>
                </div>
              </div>
            </div>
            <section className="timeline-section">
              <div className="timeline-header">
                <div>
                  <h2>
                    Vos dernières <em>têtes d’affiche.</em>
                  </h2>
                  <span>Une petite collection de vous.</span>
                </div>
                <div>
                  {status?.local && (
                    <button className="text-button" onClick={openFolder}>
                      <FolderOpen size={16} />
                      Dossier
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={takePhoto}
                    disabled={!!busy}
                  >
                    <Camera size={16} />
                    Capturer
                  </button>
                  <button
                    className="text-button"
                    onClick={() => uploadRef.current?.click()}
                  >
                    <Upload size={16} />
                    Importer
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("gallery")}
                  >
                    Toute la galerie
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="timeline">
                {entries
                  .filter((e) => e.image)
                  .slice(0, 8)
                  .map((e) => (
                    <button
                      key={e.id}
                      className={`timeline-item ${selected?.id === e.id ? "selected" : ""}`}
                      onClick={() => selectEntry(e)}
                      onDoubleClick={() => openOriginal(e)}
                    >
                      <img
                        src={e.image}
                        alt={e.kind === "portrait" ? "Portrait" : "Capture"}
                      />
                      <span>
                        {e.kind === "portrait"
                          ? "Portrait"
                          : e.kind === "reply"
                            ? moodLabel(e.mood)
                            : "Capture"}{" "}
                        <i>↗</i>
                      </span>
                    </button>
                  ))}
                <button
                  className="timeline-add"
                  onClick={() => uploadRef.current?.click()}
                >
                  <Plus size={25} />
                  <span>
                    {entries.some((e) => e.image)
                      ? "La prochaine ?"
                      : "La collection commence avec vous."}
                  </span>
                </button>
              </div>
            </section>
            <footer className="studio-footer">
              <span>
                <ShieldCheck size={14} />
                Galerie sur cet appareil · aucune clé du créateur
              </span>
              <span>
                <span className="keycap">espace</span> réplique{" "}
                <span className="keycap">C</span> capture{" "}
                <span className="keycap">esc</span> pause
              </span>
            </footer>
          </section>

          {tab === "gallery" && (
            <section className="gallery-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">VOTRE COLLECTION PERSONNELLE</div>
                  <h1>
                    Un certain <em>portrait.</em>
                  </h1>
                  <p>Vos captures, vos créations, vos meilleurs moments.</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() =>
                    download(
                      "SassyCam-galerie.json",
                      JSON.stringify(
                        {
                          app: "SassyCam",
                          version: "1.0.0",
                          exportedAt: new Date().toISOString(),
                          entries: entries.map(({ scope, ...e }) => e),
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    )
                  }
                >
                  <Download size={17} />
                  Exporter la galerie
                </button>
              </div>
              <div className="gallery-tools">
                <div className="filter-tabs">
                  {[
                    ["all", "Tout"],
                    ["portrait", "Portraits"],
                    ["capture", "Captures"],
                    ["reply", "Avec réplique"],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      className={galleryFilter === v ? "selected" : ""}
                      onClick={() => setGalleryFilter(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="search"
                  aria-label="Rechercher dans la galerie"
                  placeholder="Retrouver une réplique…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className="text-button"
                  onClick={() => importRef.current?.click()}
                >
                  <Upload size={16} />
                  Restaurer
                </button>
              </div>
              {!filtered.length ? (
                <div className="empty-panel">
                  <Images size={46} strokeWidth={1} />
                  <h2>Votre collection vous attend.</h2>
                  <p>
                    Ouvrez le studio pour capturer une photo ou créer votre
                    premier portrait.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => navigate("studio")}
                  >
                    Retour au studio
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="gallery-grid">
                  {filtered.map((e) => (
                    <article className="gallery-card" key={e.id}>
                      <button
                        className="gallery-image"
                        onClick={() => setLightbox(e)}
                      >
                        {e.image ? (
                          <img
                            src={e.image}
                            alt={
                              e.kind === "portrait"
                                ? "Votre portrait"
                                : "Votre capture"
                            }
                          />
                        ) : (
                          <div className="text-art">
                            “<p>{e.text}</p>
                          </div>
                        )}
                        <span className="entry-type">
                          {e.kind === "portrait"
                            ? e.generated
                              ? "Création IA"
                              : "Illustration locale"
                            : e.kind === "capture"
                              ? "Capture"
                              : moodLabel(e.mood)}
                        </span>
                      </button>
                      <div className="gallery-caption">
                        <p>{e.text || "Un moment au studio."}</p>
                        <small>{fmtDate(e.date)}</small>
                        <div>
                          <IconButton
                            label="Télécharger l’image"
                            onClick={() =>
                              e.image
                                ? download("SassyCam-" + e.id + ".png", e.image)
                                : exportCard(e)
                            }
                          >
                            <Download size={17} />
                          </IconButton>
                          <IconButton
                            label="Retirer cet élément"
                            onClick={() => setConfirmDelete(e)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "history" && (
            <section>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">LE MOT DE LA FIN, C’EST VOUS.</div>
                  <h1>
                    De la <em>répartie.</em>
                  </h1>
                  <p>
                    Les répliques de votre studio, conservées sur cet appareil.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() =>
                    download(
                      "SassyCam-repliques.txt",
                      entries
                        .filter((e) => e.text)
                        .map(
                          (e) =>
                            `${fmtDate(e.date)} · ${moodLabel(e.mood)}\n${e.text}`,
                        )
                        .join("\n\n"),
                      "text/plain",
                    )
                  }
                >
                  <Download size={17} />
                  Exporter les textes
                </button>
              </div>
              <div className="history-list">
                {entries
                  .filter((e) => e.text)
                  .map((e) => (
                    <article key={e.id}>
                      <span className="history-quote">“</span>
                      <div>
                        <div className="history-meta">
                          <span
                            className={`mood-tag ${e.mood < 0 ? "sweet" : ""}`}
                          >
                            {moodLabel(e.mood)} {e.mood > 0 ? "+" : ""}
                            {e.mood}
                          </span>
                          <small>
                            {fmtDate(e.date)} ·{" "}
                            {PROVIDER_NAMES[e.provider as Provider] ||
                              e.provider}
                          </small>
                        </div>
                        <p>{e.text}</p>
                        <div className="history-actions">
                          <button
                            className="text-button"
                            onClick={() => say(e.text)}
                          >
                            <Volume2 size={16} />
                            Écouter
                          </button>
                          <button
                            className="text-button"
                            onClick={() => copyText(e.text)}
                          >
                            <Copy size={15} />
                            Copier
                          </button>
                          <button
                            className="text-button"
                            onClick={() => exportCard(e)}
                          >
                            <Download size={16} />
                            Créer une carte
                          </button>
                        </div>
                      </div>
                      {e.image && (
                        <button
                          className="history-thumbnail"
                          onClick={() => setLightbox(e)}
                        >
                          <img src={e.image} alt="Photo associée" />
                        </button>
                      )}
                    </article>
                  ))}
                {!entries.some((e) => e.text) && (
                  <div className="empty-panel">
                    <MessageCircle size={42} />
                    <h2>Le premier mot vous appartient.</h2>
                    <p>Lancez une réplique dans le studio pour commencer.</p>
                    <button
                      className="primary-button"
                      onClick={() => navigate("studio")}
                    >
                      Ouvrir le studio
                      <ArrowUpRight size={17} />
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "settings" && (
            <section className="settings-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">TOUT EST DANS LE DOSAGE.</div>
                  <h1>
                    À votre <em>façon.</em>
                  </h1>
                  <p>
                    Votre intelligence artificielle, votre voix, vos règles du
                    jeu.
                  </p>
                </div>
                <span className="version-badge">
                  SassyCam {status?.version || "1.0.0"}
                </span>
              </div>
              <div className="settings-layout">
                <nav
                  className="settings-nav"
                  aria-label="Catégories des réglages"
                >
                  {[
                    ["ai", "Intelligence artificielle", Sparkles],
                    ["images", "Portraits & styles", Images],
                    ["voice", "Voix & audio", Mic],
                    ["session", "Séance & caméra", Camera],
                    ["privacy", "Compte & confidentialité", ShieldCheck],
                  ].map(([id, label, Icon]: any) => (
                    <button
                      key={id}
                      className={settingsTab === id ? "selected" : ""}
                      onClick={() => setSettingsTab(id)}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                  <div className="saved-note">
                    <Check size={14} />
                    Préférences enregistrées
                    <br />
                    sur cet appareil.
                  </div>
                </nav>
                <div className="settings-content">
                  {settingsTab === "ai" && (
                    <>
                      <div className="settings-intro">
                        <span className="settings-icon">
                          <Sparkles />
                        </span>
                        <h2>Le cerveau derrière la répartie.</h2>
                        <p>
                          Commencez gratuitement en local, ou connectez votre
                          propre fournisseur. Les images et le texte vont
                          uniquement au service que vous choisissez.
                        </p>
                      </div>
                      <Field label="Fournisseur de conversation">
                        <select
                          value={p.provider}
                          onChange={(e) => {
                            setP({ provider: e.target.value as Provider });
                            setModelList([]);
                          }}
                        >
                          {Object.entries(PROVIDER_NAMES).map(([id, label]) => (
                            <option
                              key={id}
                              value={id}
                              disabled={
                                !status?.local &&
                                ["ollama", "compatible"].includes(id)
                              }
                            >
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {p.provider === "browser" && (
                        <div className="local-ai-panel">
                          <div className="local-ai-heading">
                            <Monitor size={23} />
                            <div>
                              <strong>Une petite IA. Chez vous.</strong>
                              <small>
                                SmolVLM 256M · gratuit · sans clé API
                              </small>
                            </div>
                            <span className="pill">LOCAL</span>
                          </div>
                          <p>
                            Le modèle est téléchargé depuis Hugging Face, puis
                            vos photos sont analysées sur cet appareil. Il est
                            surtout entraîné en anglais : les répliques en
                            français et leur finesse peuvent être limitées.
                          </p>
                          <Field label="Accélération">
                            <select
                              value={p.device}
                              onChange={(e) => {
                                setP({ device: e.target.value as any });
                                setLocalReady(false);
                              }}
                            >
                              <option value="wasm">
                                CPU · compatibilité maximale
                              </option>
                              <option
                                value="webgpu"
                                disabled={!(navigator as any).gpu}
                              >
                                WebGPU · si disponible
                              </option>
                            </select>
                          </Field>
                          <button
                            className="primary-button"
                            onClick={enableLocal}
                            disabled={localLoading}
                          >
                            {localLoading ? (
                              <LoaderCircle size={18} className="spin" />
                            ) : localReady ? (
                              <Check size={18} />
                            ) : (
                              <Download size={18} />
                            )}{" "}
                            {localLoading
                              ? "Chargement…"
                              : localReady
                                ? "Modèle prêt"
                                : "Activer l’IA gratuite"}
                          </button>
                          <small>
                            Premier téléchargement : quelques centaines de Mo.
                            Aucun téléchargement avant ce clic.
                          </small>
                          {localLoading && (
                            <div role="status" className="download-progress">
                              {progress}
                            </div>
                          )}
                        </div>
                      )}
                      {p.provider === "ollama" && (
                        <div className="notice">
                          <Monitor size={20} />
                          <div>
                            <strong>
                              Ollama · une IA gratuite sur votre ordinateur
                            </strong>
                            <p>
                              Installez un modèle avec vision, par exemple{" "}
                              <code>ollama pull qwen3-vl:2b</code>, puis
                              actualisez la liste. Le serveur doit être démarré.
                              Le téléchargement et la puissance de calcul
                              restent sur votre appareil.
                            </p>
                            <a
                              href="https://ollama.com/download"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Installer Ollama <ArrowUpRight size={14} />
                            </a>
                          </div>
                        </div>
                      )}
                      {p.provider === "chatgpt" && (
                        <div className="chatgpt-panel">
                          <h3>Votre compte. Votre quota.</h3>
                          {status?.local ? (
                            <>
                              <p>
                                La conversation et la vision utilisent le quota
                                du compte ChatGPT que vous autorisez. Un
                                abonnement éligible et votre consentement sont
                                nécessaires. Les portraits IA et la voix
                                utilisent leurs propres moteurs.
                              </p>
                              {status.chatgpt?.connected ? (
                                <>
                                  <div className="connected-account">
                                    <Check size={20} />
                                    <div>
                                      <strong>
                                        {status.chatgpt.name ||
                                          status.chatgpt.email}
                                      </strong>
                                      <small>Quota personnel autorisé</small>
                                    </div>
                                  </div>
                                  <div className="button-row">
                                    <button
                                      className="secondary-button"
                                      onClick={() => connectChatGPT(true)}
                                    >
                                      Ajouter un autre compte
                                    </button>
                                    <button
                                      className="text-button"
                                      onClick={async () => {
                                        try {
                                          await api("chatgpt/disconnect", {});
                                          setAuthPending(false);
                                          setModelList([]);
                                          await refreshStatus();
                                        } catch (e: any) {
                                          notify(e.message, true);
                                        }
                                      }}
                                    >
                                      Déconnecter
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <button
                                  className="chatgpt-connect"
                                  onClick={() => connectChatGPT()}
                                  disabled={authPending}
                                >
                                  {authPending ? (
                                    <LoaderCircle size={18} className="spin" />
                                  ) : (
                                    <Globe size={18} />
                                  )}
                                  Continue with ChatGPT
                                  <ArrowUpRight size={18} />
                                </button>
                              )}
                              {authPending && (
                                <p role="status">
                                  Terminez la connexion dans votre navigateur,
                                  puis revenez ici.
                                </p>
                              )}
                              {status.chatgpt?.error && (
                                <p className="error-text">
                                  {status.chatgpt.error}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p>
                                Vous êtes identifié par ChatGPT sur ce Site.
                                Cette connexion ne donne pas accès à votre quota
                                IA. L’utilisation du quota dans une application
                                hébergée demande une autorisation distincte
                                d’OpenAI ; elle n’est pas activée ici.
                              </p>
                              <p>
                                Utilisez l’IA locale du navigateur, votre clé
                                API personnelle, ou SassyCam bureau pour la
                                conversation avec votre quota ChatGPT.
                              </p>
                              <a
                                href="https://github.com/vhaloo/SassyCam"
                                target="_blank"
                                rel="noreferrer"
                                className="secondary-button"
                              >
                                SassyCam bureau
                                <ArrowUpRight size={16} />
                              </a>
                            </>
                          )}
                        </div>
                      )}
                      {["ollama", "compatible"].includes(p.provider) && (
                        <Field
                          label="Adresse du serveur"
                          hint="HTTP est réservé à localhost ; les serveurs distants doivent utiliser HTTPS."
                        >
                          <input
                            type="url"
                            value={p.endpoints[p.provider] || ""}
                            onChange={(e) =>
                              setP({
                                endpoints: {
                                  ...p.endpoints,
                                  [p.provider]: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                      )}
                      {!["browser", "chatgpt", "ollama"].includes(
                        p.provider,
                      ) && (
                        <>
                          <Field
                            label={`Votre clé ${PROVIDER_NAMES[p.provider]}`}
                            hint={
                              status?.credentialProviders?.includes(p.provider)
                                ? "Une clé est déjà conservée dans le trousseau. Laissez vide pour l’utiliser."
                                : status?.local
                                  ? "La clé reste en mémoire, sauf si vous choisissez de la conserver dans le trousseau."
                                  : "La clé reste en mémoire dans cet onglet. Elle n’est pas enregistrée dans les préférences ni la galerie."
                            }
                          >
                            <input
                              type="password"
                              autoComplete="off"
                              spellCheck={false}
                              value={keys[p.provider] || ""}
                              placeholder="Votre clé API personnelle"
                              onChange={(e) =>
                                setKeys({
                                  ...keys,
                                  [p.provider]: e.target.value,
                                })
                              }
                            />
                          </Field>
                          {status?.local && (
                            <div className="button-row">
                              <button
                                className="secondary-button"
                                disabled={!keys[p.provider]}
                                onClick={() => storeKey(p.provider)}
                              >
                                <ShieldCheck size={16} />
                                Conserver dans le trousseau
                              </button>
                              {status.credentialProviders?.includes(
                                p.provider,
                              ) && (
                                <button
                                  className="text-button"
                                  onClick={async () => {
                                    try {
                                      await api("credentials", {
                                        provider: p.provider,
                                        apiKey: "",
                                      });
                                      await refreshStatus();
                                      notify("Clé retirée du trousseau.");
                                    } catch (e: any) {
                                      notify(e.message, true);
                                    }
                                  }}
                                >
                                  Retirer la clé enregistrée
                                </button>
                              )}
                            </div>
                          )}
                          {p.provider === "pollinations" && (
                            <p className="settings-note">
                              Pollinations nécessite désormais votre propre clé
                              et un accès au modèle choisi. Ce service n’est pas
                              présenté comme gratuit ou illimité.
                            </p>
                          )}
                        </>
                      )}
                      {p.provider !== "browser" && (
                        <>
                          <div className="field-with-action">
                            <Field
                              label="Modèle"
                              hint="Choisissez un modèle acceptant les images pour analyser une photo."
                            >
                              <input
                                list="available-models"
                                value={p.models[p.provider] || ""}
                                placeholder="Nom du modèle"
                                onChange={(e) =>
                                  setP({
                                    models: {
                                      ...p.models,
                                      [p.provider]: e.target.value,
                                    },
                                  })
                                }
                              />
                              <datalist id="available-models">
                                {modelList.map((m) => (
                                  <option value={m.id} key={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </datalist>
                            </Field>
                            <button
                              className="secondary-button"
                              onClick={refreshModels}
                              disabled={modelsBusy}
                            >
                              {modelsBusy ? (
                                <LoaderCircle size={17} className="spin" />
                              ) : (
                                <RefreshCw size={17} />
                              )}
                              Actualiser
                            </button>
                          </div>
                          {modelList.length > 0 && (
                            <Field label="Modèles disponibles sur ce compte">
                              <select
                                value={p.models[p.provider] || ""}
                                onChange={(e) =>
                                  setP({
                                    models: {
                                      ...p.models,
                                      [p.provider]: e.target.value,
                                    },
                                  })
                                }
                              >
                                <option value="">Choisir…</option>
                                {modelList.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {settingsTab === "images" && (
                    <>
                      <div className="settings-intro">
                        <span className="settings-icon coral">
                          <Images />
                        </span>
                        <h2>De vous à votre personnage.</h2>
                        <p>
                          Le moteur de portraits est indépendant de la
                          conversation. La photo sert de référence aux
                          fournisseurs IA compatibles.
                        </p>
                      </div>
                      <Field label="Moteur de portrait">
                        <select
                          value={p.imageProvider}
                          onChange={(e) =>
                            setP({
                              imageProvider: e.target.value as ImageProvider,
                            })
                          }
                        >
                          {Object.entries(IMAGE_NAMES).map(([id, label]) => (
                            <option
                              key={id}
                              value={id}
                              disabled={
                                !status?.local &&
                                ["comfyui", "compatible"].includes(id)
                              }
                            >
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Direction artistique">
                        <select
                          value={p.style}
                          onChange={(e) => setP({ style: e.target.value })}
                        >
                          {STYLES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                      {p.imageProvider === "local" ? (
                        <div className="notice">
                          <Info size={20} />
                          <div>
                            <strong>
                              Un effet illustré gratuit, sans IA générative.
                            </strong>
                            <p>
                              Un traitement de votre photo, avec aplats,
                              contours et couleurs. Pour une vraie caricature
                              générée par IA, choisissez OpenAI, Gemini ou
                              ComfyUI. Les effets locaux sont identifiés dans la
                              galerie.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Field
                            label={
                              p.imageProvider === "comfyui"
                                ? "Nom du checkpoint ComfyUI"
                                : "Modèle de génération"
                            }
                          >
                            <input
                              value={p.imageModels[p.imageProvider] || ""}
                              placeholder={
                                p.imageProvider === "comfyui"
                                  ? "auto"
                                  : p.imageProvider === "gemini"
                                    ? "gemini-3.1-flash-image"
                                    : "gpt-image-2.5-flare"
                              }
                              onChange={(e) =>
                                setP({
                                  imageModels: {
                                    ...p.imageModels,
                                    [p.imageProvider]: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                          {["comfyui", "compatible"].includes(
                            p.imageProvider,
                          ) && (
                            <Field label="Adresse du serveur d’images">
                              <input
                                type="url"
                                value={p.endpoints[p.imageProvider] || ""}
                                onChange={(e) =>
                                  setP({
                                    endpoints: {
                                      ...p.endpoints,
                                      [p.imageProvider]: e.target.value,
                                    },
                                  })
                                }
                              />
                            </Field>
                          )}
                          {p.imageProvider === "comfyui" ? (
                            <div className="notice">
                              <Monitor size={20} />
                              <div>
                                <strong>
                                  ComfyUI · génération sur votre ordinateur
                                </strong>
                                <p>
                                  ComfyUI doit être lancé avec un checkpoint SD
                                  1.5 ou SDXL comprenant CLIP et VAE. Le
                                  workflow image-vers-image préserve la photo de
                                  départ. Le calcul est local ; aucun compte du
                                  créateur n’est utilisé.
                                </p>
                                <a
                                  href="https://docs.comfy.org"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Configurer ComfyUI <ArrowUpRight size={14} />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Field
                                label="Votre clé API pour les portraits"
                                hint={
                                  status?.credentialProviders?.includes(
                                    p.imageProvider,
                                  )
                                    ? "Une clé est conservée dans le trousseau pour ce fournisseur."
                                    : "La même clé peut servir à la conversation et aux portraits du même fournisseur."
                                }
                              >
                                <input
                                  type="password"
                                  autoComplete="off"
                                  spellCheck={false}
                                  value={keys[p.imageProvider] || ""}
                                  onChange={(e) =>
                                    setKeys({
                                      ...keys,
                                      [p.imageProvider]: e.target.value,
                                    })
                                  }
                                  placeholder="Votre clé personnelle"
                                />
                              </Field>
                              {status?.local && (
                                <button
                                  className="secondary-button"
                                  disabled={!keys[p.imageProvider]}
                                  onClick={() => storeKey(p.imageProvider)}
                                >
                                  Conserver dans le trousseau
                                </button>
                              )}
                              <p className="settings-note">
                                Les images sont facturées ou décomptées selon
                                votre fournisseur. Le quota ChatGPT de la
                                connexion bureau ne couvre pas la génération
                                d’images.
                              </p>
                            </>
                          )}
                        </>
                      )}
                      <Toggle
                        label="Un portrait après chaque réplique"
                        hint="Utilise le moteur et le compte choisis ici, y compris en séance automatique."
                        checked={p.autoPortrait}
                        onChange={(v) => setP({ autoPortrait: v })}
                      />
                    </>
                  )}
                  {settingsTab === "voice" && (
                    <>
                      <div className="settings-intro">
                        <span className="settings-icon lavender">
                          <Mic />
                        </span>
                        <h2>La personnalité s’entend aussi.</h2>
                        <p>
                          Parlez pour donner votre réplique ou commander le
                          studio. L’écoute se termine après chaque intervention.
                        </p>
                      </div>
                      <Field label="Langue de réponse et de reconnaissance">
                        <select
                          value={p.language}
                          onChange={(e) => setP({ language: e.target.value })}
                        >
                          {LANGS.map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Reconnaissance vocale">
                        <select
                          value={p.voiceInput}
                          onChange={(e) =>
                            setP({ voiceInput: e.target.value as any })
                          }
                        >
                          <option value="browser">
                            {status?.local
                              ? "Whisper dans l’application · gratuit"
                              : "Reconnaissance du navigateur (si disponible)"}
                          </option>
                          <option value="whisper">
                            {status?.local
                              ? "Whisper Python local (module facultatif)"
                              : "Whisper local · gratuit, premier téléchargement"}
                          </option>
                        </select>
                      </Field>
                      <p className="settings-note">
                        {status?.local || p.voiceInput === "whisper"
                          ? "Whisper analyse la voix sur votre appareil. Son modèle se télécharge lors de la première utilisation."
                          : "La reconnaissance native peut envoyer la voix au service du navigateur. Choisissez Whisper local pour traiter la voix sur votre appareil."}{" "}
                        Un enregistrement dure au maximum 15 secondes.
                      </p>
                      {status?.local && p.voiceInput === "whisper" && (
                        <Field label="Modèle Whisper Python">
                          <select
                            value={p.whisperModel}
                            onChange={(e) =>
                              setP({ whisperModel: e.target.value })
                            }
                          >
                            {["tiny", "base", "small", "medium"].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </Field>
                      )}
                      <Field label="Microphone">
                        <select
                          value={p.micId}
                          onChange={(e) => setP({ micId: e.target.value })}
                        >
                          <option value="">Micro par défaut</option>
                          {camera.devices
                            .filter((d) => d.kind === "audioinput")
                            .map((d, i) => (
                              <option key={d.deviceId || i} value={d.deviceId}>
                                {d.label || `Micro ${i + 1}`}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Toggle
                        label="Lire les répliques à voix haute"
                        checked={p.speak}
                        onChange={(v) => {
                          setP({ speak: v });
                          stopSpeech();
                        }}
                      />
                      <Field label="Moteur de voix">
                        <select
                          value={p.voiceEngine}
                          onChange={(e) =>
                            setP({ voiceEngine: e.target.value as any })
                          }
                        >
                          <option value="system">
                            Voix du système / navigateur
                          </option>
                          {status?.local && (
                            <option value="kokoro">
                              Kokoro local · module facultatif
                            </option>
                          )}
                        </select>
                      </Field>
                      <Field label="Voix">
                        <select
                          value={p.voice}
                          onChange={(e) => setP({ voice: e.target.value })}
                        >
                          <option value="">
                            Voix par défaut pour la langue
                          </option>
                          {p.voiceEngine === "kokoro"
                            ? [
                                "ff_siwis",
                                "af_heart",
                                "af_bella",
                                "af_nicole",
                                "af_sarah",
                                "am_adam",
                                "am_michael",
                                "jf_alpha",
                                "kf_alpha",
                                "zf_alpha",
                                "ef_alpha",
                              ].map((v) => <option key={v}>{v}</option>)
                            : voices.map((v) => (
                                <option key={v.voiceURI} value={v.voiceURI}>
                                  {v.name} · {v.lang}
                                  {v.localService ? " · locale" : ""}
                                </option>
                              ))}
                        </select>
                      </Field>
                      <div className="settings-two">
                        <Field
                          label={`Volume · ${Math.round(p.volume * 100)} %`}
                        >
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={p.volume}
                            onChange={(e) =>
                              setP({ volume: Number(e.target.value) })
                            }
                          />
                        </Field>
                        <Field label={`Vitesse · ${p.rate.toFixed(1)}×`}>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={p.rate}
                            onChange={(e) =>
                              setP({ rate: Number(e.target.value) })
                            }
                          />
                        </Field>
                      </div>
                      {p.voiceEngine === "kokoro" && (
                        <Field label="Sortie audio">
                          <select
                            value={p.outputId}
                            onChange={(e) => setP({ outputId: e.target.value })}
                          >
                            <option value="">Sortie système par défaut</option>
                            {camera.devices
                              .filter((d) => d.kind === "audiooutput")
                              .map((d, i) => (
                                <option
                                  key={d.deviceId || i}
                                  value={d.deviceId}
                                >
                                  {d.label || `Sortie ${i + 1}`}
                                </option>
                              ))}
                          </select>
                        </Field>
                      )}
                      <div className="voice-command-card">
                        <h3>Le studio vous écoute.</h3>
                        <div>
                          {[
                            "« Prends une photo »",
                            "« Plus doux »",
                            "« Plus fort »",
                            "« Adore-moi »",
                            "« Portrait »",
                            "« Stop »",
                          ].map((s) => (
                            <span key={s}>{s}</span>
                          ))}
                        </div>
                        <p>
                          Les autres phrases deviennent votre réplique. Le micro
                          ne reste pas en écoute permanente.
                        </p>
                      </div>
                    </>
                  )}
                  {settingsTab === "session" && (
                    <>
                      <div className="settings-intro">
                        <span className="settings-icon">
                          <Camera />
                        </span>
                        <h2>Cadrez. Dosez. Recommencez.</h2>
                        <p>
                          La séance automatique fonctionne seulement quand le
                          studio est visible et la caméra active. Elle se met en
                          pause dès que vous quittez le studio.
                        </p>
                      </div>
                      <Field
                        label={`Intervalle automatique · ${p.interval} secondes`}
                      >
                        <input
                          type="range"
                          min="15"
                          max="300"
                          step="5"
                          value={p.interval}
                          onChange={(e) =>
                            setP({ interval: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Retardateur des actions manuelles">
                        <select
                          value={p.countdown}
                          onChange={(e) =>
                            setP({ countdown: Number(e.target.value) })
                          }
                        >
                          {[0, 3, 5, 10].map((v) => (
                            <option value={v} key={v}>
                              {v ? v + " secondes" : "Sans retardateur"}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Toggle
                        label="Retour miroir de la caméra"
                        hint="Les captures gardent le même cadrage que l’aperçu."
                        checked={p.mirror}
                        onChange={(v) => setP({ mirror: v })}
                      />
                      <Toggle
                        label="Grille de composition"
                        checked={p.grid}
                        onChange={(v) => setP({ grid: v })}
                      />
                      <Toggle
                        label="Interface sombre"
                        checked={p.dark}
                        onChange={(v) => setP({ dark: v })}
                      />
                      {status?.local && (
                        <>
                          <hr />
                          <h3>Intégration ROS 2</h3>
                          <Toggle
                            label="Publier les répliques dans ROS 2"
                            hint="Nécessite Python et rclpy dans votre environnement ROS 2. Une publication suit chaque réplique réussie."
                            checked={p.ros}
                            onChange={(v) => setP({ ros: v })}
                          />
                          <Field label="Sujet ROS 2">
                            <input
                              value={p.rosTopic}
                              onChange={(e) =>
                                setP({ rosTopic: e.target.value })
                              }
                              placeholder="/sassy_cam/roast"
                            />
                          </Field>
                        </>
                      )}
                      <div className="notice">
                        <Keyboard size={21} />
                        <div>
                          <strong>Vos raccourcis studio</strong>
                          <p>
                            Espace : lancer une réplique. C : capturer. Ctrl/Cmd
                            + Entrée : envoyer le texte. Échap : interrompre la
                            séance et la voix.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {settingsTab === "privacy" && (
                    <>
                      <div className="settings-intro">
                        <span className="settings-icon">
                          <ShieldCheck />
                        </span>
                        <h2>Chez vous, à votre nom.</h2>
                        <p>
                          SassyCam n’utilise aucune clé API du créateur. Vous
                          gardez le choix de l’endroit où vos images et votre
                          voix sont traitées.
                        </p>
                      </div>
                      <div className="privacy-facts">
                        <div>
                          <Monitor />
                          <strong>Galerie locale</strong>
                          <p>
                            Vos captures et répliques sont enregistrées dans ce
                            navigateur, par compte. Elles ne sont pas
                            synchronisées entre appareils. Exportez-les avant
                            d’effacer les données du navigateur.
                          </p>
                        </div>
                        <div>
                          <ShieldCheck />
                          <strong>Clés personnelles</strong>
                          <p>
                            {status?.local
                              ? "Les clés sauvegardées sont chiffrées par le trousseau du système. Un trousseau indisponible empêche leur sauvegarde."
                              : "Les clés API restent en mémoire dans cet onglet. Les appels passent par le serveur du Site vers le fournisseur choisi ; les clés ne sont pas conservées."}
                          </p>
                        </div>
                      </div>
                      <Toggle
                        label="Autoriser mon fournisseur en ligne pour cette session"
                        hint="Les actions que vous lancez peuvent envoyer une photo, votre texte et votre clé personnelle au fournisseur choisi. La séance auto et les portraits auto suivent aussi cette autorisation. Elle revient à zéro à chaque ouverture."
                        checked={p.cloudConsent}
                        onChange={(v) => setP({ cloudConsent: v })}
                      />
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setKeys({});
                          setP({ cloudConsent: false, auto: false });
                          stopAll();
                          notify(
                            "Clés en mémoire effacées. Les clés du trousseau et votre galerie sont conservées.",
                          );
                        }}
                      >
                        Terminer les traitements et vider les clés en mémoire
                      </button>
                      {status?.local ? (
                        <>
                          <hr />
                          <h3>Profils de cet ordinateur</h3>
                          <Field label="Profil actif">
                            <select
                              value={status.user?.id || ""}
                              onChange={(e) => switchProfile(e.target.value)}
                            >
                              {profiles.map((pro) => (
                                <option key={pro.id} value={pro.id}>
                                  {pro.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <div className="field-with-action">
                            <Field label="Nouveau profil">
                              <input
                                maxLength={80}
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="Un autre studio"
                              />
                            </Field>
                            <button
                              className="secondary-button"
                              disabled={!profileName.trim()}
                              onClick={() => switchProfile()}
                            >
                              Créer
                            </button>
                          </div>
                          <p className="settings-note">
                            Chaque profil possède ses propres préférences, sa
                            galerie et ses clés. Les données de la version 0.1.2
                            restent à leur emplacement d’origine.
                          </p>
                        </>
                      ) : (
                        <div className="notice">
                          <Globe size={21} />
                          <div>
                            <strong>
                              {status?.user
                                ? "Connecté avec ChatGPT"
                                : "Connexion au Site"}
                            </strong>
                            <p>
                              {status?.user?.name ||
                                status?.user?.email ||
                                "Connectez-vous pour isoler votre galerie par compte sur cet appareil."}{" "}
                              La connexion au Site n’autorise pas le calcul sur
                              votre abonnement ChatGPT.
                            </p>
                            <a
                              href={
                                status?.user
                                  ? "/signout-with-chatgpt"
                                  : "/signin-with-chatgpt"
                              }
                              target="_top"
                            >
                              {status?.user
                                ? "Déconnexion"
                                : "Continue with ChatGPT"}
                              <ArrowUpRight size={15} />
                            </a>
                          </div>
                        </div>
                      )}
                      <hr />
                      <h3>Les limites, en clair.</h3>
                      <p className="settings-note">
                        Le quota personnel ChatGPT est disponible dans
                        l’application bureau pour les requêtes compatibles, sous
                        réserve d’éligibilité du compte. Le Site hébergé
                        nécessite une intégration de quota distincte. Ce quota
                        ne prend pas en charge la génération d’images ni
                        l’audio. Les fournisseurs peuvent appliquer leurs frais
                        et leurs règles de conservation.
                      </p>
                      <div className="about-links">
                        <a
                          href="https://github.com/vhaloo/SassyCam"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Code source · MIT
                          <ArrowUpRight size={14} />
                        </a>
                        <a
                          href="https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Contrat ChatGPT
                          <ArrowUpRight size={14} />
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
        <nav className="mobile-nav" aria-label="Navigation mobile">
          {[
            ["studio", Camera, "Studio"],
            ["gallery", Images, "Galerie"],
            ["history", History, "Répliques"],
            ["settings", SlidersHorizontal, "Réglages"],
          ].map(([id, Icon, label]: any) => (
            <button
              key={id}
              className={tab === id ? "selected" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <input
        className="sr-only"
        ref={uploadRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Importer une photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void imported(file);
          e.target.value = "";
        }}
      />
      <input
        className="sr-only"
        ref={importRef}
        type="file"
        accept="application/json,.json"
        aria-label="Restaurer une galerie"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              if (file.size > 80_000_000)
                throw new Error("Archive trop volumineuse.");
              const n = await importEntries(await file.text(), scope);
              const restored=await getEntries(scope);
              if(current.current.scope===scope){setEntries(restored);notify(`${n} éléments restaurés.`);}
            } catch (err: any) {
              notify(err.message, true);
            }
          }
          e.target.value = "";
        }}
      />
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <AlertCircle size={20} /> : <Check size={20} />}
          <span>{toast.text}</span>
          <button
            aria-label="Fermer la notification"
            onClick={() => setToast(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)}>
          <section
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Aperçu de la création"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lightbox-header">
              <strong>
                {lightbox.kind === "portrait"
                  ? lightbox.generated
                    ? "Portrait généré par IA"
                    : "Illustration locale · sans IA générative"
                  : "Capture du studio"}
              </strong>
              <IconButton
                label="Fermer l’aperçu"
                onClick={() => setLightbox(null)}
              >
                <X size={21} />
              </IconButton>
            </div>
            {lightbox.image && (
              <img src={lightbox.image} alt="Votre création en grand format" />
            )}
            <div className="lightbox-caption">
              <p>{lightbox.text}</p>
              <div className="button-row">
                {status?.local && lightbox.image && (
                  <button
                    className="secondary-button"
                    onClick={() => openOriginal(lightbox)}
                  >
                    <ArrowUpRight size={17} />
                    Ouvrir dans le système
                  </button>
                )}
                {lightbox.image && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      download(
                        "SassyCam-" + lightbox.id + ".png",
                        lightbox.image!,
                      )
                    }
                  >
                    <Download size={17} />
                    Image originale
                  </button>
                )}
                <button
                  className="primary-button"
                  onClick={() => exportCard(lightbox)}
                >
                  <Download size={17} />
                  Carte avec réplique
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 size={29} />
            <h2 id="delete-title">Retirer cet élément ?</h2>
            <p>
              Il sera retiré de la galerie de ce compte sur cet appareil. Vos
              fichiers déjà téléchargés restent conservés.
            </p>
            <div className="button-row">
              <button
                className="secondary-button"
                onClick={() => setConfirmDelete(null)}
              >
                Annuler
              </button>
              <button
                className="danger-button"
                onClick={() => deleteItem(confirmDelete)}
              >
                Retirer de la galerie
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
