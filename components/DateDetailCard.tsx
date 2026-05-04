import type { DiagnoseResult } from "@/lib/types";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function DateDetailCard({ result }: { result: DiagnoseResult }) {
  const { date, stats, comment } = result;
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">{formatDate(date)}</h3>
        <span className="text-xs text-stone-500">
          サンプル数: {stats.n}日
        </span>
      </header>
      <p className="mb-3 text-sm leading-relaxed text-stone-700">{comment}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-stone-500">平均最高</dt>
          <dd className="font-medium">{stats.avgTmax.toFixed(1)}℃</dd>
        </div>
        <div>
          <dt className="text-stone-500">平均最低</dt>
          <dd className="font-medium">{stats.avgTmin.toFixed(1)}℃</dd>
        </div>
        <div>
          <dt className="text-stone-500">雨日割合</dt>
          <dd className="font-medium">{pct(stats.rainProb)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">大雨日割合</dt>
          <dd className="font-medium">{pct(stats.heavyRainProb)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">真夏日割合</dt>
          <dd className="font-medium">{pct(stats.hotDayProb)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">寒い日割合</dt>
          <dd className="font-medium">{pct(stats.coldDayProb)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">平均日照</dt>
          <dd className="font-medium">{stats.avgSunshine.toFixed(1)}h</dd>
        </div>
        <div>
          <dt className="text-stone-500">平均風速</dt>
          <dd className="font-medium">{stats.avgWind.toFixed(1)} m/s</dd>
        </div>
      </dl>
    </article>
  );
}
