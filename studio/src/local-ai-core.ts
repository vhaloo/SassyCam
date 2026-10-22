// Runs only inside the local AI worker. Model weights never receive provider keys.
import { systemPrompt } from "../../server/contracts.mjs";
const MODELS = {
  "onnx-community/Qwen3.5-0.8B-ONNX": {
    revision: "8fe9dbe3fb39fe902e18df9be84b6a0ac77ae0f6",
    kind: "qwen",
  },
  "HuggingFaceTB/SmolVLM-256M-Instruct": {
    revision: "7e3e67edbbed1bf9888184d9df282b700a323964",
    kind: "smol",
  },
} as const;
export const DEFAULT_LOCAL_MODEL = "onnx-community/Qwen3.5-0.8B-ONNX";
let model: any,
  processor: any,
  transcriber: any,
  loadedModel = "",
  loadedDevice = "";
export async function loadLocalAI(
  onProgress: (s: string) => void,
  requestedDevice: "auto" | "wasm" | "webgpu" = "auto",
  modelId = DEFAULT_LOCAL_MODEL,
) {
  if (!Object.hasOwn(MODELS, modelId))
    throw new Error("Modèle local non pris en charge.");
  let config = MODELS[modelId as keyof typeof MODELS];
  let device: "wasm" | "webgpu" =
    requestedDevice === "webgpu" ? "webgpu" : "wasm";
  if (requestedDevice === "auto")
    try {
      if (await (self.navigator as any).gpu?.requestAdapter())
        device = "webgpu";
    } catch {}
  const useCPUModel = () => {
    // The current browser WASM runtime has no GatherBlockQuantized kernel used
    // by Qwen's quantized vision encoder. Use the tested smaller CPU model.
    if (config.kind === "qwen") {
      modelId = "HuggingFaceTB/SmolVLM-256M-Instruct";
      config = MODELS["HuggingFaceTB/SmolVLM-256M-Instruct"];
      onProgress("Mode CPU · modèle léger SmolVLM, réponses en anglais…");
    }
  };
  if (device === "wasm") useCPUModel();
  if (model && loadedDevice === device && loadedModel === modelId)
    return { model: modelId, device };
  const hf = await import("@huggingface/transformers");
  hf.env.allowLocalModels = false;
  if (model) {
    await model.dispose();
    model = null;
  }
  const progress = (p: any) => {
    if (p.status === "progress")
      onProgress(
        `Modèle local · ${p.file?.split("/").pop()} · ${Math.round(p.progress || 0)} %`,
      );
  };
  onProgress(`Préparation du modèle · ${device === "webgpu" ? "GPU" : "CPU"}…`);
  processor = await hf.AutoProcessor.from_pretrained(modelId, {
    revision: config.revision,
    progress_callback: progress,
  });
  const create = (backend: "wasm" | "webgpu") => {
    const dtype: Record<string, "q4" | "fp16" | "q8" | "fp32"> =
      config.kind === "qwen"
        ? {
            embed_tokens: "q4",
            vision_encoder: backend === "webgpu" ? "fp16" : "q8",
            decoder_model_merged: "q4",
          }
        : {
            embed_tokens: "fp32",
            vision_encoder: "q8",
            decoder_model_merged: "q4",
          };
    const options = {
      revision: config.revision,
      device: backend,
      dtype,
      progress_callback: progress,
    };
    return config.kind === "qwen"
      ? hf.Qwen3_5ForConditionalGeneration.from_pretrained(modelId, options)
      : hf.AutoModelForVision2Seq.from_pretrained(modelId, options);
  };
  try {
    model = await create(device);
  } catch (error) {
    if (requestedDevice !== "auto" || device !== "webgpu") throw error;
    onProgress("GPU indisponible pour ce modèle · reprise sur CPU…");
    device = "wasm";
    useCPUModel();
    model = await create(device);
  }
  loadedModel = modelId;
  loadedDevice = device;
  onProgress(
    `IA locale prête · ${device === "webgpu" ? "GPU" : "CPU"} · calcul sur cet appareil`,
  );
  return { model: modelId, device };
}
export async function localReply(
  image: string | undefined,
  text: string,
  mood: number,
  language: string,
) {
  if (!model || !processor)
    throw new Error("Activez le modèle local dans les réglages.");
  const { RawImage } = await import("@huggingface/transformers");
  const isQwen = MODELS[loadedModel as keyof typeof MODELS].kind === "qwen";
  const instruction = !isQwen
    ? systemPrompt({ mood, language: "en", image }) +
      " Answer only in English, in one short sentence. No repetition."
    :
    language === "fr"
      ? `Tu es SassyCam, un compagnon de studio drôle et chaleureux. ${mood < 0 ? "Fais un compliment précis et enthousiaste. Plus la valeur est négative, plus ton admiration est théâtrale." : mood > 0 ? "Fais une petite moquerie malicieuse. Plus la valeur est positive, plus ta répartie est piquante, sans cruauté." : "Fais une observation simple et amicale."} Intensité : ${mood}, de -100 (adoration) à +100 (roast). ${image ? "Appuie-toi seulement sur les vêtements, la pose, les objets ou le décor visibles." : "Aucune photo n’est fournie : réagis seulement aux mots de la personne sans prétendre la voir."} N’invente pas d’identité, d’âge, d’origine ou d’état de santé. Réponds uniquement en français, avec une seule phrase courte, sans répétition ni raisonnement.`
      : systemPrompt({ mood, language, image }) +
        " Return exactly one short sentence. Never repeat a clause. No analysis, no thinking tags.";
  const userText =
    text ||
    (language === "fr" && isQwen
      ? "Réagis à cette scène en une courte phrase française."
      : "React to the visible scene in one short sentence.");
  const content = [
    ...(image ? [{ type: "image" }] : []),
    { type: "text", text: isQwen ? userText : instruction + " " + userText },
  ];
  const conversation = [
    ...(isQwen ? [{ role: "system", content: instruction }] : []),
    { role: "user", content },
  ];
  const prompt = processor.apply_chat_template(conversation, {
    add_generation_prompt: true,
    enable_thinking: false,
  });
  let raw = image ? await RawImage.read(image) : null;
  if (raw && Math.max(raw.width, raw.height) > 448) {
    const factor = 448 / Math.max(raw.width, raw.height);
    raw = await raw.resize(
      Math.round(raw.width * factor),
      Math.round(raw.height * factor),
    );
  }
  const inputs = raw
    ? await processor(prompt, raw, { add_special_tokens: false })
    : await processor(prompt, null, { add_special_tokens: false }).catch(() =>
        processor.tokenizer(prompt, { add_special_tokens: false }),
      );
  const output: any = await model.generate({
    ...inputs,
    max_new_tokens: 72,
    do_sample: true,
    temperature: 0.7,
    top_p: 0.85,
    top_k: 20,
    repetition_penalty: 1.15,
    no_repeat_ngram_size: 4,
  });
  const generated = output.slice(null, [inputs.input_ids.dims.at(-1), null]);
  const result = processor
    .batch_decode(generated, { skip_special_tokens: true })[0]
    ?.replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();
  if (!result)
    throw new Error(
      "Le modèle local n’a produit aucune réplique. Essayez une photo plus claire ou un autre fournisseur.",
    );
  return {
    text: result.slice(0, 1500),
    provider: "browser",
    model: loadedModel,
    vision: !!image,
    device: loadedDevice,
  };
}
export async function transcribeLocal(
  audio: Float32Array,
  language: string,
  onProgress: (s: string) => void,
) {
  if (!transcriber) {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny",
      {
        dtype: "q8",
        device: "wasm",
        progress_callback: (p: any) => {
          if (p.status === "progress")
            onProgress(`Whisper local · ${Math.round(p.progress || 0)} %`);
        },
      },
    );
  }
  const result = await transcriber(audio, { language, task: "transcribe" });
  return (Array.isArray(result) ? result[0] : result).text.trim();
}
