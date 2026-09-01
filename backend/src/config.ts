import "dotenv/config";

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.7-flash",
  port: Number(process.env.PORT ?? 3001),
} as const;

export const isGeminiConfigured = (): boolean => config.geminiApiKey.length > 0;
