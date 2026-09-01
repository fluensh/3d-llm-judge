import type { StageInfo } from "../services/api";

interface ProgressPanelProps {
  stages: StageInfo[];
  failed: boolean;
  done: boolean;
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default function ProgressPanel({ stages, failed, done }: ProgressPanelProps) {
  if (stages.length === 0) return null;
  const lastStage = stages[stages.length - 1];

  return (
    <section
      className={`rounded-xl border px-5 py-4 ${
        failed
          ? "border-red-200 bg-red-50"
          : done
            ? "border-emerald-200 bg-emerald-50"
            : "border-blue-200 bg-blue-50"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {!failed && !done && (
          <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        <p className={`text-sm font-medium ${failed ? "text-red-700" : done ? "text-emerald-700" : "text-blue-800"}`}>
          {failed ? "评估失败" : done ? "评估完成" : "评估进行中"}
        </p>
        <span className="text-xs text-gray-500">耗时 {formatMs(lastStage.elapsedMs)}</span>
      </div>

      <ol className="mt-3 space-y-2">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const isCurrent = isLast && !failed && !done;
          const isFailedStage = failed && isLast;
          return (
            <li key={`${stage.step}-${index}`} className="flex items-start gap-3">
              {isCurrent ? (
                <svg className="mt-0.5 h-4 w-4 flex-none animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isFailedStage ? (
                <svg className="mt-0.5 h-4 w-4 flex-none text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              ) : (
                <svg className="mt-0.5 h-4 w-4 flex-none text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-6 ${isFailedStage ? "font-medium text-red-700" : "text-gray-700"}`}>
                  {stage.message}
                </p>
              </div>
              <span className="flex-none text-xs tabular-nums text-gray-400">
                {formatMs(stage.elapsedMs)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
