// Evaluation result types (mirrors backend/src/types/evaluation.ts)

export type DimensionId =
  | "identity_fidelity"
  | "facial_geometry_fidelity"
  | "global_morphology_proportion"
  | "pose_silhouette_fidelity"
  | "structural_detail_fidelity";

export type View =
  | "front"
  | "left45"
  | "right45"
  | "left_profile"
  | "right_profile"
  | "back"
  | "full_body"
  | "unknown";

export type Severity = "minor" | "moderate" | "major" | "critical";
export type Effect = "positive" | "negative" | "neutral";
export type EvaluationStatus = "SUCCESS" | "INSUFFICIENT_EVIDENCE";

export interface EvidenceItem {
  view: View;
  region: string;
  observation: string;
  severity: Severity;
  effect: Effect;
}

export interface StrongestPoint {
  title: string;
  description: string;
}

export interface MainProblem {
  title: string;
  description: string;
  severity: Severity;
}

export interface DimensionResult {
  id: DimensionId;
  name: string;
  nameEn: string;
  weight: number;
  score: number | null;
  score100: number | null;
  confidence: number;
  summary: string;
  evidence: EvidenceItem[];
}

export interface EvaluationResult {
  status: EvaluationStatus;
  overallScore: number | null;
  evidenceCoverage: number;
  candidate: {
    candidateId: string;
    candidateName: string;
  };
  dimensions: DimensionResult[];
  strongestPoints: StrongestPoint[];
  mainProblems: MainProblem[];
  summary: string;
  recommendation: string;
}
