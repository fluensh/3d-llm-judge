import type { EvaluationResult } from "../types/evaluation";

export class ApiError extends Error {
  readonly code: string;
  readonly stage?: string;
  readonly detail?: string;

  constructor(code: string, message: string, stage?: string, detail?: string) {
    super(message);
    this.code = code;
    this.stage = stage;
    this.detail = detail;
  }
}

export interface StageInfo {
  step: string;
  message: string;
  elapsedMs: number;
}

export interface EvaluateCallbacks {
  onStage: (stage: StageInfo) => void;
  onResult: (result: EvaluationResult) => void;
  onError: (error: ApiError) => void;
}

/**
 * POST /api/evaluate as an SSE stream.
 * The backend emits: `stage` (progress), `result` (final payload) or `error` events.
 * Validation failures that occur before the stream starts arrive as plain JSON.
 */
export async function evaluate(
  referenceImages: File[],
  candidateImages: File[],
  callbacks: EvaluateCallbacks,
  provider: string = "gemini",
): Promise<void> {
  const formData = new FormData();
  referenceImages.forEach((file) => formData.append("referenceImages", file));
  candidateImages.forEach((file) => formData.append("candidateImages", file));
  formData.append("provider", provider);

  let response: Response;
  try {
    response = await fetch("/api/evaluate", {
      method: "POST",
      body: formData,
    });
  } catch {
    callbacks.onError(new ApiError("NETWORK_ERROR", "无法连接评估服务，请确认后端已启动。"));
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";

  // Pre-stream failures (invalid files, missing key...) come back as JSON
  if (!contentType.includes("text/event-stream")) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // ignore
    }
    const errBody = (body as { error?: { code?: string; message?: string } } | null)?.error;
    callbacks.onError(
      new ApiError(
        errBody?.code ?? "UNKNOWN",
        errBody?.message ?? "评估失败，请重试。",
        "request",
      ),
    );
    return;
  }

  if (!response.body) {
    callbacks.onError(new ApiError("NETWORK_ERROR", "连接中断，请重试。", "stream"));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleEvent = (eventName: string, dataText: string) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataText);
    } catch {
      return;
    }
    if (eventName === "stage") {
      callbacks.onStage({
        step: String(data.step ?? ""),
        message: String(data.message ?? ""),
        elapsedMs: Number(data.elapsedMs ?? 0),
      });
    } else if (eventName === "result") {
      callbacks.onResult(data as unknown as EvaluationResult);
    } else if (eventName === "error") {
      callbacks.onError(
        new ApiError(
          String(data.code ?? "UNKNOWN"),
          String(data.message ?? "评估失败，请重试。"),
          data.stage ? String(data.stage) : undefined,
          data.detail ? String(data.detail) : undefined,
        ),
      );
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line
      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        let eventName = "message";
        const dataLines: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }
        if (dataLines.length > 0) {
          handleEvent(eventName, dataLines.join("\n"));
        }
      }
    }
  } catch {
    callbacks.onError(new ApiError("NETWORK_ERROR", "连接中断，请重试。", "stream"));
  }
}
