import type { LlmProvider } from "./types.js";
import { config } from "../../config.js";
import { createOpenAiCompatibleProvider } from "./openAiCompatible.js";
import { geminiProvider } from "./gemini.js";

// DashScope OpenAI-compatible endpoint (China region)
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const qwenProvider: LlmProvider = createOpenAiCompatibleProvider({
  id: "qwen",
  label: "通义千问 Qwen3.8-Max",
  model: config.qwenModel,
  baseUrl: DASHSCOPE_BASE_URL,
  apiKey: () => config.dashscopeApiKey,
});

export const deepseekProvider: LlmProvider = createOpenAiCompatibleProvider({
  id: "deepseek",
  label: "DeepSeek Vision",
  model: config.deepseekModel,
  baseUrl: DEEPSEEK_BASE_URL,
  apiKey: () => config.deepseekApiKey,
});

export const openrouterGeminiProvider: LlmProvider = createOpenAiCompatibleProvider({
  id: "openrouter-gemini",
  label: "OpenRouter Gemini 3.7 Flash",
  model: config.openrouterModel,
  baseUrl: OPENROUTER_BASE_URL,
  apiKey: () => config.openrouterApiKey,
});

export const openrouterGptProvider: LlmProvider = createOpenAiCompatibleProvider({
  id: "openrouter-gpt",
  label: "OpenRouter ChatGPT 5.6 Sol",
  model: config.openrouterGptModel,
  baseUrl: OPENROUTER_BASE_URL,
  apiKey: () => config.openrouterApiKey,
});

export const providers: LlmProvider[] = [
  geminiProvider,
  qwenProvider,
  deepseekProvider,
  openrouterGeminiProvider,
  openrouterGptProvider,
];

export function getProvider(id: string): LlmProvider | undefined {
  return providers.find((p) => p.id === id);
}
