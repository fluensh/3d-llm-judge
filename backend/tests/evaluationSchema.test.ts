import { describe, expect, it } from "vitest";
import {
  geminiEvaluationSchema,
  parseGeminiEvaluation,
} from "../src/schemas/evaluationSchema.js";

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    view: "front",
    region: "jaw",
    observation: "参考人物下半脸较窄，候选模型下颌略宽。",
    severity: "moderate",
    effect: "negative",
    ...overrides,
  };
}

function dimension(overrides: Record<string, unknown> = {}) {
  return {
    id: "identity_fidelity",
    score: 4.5,
    confidence: 0.91,
    summary: "整体身份特征高度接近参考人物。",
    evidence: [evidence(), evidence({ region: "eyes", effect: "positive", severity: "minor" })],
    ...overrides,
  };
}

function evaluation(overrides: Record<string, unknown> = {}) {
  return {
    dimensions: [
      dimension(),
      dimension({ id: "facial_geometry_fidelity", score: 4 }),
      dimension({ id: "global_morphology_proportion", score: 4 }),
      dimension({ id: "pose_silhouette_fidelity", score: 3.5 }),
      dimension({ id: "structural_detail_fidelity", score: null, evidence: [], summary: "证据不足" }),
    ],
    strongestPoints: [
      { title: "脸部整体比例", description: "候选模型较准确保留了参考人物的脸宽、脸长关系。" },
    ],
    mainProblems: [
      {
        title: "鼻梁立体度不足",
        description: "45 度视角中候选模型鼻梁高度低于参考人物。",
        severity: "moderate",
      },
    ],
    summary: "候选模型整体还原度较高。",
    recommendation: "重点优化鼻梁高度。",
    ...overrides,
  };
}

