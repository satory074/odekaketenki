import { AppHeader } from "./AppHeader";

type Props = {
  children: React.ReactNode;
  headerSearch?: React.ReactNode;
  headerPlaceBadge?: React.ReactNode;
  headerActions?: React.ReactNode;
};

export function AppShell({
  children,
  headerSearch,
  headerPlaceBadge,
  headerActions,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        searchSlot={headerSearch}
        placeBadge={headerPlaceBadge}
        actions={headerActions}
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
            ※ 集計範囲: 候補日±7日 × 過去30年（1995–2024）。分布バンドは P10–P90、太色帯は P25–P75、縦線は中央値。
          </p>
        </div>
      </footer>
    </div>
  );
}
