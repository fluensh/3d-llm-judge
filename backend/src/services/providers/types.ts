import type { InputImage } from "../geminiService.js";

export type { InputImage };

export interface LlmProvider {
  /** Stable id used in API requests (form field `provider`) */
  readonly id: string;
  /** Display name for the frontend selector */
  readonly label: string;
  /** Actual model id sent to the API */
  readonly model: string;
  /** Whether the API key for this provider is configured */
  isConfigured(): boolean;
  /**
   * Run the multimodal evaluation. Returns the raw parsed JSON object;
   * caller validates it against the Zod schema.
   */
  evaluate(
    referenceImages: InputImage[],
    candidateImages: InputImage[],
    options?: { signal?: AbortSignal },
  ): Promise<unknown>;
}
