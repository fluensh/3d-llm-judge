import type { InputImage, LlmProvider } from "./types.js";
import { EVALUATION_SYSTEM_PROMPT, EVALUATION_USER_PROMPT } from "../../prompts/evaluationPrompt.js";
import { JSON_OUTPUT_SCHEMA_PROMPT } from "../../prompts/jsonOutputSchema.js";

interface ChatContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

/**
 * Extracts the JSON object from a model response that may wrap it in
 * markdown code fences or stray prose.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  // Fall back to the first {...} block if the response contains prose around it
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Model response is not valid JSON");
  }
}

/**
 * Generic OpenAI Chat Completions compatible provider (Qwen via DashScope,
 * DeepSeek). Sends grouped base64 images and asks for JSON output.
 */
export function createOpenAiCompatibleProvider(opts: {
  id: string;
  label: string;
  model: string;
  baseUrl: string;
  apiKey: () => string;
}): LlmProvider {
  return {
    id: opts.id,
    label: opts.label,
    model: opts.model,
    isConfigured: () => opts.apiKey().length > 0,

    async evaluate(
      referenceImages: InputImage[],
      candidateImages: InputImage[],
      options?: { signal?: AbortSignal },
    ): Promise<unknown> {
      const content: ChatContentPart[] = [];

      content.push({ type: "text", text: "REFERENCE IMAGES START" });
      referenceImages.forEach((img, i) => {
        content.push({ type: "text", text: `Reference Image ${i + 1}` });
        content.push({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        });
      });
      content.push({ type: "text", text: "REFERENCE IMAGES END" });

      content.push({ type: "text", text: "CANDIDATE 3D RENDER IMAGES START" });
      candidateImages.forEach((img, i) => {
        content.push({ type: "text", text: `Candidate Render ${i + 1}` });
        content.push({
          type: "image_url",
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        });
      });
      content.push({ type: "text", text: "CANDIDATE 3D RENDER IMAGES END" });

      content.push({
        type: "text",
        text: `${EVALUATION_USER_PROMPT}\n\n${JSON_OUTPUT_SCHEMA_PROMPT}`,
      });

      const response = await fetch(`${opts.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey()}`,
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: "system", content: EVALUATION_SYSTEM_PROMPT },
            { role: "user", content },
          ],
          response_format: { type: "json_object" },
        }),
        signal: options?.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `${opts.label} API error ${response.status}: ${body.slice(0, 500)}`,
        );
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = payload.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error(`${opts.label} returned an empty response`);
      }
      return extractJson(text);
    },
  };
}
