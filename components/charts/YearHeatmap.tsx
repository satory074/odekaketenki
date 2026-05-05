import type { YearOutcome } from "@/lib/types";

type Props = {
  data: YearOutcome[];
  windowDays: number;
};

const SCALE = ["#f5f5f4", "#e0e7ff", "#a5b4fc", "#6366f1", "#3730a3", "#1e1b4b"];

function bucketIndex(rainDays: number, maxRainDays: number): number {
  if (maxRainDays <= 0 || rainDays <= 0) return 0;
  const t = rainDays / maxRainDays;
  if (t < 0.2) return 1;
  if (t < 0.4) return 2;
  if (t < 0.6) return 3;
  if (t < 0.8) return 4;
  return 5;
}

function rangeForBucket(i: number, maxRainDays: number): string {
  if (i === 0) return "0日";
  const lo = Math.max(1, Math.ceil((i - 1) * 0.2 * maxRainDays) + (i === 1 ? 0 : 0));
  const hi = Math.floor(i * 0.2 * maxRainDays);
  if (i === 5) return `${Math.ceil(0.8 * maxRainDays)}日+`;
  return `${lo}–${hi}日`;
}

export function YearHeatmap({ data, windowDays }: Props) {
  if (data.length === 0) {
    return <p className="text-xs text-stone-500">データがありません。</p>;
  }
  const expectedDays = windowDays * 2 + 1;
  const maxRainDays = Math.max(...data.map((d) => d.rainDays), 1);
  const sorted = [...data].sort((a, b) => a.year - b.year);
  const peakYear = sorted.reduce((a, b) => (b.rainDays > a.rainDays ? b : a));

  const cols = 10;
  const rows = Math.ceil(sorted.length / cols);
  const cellSize = 24;
  const gap = 4;
  const W = cols * cellSize + (cols - 1) * gap;
  const H = rows * (cellSize + gap) + 16;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-stone-500">
        ●1セル＝1年の±{windowDays}日窓 ({expectedDays}日中の雨日数)。
        最も雨が多かった年は黄枠で強調。
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMinYMin meet">
        {sorted.map((d, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const x = c * (cellSize + gap);
          const y = r * (cellSize + gap);
          const bucket = bucketIndex(d.rainDays, maxRainDays);
          const fill = SCALE[bucket];
          const isPeak = d.year === peakYear.year;
          const textFill = bucket >= 3 ? "#ffffff" : "#3730a3";
          return (
            <g key={d.year}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx="3"
                fill={fill}
                stroke={isPeak ? "#fbbf24" : "transparent"}
                strokeWidth={isPeak ? 2 : 0}
              >
                <title>
                  {d.year}年 / 雨日 {d.rainDays}日 / 最大雨量 {d.maxPrcp.toFixed(0)}mm /
                  平均最高 {d.tmaxMean.toFixed(1)}℃ / 平均最低 {d.tminMean.toFixed(1)}℃
                </title>
              </rect>
              <text
                x={x + cellSize / 2}
                y={y + cellSize / 2 - 1}
                textAnchor="middle"
                fontSize="7"
                fontWeight="700"
                fill={textFill}
                fontFamily="ui-monospace, monospace"
              >
                {d.rainDays}
              </text>
              <text
                x={x + cellSize / 2}
                y={y + cellSize - 2}
                textAnchor="middle"
                fontSize="5"
                fill={textFill}
                fontFamily="ui-monospace, monospace"
                opacity="0.7"
              >
                {String(d.year).slice(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-600">
        <span className="text-stone-500">凡例：</span>
        {SCALE.map((c, i) => (
          <span key={c} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-4 rounded-sm ring-1 ring-stone-200"
              style={{ backgroundColor: c }}
            />
            <span className="font-mono tabular-nums">{rangeForBucket(i, maxRainDays)}</span>
          </span>
        ))}
        <span className="ml-2 text-stone-500">最多: {peakYear.year}年 {peakYear.rainDays}日</span>
      </div>
    </div>
  );
}
