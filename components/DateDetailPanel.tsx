import type { DiagnoseResult } from "@/lib/types";
import { HeroBlock } from "./HeroBlock";
import { RibbonBand } from "./charts/RibbonBand";
import { TempRibbonBand } from "./charts/TempRibbonBand";
import { StackedShareBar } from "./charts/StackedShareBar";
import { SamplesTable } from "./charts/SamplesTable";
import { StatCards } from "./charts/StatCards";

const WINDOW_DAYS = 7;
const WINDOW_TOTAL_DAYS = WINDOW_DAYS * 2 + 1;

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function DateDetailPanel({ result }: { result: DiagnoseResult }) {
  const { stats, scores, comment } = result;

  const tempBounds = [
    stats.tmaxDist.p10,
    stats.tmaxDist.p90,
    stats.tminDist.p10,
    stats.tminDist.p90,
    30,
    5,
  ];
  const tempDomain: [number, number] = [
    Math.floor(Math.min(...tempBounds) - 3),
    Math.ceil(Math.max(...tempBounds) + 3),
  ];
  const windHi = Math.max(8, Math.ceil(stats.windDist.p90 + 1));

  const missing = stats.expectedSampleDays - stats.n;

  return (
    <div className="space-y-4 bg-slate-50/60 p-4 sm:p-5">
      {/* ① ヒーロー（日付・スコア・コメント） */}
      <HeroBlock date={result.date} score={scores.total} comment={comment} />

      {/* ② 集計根拠バナー */}
      <p className="text-xs text-slate-500">
        集計根拠:{" "}
        <span className="font-mono tabular-nums text-slate-700">{stats.n}</span>{" "}
        観測日（30年 × 候補日±{WINDOW_DAYS}日 ={" "}
        <span className="font-mono tabular-nums text-slate-700">
          {stats.expectedSampleDays}
        </span>
        日中）
        {missing > 0 && (
          <span className="text-slate-400">／観測欠損 {missing}日</span>
        )}
        ／ 集計年: {stats.yearRange.start}–{stats.yearRange.end}
      </p>

      {/* ③ 要約カード */}
      <StatCards stats={stats} scores={scores} />

      {/* ④ 主役: 降水量の構成 */}
      <section className="relative overflow-hidden rounded-xl border-2 border-indigo-200 bg-white p-5 shadow-sm">
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-1 bg-indigo-500"
        />
        <header className="mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              主役
            </span>
            <h3 className="text-base font-semibold text-slate-900">
              降水量の構成
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            候補日±{WINDOW_DAYS}日窓の全観測日を、降水量で晴れ／小雨／雨／大雨に分類した内訳。
          </p>
        </header>
        <StackedShareBar
          share={stats.rainShare}
          totalDays={WINDOW_TOTAL_DAYS}
          sampleN={stats.n}
        />
      </section>

      {/* ⑤ 気温の分布 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            気温の分布（30年・±7日窓）
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            淡色＝典型範囲(P10–P90)／濃色＝中央50%(P25–P75)／縦線＝中央値(P50)
          </p>
        </header>
        <TempRibbonBand
          tmax={stats.tmaxDist}
          tmin={stats.tminDist}
          domain={tempDomain}
          thresholds={[
            { value: 30, label: "真夏日 30℃", color: "#ea580c" },
            { value: 5, label: "冷込 5℃", color: "#0284c7" },
          ]}
        />
      </section>

      {/* ⑥ 風速 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            風速の分布
          </h3>
        </header>
        <RibbonBand
          axis="wind"
          label="平均風速"
          unit="m/s"
          percentiles={stats.windDist}
          domain={[0, windHi]}
          thresholds={[
            { value: 4, label: "やや強い", color: "#7c3aed" },
            { value: 6, label: "強い", color: "#5b21b6" },
          ]}
        />
      </section>

      {/* ⑦ 数値で見る（折りたたみ） */}
      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50">
          <span>数値で見る（平均値）</span>
          <span
            aria-hidden="true"
            className="text-slate-400 transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="border-t border-slate-100 px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">平均最高</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.avgTmax.toFixed(1)}℃
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">平均最低</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.avgTmin.toFixed(1)}℃
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">平均日中</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.avgTavg.toFixed(1)}℃
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">湿度</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.avgHumidity != null
                  ? `${Math.round(stats.avgHumidity)}%`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">雨日割合</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {pct(stats.rainProb)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">大雨日割合</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {pct(stats.heavyRainProb)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">平均日照</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.avgSunshine.toFixed(1)}h
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">平均風速</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.avgWind.toFixed(1)} m/s
              </dd>
            </div>
          </dl>
        </div>
      </details>

      {/* ⑧ 全観測データ一覧（折りたたみ） */}
      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50">
          <span>全観測データ一覧（{stats.samples.length}件）</span>
          <span
            aria-hidden="true"
            className="text-slate-400 transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="border-t border-slate-100 px-5 py-4">
          <SamplesTable samples={stats.samples} yearRange={stats.yearRange} />
        </div>
      </details>
    </div>
  );
}
