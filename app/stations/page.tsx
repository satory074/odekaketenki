import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AUTHOR, absoluteUrl, JsonLd, pageMetadata, SITE_NAME, WEBSITE_ID } from "@/lib/site";
import { allStations, publishedStations, stationsByRegion } from "@/lib/station-pages";

const TITLE = "観測地点の一覧 — 気象庁の観測地点ごとの月別天気統計";

function description(count: number): string {
  return `お出かけ天気ナビで集計している気象庁の${count}の観測地点の一覧です。地点ごとに、過去30年の観測値から月別の雨の日の割合・平均気温・日照時間と、天気が安定しやすい週をまとめています。`;
}

export function generateMetadata() {
  return pageMetadata({
    title: `${TITLE}｜${SITE_NAME}`,
    description: description(publishedStations().length),
    path: "stations/",
    shareTitle: TITLE,
  });
}

export default function StationsIndexPage() {
  const groups = stationsByRegion();
  const count = publishedStations().length;
  const skipped = allStations().length - count;
  const url = absoluteUrl("stations/");

  return (
    <AppShell titleAs="p">
      <JsonLd
        data={{
          "@type": "CollectionPage",
          "@id": `${url}#webpage`,
          name: TITLE,
          url,
          description: description(count),
          inLanguage: "ja",
          isPartOf: { "@id": WEBSITE_ID },
          author: AUTHOR,
        }}
      />
      <article className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            観測地点の一覧（{count}地点）
          </h1>
          <p className="text-sm leading-relaxed text-slate-700">
            気象庁の気象台・特別地域気象観測所の日別の観測値（過去30年）から、地点ごとに月別の雨の日の割合・気温・日照時間と、天気が安定しやすい週・崩れやすい週をまとめています。
            候補日ごとの詳しい比較は
            <Link href="/" className="text-sky-700 underline underline-offset-2">
              トップのカレンダー
            </Link>
            から調べられます。
          </p>
          {skipped > 0 && (
            <p className="text-xs text-slate-500">
              降水量または気温の観測が20年分に満たない{skipped}地点（観測を終えた山の上の地点など）は、ページを作っていません。
            </p>
          )}
        </header>

        {groups.map(({ region, prefectures }) => (
          <section key={region} aria-labelledby={`region-${region}`} className="space-y-3">
            <h2 id={`region-${region}`} className="text-lg font-semibold text-slate-900">
              {region}
            </h2>
            <dl className="space-y-2">
              {prefectures.map(({ name, stations }) => (
                <div key={name} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                  <dt className="w-24 shrink-0 text-sm font-medium text-slate-500">{name}</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      {stations.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/stations/${s.id}/`}
                            className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </article>
    </AppShell>
  );
}
