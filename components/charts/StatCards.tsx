import type { Aggregated, RiskLevel, ScoreReport } from "@/lib/types";

type Props = {
  stats: Aggregated;
  scores: ScoreReport;
};

const RISK_STYLE: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  low: { bg: "#d1fae5", text: "#065f46", label: "リスク低" },
  mid: { bg: "#fef3c7", text: "#92400e", label: "やや注意" },
  high: { bg: "#fee2e2", text: "#9f1d1d", label: "要注意" },
};

const ACCENT: Record<"rain" | "temp" | "wind", { fg: string; chip: string }> = {
  rain: { fg: "#3730a3", chip: "#e0e7ff" },
  temp: { fg: "#9a3412", chip: "#fed7aa" },
  wind: { fg: "#5b21b6", chip: "#ede9fe" },
};

function pickTempRisk(stats: Aggregated, scores: ScoreReport): {
  level: RiskLevel;
  primary: "heat" | "cold" | "neutral";
  hint: string;
} {
  const heatLevel = scores.heat;
  const coldLevel = scores.cold;
  const heatRank = heatLevel === "high" ? 2 : heatLevel === "mid" ? 1 : 0;
  const coldRank = coldLevel === "high" ? 2 : coldLevel === "mid" ? 1 : 0;
  if (heatRank >= coldRank && heatRank > 0) {
    return {
      level: heatLevel,
      primary: "heat",
      hint: heatLevel === "high" ? "猛暑日に近い" : "やや暑め",
    };
  }
  if (coldRank > heatRank) {
    return {
      level: coldLevel,
      primary: "cold",
      hint: coldLevel === "high" ? "冷え込み強い" : "肌寒め",
    };
  }
  // both low
  const avg = stats.avgTavg;
  let hint = "穏やか";
  if (avg < 12) hint = "やや涼しい";
  else if (avg > 24) hint = "暖かい";
  return { level: "low", primary: "neutral", hint };
}

function windHint(p50: number): string {
  if (p50 >= 6) return "強い風";
  if (p50 >= 4) return "やや強い";
  if (p50 >= 2.5) return "穏やか";
  return "ほぼ無風";
}

export function StatCards({ stats, scores }: Props) {
  const wetShare = 1 - stats.rainShare.none;
  const wetPct = Math.round(wetShare * 100);
  const tempRange = `${stats.tmaxDist.p25.toFixed(0)}–${stats.tmaxDist.p75.toFixed(0)}℃`;
  const tminRange = `${stats.tminDist.p25.toFixed(0)}–${stats.tminDist.p75.toFixed(0)}℃`;
  const windP50 = stats.windDist.p50;

  const tempRisk = pickTempRisk(stats, scores);
  const cards: {
    accent: keyof typeof ACCENT;
    label: string;
    value: string;
    sub: string;
    risk: RiskLevel;
  }[] = [
    {
      accent: "rain",
      label: "雨日割合",
      value: `${wetPct}%`,
      sub: `中〜大雨 ${Math.round((stats.rainShare.moderate + stats.rainShare.heavy) * 100)}%`,
      risk: scores.rain,
    },
    {
      accent: "temp",
      label: "気温帯（中央50%）",
      value: tempRange,
      sub: `最低 ${tminRange} · ${tempRisk.hint}`,
      risk: tempRisk.level,
    },
    {
      accent: "wind",
      label: "風速（中央値）",
      value: `${windP50.toFixed(1)} m/s`,
      sub: windHint(windP50),
      risk: scores.wind,
    },
  ];

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
    >
      {cards.map((c) => {
        const accent = ACCENT[c.accent];
        const risk = RISK_STYLE[c.risk];
        return (
          <div
            key={c.label}
            className="rounded-md bg-white p-3 ring-1 ring-stone-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-stone-600">{c.label}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: risk.bg, color: risk.text }}
              >
                {risk.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span
                className="font-mono text-2xl font-bold tabular-nums leading-none"
                style={{ color: accent.fg }}
              >
                {c.value}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
