// Shared evaluation domain types (mirrored in frontend/src/types/evaluation.ts)

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

/** Raw dimension as returned by Gemini (before backend enrichment) */
export interface GeminiDimension {
  id: DimensionId;
  score: number | null; // 0-5 step 0.5, null = N/A
  confidence: number; // 0-1
  summary: string;
  evidence: EvidenceItem[];
}

export interface GeminiEvaluation {
  dimensions: GeminiDimension[];
  strongestPoints: StrongestPoint[];
  mainProblems: MainProblem[];
  summary: string;
  recommendation: string;
}

/** Final dimension returned to the frontend */
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

export interface CandidateInfo {
  candidateId: string;
  candidateName: string;
}

export interface EvaluationResult {
  status: EvaluationStatus;
  overallScore: number | null; // 0-100, null when INSUFFICIENT_EVIDENCE
  evidenceCoverage: number; // 0-1, sum of evaluable dimension weights
  candidate: CandidateInfo;
  dimensions: DimensionResult[];
  strongestPoints: StrongestPoint[];
  mainProblems: MainProblem[];
  summary: string;
  recommendation: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
