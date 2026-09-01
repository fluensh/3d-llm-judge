import { useState } from "react";
import type { DimensionResult } from "../types/evaluation";
import { SeverityBadge, EffectBadge, viewLabel } from "./badges";

interface DimensionCardProps {
  dimension: DimensionResult;
}

function scoreBarColor(score100: number): string {
  if (score100 >= 80) return "bg-emerald-500";
  if (score100 >= 60) return "bg-blue-500";
  if (score100 >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export default function DimensionCard({ dimension }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { name, nameEn, weight, score, score100, confidence, summary, evidence } = dimension;
  const isNA = score === null || score100 === null;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
            <p className="text-xs text-gray-500">{nameEn}</p>
          </div>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            权重 {Math.round(weight * 100)}%
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
          {isNA ? (
            <p className="text-2xl font-bold text-gray-400">N/A</p>
          ) : (
            <p className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{score100}</span>
              <span className="text-sm text-gray-400">/ 100</span>
              <span className="ml-2 text-xs text-gray-500">原始评分 {score} / 5</span>
            </p>
          )}
          <p className="text-xs text-gray-500">Confidence {confidencePercent}%</p>
        </div>

        {!isNA && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${scoreBarColor(score100 as number)}`}
              style={{ width: `${score100}%` }}
            />
          </div>
        )}

        <p className="mt-3 text-sm leading-6 text-gray-600">{summary}</p>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={evidence.length === 0}
          className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:text-gray-400"
        >
          {expanded ? "收起 Evidence" : `Evidence（${evidence.length}）`}
        </button>
      </div>

      {expanded && evidence.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence</p>
          <ul className="mt-2 space-y-3">
            {evidence.map((item, index) => (
              <li key={index} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                    [{viewLabel[item.view]}]
                  </span>
                  <span className="text-sm font-medium text-gray-900">{item.region}</span>
                  <SeverityBadge severity={item.severity} />
                  <EffectBadge effect={item.effect} />
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.observation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
