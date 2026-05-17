import type { Percentiles } from "@/lib/types";

type Threshold = { value: number; label: string; color?: string };

type Props = {
  label: string;
  unit: string;
  percentiles: Percentiles;
  domain: [number, number];
  thresholds?: Threshold[];
  axis: "tmax" | "tmin" | "wind";
};

const AXIS_COLOR: Record<
  Props["axis"],
  { p10p90: string; p25p75: string; median: string; tickText: string }
> = {
  tmax: { p10p90: "#ffedd5", p25p75: "#fdba74", median: "#9a3412", tickText: "#7c2d12" },
  tmin: { p10p90: "#e0f2fe", p25p75: "#7dd3fc", median: "#075985", tickText: "#0c4a6e" },
  wind: { p10p90: "#ede9fe", p25p75: "#c4b5fd", median: "#5b21b6", tickText: "#4c1d95" },
};

function niceStep(range: number): number {
  if (range <= 0) return 1;
  const target = range / 5;
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100];
  for (const c of candidates) {
    if (c >= target) return c;
  }
  return 100;
}

function SeriesSwatch({ color }: { color: string }) {
  return (
    <svg width="10" height="10" aria-hidden className="inline-block shrink-0">
      <rect width="10" height="10" rx="2" fill={color} />
    </svg>
  );
}

function DashSwatch({ color }: { color: string }) {
  return (
    <svg width="14" height="6" aria-hidden className="inline-block shrink-0">
      <line x1="0" y1="3" x2="14" y2="3" stroke={color} strokeWidth="1.4" strokeDasharray="3 2" />
    </svg>
  );
}

function buildTicks(min: number, max: number): number[] {
  const step = niceStep(max - min);
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-6; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  if (ticks.length < 3) {
    return [min, (min + max) / 2, max];
  }
  return ticks;
}

export function RibbonBand({ label, unit, percentiles, domain, thresholds, axis }: Props) {
  const [min, max] = domain;
  const range = Math.max(0.0001, max - min);
  const x = (v: number) => ((v - min) / range) * 100;

  const W = 100;
  const H = 28;
  const colors = AXIS_COLOR[axis];
  const ticks = buildTicks(min, max);

  const bandTop = 4;
  const bandHeight = 12;
  const bandBottom = bandTop + bandHeight;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
          <SeriesSwatch color={colors.p25p75} />
          {label}
        </span>
        <span className="font-mono tabular-nums text-stone-500">
          {percentiles.p10.toFixed(1)}〜{percentiles.p90.toFixed(1)} {unit}
          <span className="ml-2 text-stone-600">
            中央 <span className="font-semibold">{percentiles.p50.toFixed(1)}</span>
          </span>
        </span>
      </div>
      {thresholds && thresholds.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] pt-0.5">
          {thresholds.map((t) => {
            const c = t.color ?? "#78716c";
            return (
              <span key={t.label} className="inline-flex items-center gap-1.5" style={{ color: c }}>
                <DashSwatch color={c} />
                <span className="font-medium">{t.label}</span>
              </span>
            );
          })}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {/* baseline */}
        <line x1="0" x2={W} y1={bandBottom + 2} y2={bandBottom + 2} stroke="#e7e5e4" strokeWidth="0.4" />
        {/* axis ticks (vertical lines + numeric labels) */}
        {ticks.map((t, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={bandBottom + 1.6}
              y2={bandBottom + 3.4}
              stroke="#a8a29e"
              strokeWidth="0.3"
            />
            <text
              x={x(t)}
              y={H - 0.6}
              textAnchor="middle"
              fontSize="3.4"
              fill="#a8a29e"
              fontFamily="ui-monospace, monospace"
            >
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {/* P10–P90 band */}
        <rect
          x={x(percentiles.p10)}
          y={bandTop}
          width={x(percentiles.p90) - x(percentiles.p10)}
          height={bandHeight}
          rx="1.5"
          fill={colors.p10p90}
        />
        {/* P25–P75 band */}
        <rect
          x={x(percentiles.p25)}
          y={bandTop}
          width={x(percentiles.p75) - x(percentiles.p25)}
          height={bandHeight}
          rx="1.5"
          fill={colors.p25p75}
        />
        {/* P50 median line */}
        <line
          x1={x(percentiles.p50)}
          x2={x(percentiles.p50)}
          y1={bandTop - 1.2}
          y2={bandBottom + 1.2}
          strokeWidth="0.7"
          stroke={colors.median}
        />
        {/* Thresholds: dashed line only (labels are rendered in the legend row above) */}
        {thresholds?.map((t) => {
          if (t.value < min || t.value > max) return null;
          const tx = x(t.value);
          const tagColor = t.color ?? "#78716c";
          return (
            <line
              key={t.label}
              x1={tx}
              x2={tx}
              y1={bandTop - 1}
              y2={bandBottom + 1.2}
              strokeDasharray="0.8 0.8"
              strokeWidth="0.4"
              stroke={tagColor}
            />
          );
        })}
      </svg>
    </div>
  );
}
