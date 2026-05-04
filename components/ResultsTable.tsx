import type { DiagnoseResponse } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}/${m}/${d}`;
}

function weekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()];
}

function scoreColor(total: number): string {
  if (total >= 80) return "text-green-700";
  if (total >= 60) return "text-amber-700";
  return "text-red-700";
}

export function ResultsTable({ data }: { data: DiagnoseResponse }) {
  return (
    <section className="mt-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">候補日比較</h2>
        <p className="text-xs text-stone-500">
          最寄観測地点: <strong>{data.station.name}</strong>
          <span className="text-stone-400"> ({data.station.prefecture})</span>
          <span className="ml-1">/ 距離 約{data.station.distanceKm}km</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">日付</th>
              <th className="px-3 py-2 text-center font-medium">雨</th>
              <th className="px-3 py-2 text-center font-medium">暑さ</th>
              <th className="px-3 py-2 text-center font-medium">寒さ</th>
              <th className="px-3 py-2 text-center font-medium">風</th>
              <th className="px-3 py-2 text-right font-medium">総合</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r) => (
              <tr key={r.date} className="border-t border-stone-100">
                <td className="px-3 py-2">
                  <div className="font-medium">{formatDate(r.date)}</div>
                  <div className="text-xs text-stone-500">
                    ({weekday(r.date)})
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <RiskBadge level={r.scores.rain} />
                </td>
                <td className="px-3 py-2 text-center">
                  <RiskBadge level={r.scores.heat} />
                </td>
                <td className="px-3 py-2 text-center">
                  <RiskBadge level={r.scores.cold} />
                </td>
                <td className="px-3 py-2 text-center">
                  <RiskBadge level={r.scores.wind} />
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`text-lg font-bold ${scoreColor(r.scores.total)}`}>
                    {r.scores.total}
                  </span>
                  <span className="text-xs text-stone-400">/100</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
