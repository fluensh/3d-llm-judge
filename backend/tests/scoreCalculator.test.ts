import { describe, expect, it } from "vitest";
import { computeOverallScore } from "../src/utils/scoreCalculator.js";
import type { GeminiDimension } from "../src/types/evaluation.js";

function dim(id: string, score: number | null): GeminiDimension {
  return {
    id: id as GeminiDimension["id"],
    score,
    confidence: 0.9,
    summary: "测试摘要",
    evidence:
      score === null
        ? []
        : [
            {
              view: "front",
              region: "face_contour",
              observation: "测试观察",
              severity: "minor",
              effect: "positive",
            },
            {
              view: "front",
              region: "jaw",
              observation: "测试观察",
              severity: "moderate",
              effect: "negative",
            },
          ],
  };
}

const allIds = [
  "identity_fidelity",
  "facial_geometry_fidelity",
  "global_morphology_proportion",
  "pose_silhouette_fidelity",
  "structural_detail_fidelity",
];

function dims(scores: Record<string, number | null>): GeminiDimension[] {
  return allIds.map((id) => dim(id, scores[id] === undefined ? 0 : scores[id]!));
}

describe("computeOverallScore", () => {
  it("computes weighted score when all dimensions are present", () => {
    // 4.5*20*0.3 + 4*20*0.3 + 4.5*20*0.2 + 4*20*0.1 + 3.5*20*0.1 = 27+24+18+8+7 = 84
    const result = computeOverallScore(
      dims({
        identity_fidelity: 4.5,
        facial_geometry_fidelity: 4,
        global_morphology_proportion: 4.5,
        pose_silhouette_fidelity: 4,
        structural_detail_fidelity: 3.5,
      }),
    );
    expect(result.status).toBe("SUCCESS");
    expect(result.overallScore).toBe(84);
    expect(result.evidenceCoverage).toBe(1);
  });

  it("scores 0 across the board → 0", () => {
    const result = computeOverallScore(dims({}));
    expect(result.status).toBe("SUCCESS");
    expect(result.overallScore).toBe(0);
  });

  it("renormalizes weights when a non-critical dimension is N/A", () => {
    // structural_detail (0.1) is N/A → available weight 0.9
    // (4.5*20*0.3 + 4*20*0.3 + 4.5*20*0.2 + 4*20*0.1) / 0.9 = (27+24+18+8)/0.9 = 85.56 → 86
    const result = computeOverallScore(
      dims({
        identity_fidelity: 4.5,
        facial_geometry_fidelity: 4,
        global_morphology_proportion: 4.5,
        pose_silhouette_fidelity: 4,
        structural_detail_fidelity: null,
      }),
    );
    expect(result.status).toBe("SUCCESS");
    expect(result.overallScore).toBe(86);
    expect(result.evidenceCoverage).toBe(0.9);
  });

  it("renormalizes with multiple N/A non-critical dimensions", () => {
    // pose (0.1) and structural (0.1) N/A → available 0.8
    // (5*20*0.3 + 3.5*20*0.3 + 3*20*0.2) / 0.8 = (30+21+12)/0.8 = 78.75 → 79
    const result = computeOverallScore(
      dims({
        identity_fidelity: 5,
        facial_geometry_fidelity: 3.5,
        global_morphology_proportion: 3,
        pose_silhouette_fidelity: null,
        structural_detail_fidelity: null,
      }),
    );
    expect(result.status).toBe("SUCCESS");
    expect(result.overallScore).toBe(79);
    expect(result.evidenceCoverage).toBe(0.8);
  });

  it("identity N/A → INSUFFICIENT_EVIDENCE with null overallScore", () => {
    const result = computeOverallScore(
      dims({
        identity_fidelity: null,
        facial_geometry_fidelity: 4,
        global_morphology_proportion: 4,
        pose_silhouette_fidelity: 4,
        structural_detail_fidelity: 4,
      }),
    );
    expect(result.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.overallScore).toBeNull();
    // 0.7 evaluable weight is still reported as coverage
    expect(result.evidenceCoverage).toBe(0.7);
  });

  it("facial geometry N/A → INSUFFICIENT_EVIDENCE with null overallScore", () => {
    const result = computeOverallScore(
      dims({
        identity_fidelity: 4,
        facial_geometry_fidelity: null,
        global_morphology_proportion: 4,
        pose_silhouette_fidelity: 4,
        structural_detail_fidelity: 4,
      }),
    );
    expect(result.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.overallScore).toBeNull();
    expect(result.evidenceCoverage).toBe(0.7);
  });

  it("N/A is never treated as 0 in renormalization", () => {
    // if N/A were treated as 0 the result would be lower;
    // correct: (4*20*0.3 + 4*20*0.3 + 4*20*0.2) / 0.8 = 80
    const result = computeOverallScore(
      dims({
        identity_fidelity: 4,
        facial_geometry_fidelity: 4,
        global_morphology_proportion: 4,
        pose_silhouette_fidelity: null,
        structural_detail_fidelity: null,
      }),
    );
    expect(result.overallScore).toBe(80);
  });
});
