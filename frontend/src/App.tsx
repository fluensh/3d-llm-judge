import { useEffect, useState } from "react";
import ImageUploadSection from "./components/ImageUploadSection";
import ImageCompareGallery from "./components/ImageCompareGallery";
import OverallScoreCard from "./components/OverallScoreCard";
import DimensionCard from "./components/DimensionCard";
import PointsPanels from "./components/PointsPanels";
import ProgressPanel from "./components/ProgressPanel";
import { useImageList } from "./hooks/useImageList";
import { evaluate, type ApiError, type StageInfo } from "./services/api";
import type { EvaluationResult } from "./types/evaluation";

type Phase = "idle" | "loading" | "done";

export interface ProviderInfo {
  id: string;
  label: string;
  model: string;
  configured: boolean;
}

const stageLabel: Record<string, string> = {
  request: "请求阶段",
  received: "接收图片",
  validated: "图片校验",
  llm_started: "模型调用",
  llm_completed: "模型返回",
  schema_validated: "数据校验",
  scoring: "分数计算",
  stream: "连接",
};

export default function App() {
  const reference = useImageList();
  const candidate = useImageList();

  const [providerList, setProviderList] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("gemini");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: { providers?: ProviderInfo[] }) => {
        if (Array.isArray(data.providers) && data.providers.length > 0) {
          setProviderList(data.providers);
          const firstConfigured =
            data.providers.find((p) => p.configured)?.id ?? data.providers[0].id;
          setSelectedProvider(firstConfigured);
        }
      })
      .catch(() => {
        // backend unreachable - selector falls back to a static Gemini entry
      });
  }, []);

  const selectedInfo = providerList.find((p) => p.id === selectedProvider);
  const providerReady = !selectedInfo || selectedInfo.configured;

  const [phase, setPhase] = useState<Phase>("idle");
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [snapshot, setSnapshot] = useState<{ reference: File[]; candidate: File[] } | null>(null);

  const canEvaluate =
    reference.files.length > 0 &&
    candidate.files.length > 0 &&
    phase !== "loading" &&
    providerReady;

  async function handleEvaluate() {
    setPhase("loading");
    setStages([]);
    setError(null);
    setResult(null);
    setSnapshot({ reference: [...reference.files], candidate: [...candidate.files] });

    await evaluate(
      reference.files,
      candidate.files,
      {
        onStage: (stage) => setStages((prev) => [...prev, stage]),
        onResult: (evaluationResult) => {
          setResult(evaluationResult);
          setPhase("done");
        },
        onError: (apiError) => {
          setError(apiError);
          setPhase("idle");
        },
      },
      selectedProvider,
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <header className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">3D Person Restoration Evaluator</h1>
              <p className="text-sm text-gray-500">
                Evaluate how accurately a 3D person reconstruction matches the original
                reference images.
              </p>
            </div>
          </div>
        </header>

        <main className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ImageUploadSection
              titleZh="原始参考图片"
              titleEn="Reference Images"
              list={reference}
            />
            <ImageUploadSection
              titleZh="候选 3D 模型渲染图"
              titleEn="Candidate 3D Renders"
              list={candidate}
              hint="建议上传正面、45°、侧面等多个视角。所有图片应来自同一个候选 3D 模型。"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">评估大模型</span>
              {(providerList.length > 0
                ? providerList
                : [{ id: "gemini", label: "Google Gemini", model: "gemini-3.7-flash", configured: true }]
              ).map((p) => {
                const selected = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id)}
                    disabled={phase === "loading"}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    } ${phase === "loading" ? "cursor-not-allowed opacity-60" : ""}`}
                    title={p.configured ? p.model : `${p.model}（API Key 未配置）`}
                  >
                    <span className="font-medium">{p.label}</span>
                    <span className="text-xs text-gray-400">{p.model}</span>
                    {!p.configured && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                        未配置 Key
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={!canEvaluate}
              className={`rounded-lg px-10 py-3 text-base font-semibold transition-colors ${
                canEvaluate
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {phase === "loading" ? "评估中…" : "开始评估"}
              <span className="ml-2 text-sm font-normal opacity-80">Evaluate</span>
            </button>
            {(reference.files.length === 0 || candidate.files.length === 0) && phase === "idle" && (
              <p className="text-xs text-gray-400">
                请至少上传一张原始参考图片和一张候选模型渲染图。
              </p>
            )}
            {!providerReady && phase === "idle" && (
              <p className="text-xs text-amber-600">
                {selectedInfo?.label}（{selectedInfo?.model}）的 API Key 未配置，请在
                backend/.env 中填写对应的 Key 后重启后端。
              </p>
            )}
          </div>

          {(phase === "loading" || (stages.length > 0 && phase === "idle" && error)) && (
            <ProgressPanel
              stages={stages}
              failed={Boolean(error)}
              done={false}
            />
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-red-700">评估失败</p>
                {error.stage && (
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    失败阶段：{stageLabel[error.stage] ?? error.stage}
                  </span>
                )}
                <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {error.code}
                </span>
              </div>
              <p className="mt-1 text-sm text-red-600">{error.message}</p>
              {error.detail && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-500">技术详情（开发调试用）</summary>
                  <p className="mt-1 break-all font-mono text-xs leading-5 text-red-500">
                    {error.detail}
                  </p>
                </details>
              )}
            </div>
          )}

          {phase === "done" && result && snapshot && (
            <div className="space-y-6">
              <OverallScoreCard result={result} />
              <ImageCompareGallery
                referenceImages={snapshot.reference}
                candidateImages={snapshot.candidate}
              />
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  五维评分
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {result.dimensions.map((dimension) => (
                    <DimensionCard key={dimension.id} dimension={dimension} />
                  ))}
                </div>
              </div>
              <PointsPanels result={result} />
            </div>
          )}
        </main>

        <footer className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-400">
          Powered by Google Gemini · 评分与 Evidence 仅基于上传图片中的可见结构证据
        </footer>
      </div>
    </div>
  );
}
