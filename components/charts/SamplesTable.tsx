import type { SampleRecord } from "@/lib/types";

type Props = {
  samples: SampleRecord[];
  yearRange: { start: number; end: number };
};

const RAIN_MM = 1.0;
const HEAVY_RAIN_MM = 30.0;

function fmtOffset(off: number): string {
  if (off === 0) return "±0";
  return off > 0 ? `+${off}` : `${off}`;
}

function fmtNum(v: number | null, digits: number, suffix = ""): string {
  if (v == null) return "";
  return `${v.toFixed(digits)}${suffix}`;
}

function NumCell({
  value,
  digits,
  suffix = "",
  className = "",
}: {
  value: number | null;
  digits: number;
  suffix?: string;
  className?: string;
}) {
  if (value == null) {
    return (
      <td className={`px-2 py-1 text-right text-stone-300 ${className}`}>—</td>
    );
  }
  return (
    <td className={`px-2 py-1 text-right font-mono tabular-nums ${className}`}>
      {fmtNum(value, digits, suffix)}
    </td>
  );
}

export function SamplesTable({ samples, yearRange }: Props) {
  const sorted = [...samples].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.offset - b.offset;
  });

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-stone-500">
        候補日 ± 7日 × {yearRange.start}–{yearRange.end}年 = 全
        <span className="font-mono tabular-nums"> {samples.length} </span>
        件（欠損も含む）
      </p>
      <div className="max-h-96 overflow-auto rounded border border-stone-200">
        <table className="min-w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 bg-stone-100 text-stone-600">
            <tr>
              <th className="px-2 py-1 text-left font-medium">年</th>
              <th className="px-2 py-1 text-left font-medium">月日</th>
              <th className="px-2 py-1 text-right font-medium">候補日比</th>
              <th className="px-2 py-1 text-right font-medium">最高(℃)</th>
              <th className="px-2 py-1 text-right font-medium">最低(℃)</th>
              <th className="px-2 py-1 text-right font-medium">平均(℃)</th>
              <th className="px-2 py-1 text-right font-medium">降水(mm)</th>
              <th className="px-2 py-1 text-right font-medium">日照(h)</th>
              <th className="px-2 py-1 text-right font-medium">風速(m/s)</th>
              <th className="px-2 py-1 text-right font-medium">湿度(%)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const isCandidate = s.offset === 0;
              const rainClass =
                s.prcp != null && s.prcp >= HEAVY_RAIN_MM
                  ? "text-indigo-800 font-bold"
                  : s.prcp != null && s.prcp >= RAIN_MM
                    ? "text-indigo-600 font-medium"
                    : "";
              const rowBg = isCandidate
                ? "bg-amber-50"
                : i % 2 === 0
                  ? "bg-white"
                  : "bg-stone-50/60";
              return (
                <tr
                  key={`${s.year}-${s.offset}`}
                  className={`${rowBg} border-t border-stone-100`}
                >
                  <td className="px-2 py-1 font-mono tabular-nums text-stone-700">
                    {s.year}
                  </td>
                  <td className="px-2 py-1 font-mono tabular-nums text-stone-600">
                    {s.monthDay}
                  </td>
                  <td
                    className={`px-2 py-1 text-right font-mono tabular-nums ${
                      isCandidate ? "font-semibold text-amber-700" : "text-stone-500"
                    }`}
                  >
                    {fmtOffset(s.offset)}
                  </td>
                  <NumCell value={s.tmax} digits={1} />
                  <NumCell value={s.tmin} digits={1} />
                  <NumCell value={s.tavg} digits={1} />
                  <NumCell value={s.prcp} digits={1} className={rainClass} />
                  <NumCell value={s.sunshine} digits={1} />
                  <NumCell value={s.wind} digits={1} />
                  <NumCell value={s.humidity} digits={0} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
