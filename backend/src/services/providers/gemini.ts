import type { LlmProvider } from "./types.js";
import { config } from "../../config.js";
import { evaluateWithGemini } from "../geminiService.js";

export const geminiProvider: LlmProvider = {
  id: "gemini",
  label: "Google Gemini",
  model: config.geminiModel,
  isConfigured: () => config.geminiApiKey.length > 0,
  evaluate: (referenceImages, candidateImages, options) =>
    evaluateWithGemini(referenceImages, candidateImages, options),
};
