import { z } from "zod";
import type { GeminiEvaluation } from "../types/evaluation.js";

export const DIMENSION_IDS = [
  "identity_fidelity",
  "facial_geometry_fidelity",
  "global_morphology_proportion",
  "pose_silhouette_fidelity",
  "structural_detail_fidelity",
] as const;

export const dimensionIdSchema = z.enum(DIMENSION_IDS);
export type DimensionId = (typeof DIMENSION_IDS)[number];

export const viewSchema = z.enum([
  "front",
  "left45",
  "right45",
  "left_profile",
  "right_profile",
  "back",
  "full_body",
  "unknown",
]);

export const severitySchema = z.enum(["minor", "moderate", "major", "critical"]);
export const effectSchema = z.enum(["positive", "negative", "neutral"]);

/** 0-5 with 0.5 steps, or null (N/A) */
export const scoreSchema = z
  .number()
  .refine(
    (v) => v >= 0 && v <= 5 && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9,
    "score must be within 0-5 with 0.5 steps",
  )
  .nullable();

export const confidenceSchema = z
  .number()
  .refine((v) => v >= 0 && v <= 1, "confidence must be within 0-1");

export const evidenceSchema = z.object({
  view: viewSchema,
  region: z.string().min(1, "region must not be empty"),
  observation: z.string().min(1, "observation must not be empty"),
  severity: severitySchema,
  effect: effectSchema,
});

export const geminiDimensionSchema = z.object({
  id: dimensionIdSchema,
  score: scoreSchema,
  confidence: confidenceSchema,
  summary: z.string().min(1, "summary must not be empty"),
  // Scored dimensions ideally carry 2-4 evidence items (prompt enforces this),
  // but the model occasionally returns fewer - normalization below fixes the
  // self-contradictory cases before validation.
  evidence: z.array(evidenceSchema).max(4),
});

export const strongestPointSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const mainProblemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: severitySchema,
});

export const geminiEvaluationSchema = z
  .object({
    dimensions: z.array(geminiDimensionSchema).length(5, "exactly 5 dimensions required"),
    strongestPoints: z.array(strongestPointSchema).max(3),
    mainProblems: z.array(mainProblemSchema).max(3),
    summary: z.string().min(1, "summary must not be empty"),
    recommendation: z.string().min(1, "recommendation must not be empty"),
  })
  .refine(
    (r) => {
      const ids = new Set(r.dimensions.map((d) => d.id));
      return ids.size === DIMENSION_IDS.length && DIMENSION_IDS.every((id) => ids.has(id));
    },
    "dimensions must cover all 5 expected ids exactly once",
  );

/**
 * Repair common self-contradictions in Gemini's raw JSON before strict validation:
 * - N/A dimension (score=null) that still carries evidence → drop the evidence
 * - More than 4 evidence items on a scored dimension → keep the first 4
 * - More than 3 strongest points / main problems → keep the first 3
 * This avoids rejecting an otherwise usable evaluation over format nits.
 */
export function normalizeGeminiEvaluation(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  if (Array.isArray(obj.dimensions)) {
    obj.dimensions = obj.dimensions.map((d) => {
      if (typeof d !== "object" || d === null) return d;
      const dim = { ...(d as Record<string, unknown>) };
      const isNA = dim.score === null || dim.score === undefined;
      if (isNA) {
        dim.evidence = [];
      } else if (Array.isArray(dim.evidence)) {
        dim.evidence = dim.evidence.slice(0, 4);
      }
      return dim;
    });
  }
  if (Array.isArray(obj.strongestPoints)) obj.strongestPoints = obj.strongestPoints.slice(0, 3);
  if (Array.isArray(obj.mainProblems)) obj.mainProblems = obj.mainProblems.slice(0, 3);

  return obj;
}

export function parseGeminiEvaluation(raw: unknown):
  | { ok: true; data: GeminiEvaluation }
  | { ok: false; error: z.ZodError } {
  const result = geminiEvaluationSchema.safeParse(normalizeGeminiEvaluation(raw));
  if (result.success) {
    return { ok: true, data: result.data as GeminiEvaluation };
  }
  return { ok: false, error: result.error };
}
