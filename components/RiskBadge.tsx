import type { RiskLevel } from "@/lib/types";

const STYLE: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 ring-green-200",
  mid: "bg-amber-100 text-amber-800 ring-amber-200",
  high: "bg-red-100 text-red-800 ring-red-200",
};

const LABEL: Record<RiskLevel, string> = {
  low: "低",
  mid: "中",
  high: "高",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLE[level]}`}
    >
      {LABEL[level]}
    </span>
  );
}
