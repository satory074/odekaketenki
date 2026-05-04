import { CandidateForm } from "@/components/CandidateForm";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          お出かけ天気ナビ
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          結婚式・旅行・前撮りなど、イベントの日取りに迷ったら。候補日と場所を入力すると、過去30年の同時期の天候から「雨・暑さ・寒さ・風」のリスクを比較できます。
        </p>
      </header>

      <CandidateForm />

      <footer className="mt-16 border-t border-stone-200 pt-6 text-xs text-stone-500">
        <p>
          天気データ:{" "}
          <a
            href="https://www.data.jma.go.jp/risk/obsdl/"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            気象庁
          </a>
          （データを加工して利用）／ 場所検索:{" "}
          <a
            href="https://open-meteo.com/"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Open-Meteo Geocoding
          </a>
        </p>
        <p className="mt-1">
          ※ 任意地点の入力を最寄りの観測地点に割り当てて集計しています。表示値は参考値です。
        </p>
        <p className="mt-1">
          ※ 集計範囲: 候補日±7日 × 過去30年（1995-2024）。分布バンドは P10–P90、太色帯は P25–P75、縦線は中央値。
        </p>
        <p className="mt-1">
          ※ 現在はデモ用の合成データで動作しています。気象庁の実データへの差し替えは <code className="rounded bg-stone-100 px-1">scripts/fetch_jma.py</code> による事前バッチで順次行います。
        </p>
      </footer>
    </div>
  );
}
