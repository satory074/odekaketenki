import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { assetPath } from "@/lib/asset-path";
import { AUTHOR, absoluteUrl, JsonLd, pageMetadata, SITE_NAME, SITE_URL, WEBSITE_ID } from "@/lib/site";
import {
  findPublished,
  nearestStations,
  publishedStations,
  stationSummary,
} from "@/lib/station-pages";
import type { MonthRow, StationSummary, WeekRow } from "@/lib/station-summary";
import type { Station } from "@/lib/types";

// 観測地点ごとの静的ページ。ビルド時に fs で日別データを読み、要約の数字だけを HTML に描く。
// ブラウザでの再計算はしない (client component を置かない) ので、日別データは RSC にも載らない。

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedStations().map((s) => ({ id: s.id }));
}

type Params = { params: Promise<{ id: string }> };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const deg = (v: number) => `${v.toFixed(1)}℃`;

function dayLabel(md: string): string {
  const [m, d] = md.split("-").map(Number);
  return `${m}月${d}日`;
}

/** 掲載年の言い方。最後の年がデータの最新年なら「過去 N 年」、観測を終えた地点は年の範囲 */
function periodLabel(s: StationSummary, latestYear: number): string {
  const span = s.lastYear - s.firstYear + 1;
  return s.lastYear === latestYear ? `過去${span}年` : `${s.firstYear}〜${s.lastYear}年`;
}

function extreme(
  rows: MonthRow[],
  pick: (r: MonthRow) => number | null,
  dir: "max" | "min",
): { month: number; value: number } | null {
  let best: { month: number; value: number } | null = null;
  for (const r of rows) {
    const v = pick(r);
    if (v == null) continue;
    if (!best || (dir === "max" ? v > best.value : v < best.value)) best = { month: r.month, value: v };
  }
  return best;
}

/** 表から言える事実だけの短い要約 (説明文と本文の冒頭で使う) */
function highlights(name: string, s: StationSummary): string[] {
  const out: string[] = [];
  const wet = extreme(s.months, (r) => r.rainDays, "max");
  const dry = extreme(s.months, (r) => r.rainDays, "min");
  if (wet && dry) {
    out.push(
      `${name}で雨の日（日降水量1mm以上）の割合が最も高いのは${wet.month}月で${pct(wet.value)}、最も低いのは${dry.month}月で${pct(dry.value)}です。`,
    );
  }
  const hot = extreme(s.months, (r) => r.avgTmax, "max");
  const cold = extreme(s.months, (r) => r.avgTmin, "min");
  if (hot && cold) {
    out.push(
      `最高気温の平均が最も高いのは${hot.month}月（${deg(hot.value)}）、最低気温の平均が最も低いのは${cold.month}月（${deg(cold.value)}）です。`,
    );
  }
  return out;
}

function latestYear(): number {
  return Math.max(...publishedStations().map((s) => stationSummary(s).lastYear));
}

function titleOf(station: Station, s: StationSummary): string {
  return `${station.name}の天気 ${periodLabel(s, latestYear())}の月別統計`;
}

