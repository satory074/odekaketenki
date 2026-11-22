import Link from "next/link";
import { AppHeader } from "./AppHeader";

// 集計に使っている年。next.config.ts がデータ (public/data/jma) から入れるので、年次更新で自動的に変わる
const DATA_YEARS = process.env.NEXT_PUBLIC_DATA_YEARS ?? "";

type Props = {
  children: React.ReactNode;
  headerSearch?: React.ReactNode;
  headerPlaceBadge?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** AppHeader のアプリ名の要素 (ページ自身の h1 を持つページでは "p") */
  titleAs?: "h1" | "p";
};

export function AppShell({
  children,
  headerSearch,
  headerPlaceBadge,
  headerActions,
  titleAs,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        searchSlot={headerSearch}
        placeBadge={headerPlaceBadge}
        actions={headerActions}
        titleAs={titleAs}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      >
        {children}
      </main>
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-screen-2xl space-y-1 px-4 py-8 text-xs text-slate-500 sm:px-6 lg:px-8">
          <p>
            天気データ:{" "}
            <a
              href="https://www.data.jma.go.jp/risk/obsdl/"
              className="underline underline-offset-2 transition-colors hover:text-sky-700"
              target="_blank"
              rel="noreferrer"
            >
              気象庁
            </a>
            （データを加工して利用）／ 場所検索:{" "}
            <a
              href="https://open-meteo.com/"
              className="underline underline-offset-2 transition-colors hover:text-sky-700"
              target="_blank"
              rel="noreferrer"
            >
              Open-Meteo Geocoding
            </a>
          </p>
          <p>
            ※ 任意地点の入力を最寄りの観測地点に割り当てて集計しています。表示値は参考値です。
          </p>
          <p>
            ※ 集計範囲: 候補日±7日 × 過去30年（{DATA_YEARS}）。分布バンドは P10–P90、太色帯は P25–P75、縦線は中央値。
          </p>
          <p>
            <Link
              href="/stations/"
              className="underline underline-offset-2 transition-colors hover:text-sky-700"
            >
              観測地点ごとの月別の天気統計
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
