import type { DiagnoseResult } from "@/lib/types";
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
    <div className="space-y-4 border-t border-stone-100 bg-stone-50/50 p-4">
      {/* ① コメント */}
      <p className="text-sm leading-relaxed text-stone-700">{comment}</p>

      {/* ② 要約カード */}
      <StatCards stats={stats} scores={scores} />

      {/* ③ サンプル数バナー */}
      <p className="text-[11px] text-stone-500">
        集計根拠: <span className="font-mono tabular-nums">{stats.n}</span> 観測日
        （30年 × 候補日±{WINDOW_DAYS}日 = <span className="font-mono tabular-nums">{stats.expectedSampleDays}</span>日中）
        {missing > 0 && (
          <span className="text-stone-400">／観測欠損 {missing}日</span>
        )}
        ／ 集計年: {stats.yearRange.start}–{stats.yearRange.end}
      </p>

      {/* ④ 降水量の構成（メイン） */}
      <section className="space-y-3 rounded-md bg-white p-4 ring-1 ring-stone-200 shadow-sm">
        <div>
          <h4 className="text-sm font-semibold text-stone-800">降水量の構成</h4>
          <p className="text-[11px] text-stone-500">
            候補日±{WINDOW_DAYS}日窓の全観測日を、その日の降水量で晴れ／小雨／雨／大雨に分類した内訳。
          </p>
        </div>
        <StackedShareBar
          share={stats.rainShare}
          totalDays={WINDOW_TOTAL_DAYS}
          sampleN={stats.n}
        />
      </section>

      {/* ⑤ 気温の分布 */}
      <section className="space-y-3 rounded-md bg-white p-3 ring-1 ring-stone-200">
        <div>
          <h4 className="text-xs font-semibold text-stone-700">気温の分布（30年・±7日窓）</h4>
          <p className="text-[10px] text-stone-500">
            淡色＝典型範囲(P10–P90)／濃色＝中央50%(P25–P75)／縦線＝中央値(P50)
          </p>
        </div>
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
      <section className="space-y-2 rounded-md bg-white p-3 ring-1 ring-stone-200">
        <h4 className="text-xs font-semibold text-stone-700">風速の分布</h4>
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
      <details className="rounded-md bg-white p-3 ring-1 ring-stone-200">
        <summary className="cursor-pointer text-xs font-semibold text-stone-700">
          数値で見る（平均値）
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-stone-500">平均最高</dt>
            <dd className="font-medium">{stats.avgTmax.toFixed(1)}℃</dd>
          </div>
          <div>
            <dt className="text-stone-500">平均最低</dt>
            <dd className="font-medium">{stats.avgTmin.toFixed(1)}℃</dd>
          </div>
          <div>
            <dt className="text-stone-500">平均日中</dt>
            <dd className="font-medium">{stats.avgTavg.toFixed(1)}℃</dd>
          </div>
          <div>
            <dt className="text-stone-500">湿度</dt>
            <dd className="font-medium">
              {stats.avgHumidity != null ? `${Math.round(stats.avgHumidity)}%` : "—"}
            </dd>
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
            <dt className="text-stone-500">平均日照</dt>
            <dd className="font-medium">{stats.avgSunshine.toFixed(1)}h</dd>
          </div>
          <div>
            <dt className="text-stone-500">平均風速</dt>
            <dd className="font-medium">{stats.avgWind.toFixed(1)} m/s</dd>
          </div>
        </dl>
      </details>

      {/* ⑧ 全観測データ一覧（折りたたみ） */}
      <details className="rounded-md bg-white p-3 ring-1 ring-stone-200">
        <summary className="cursor-pointer text-xs font-semibold text-stone-700">
          全観測データ一覧（{stats.samples.length}件）
        </summary>
        <div className="mt-3">
          <SamplesTable samples={stats.samples} yearRange={stats.yearRange} />
        </div>
      </details>
    </div>
  );
}
