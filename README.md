# お出かけ天気ナビ (odekaketenki)

結婚式・旅行・前撮りなど、イベントの日取りを決めるときに、候補日の過去30年（同日±7日）の天候統計を比較できるWebアプリ。

「単なる過去天気検索」ではなく **「日程決定のためのリスク比較 + 日本語コメント」** に特化しています。

## 主な機能

- 場所のテキスト入力 → Open-Meteo Geocoding でジオコーディング
- 候補日（最大5件）を入力して比較
- 最寄りの気象庁観測地点（全47都道府県）から30年×±7日の統計を集計
- 雨/暑さ/寒さ/風の3段階リスク + 総合スコア（0-100）
- 日本語コメントでリスクの優先度を解説

## 起動

```bash
npm install
npm run dev          # http://localhost:3000
```

ビルドと型チェック:
```bash
npm run build
npm run lint
```

## データ更新（気象庁実データ取得）

初期状態では `public/data/jma/*.json` は緯度ベースの合成データです。実データに差し替えるには:

```bash
cd scripts
uv sync
uv run python -m fetch_jma --all --years 30      # 約14時間。3秒/リクエストでJMAをスクレイピング
uv run python -m build_dataset --all              # raw→公開JSON
```

詳細は [`CLAUDE.md`](./CLAUDE.md) を参照。

## 技術スタック

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v3
- データインジェスト: Python 3.12 + uv (httpx, beautifulsoup4, tenacity)
- データソース: 気象庁 obsdl (HTML) + Open-Meteo Geocoding

## ライセンス・クレジット

- 気象庁オープンデータを加工して利用 (https://www.data.jma.go.jp/risk/obsdl/)
- 場所検索: Open-Meteo Geocoding (CC-BY 4.0)
