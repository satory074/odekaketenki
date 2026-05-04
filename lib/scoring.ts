import type { Aggregated, RiskLevel, ScoreReport } from "./types";

function level(value: number, midThreshold: number, highThreshold: number): RiskLevel {
  if (value >= highThreshold) return "high";
  if (value >= midThreshold) return "mid";
  return "low";
}

const LEVEL_PENALTY: Record<RiskLevel, number> = {
  low: 0,
  mid: 12,
  high: 28,
};

export function score(stats: Aggregated): ScoreReport {
  const rain: RiskLevel = level(stats.rainProb, 0.25, 0.45);
  const heat: RiskLevel = level(stats.hotDayProb, 0.3, 0.6);
  const cold: RiskLevel = level(stats.coldDayProb, 0.3, 0.6);
  const wind: RiskLevel = level(stats.avgWind, 4.0, 6.0);

  const heavyPenalty = stats.heavyRainProb >= 0.08 ? 6 : 0;

  const total = Math.max(
    0,
    Math.min(
      100,
      100 -
        LEVEL_PENALTY[rain] -
        LEVEL_PENALTY[heat] * 0.9 -
        LEVEL_PENALTY[cold] * 0.7 -
        LEVEL_PENALTY[wind] * 0.5 -
        heavyPenalty,
    ),
  );

  return {
    rain,
    heat,
    cold,
    wind,
    total: Math.round(total),
  };
}

export function levelLabel(lv: RiskLevel): string {
  return lv === "high" ? "高" : lv === "mid" ? "中" : "低";
}
