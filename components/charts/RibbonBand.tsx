import type { Percentiles } from "@/lib/types";

type Props = {
  label: string;
  unit: string;
  percentiles: Percentiles;
  domain: [number, number];
  thresholds?: { value: number; label: string; color?: string }[];
  axis: "tmax" | "tmin" | "wind";
};

const AXIS_COLOR: Record<
  Props["axis"],
  { p10p90: string; p25p75: string; median: string }
> = {
  tmax: { p10p90: "#ffedd5", p25p75: "#fdba74", median: "#c2410c" }, // orange 100/300/700
  tmin: { p10p90: "#e0f2fe", p25p75: "#7dd3fc", median: "#0369a1" }, // sky 100/300/700
  wind: { p10p90: "#ede9fe", p25p75: "#c4b5fd", median: "#6d28d9" }, // violet 100/300/700
};

export function RibbonBand({ label, unit, percentiles, domain, thresholds, axis }: Props) {
  const [min, max] = domain;
  const range = Math.max(0.0001, max - min);
  const x = (v: number) => ((v - min) / range) * 100;

  const W = 100;
  const colors = AXIS_COLOR[axis];

  const ticks = [min, (min + max) / 2, max];

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="font-mono tabular-nums text-stone-500">
          {percentiles.p10.toFixed(1)}〜{percentiles.p90.toFixed(1)} {unit}
          <span className="ml-1 text-stone-400">(中央 {percentiles.p50.toFixed(1)})</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} 24`} className="w-full" preserveAspectRatio="none">
        <rect x="0" y="20" width={W} height="0.4" fill="#e7e5e4" />
        <rect
          x={x(percentiles.p10)}
          y="6"
          width={x(percentiles.p90) - x(percentiles.p10)}
          height="12"
          rx="2"
          fill={colors.p10p90}
        />
        <rect
          x={x(percentiles.p25)}
          y="6"
          width={x(percentiles.p75) - x(percentiles.p25)}
          height="12"
          rx="2"
          fill={colors.p25p75}
        />
        <line
          x1={x(percentiles.p50)}
          x2={x(percentiles.p50)}
          y1="4"
          y2="20"
          strokeWidth="0.6"
          stroke={colors.median}
        />
        {thresholds?.map((t) => {
          if (t.value < min || t.value > max) return null;
          return (
            <line
              key={t.label}
              x1={x(t.value)}
              x2={x(t.value)}
              y1="2"
              y2="22"
              strokeDasharray="1 1"
              strokeWidth="0.4"
              stroke={t.color ?? "#78716c"}
            />
          );
        })}
      </svg>
      <div className="flex justify-between font-mono text-[10px] tabular-nums text-stone-400">
        {ticks.map((t) => (
          <span key={t}>
            {t.toFixed(0)}
            {unit}
          </span>
        ))}
      </div>
    </div>
  );
}
