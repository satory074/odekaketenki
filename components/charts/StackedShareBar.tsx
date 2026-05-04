import type { RainShare } from "@/lib/types";

type Props = {
  share: RainShare;
};

const SEGMENTS: {
  key: keyof RainShare;
  label: string;
  bg: string;
  fg: string;
}[] = [
  { key: "none", label: "晴れ・曇り (<1mm)", bg: "#e7e5e4", fg: "#44403c" },
  { key: "light", label: "小雨 (1〜10mm)", bg: "#a5b4fc", fg: "#3730a3" },
  { key: "moderate", label: "雨 (10〜30mm)", bg: "#6366f1", fg: "#ffffff" },
  { key: "heavy", label: "大雨 (≥30mm)", bg: "#3730a3", fg: "#ffffff" },
];

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function StackedShareBar({ share }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex h-7 w-full overflow-hidden rounded-md ring-1 ring-stone-200">
        {SEGMENTS.map((s) => {
          const v = share[s.key];
          if (v <= 0) return null;
          return (
            <div
              key={s.key}
              className="flex items-center justify-center text-[10px] font-medium"
              style={{ width: `${v * 100}%`, backgroundColor: s.bg, color: s.fg }}
              title={`${s.label}: ${pct(v)}`}
            >
              {v >= 0.08 ? pct(v) : ""}
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-stone-600">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: s.bg }}
            />
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
