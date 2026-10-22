import { loadLocalAI, localReply, transcribeLocal } from "./local-ai-core";
const scope = self as any;
let running = false;
scope.onmessage = async (event: MessageEvent) => {
  const { id, kind, args } = event.data;
  if (running) {
    scope.postMessage({
      id,
      error:
        "Le moteur local est occupé. Réessayez après la fin du traitement.",
    });
    return;
  }
  running = true;
  const progress = (text: string) => scope.postMessage({ id, progress: text });
  try {
    let result;
    if (kind === "load")
      result = await loadLocalAI(progress, args.device, args.model);
    else if (kind === "reply")
      result = await localReply(
        args.image,
        args.text,
        args.mood,
        args.language,
      );
    else if (kind === "transcribe")
      result = await transcribeLocal(args.audio, args.language, progress);
    else throw new Error("Action locale inconnue.");
    scope.postMessage({ id, result });
  } catch (error: any) {
    scope.postMessage({
      id,
      error: error?.message || "Le moteur local a rencontré une erreur.",
    });
  } finally {
    running = false;
  }
};
