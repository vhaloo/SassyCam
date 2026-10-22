// Models are loaded only after the visitor explicitly enables local AI or voice.
export const VISION_MODEL = "HuggingFaceTB/SmolVLM-256M-Instruct";
export const VISION_REVISION = "7e3e67edbbed1bf9888184d9df282b700a323964";
let model: any,
  processor: any,
  transcriber: any,
  loading: Promise<void> | null = null;
let loadedDevice = "";
export async function loadLocalAI(
  onProgress: (s: string) => void,
  device: "wasm" | "webgpu" = "wasm",
) {
  if (model && loadedDevice === device) return;
  if (loading) return loading;
  loading = (async () => {
    const { AutoProcessor, AutoModelForVision2Seq, env } =
      await import("@huggingface/transformers");
    env.allowLocalModels = false;
    if (model) {
      await model.dispose();
      model = null;
    }
    onProgress("Téléchargement du modèle local…");
    const progress = (p: any) => {
      if (p.status === "progress")
        onProgress(
          `Modèle local · ${p.file?.split("/").pop()} · ${Math.round(p.progress || 0)} %`,
        );
    };
    processor = await AutoProcessor.from_pretrained(VISION_MODEL, {
      revision: VISION_REVISION,
      progress_callback: progress,
    });
    model = await AutoModelForVision2Seq.from_pretrained(VISION_MODEL, {
      revision: VISION_REVISION,
      device,
      dtype: {
        embed_tokens: "fp32",
        vision_encoder: "q8",
        decoder_model_merged: "q4",
      },
      progress_callback: progress,
    });
    loadedDevice = device;
    onProgress("IA locale prête · photos traitées sur cet appareil");
  })().finally(() => {
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
  if (!model || !processor)
    throw new Error(
      "Activez l’IA du navigateur dans les réglages avant de lancer une réplique.",
    );
  signal.throwIfAborted();
  const { RawImage, InterruptableStoppingCriteria } =
    await import("@huggingface/transformers");
  const promptText = `${mood < 0 ? "Give one warm compliment" : mood > 0 ? "Give one playful, witty joke" : "Give one friendly observation"}${image ? " about the visible scene" : " about these words"}. ${text ? `User says: ${text}.` : ""} Reply in ${language === "fr" ? "French" : language === "en" ? "English" : language} in one short sentence. Do not invent unseen details.`;
  const messages = [
    {
      role: "user",
      content: [
        ...(image ? [{ type: "image" }] : []),
        { type: "text", text: promptText },
      ],
    },
  ];
  const prompt = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  const raw = image ? await RawImage.read(image) : null;
  const inputs = raw
    ? await processor(prompt, raw, { add_special_tokens: false })
    : processor.tokenizer(prompt, { add_special_tokens: false });
  const stop = new InterruptableStoppingCriteria();
  const onAbort = () => stop.interrupt();
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    const output: any = await model.generate({
      ...inputs,
      max_new_tokens: 90,
      do_sample: false,
      stopping_criteria: [stop],
    });
    signal.throwIfAborted();
    const generated = output.slice(null, [inputs.input_ids.dims.at(-1), null]);
    const result = processor
      .batch_decode(generated, { skip_special_tokens: true })[0]
      ?.trim();
    if (!result)
      throw new Error(
        "Le modèle local n’a produit aucune réplique. Essayez une photo plus claire ou un fournisseur plus puissant.",
      );
    return {
      text: result,
      provider: "browser",
      model: VISION_MODEL,
      vision: !!image,
    };
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
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
export async function disposeLocalAI() {
  if (model) await model.dispose();
  if (transcriber) await transcriber.dispose();
  model = processor = transcriber = null;
  loadedDevice = "";
}
