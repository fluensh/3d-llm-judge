import type { EvaluationResult } from "../types/evaluation";

interface OverallScoreCardProps {
  result: EvaluationResult;
}

export default function OverallScoreCard({ result }: OverallScoreCardProps) {
  const insufficient = result.status === "INSUFFICIENT_EVIDENCE";
  const coveragePercent = Math.round(result.evidenceCoverage * 100);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Overall Restoration Score</p>
          <p className="mt-1 flex items-baseline gap-2">
            {insufficient || result.overallScore === null ? (
              <span className="text-4xl font-bold text-gray-400">N/A</span>
            ) : (
              <>
                <span className="text-4xl font-bold text-gray-900">{result.overallScore}</span>
                <span className="text-lg text-gray-400">/ 100</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${
              result.evidenceCoverage >= 1
                ? "bg-emerald-50 text-emerald-700 ring-emerald-300"
                : "bg-amber-50 text-amber-700 ring-amber-300"
            }`}
          >
            Evidence Coverage {coveragePercent}%
          </span>
          <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-300">
            {result.candidate.candidateName}
          </span>
        </div>
      </div>

      {insufficient && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 ring-1 ring-inset ring-amber-200">
          核心维度（人物身份 / 面部几何）证据不足（INSUFFICIENT_EVIDENCE），无法计算综合分数。
          建议补充更清晰的 Reference 图片后重新评估。
        </p>
      )}

      <p className="mt-4 text-base leading-7 text-gray-700">{result.summary}</p>
    </section>
  );
}