function descriptionOf(station: Station, s: StationSummary): string {
  const dry = extreme(s.months, (r) => r.rainDays, "min");
  const best = s.bestWeeks[0];
  return (
    `${station.name}（${station.prefecture}）の${s.firstYear}〜${s.lastYear}年の気象庁の観測値から、` +
    `月ごとの雨の日の割合・平均気温・日照時間と、天気が安定しやすい週をまとめました。` +
    (dry ? `雨の日が最も少ないのは${dry.month}月（${pct(dry.value)}）。` : "") +
    (best ? `安定しやすいのは${dayLabel(best.start)}〜${dayLabel(best.end)}ごろ。` : "")
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const station = findPublished(id);
  if (!station) return {};
  const s = stationSummary(station);
  return pageMetadata({
    title: `${titleOf(station, s)}｜${SITE_NAME}`,
    description: descriptionOf(station, s),
    path: `stations/${station.id}/`,
    shareTitle: titleOf(station, s),
  });
}

function scoreClass(v: number): string {
  if (v >= 75) return "text-emerald-700";
  if (v >= 50) return "text-amber-700";
  return "text-rose-700";
}

function Cell({ value, format }: { value: number | null; format: (v: number) => string }) {
  return (
    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
      {value == null ? <span className="text-slate-400">—</span> : format(value)}
    </td>
  );
}

function WeekList({ weeks }: { weeks: WeekRow[] }) {
  return (
    <ol className="space-y-1.5 text-sm text-slate-700">
      {weeks.map((w) => (
        <li key={w.start} className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-medium text-slate-900">
            {dayLabel(w.start)}〜{dayLabel(w.end)}
          </span>
          <span className="tabular-nums">
            スコア <span className={`font-semibold ${scoreClass(w.score)}`}>{Math.round(w.score)}</span>
          </span>
          <span className="tabular-nums text-slate-600">雨の日 {pct(w.rainDays)}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function StationPage({ params }: Params) {
  const { id } = await params;
  const station = findPublished(id);
  if (!station) notFound();
  const s = stationSummary(station);
  const near = nearestStations(station);
  const title = titleOf(station, s);
  const url = absoluteUrl(`stations/${station.id}/`);
  const years = `${s.firstYear}–${s.lastYear}年`;
  const appHref = assetPath(`/?station=${station.id}`);

  return (
    <AppShell titleAs="p">
      <JsonLd
        data={{
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          name: title,
          url,
          description: descriptionOf(station, s),
          inLanguage: "ja",
          isPartOf: { "@id": WEBSITE_ID },
          author: AUTHOR,
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "観測地点の一覧", item: absoluteUrl("stations/") },
              { "@type": "ListItem", position: 3, name: station.name, item: url },
            ],
          },
        }}
      />
      <article className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <nav aria-label="パンくずリスト" className="text-xs text-slate-500">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="underline underline-offset-2 hover:text-sky-700">
                  {SITE_NAME}
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link href="/stations/" className="underline underline-offset-2 hover:text-sky-700">
                  観測地点の一覧
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li aria-current="page">{station.name}</li>
            </ol>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          <p className="text-sm text-slate-600">
            {station.prefecture}・気象庁「{station.name}」の観測値（{years}、観測がそろった年は{s.fullYears}年分）の日別値から集計しました。
          </p>
          {highlights(station.name, s).map((t) => (
            <p key={t} className="text-sm leading-relaxed text-slate-700">
              {t}
            </p>
          ))}
          <p>
            <a
              href={appHref}
              className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              {station.name}で候補日を選んで調べる <span aria-hidden="true">→</span>
            </a>
          </p>
        </header>

        <section aria-labelledby="monthly" className="space-y-3">
          <h2 id="monthly" className="text-lg font-semibold text-slate-900">
            月別の天気（{years}）
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm text-slate-700">
              <caption className="sr-only">
                {station.name}の月別の雨の日の割合・気温・日照時間・風速・総合スコア
              </caption>
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left font-medium">月</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">雨の日</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">大雨の日</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">平均最高</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">平均最低</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">30℃以上</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">5℃以下</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">日照</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">風速</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">スコア</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.months.map((r) => (
                  <tr key={r.month}>
                    <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-slate-900">
                      {r.month}月
                    </th>
                    <Cell value={r.rainDays} format={pct} />
                    <Cell value={r.heavyRainDays} format={pct} />
                    <Cell value={r.avgTmax} format={deg} />
                    <Cell value={r.avgTmin} format={deg} />
                    <Cell value={r.hotDays} format={pct} />
                    <Cell value={r.coldDays} format={pct} />
                    <Cell value={r.sunshine} format={(v) => `${v.toFixed(1)}時間`} />
                    <Cell value={r.wind} format={(v) => `${v.toFixed(1)}m/s`} />
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                      {r.score == null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`font-semibold ${scoreClass(r.score)}`}>{Math.round(r.score)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-0.5 text-xs leading-relaxed text-slate-500">
            <li>雨の日: 日降水量 1mm 以上の日の割合。大雨の日: 30mm 以上。30℃以上: 最高気温、5℃以下: 最低気温がその値の日の割合。</li>
            <li>日照: 1日あたりの日照時間の平均。風速: 日平均風速の平均。「—」は観測値が約10年分に満たない項目。</li>
            <li>スコア: このアプリの総合スコア（0–100、雨・暑さ・寒さ・風のリスクから算出）を、その月の各日について出した平均。</li>
          </ul>
        </section>

        <section aria-labelledby="weeks" className="space-y-4">
          <h2 id="weeks" className="text-lg font-semibold text-slate-900">
            天気が安定しやすい週・崩れやすい週
          </h2>
          <p className="text-xs leading-relaxed text-slate-500">
            方法: 1年の各日についてアプリと同じ総合スコア（その日±7日 × {years}の観測から算出）を出し、連続する7日の平均が高い週・低い週を、重ならないように3つずつ選びました（同点は雨の日の割合で順位付け）。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <h3 className="text-sm font-semibold text-emerald-900">安定しやすい週</h3>
              <WeekList weeks={s.bestWeeks} />
              {s.bestComment && <p className="text-xs leading-relaxed text-slate-600">{s.bestComment}</p>}
            </div>
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
              <h3 className="text-sm font-semibold text-rose-900">崩れやすい週</h3>
              <WeekList weeks={s.worstWeeks} />
              {s.worstComment && <p className="text-xs leading-relaxed text-slate-600">{s.worstComment}</p>}
            </div>
          </div>
        </section>

        <section aria-labelledby="nearby" className="space-y-3">
          <h2 id="nearby" className="text-lg font-semibold text-slate-900">
            近くの観測地点
          </h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {near.map(({ station: n, distanceKm }) => (
              <li key={n.id}>
                <Link
                  href={`/stations/${n.id}/`}
                  className="inline-flex items-baseline gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                >
                  {n.name}
                  <span className="text-xs text-slate-500">
                    {n.prefecture}・約{Math.round(distanceKm)}km
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            <Link href="/stations/" className="text-sky-700 underline underline-offset-2">
              すべての観測地点を見る
            </Link>
          </p>
        </section>
      </article>
    </AppShell>
  );
}
