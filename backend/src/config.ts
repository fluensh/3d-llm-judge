import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.7-flash",
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY ?? "",
  qwenModel: process.env.QWEN_MODEL ?? "qwen3.8-max",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash-vision-exp",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "google/gemini-3.7-flash",
  openrouterGptModel: process.env.OPENROUTER_GPT_MODEL ?? "openai/gpt-5.6-sol",
} as const;

export const isGeminiConfigured = (): boolean => config.geminiApiKey.length > 0;
