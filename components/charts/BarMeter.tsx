type Props = {
  value: number;
  max: number;
  thresholds?: { mid?: number; high?: number };
  label: string;
  valueLabel: string;
  axis: "rain" | "heat" | "cold" | "wind";
};

const AXIS_COLOR: Record<Props["axis"], { bar: string; track: string }> = {
  rain: { bar: "#6366f1", track: "#e0e7ff" },
  heat: { bar: "#f97316", track: "#ffedd5" },
  cold: { bar: "#0ea5e9", track: "#e0f2fe" },
  wind: { bar: "#8b5cf6", track: "#ede9fe" },
};

export function BarMeter({ value, max, thresholds, label, valueLabel, axis }: Props) {
  const safe = Math.max(0, Math.min(max, value));
  const pct = max > 0 ? (safe / max) * 100 : 0;
  const colors = AXIS_COLOR[axis];

  const midPct = thresholds?.mid != null ? (thresholds.mid / max) * 100 : null;
  const highPct = thresholds?.high != null ? (thresholds.high / max) * 100 : null;

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-10 shrink-0 text-stone-600">{label}</div>
      <div
        className="relative h-2.5 flex-1 rounded-full"
        style={{ backgroundColor: colors.track }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: colors.bar }}
        />
        {midPct != null && (
          <span
            aria-hidden
            className="absolute h-[14px] w-px"
            style={{ top: -2, left: `${midPct}%`, backgroundColor: "rgba(120,113,108,0.7)" }}
          />
        )}
        {highPct != null && (
          <span
            aria-hidden
            className="absolute h-[14px] w-px"
            style={{ top: -2, left: `${highPct}%`, backgroundColor: "#57534e" }}
          />
        )}
      </div>
      <div className="w-12 shrink-0 text-right font-mono tabular-nums text-stone-700">
        {valueLabel}
      </div>
    </div>
  );
}
