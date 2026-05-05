import type { YearOutcome } from "@/lib/types";

type Props = {
  data: YearOutcome[];
};

const COLOR = {
  normal: "#a5b4fc",
  high: "#3730a3",
  low: "#fde68a",
  median: "#78716c",
  axis: "#a8a29e",
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function YearBars({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-xs text-stone-500">データがありません。</p>;
  }
  const sorted = [...data].sort((a, b) => a.year - b.year);
  const rainDaysSorted = [...data].map((d) => d.rainDays).sort((a, b) => a - b);
  const max = Math.max(rainDaysSorted[rainDaysSorted.length - 1], 1);
  const median = quantile(rainDaysSorted, 0.5);
  const p25 = quantile(rainDaysSorted, 0.25);
  const p75 = quantile(rainDaysSorted, 0.75);

  const peak = data.reduce((a, b) => (b.rainDays > a.rainDays ? b : a));
  const trough = data.reduce((a, b) => (b.rainDays < a.rainDays ? b : a));

  const W = 320;
  const H = 90;
  const padL = 18;
  const padR = 6;
  const padTop = 10;
  const padBottom = 18;
  const innerW = W - padL - padR;
  const innerH = H - padTop - padBottom;
  const n = sorted.length;
  const slotW = innerW / n;
  const barW = Math.max(2, slotW - 1.6);

  const yOf = (v: number) => padTop + (1 - v / max) * innerH;

  const xLabelYears: number[] = [];
  for (const d of sorted) {
    if (d.year % 5 === 0) xLabelYears.push(d.year);
  }
  if (xLabelYears[0] !== sorted[0].year) xLabelYears.unshift(sorted[0].year);
  if (xLabelYears[xLabelYears.length - 1] !== sorted[n - 1].year) xLabelYears.push(sorted[n - 1].year);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y axis labels: 0 and max */}
        <text x={padL - 2} y={padTop + 3} fontSize="6.5" fill={COLOR.axis} textAnchor="end" fontFamily="ui-monospace, monospace">
          {max}日
        </text>
        <text x={padL - 2} y={padTop + innerH + 2} fontSize="6.5" fill={COLOR.axis} textAnchor="end" fontFamily="ui-monospace, monospace">
          0
        </text>
        {/* Median line */}
        <line
          x1={padL}
          x2={padL + innerW}
          y1={yOf(median)}
          y2={yOf(median)}
          stroke={COLOR.median}
          strokeDasharray="2 1.5"
          strokeWidth="0.6"
        />
        <text
          x={padL + innerW}
          y={yOf(median) - 1.6}
          textAnchor="end"
          fontSize="6"
          fill={COLOR.median}
          fontFamily="ui-monospace, monospace"
        >
          中央値 {median.toFixed(1)}日
        </text>
        {/* Bars */}
        {sorted.map((d, i) => {
          const x = padL + i * slotW + (slotW - barW) / 2;
          const y = yOf(d.rainDays);
          const h = padTop + innerH - y;
          let fill = COLOR.normal;
          if (d.rainDays >= p75) fill = COLOR.high;
          else if (d.rainDays <= p25) fill = COLOR.low;
          return (
            <rect key={d.year} x={x} y={y} width={barW} height={h} rx="0.8" fill={fill}>
              <title>
                {d.year}年 / 雨日 {d.rainDays}日 / 最大雨量 {d.maxPrcp.toFixed(0)}mm
              </title>
            </rect>
          );
        })}
        {/* X axis labels */}
        {xLabelYears.map((year) => {
          const i = sorted.findIndex((d) => d.year === year);
          if (i < 0) return null;
          const x = padL + i * slotW + slotW / 2;
          return (
            <text
              key={year}
              x={x}
              y={H - 4}
              textAnchor="middle"
              fontSize="6.5"
              fill={COLOR.axis}
              fontFamily="ui-monospace, monospace"
            >
              {String(year).slice(2)}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-stone-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR.high }} />
          雨が多かった年（上位25%）
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR.normal }} />
          通常
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR.low }} />
          雨が少なかった年（下位25%）
        </span>
      </div>
      <p className="text-[11px] text-stone-600">
        最多: <span className="font-mono tabular-nums">{peak.year}年 {peak.rainDays}日</span>
        <span className="mx-2 text-stone-400">/</span>
        最少: <span className="font-mono tabular-nums">{trough.year}年 {trough.rainDays}日</span>
      </p>
    </div>
  );
}
