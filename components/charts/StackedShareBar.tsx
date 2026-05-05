import type { RainShare } from "@/lib/types";

type Props = {
  share: RainShare;
  /** ±N窓 × 30年 = 全観測「期待」日数（欠損含む）。表示用に概算日数を出すのに使う */
  totalDays?: number;
  /** 実観測日数（n）。指定された場合は totalDays より優先して使う */
  sampleN?: number;
};

const SEGMENTS: {
  key: keyof RainShare;
  label: string;
  bg: string;
  fg: string;
}[] = [
  { key: "none", label: "晴れ・曇り", bg: "#fef3c7", fg: "#92400e" },
  { key: "light", label: "小雨", bg: "#a5b4fc", fg: "#312e81" },
  { key: "moderate", label: "雨", bg: "#6366f1", fg: "#ffffff" },
  { key: "heavy", label: "大雨", bg: "#3730a3", fg: "#ffffff" },
];

const RANGE_TEXT: Record<keyof RainShare, string> = {
  none: "<1mm",
  light: "1〜10mm",
  moderate: "10〜30mm",
  heavy: "≥30mm",
};

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function StackedShareBar({ share, totalDays, sampleN }: Props) {
  const denominator = sampleN ?? totalDays ?? 0;
  const days = (s: number): number => Math.round(s * denominator);
  const wetShare = share.light + share.moderate + share.heavy;
  const wetDays = days(wetShare);

  return (
    <div className="space-y-3">
      {/* Headline */}
      {denominator > 0 && (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold tabular-nums text-indigo-700">
            {pct(wetShare)}
          </span>
          <span className="text-xs text-stone-600">
            の日が雨（<span className="font-mono tabular-nums">{denominator}日</span>中{" "}
            <span className="font-mono tabular-nums">{wetDays}日</span>）
          </span>
        </div>
      )}

      {/* Bar */}
      <div className="flex h-12 w-full overflow-hidden rounded-lg ring-1 ring-stone-200 shadow-inner">
        {SEGMENTS.map((s) => {
          const v = share[s.key];
          if (v <= 0) return null;
          const showInline = v >= 0.08;
          return (
            <div
              key={s.key}
              className="flex flex-col items-center justify-center text-[10px] font-medium leading-tight"
              style={{ width: `${v * 100}%`, backgroundColor: s.bg, color: s.fg }}
              title={`${s.label} (${RANGE_TEXT[s.key]}): ${pct(v)} / ${days(v)}日`}
            >
              {showInline && (
                <>
                  <span className="text-xs font-semibold">{pct(v)}</span>
                  {denominator > 0 && (
                    <span className="text-[9px] opacity-90">{days(v)}日</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-stone-700 sm:grid-cols-4">
        {SEGMENTS.map((s) => {
          const v = share[s.key];
          return (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: s.bg }}
              />
              <span className="flex flex-col leading-tight">
                <span>
                  {s.label}{" "}
                  <span className="text-stone-400">({RANGE_TEXT[s.key]})</span>
                </span>
                <span className="font-mono tabular-nums text-stone-600">
                  {pct(v)}
                  {denominator > 0 && (
                    <span className="text-stone-400"> · {days(v)}日</span>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
