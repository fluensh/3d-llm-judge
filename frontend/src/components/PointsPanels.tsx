import type { EvaluationResult } from "../types/evaluation";
import { SeverityBadge } from "./badges";

interface PointsPanelsProps {
  result: EvaluationResult;
}

export default function PointsPanels({ result }: PointsPanelsProps) {
  const { strongestPoints, mainProblems, recommendation } = result;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">最准确的 3 个方面</h3>
          <p className="text-xs text-gray-500">Strongest Points</p>
          <ul className="mt-3 space-y-3">
            {strongestPoints.length === 0 && (
              <li className="text-sm text-gray-400">无</li>
            )}
            {strongestPoints.map((point, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{point.title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-gray-600">{point.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">主要的 3 个问题</h3>
          <p className="text-xs text-gray-500">Main Problems</p>
          <ul className="mt-3 space-y-3">
            {mainProblems.length === 0 && (
              <li className="text-sm text-gray-400">无</li>
            )}
            {mainProblems.map((problem, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-amber-100">
                  <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{problem.title}</p>
                    <SeverityBadge severity={problem.severity} />
                  </div>
                  <p className="mt-0.5 text-sm leading-6 text-gray-600">{problem.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {recommendation && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
          <h3 className="text-sm font-semibold text-blue-900">优化建议</h3>
          <p className="text-xs text-blue-600">Recommendation</p>
          <p className="mt-2 text-sm leading-6 text-gray-700">{recommendation}</p>
        </section>
      )}
    </div>
  );
}
