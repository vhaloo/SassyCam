export type Provider =
  | "browser"
  | "ollama"
  | "chatgpt"
  | "openai"
  | "gemini"
  | "anthropic"
  | "compatible"
  | "pollinations";
export type ImageProvider =
  "local" | "openai" | "gemini" | "comfyui" | "compatible";
export interface User {
  id: string;
  name?: string;
  email?: string;
}
export interface Status {
  version: string;
  local: boolean;
  user: User | null;
  chatgpt?: {
    connected: boolean;
    pending?: boolean;
    name?: string;
    email?: string;
    planAuthorized?: boolean;
    error?: string;
  };
  credentialProviders: string[];
}
export interface Preferences {
  mood: number;
  language: string;
  provider: Provider;
  imageProvider: ImageProvider;
  models: Record<string, string>;
  imageModels: Record<string, string>;
  endpoints: Record<string, string>;
  style: string;
  mirror: boolean;
  grid: boolean;
  cameraId: string;
  micId: string;
  outputId: string;
  countdown: number;
  speak: boolean;
  voice: string;
  voiceEngine: "system" | "kokoro";
  voiceInput: "browser" | "whisper";
  volume: number;
  rate: number;
  auto: boolean;
  interval: number;
  autoPortrait: boolean;
  cloudConsent: boolean;
  ros: boolean;
  rosTopic: string;
  whisperModel: string;
  dark: boolean;
  device: "wasm" | "webgpu";
}
export interface Entry {
  id: string;
  scope: string;
  kind: "capture" | "reply" | "portrait";
  image?: string;
  text: string;
  mood: number;
  date: string;
  provider: string;
  model?: string;
  generated?: boolean;
  sourceId?: string;
}
export const PROVIDER_NAMES: Record<Provider, string> = {
  browser: "IA du navigateur",
  ollama: "Ollama · local",
  chatgpt: "Mon compte ChatGPT",
  openai: "OpenAI API",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  compatible: "API compatible OpenAI",
  pollinations: "Pollinations",
};
export const IMAGE_NAMES: Record<ImageProvider, string> = {
  local: "Illustration locale · sans IA",
  openai: "OpenAI Images",
  gemini: "Gemini Images",
  comfyui: "ComfyUI · local",
  compatible: "API images compatible",
};
export const DEFAULT_PREFS: Preferences = {
  mood: 35,
  language: "fr",
  provider: "browser",
  imageProvider: "local",
  models: {
    browser: "HuggingFaceTB/SmolVLM-256M-Instruct",
    openai: "gpt-6.1-sol",
    gemini: "gemini-3.5-flash",
    anthropic: "claude-sonnet-4-6",
    pollinations: "openai",
    ollama: "auto",
  },
  imageModels: {
    openai: "gpt-image-2.5-flare",
    gemini: "gemini-3.1-flash-image",
    comfyui: "auto",
  },
  endpoints: {
    ollama: "http://127.0.0.1:11434",
    compatible: "http://127.0.0.1:1234/v1",
    comfyui: "http://127.0.0.1:8188",
  },
  style: "Éditorial",
  mirror: true,
  grid: false,
  cameraId: "",
  micId: "",
  outputId: "",
  countdown: 0,
  speak: true,
  voice: "",
  voiceEngine: "system",
  voiceInput: "browser",
  volume: 0.8,
  rate: 1,
  auto: false,
  interval: 45,
  autoPortrait: false,
  cloudConsent: false,
  ros: false,
  rosTopic: "/sassy_cam/roast",
  whisperModel: "tiny",
  dark: false,
  device: "wasm",
};
