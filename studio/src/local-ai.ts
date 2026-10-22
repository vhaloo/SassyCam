// The UI only coordinates requests. Model loading, preprocessing, generation and
// transcription all run in a worker so camera controls and Cancel stay responsive.
import LocalAIWorker from "./local-ai.worker?worker";
export const VISION_MODEL = "onnx-community/Qwen3.5-0.8B-ONNX";
export const VISION_REVISION = "8fe9dbe3fb39fe902e18df9be84b6a0ac77ae0f6";
type Device = "auto" | "wasm" | "webgpu";
type Pending = {
  kind: string;
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  progress?: (s: string) => void;
  cleanup?: () => void;
};
let worker: Worker | null = null,
  sequence = 0,
  ready = false;
let activeOptions: { device: Device; model: string } = {
  device: "auto",
  model: VISION_MODEL,
};
let loading: Promise<any> | null = null;
const pending = new Map<number, Pending>();
function reset(reason: Error) {
  worker?.terminate();
  worker = null;
  ready = false;
  loading = null;
  for (const request of pending.values()) {
    request.cleanup?.();
    request.reject(reason);
  }
  pending.clear();
}
function engine() {
  if (worker) return worker;
  worker = new LocalAIWorker({
    name: "SassyCam local AI",
  });
  worker.onmessage = (event) => {
    const { id, progress, error, result } = event.data;
    const request = pending.get(id);
    if (!request) return;
    if (progress) {
      request.progress?.(progress);
      return;
    }
    pending.delete(id);
    request.cleanup?.();
    if (error) request.reject(new Error(error));
    else request.resolve(result);
  };
  worker.onerror = (event) => {
    event.preventDefault();
    reset(
      new Error(
        "Le moteur IA local ne peut pas démarrer dans ce navigateur. Essayez CPU, le modèle léger ou votre propre fournisseur.",
      ),
    );
  };
  return worker;
}
function request(
  kind: string,
  args: any,
  onProgress?: (s: string) => void,
  signal?: AbortSignal,
): Promise<any> {
  signal?.throwIfAborted();
  const target = engine();
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const abort = () =>
      reset(new DOMException("Opération annulée.", "AbortError"));
    signal?.addEventListener("abort", abort, { once: true });
    pending.set(id, {
      kind,
      resolve,
      reject,
      progress: onProgress,
      cleanup: () => signal?.removeEventListener("abort", abort),
    });
    target.postMessage({ id, kind, args });
  });
}
export async function loadLocalAI(
  onProgress: (s: string) => void,
  device: Device = "auto",
  model = VISION_MODEL,
  signal?: AbortSignal,
) {
  if (ready && activeOptions.device === device && activeOptions.model === model)
    return;
  if (loading) return loading;
  activeOptions = { device, model };
  loading = request("load", activeOptions, onProgress, signal)
    .then((result) => {
      ready = true;
      return result;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}
export async function localReply(
  image: string | undefined,
  text: string,
  mood: number,
  language: string,
  signal: AbortSignal,
) {
  if (!ready)
    await loadLocalAI(
      () => {},
      activeOptions.device,
      activeOptions.model,
      signal,
    );
  signal.throwIfAborted();
  return request("reply", { image, text, mood, language }, undefined, signal);
}
export async function transcribeLocal(
  audio: Float32Array,
  language: string,
  onProgress: (s: string) => void,
) {
  return request("transcribe", { audio, language }, onProgress);
}
export function cancelLocalTranscription() {
  if ([...pending.values()].some((r) => r.kind === "transcribe"))
    reset(new DOMException("Transcription annulée.", "AbortError"));
}
export async function disposeLocalAI() {
  reset(new DOMException("Moteur local fermé.", "AbortError"));
}
