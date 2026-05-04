import type { YearOutcome } from "@/lib/types";

type Props = {
  data: YearOutcome[];
  windowDays: number;
};

const SCALE = ["#f5f5f4", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#6366f1", "#3730a3"];

function rainColor(rainDays: number, maxRainDays: number): string {
  if (maxRainDays <= 0) return SCALE[0];
  const t = Math.min(1, rainDays / maxRainDays);
  if (t === 0) return SCALE[0];
  if (t < 0.2) return SCALE[1];
  if (t < 0.4) return SCALE[2];
  if (t < 0.6) return SCALE[3];
  if (t < 0.8) return SCALE[4];
  return SCALE[5];
}

export function YearHeatmap({ data, windowDays }: Props) {
  if (data.length === 0) {
    return <p className="text-xs text-stone-500">データがありません。</p>;
  }
  const expectedDays = windowDays * 2 + 1;
  const maxRainDays = Math.max(...data.map((d) => d.rainDays), 1);
  const sorted = [...data].sort((a, b) => a.year - b.year);

  const cols = 10;
  const rows = Math.ceil(sorted.length / cols);
  const cellSize = 18;
  const gap = 3;
  const W = cols * cellSize + (cols - 1) * gap;
  const H = rows * cellSize + (rows - 1) * gap + 16;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-stone-500">
        ●1セル＝1年の±{windowDays}日窓 ({expectedDays}日中の雨日数で濃淡)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMinYMin meet">
        {sorted.map((d, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const x = c * (cellSize + gap);
          const y = r * (cellSize + gap);
          return (
            <g key={d.year}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx="2"
                fill={rainColor(d.rainDays, maxRainDays)}
              >
                <title>
                  {d.year}年 / 雨日 {d.rainDays}日 / 最大雨量 {d.maxPrcp.toFixed(0)}mm /
                  平均最高 {d.tmaxMean.toFixed(1)}℃ / 平均最低 {d.tminMean.toFixed(1)}℃
                </title>
              </rect>
              {(c === 0 || c === cols - 1) && (
                <text
                  x={x + cellSize / 2}
                  y={H - 4}
                  textAnchor="middle"
                  fill="#a8a29e"
                  fontFamily="ui-monospace, monospace"
                  fontSize="7"
                >
                  {String(d.year).slice(2)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-2 text-[10px] text-stone-500">
        <span>少ない</span>
        {SCALE.map((c) => (
          <span
            key={c}
            className="inline-block h-2 w-3 rounded-sm"
            style={{ backgroundColor: c }}
          />
        ))}
        <span>多い (max {maxRainDays}日)</span>
      </div>
    </div>
  );
}
