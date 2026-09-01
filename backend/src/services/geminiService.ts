import { GoogleGenAI, Type, ThinkingLevel, type Part } from "@google/genai";
import { config } from "../config.js";
import { EVALUATION_SYSTEM_PROMPT, EVALUATION_USER_PROMPT } from "../prompts/evaluationPrompt.js";
import type { GeminiEvaluation } from "../types/evaluation.js";
import { DIMENSION_IDS } from "../schemas/evaluationSchema.js";

export interface InputImage {
  mimeType: string;
  /** base64 encoded image bytes */
  data: string;
}

// Structured output JSON schema for the Gemini response.
// Zod (evaluationSchema.ts) re-validates the parsed result afterwards.
const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    dimensions: {
      type: Type.ARRAY,
      minItems: 5,
      maxItems: 5,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, enum: [...DIMENSION_IDS] },
          score: {
            type: Type.NUMBER,
            nullable: true,
            description: "0-5，步长 0.5；Reference 证据不足时为 null（N/A），禁止猜测",
          },
          confidence: {
            type: Type.NUMBER,
            description: "0-1，当前图片证据对该判断的支持程度",
          },
          summary: { type: Type.STRING, description: "该维度一句话中文结论" },
          evidence: {
            type: Type.ARRAY,
            minItems: 0,
            maxItems: 4,
            items: {
              type: Type.OBJECT,
              properties: {
                view: {
                  type: Type.STRING,
                  enum: [
                    "front",
                    "left45",
                    "right45",
                    "left_profile",
                    "right_profile",
                    "back",
                    "full_body",
                    "unknown",
                  ],
                },
                region: { type: Type.STRING },
                observation: {
                  type: Type.STRING,
                  description: "Reference 结构、Candidate 结构、二者差异，必须具体",
                },
                severity: { type: Type.STRING, enum: ["minor", "moderate", "major", "critical"] },
                effect: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
              },
              required: ["view", "region", "observation", "severity", "effect"],
            },
          },
        },
        required: ["id", "score", "confidence", "summary", "evidence"],
      },
    },
    strongestPoints: {
      type: Type.ARRAY,
      minItems: 0,
      maxItems: 3,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "description"],
      },
    },
    mainProblems: {
      type: Type.ARRAY,
      minItems: 0,
      maxItems: 3,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["minor", "moderate", "major", "critical"] },
        },
        required: ["title", "description", "severity"],
      },
    },
    summary: { type: Type.STRING },
    recommendation: { type: Type.STRING },
  },
  required: ["dimensions", "strongestPoints", "mainProblems", "summary", "recommendation"],
} as const;

/**
 * Call Gemini with clearly labeled reference / candidate image groups
 * and a strict structured-output JSON schema.
 * Throws on transport / API failure; caller decides error mapping.
 */
export async function evaluateWithGemini(
  referenceImages: InputImage[],
  candidateImages: InputImage[],
  options?: { signal?: AbortSignal },
): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const contents: Part[] = [];

  contents.push({ text: "REFERENCE IMAGES START" });
  referenceImages.forEach((img, i) => {
    contents.push({ text: `Reference Image ${i + 1}` });
    contents.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  });
  contents.push({ text: "REFERENCE IMAGES END" });

  contents.push({ text: "CANDIDATE 3D RENDER IMAGES START" });
  candidateImages.forEach((img, i) => {
    contents.push({ text: `Candidate Render ${i + 1}` });
    contents.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  });
  contents.push({ text: "CANDIDATE 3D RENDER IMAGES END" });

  contents.push({ text: EVALUATION_USER_PROMPT });

  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: [{ role: "user", parts: contents }],
    config: {
      systemInstruction: EVALUATION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      abortSignal: options?.signal,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return JSON.parse(text);
}

export type { GeminiEvaluation };
