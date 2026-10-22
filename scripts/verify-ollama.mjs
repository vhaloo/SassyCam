import { readFile, writeFile, mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { generateReply } from "../server/providers.mjs";
await mkdir(".qa", { recursive: true });
const image =
  "data:image/png;base64," +
  (await readFile("studio/public/app-icon.png")).toString("base64");
const started = performance.now();
const result = await generateReply(
  {
    provider: "ollama",
    model: process.env.SASSYCAM_OLLAMA_MODEL || "gemma3:4b-it-q4_K_M",
    image,
    text: "Décris cette icône en une phrase, sans inventer de personne.",
    mood: 0,
    language: "fr",
  },
  { local: true },
);
const report = {
  passed: !!result.text,
  syntheticInput: "SassyCam camera icon",
  elapsedSeconds: (performance.now() - started) / 1000,
  ...result,
};
await writeFile(
  ".qa/ollama-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
