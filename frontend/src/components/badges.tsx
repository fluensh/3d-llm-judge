import type { Effect, Severity, View } from "../types/evaluation";

export const severityLabel: Record<Severity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
  critical: "Critical",
};

const severityStyle: Record<Severity, string> = {
  minor: "bg-slate-100 text-slate-700 ring-slate-300",
  moderate: "bg-amber-50 text-amber-700 ring-amber-300",
  major: "bg-orange-50 text-orange-700 ring-orange-300",
  critical: "bg-red-50 text-red-700 ring-red-300",
};

export const effectLabel: Record<Effect, string> = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
};

const effectStyle: Record<Effect, string> = {
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  negative: "bg-red-50 text-red-700 ring-red-300",
  neutral: "bg-gray-100 text-gray-600 ring-gray-300",
};

export const viewLabel: Record<View, string> = {
  front: "Front",
  left45: "Left 45°",
  right45: "Right 45°",
  left_profile: "Left Profile",
  right_profile: "Right Profile",
  back: "Back",
  full_body: "Full Body",
  unknown: "Unknown",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyle[severity]}`}
    >
      {severityLabel[severity]}
    </span>
  );
}

export function EffectBadge({ effect }: { effect: Effect }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${effectStyle[effect]}`}
    >
      {effectLabel[effect]}
    </span>
  );
}
