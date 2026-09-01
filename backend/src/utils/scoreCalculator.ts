import type { EvaluationStatus, GeminiDimension } from "../types/evaluation.js";
import { DIMENSION_IDS } from "../schemas/evaluationSchema.js";

export interface DimensionMeta {
  id: (typeof DIMENSION_IDS)[number];
  name: string;
  nameEn: string;
  weight: number;
  critical: boolean; // when null → INSUFFICIENT_EVIDENCE
}

export const DIMENSION_META: DimensionMeta[] = [
  {
    id: "identity_fidelity",
    name: "人物身份还原度",
    nameEn: "Identity Fidelity",
    weight: 0.3,
    critical: true,
  },
  {
    id: "facial_geometry_fidelity",
    name: "面部几何还原度",
    nameEn: "Facial Geometry Fidelity",
    weight: 0.3,
    critical: true,
  },
  {
    id: "global_morphology_proportion",
    name: "整体形态与比例还原度",
    nameEn: "Global Morphology & Proportion",
    weight: 0.2,
    critical: false,
  },
  {
    id: "pose_silhouette_fidelity",
    name: "姿态与轮廓还原度",
    nameEn: "Pose & Silhouette Fidelity",
    weight: 0.1,
    critical: false,
  },
  {
    id: "structural_detail_fidelity",
    name: "局部结构细节还原度",
    nameEn: "Structural Detail Fidelity",
    weight: 0.1,
    critical: false,
  },
];

export interface OverallScoreResult {
  status: EvaluationStatus;
  overallScore: number | null; // 0-100, null when INSUFFICIENT_EVIDENCE
  evidenceCoverage: number; // 0-1
}

/**
 * Compute the weighted overall score from Gemini dimension scores.
 * The server recalculates this itself and never trusts Gemini's arithmetic.
 *
 * Rules:
 * - score100 = score × 20
 * - identity_fidelity or facial_geometry_fidelity is N/A → status=INSUFFICIENT_EVIDENCE, overallScore=null
 * - non-critical dimension N/A → excluded, remaining weights renormalized
 * - evidenceCoverage = sum of evaluable dimension weights
 */
export function computeOverallScore(dimensions: GeminiDimension[]): OverallScoreResult {
  const byId = new Map(dimensions.map((d) => [d.id, d]));

  let evaluableWeight = 0;
  let weightedScore100Sum = 0;
  let hasCriticalNA = false;

  for (const meta of DIMENSION_META) {
    const dim = byId.get(meta.id);
    if (!dim) {
      // Schema validation guarantees presence; treat missing as insufficient evidence
      hasCriticalNA = true;
      continue;
    }
    if (dim.score === null) {
      if (meta.critical) hasCriticalNA = true;
      continue;
    }
    evaluableWeight += meta.weight;
    weightedScore100Sum += dim.score * 20 * meta.weight;
  }

  const evidenceCoverage = round2(evaluableWeight);

  if (hasCriticalNA || evaluableWeight <= 0) {
    return { status: "INSUFFICIENT_EVIDENCE", overallScore: null, evidenceCoverage };
  }

  const overallScore = Math.round(weightedScore100Sum / evaluableWeight);
  return { status: "SUCCESS", overallScore, evidenceCoverage };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
