import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { getProvider, providers } from "../services/providers/index.js";
import type { LlmProvider } from "../services/providers/types.js";
import { parseGeminiEvaluation } from "../schemas/evaluationSchema.js";
import { computeOverallScore, DIMENSION_META } from "../utils/scoreCalculator.js";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES_PER_GROUP,
  isAllowedImageType,
} from "../utils/imageValidation.js";
import type {
  ApiErrorBody,
  DimensionResult,
  EvaluationResult,
  GeminiDimension,
} from "../types/evaluation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_IMAGES_PER_GROUP * 2,
  },
});

interface ApiFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type StageId =
  | "received"
  | "validated"
  | "llm_started"
  | "llm_completed"
  | "schema_validated"
  | "scoring";

export interface StageEvent {
  step: StageId;
  message: string;
  elapsedMs: number;
}

export interface ErrorEvent {
  stage: string;
  code: string;
  message: string;
  detail?: string;
  elapsedMs: number;
}

function apiError(res: Response, status: number, code: string, message: string): void {
  const body: ApiErrorBody = { error: { code, message } };
  res.status(status).json(body);
}

function extractFiles(req: Request, field: string): ApiFile[] {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return (files?.[field] ?? []) as ApiFile[];
}

function validateGroup(
  files: ApiFile[],
  label: string,
): { ok: true } | { ok: false; message: string } {
  if (files.length === 0) {
    return { ok: false, message: "请至少上传一张原始参考图片和一张候选模型渲染图。" };
  }
  if (files.length > MAX_IMAGES_PER_GROUP) {
    return { ok: false, message: `${label}最多上传 ${MAX_IMAGES_PER_GROUP} 张图片。` };
  }
  for (const file of files) {
    if (!isAllowedImageType(file.mimetype)) {
      return {
        ok: false,
        message: `文件 ${file.originalname} 格式不合法，仅支持 ${ALLOWED_MIME_TYPES.map((t) => t.replace("image/", "").toUpperCase()).join(" / ")}。`,
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { ok: false, message: `文件 ${file.originalname} 超过 10 MB 上限。` };
    }
  }
  return { ok: true };
}

function toInputImages(files: ApiFile[]): { mimeType: string; data: string }[] {
  return files.map((f) => ({ mimeType: f.mimetype, data: f.buffer.toString("base64") }));
}

function buildResult(geminiDimensions: GeminiDimension[]): EvaluationResult {
  const overall = computeOverallScore(geminiDimensions);
  const byId = new Map(geminiDimensions.map((d) => [d.id, d]));

  const dimensions: DimensionResult[] = DIMENSION_META.map((meta) => {
    const dim = byId.get(meta.id)!; // schema guarantees all 5 ids present
    return {
      id: meta.id,
      name: meta.name,
      nameEn: meta.nameEn,
      weight: meta.weight,
      score: dim.score,
      score100: dim.score === null ? null : dim.score * 20,
      confidence: dim.confidence,
      summary: dim.summary,
      evidence: dim.evidence,
    };
  });

  return {
    status: overall.status,
    overallScore: overall.overallScore,
    evidenceCoverage: overall.evidenceCoverage,
    candidate: {
      candidateId: "candidate-1",
      candidateName: "Candidate Model",
    },
    dimensions,
    strongestPoints: [],
    mainProblems: [],
    summary: "",
    recommendation: "",
  };
}

export const evaluateRouter = Router();

evaluateRouter.post(
  "/evaluate",
  (req: Request, res: Response, next: NextFunction) => {
    upload.fields([
      { name: "referenceImages", maxCount: MAX_IMAGES_PER_GROUP },
      { name: "candidateImages", maxCount: MAX_IMAGES_PER_GROUP },
    ])(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof multer.MulterError
            ? err.code === "LIMIT_FILE_SIZE"
              ? "单张图片不能超过 10 MB。"
              : "图片上传失败，请检查数量与格式后重试。"
            : "图片上传失败，请重试。";
        console.error(`[evaluate] upload rejected: ${err instanceof Error ? err.message : String(err)}`);
        apiError(res, 400, "INVALID_FILE", message);
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const referenceFiles = extractFiles(req, "referenceImages");
    const candidateFiles = extractFiles(req, "candidateImages");

    // Validation failures happen before the stream starts → plain JSON error
    for (const [files] of [
      [referenceFiles],
      [candidateFiles],
    ] as const) {
      const validation = validateGroup(files, "每组图片");
      if (!validation.ok) {
        apiError(res, 400, "MISSING_OR_INVALID_IMAGES", validation.message);
        return;
      }
    }

    const providerId = String(req.body?.provider ?? "gemini");
    const provider: LlmProvider | undefined = getProvider(providerId);
    if (!provider) {
      apiError(
        res,
        400,
        "UNKNOWN_PROVIDER",
        `不支持的大模型：${providerId}。可选：${providers.map((p) => p.id).join(" / ")}。`,
      );
      return;
    }
    if (!provider.isConfigured()) {
      apiError(
        res,
        500,
        "PROVIDER_KEY_MISSING",
        `${provider.label}（${provider.model}）的 API Key 未配置，请检查 backend/.env。`,
      );
      return;
    }

    // ---- SSE stream: report every stage to the frontend ----
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    const controller = new AbortController();
    // Detect a real client disconnect (not the request body finishing).
    // In modern Node, req 'close' fires once the body is fully consumed,
    // so we watch the response instead and only abort if it ended prematurely.
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });

    const sendStage = (step: StageId, message: string) => {
      const event: StageEvent = { step, message, elapsedMs: Date.now() - start };
      res.write(`event: stage\ndata: ${JSON.stringify(event)}\n\n`);
    };
    const sendError = (stage: string, code: string, message: string, detail?: string) => {
      const event: ErrorEvent = { stage, code, message, detail, elapsedMs: Date.now() - start };
      res.write(`event: error\ndata: ${JSON.stringify(event)}\n\n`);
      res.end();
    };

    try {
      sendStage(
        "received",
        `已收到 ${referenceFiles.length} 张参考图片、${candidateFiles.length} 张候选渲染图（评估模型：${provider.label} / ${provider.model}）。`,
      );
      sendStage("validated", "图片校验通过（格式 / 大小 / 数量）。");

      sendStage(
        "llm_started",
        `正在调用 ${provider.label}（${provider.model}）进行多模态分析：人物身份、面部几何、身体比例、姿态与局部结构……`,
      );
      const raw = await provider.evaluate(
        toInputImages(referenceFiles),
        toInputImages(candidateFiles),
        { signal: controller.signal },
      );
      sendStage("llm_completed", `${provider.label} 分析完成，已收到结构化返回。`);

      sendStage("schema_validated", "返回数据已通过 Zod Schema 校验。");
      const parsed = parseGeminiEvaluation(raw);
      if (!parsed.ok) {
        console.error("[evaluate] Gemini response failed schema validation:", parsed.error.message);
        sendError(
          "schema_validation",
          "MODEL_RESPONSE_INVALID",
          "MODEL_RESPONSE_INVALID：模型返回结果不合法，请重试。",
          parsed.error.message,
        );
        return;
      }

      sendStage("scoring", "后端重新计算加权分数（不信任模型算术）……");
      const { dimensions, strongestPoints, mainProblems, summary, recommendation } = parsed.data;
      const result: EvaluationResult = {
        ...buildResult(dimensions),
        strongestPoints,
        mainProblems,
        summary,
        recommendation,
      };

      res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`);
      res.end();
    } catch (err) {
      if (controller.signal.aborted) {
        console.error("[evaluate] Client aborted the request.");
        return; // socket already closed
      }
      // Log only the error message - never the API key or image payloads
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[evaluate] Gemini API call failed: ${detail}`);
      sendError("gemini_call", "GEMINI_ERROR", "评估失败，请重试。", detail);
    }
  },
);