describe("geminiEvaluationSchema (Zod validation of Gemini output)", () => {
  it("accepts a valid full response", () => {
    const result = geminiEvaluationSchema.safeParse(evaluation());
    expect(result.success).toBe(true);
  });

  it("accepts N/A dimensions with null score and empty evidence", () => {
    const result = geminiEvaluationSchema.safeParse(
      evaluation({
        dimensions: [
          dimension({ score: null, evidence: [] }),
          dimension({ id: "facial_geometry_fidelity", score: null, evidence: [] }),
          dimension({ id: "global_morphology_proportion", score: 4 }),
          dimension({ id: "pose_silhouette_fidelity", score: 3.5 }),
          dimension({ id: "structural_detail_fidelity", score: 4 }),
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an invalid score step (4.7)", () => {
    const result = geminiEvaluationSchema.safeParse(
      evaluation({ dimensions: [dimension({ score: 4.7 })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range scores", () => {
    expect(geminiEvaluationSchema.safeParse(evaluation({ dimensions: [dimension({ score: 5.5 })] })).success).toBe(false);
    expect(geminiEvaluationSchema.safeParse(evaluation({ dimensions: [dimension({ score: -0.5 })] })).success).toBe(false);
  });

  it("rejects string N/A instead of null", () => {
    const result = geminiEvaluationSchema.safeParse(
      evaluation({ dimensions: [dimension({ score: "N/A", evidence: [] })] }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts scored dimension with only 1 evidence item (normalization relaxes the 2-item minimum)", () => {
    const result = geminiEvaluationSchema.safeParse(
      evaluation({
        dimensions: [
          dimension({ evidence: [evidence()] }),
          dimension({ id: "facial_geometry_fidelity", score: 4 }),
          dimension({ id: "global_morphology_proportion", score: 4 }),
          dimension({ id: "pose_silhouette_fidelity", score: 3.5 }),
          dimension({ id: "structural_detail_fidelity", score: 4 }),
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("normalization drops evidence on an N/A dimension that still carries some", () => {
    const raw = evaluation({
      dimensions: [
        dimension({ score: null, evidence: [evidence(), evidence()], summary: "证据不足" }),
        dimension({ id: "facial_geometry_fidelity", score: 4 }),
        dimension({ id: "global_morphology_proportion", score: 4 }),
        dimension({ id: "pose_silhouette_fidelity", score: 3.5 }),
        dimension({ id: "structural_detail_fidelity", score: 4 }),
      ],
    });
    const result = parseGeminiEvaluation(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dimensions[0].score).toBeNull();
      expect(result.data.dimensions[0].evidence).toHaveLength(0);
    }
  });

  it("normalization trims evidence to 4 items and points to 3", () => {
    const five = [evidence(), evidence(), evidence(), evidence(), evidence()];
    const four = [
      { title: "a", description: "b" },
      { title: "a", description: "b" },
      { title: "a", description: "b" },
      { title: "a", description: "b" },
    ];
    const raw = evaluation({
      dimensions: [
        dimension({ evidence: five }),
        dimension({ id: "facial_geometry_fidelity", score: 4 }),
        dimension({ id: "global_morphology_proportion", score: 4 }),
        dimension({ id: "pose_silhouette_fidelity", score: 3.5 }),
        dimension({ id: "structural_detail_fidelity", score: 4 }),
      ],
      strongestPoints: four,
      mainProblems: four.map((p, i) => ({ ...p, title: `t${i}`, severity: "minor" as const })),
    });
    const result = parseGeminiEvaluation(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dimensions[0].evidence).toHaveLength(4);
      expect(result.data.strongestPoints).toHaveLength(3);
      expect(result.data.mainProblems).toHaveLength(3);
    }
  });

  it("rejects more than 4 evidence items", () => {
    const result = geminiEvaluationSchema.safeParse(
      evaluation({
        dimensions: [dimension({ evidence: [evidence(), evidence(), evidence(), evidence(), evidence()] })],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid severity / effect / view values", () => {
    expect(
      geminiEvaluationSchema.safeParse(
        evaluation({ dimensions: [dimension({ evidence: [evidence({ severity: "huge" })] })] }),
      ).success,
    ).toBe(false);
    expect(
      geminiEvaluationSchema.safeParse(
        evaluation({ dimensions: [dimension({ evidence: [evidence({ effect: "bad" })] })] }),
      ).success,
    ).toBe(false);
    expect(
      geminiEvaluationSchema.safeParse(
        evaluation({ dimensions: [dimension({ evidence: [evidence({ view: "diagonal" })] })] }),
      ).success,
    ).toBe(false);
  });

  it("rejects missing / duplicated / unknown dimension ids", () => {
    const missing = evaluation();
    missing.dimensions = missing.dimensions.slice(0, 4);
    expect(geminiEvaluationSchema.safeParse(missing).success).toBe(false);

    const duplicated = evaluation();
    duplicated.dimensions[4] = dimension();
    expect(geminiEvaluationSchema.safeParse(duplicated).success).toBe(false);

    const unknown = evaluation();
    unknown.dimensions[0] = dimension({ id: "beauty_score" as never });
    expect(geminiEvaluationSchema.safeParse(unknown).success).toBe(false);
  });

  it("rejects confidence outside 0-1", () => {
    const result = geminiEvaluationSchema.safeParse(
      evaluation({ dimensions: [dimension({ confidence: 1.2 })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 strongest points / main problems", () => {
    const four = [
      { title: "a", description: "b" },
      { title: "a", description: "b" },
      { title: "a", description: "b" },
      { title: "a", description: "b" },
    ];
    expect(geminiEvaluationSchema.safeParse(evaluation({ strongestPoints: four })).success).toBe(false);
    expect(geminiEvaluationSchema.safeParse(evaluation({ mainProblems: four })).success).toBe(false);
  });

  it("rejects missing summary or recommendation", () => {
    const noSummary = evaluation();
    delete (noSummary as Record<string, unknown>).summary;
    expect(geminiEvaluationSchema.safeParse(noSummary).success).toBe(false);
  });
});
