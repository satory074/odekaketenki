# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## サービス概要

**お出かけ天気ナビ** — 結婚式・旅行・前撮りなどイベントの日取りを決めるとき、候補日の過去30年（同日±7日）の天気統計から「雨・暑さ・寒さ・風」リスクを比較できる Web アプリ。

差別化軸: 単なる過去天気検索ではなく、**「日程決定のためのリスク比較 + 日本語コメント」** に特化。

**主役の可視化は「降水量の構成」**: 候補日±7日窓の全観測日を晴れ／小雨／雨／大雨の4区分に分類した内訳バー（`StackedShareBar`）で、`DateDetailPanel` の中で最も視覚的に大きい。新しいチャートを追加する際もこの主役を埋もれさせないこと。

## 主要コマンド

### Web アプリ (Next.js, 静的エクスポート)
```bash
npm run dev      # 開発サーバー (http://localhost:3000)
npm run build    # `output: "export"` で out/ に静的書き出し
npm run lint     # ESLint
NEXT_PUBLIC_BASE_PATH=/odekaketenki npm run build  # GitHub Pages 用 (/odekaketenki サブパス)
```

### データインジェスト (Python uv, scripts/)
```bash
cd scripts
uv sync                                                      # 依存導入
uv run python -m fetch_jma --station tokyo --years 30        # 1地点取得 (~18分)
uv run python -m fetch_jma --all --years 30                  # 全47地点 (~14時間)
uv run python -m build_dataset --all                         # キャッシュ→public/data/jma/
uv run python -m build_dataset --registry-only               # stations.json再生成のみ
```

### 開発用合成データ生成 (Node)
```bash
node scripts/seed_dev_data.mjs   # 47地点分の合成データを public/data/jma/ に書き出し
```
気象庁実データ取得前のデモ用。緯度ベースで気候を近似生成。実データ取得後は上書きされる。

## アーキテクチャ

```
[ユーザー入力 (場所文字列 → カレンダー上の日付クリック)]
        │
        ▼
[Next.js App Router (静的エクスポート)]
   └─ app/page.tsx → CandidateForm (use client) → Calendar / DateDetailPanel
        │
        ▼
[lib/diagnose.ts]  ※ ブラウザで完結
   ├─ searchPlaces() → Open-Meteo Geocoding API 直叩き
   ├─ prepareLocation()  ※ 場所選択時に1回だけ
   │     ├─ findNearestStation()  → fetch /data/stations.json
   │     └─ loadStationData(id)   → fetch /data/jma/<id>.json
   └─ diagnoseDate()  ※ カレンダー上の日付クリックごと（同期・I/Oなし）
         ├─ aggregateAroundDate()     → 純粋関数で集計
         ├─ score()                   → 純粋関数でスコアリング
         └─ generateComment()         → ルールベース日本語コメント

[public/data/]
   ├─ stations.json       → 47地点のID/名前/緯度経度/都道府県
   └─ jma/<id>.json       → 各地点の30年分日次データ (mm-dd → 年配列)
```

**完全クライアント側**：API ルートは存在しない（GitHub Pages 静的ホスティング向け）。Open-Meteo Geocoding はブラウザから CORS で直叩き。観測点データは `public/data/` から `fetch()`、ブラウザ内 `Map` でプロセス内キャッシュ。

## デプロイ

- 本番URL: **https://satory074.github.io/odekaketenki/**
- リポジトリ: https://github.com/satory074/odekaketenki

`.github/workflows/deploy.yml` が `main` push をトリガに `NEXT_PUBLIC_BASE_PATH=/odekaketenki npm run build` → `actions/deploy-pages` で配信。CSP は `app/layout.tsx` の `<meta http-equiv="Content-Security-Policy">` で実装（GitHub Pages はカスタムヘッダー不可のため）。Pages の Source は「GitHub Actions」を選択する設定（branch deploy ではない）。

## 可視化レイヤ

- **`components/CandidateForm.tsx`** — 場所検索・観測点先読み・カレンダー・詳細パネルのオーケストレータ。`prepareLocation()` を場所選択時の `useEffect` で1度だけ呼び、結果を `LocationContext` として保持。`Calendar` の `onSelect` から `diagnoseDate()` を同期で叩いて単一日の詳細を表示。複数日比較や送信ボタンは持たない。
- **`components/Calendar.tsx`** — 依存ゼロの月次カレンダー（外部ライブラリなし）。7列グリッドは Tailwind `grid-cols-7` ではなく **inline `style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}`** で当てる（Turbopack + Tailwind v3 で `grid-cols-7` が未生成になるため）。今日にリング、選択日に sky 塗り、日曜=赤系・土曜=青系。月送り `‹` `›`。
- **`components/DateDetailPanel.tsx`** — カレンダー直下に表示される詳細パネル。トップに要約カード3枚、続いてメインの「降水量の構成」、気温分布、年ごとの雨日数（俯瞰＋時系列バー）、±7日推移、風速分布を縦に並べ、末尾に `<details>` 2つ（平均値テーブル ／ 全観測データ一覧 `SamplesTable`）。サンプル数バナーは要約カード直下。
- **`components/charts/*`** — 依存ゼロの純 SVG / テーブルプリミティブ 8種:
  - `StatCards` (雨日割合・気温帯・風速帯の3カード要約。リスクピル付き)
  - `BarMeter` (横バー + 中/高リスク閾値ティック、現状未使用)
  - `RibbonBand` (P10–P90帯 + P25–P75 濃色 + P50中央線。**P10/P50/P90 の数値直書き**＋軸ティック5〜7個＋閾値タグ。気温/風速)
  - `StackedShareBar` (晴れ/小雨/雨/大雨の100%スタック。`totalDays`/`sampleN` で日数換算を表示。h-12 とヘッドライン「X% が雨」付き)
  - `YearHeatmap` (30年分のセル。**全セルに雨日数を直接表示**＋最多年に黄枠＋数値レンジ凡例)
  - `YearBars` (30年の雨日数を縦棒で時系列表示。中央値ライン、上位25%濃色、下位25%淡色、最多/最少年キャプション)
  - `OffsetSparkline` (±7日 tmax/tmin もしくは雨日割合。Y軸ラベル＋候補日に黄背景帯＋値ラベル)
  - `SamplesTable` (集計の根拠となる全観測日（最大450件）の HTML テーブル。`max-h-96 overflow-auto` + sticky header、年降順→オフセット昇順、候補日行は amber 背景、雨/大雨セルは indigo 強調、欠損は「—」)
- 配色は **heat=橙 / cold=青 / rain=indigo / wind=紫** で固定（赤緑コンフリクト回避）。総合スコアの帯背景のみ emerald/amber/rose（独立指標なので OK）。

## 重要な設計判断

### なぜ気象庁 obsdl を直接スクレイピングしているか
公式APIなし。obsdl の HTML 月次表（`daily_s1.php?prec_no=&block_no=&year=&month=`）をパースして CSV 相当の値を抽出。JMA は「サーバ高頻度アクセス禁止」を明記しているため、`fetch_jma.py` は **3秒+ジッタの間隔** とtenacityでの指数バックオフでレート制御。

### なぜ100地点ではなく47地点か
都道府県ごとに県庁所在地相当の地方気象台を1つずつ。日本全土をカバーしつつ、commit可能なリポジトリサイズ（合成データで14MB）に収まる。観測史実件数も多く欠損が少ない。将来的には観光地系AMeDAS（軽井沢、河口湖など）を追加予定。

### なぜ ±7日を集計するか
特定の1日30サンプルだけだと外れ値の影響が大きい。±7日 × 30年 = 約450サンプルにすると、その時期の典型的な天候パターンが安定して見える。アドバイスメモ参照（"その日だけではなく±7日で見る"）。

### なぜルールベースコメントか
Gemini 等のLLM呼び出しは（1）コスト、（2）レイテンシ、（3）出力ぶれの3点でMVPに不向きと判断。閾値ベースの優先度ロジック（`lib/comments.ts` の `pickPrimary`）で、雨/暑さ/寒さ/風から最もリスクの高い1つを軸に1〜2文を組み立てる。

## 非自明な実装ポイント

- **`lib/aggregate.ts`** — ±7日のキー計算は閏年を避けるため `2001` を基準年に固定して date math。集計結果は欠損値を除外して算術平均、`n` でサンプル数を返す。1パスのループで全集計を行うため、`tmaxDist` 等の percentile 計算用配列も同時に貯める。
- **`lib/types.ts` の `Aggregated`** — 平均値（`avgTmax` 等）の他に **チャート用フィールド**を多数保持:
  - `tmaxDist / tminDist / windDist` — `Percentiles` (P10/P25/P50/P75/P90)
  - `rainShare` — `{none, light, moderate, heavy}` の比率（晴れ <1mm, 小雨 1-10mm, 雨 10-30mm, 大雨 ≥30mm）
  - `byYear` — `YearOutcome[]`（30件、年次の雨日数・最大雨量・気温平均）
  - `byOffset` — `DailyOffset[]`（15件、-7..+7 オフセットの平均 tmax/tmin/rainProb）
  - `samples` — `SampleRecord[]`（最大 15日 × 30年 ≒ 450件。集計の根拠となる生レコードを `null` 含めて保持。`SamplesTable` で表示）
  - `expectedSampleDays`、`yearRange`
  新しい集計を書く前に既存フィールドを確認すること。
- **`lib/scoring.ts`** — 各リスクの閾値（rain≥0.45, hot≥0.6 等）と重み（heat 0.9, cold 0.7, wind 0.5）はここに集約。総合スコアは「100 - ペナルティ合計」で 0–100 にクランプ。
- **`lib/comments.ts`** — `pickPrimary` で最もリスクの高い1要素を主軸に文を組み立てる。優先順は heat > cold > rain > wind（同レベル時）。湿度70%以上 + 暑さ高リスク時は別文を追加。
- **`lib/jma-data.ts` / `lib/stations.ts`** — `fetch()` ベースでブラウザから取得。モジュール内 `Map` でセッション内キャッシュ。`public/data/jma/*.json` を更新した場合はブラウザのリロードで反映。
- **`lib/diagnose.ts`** — クライアント側 API。`searchPlaces()` は Open-Meteo を直接叩く。`prepareLocation()` は場所決定時に観測点検索 + データ取得を1回だけ実行（I/Oあり、async）。`diagnoseDate()` はその後の日付クリックごとに集計 + スコアリング + コメント生成を同期で行う（純粋関数、I/Oなし）。`diagnose()` も互換のため残してあるが現状未使用。
- **`lib/asset-path.ts`** — `NEXT_PUBLIC_BASE_PATH` を読んで `/data/...` 等の fetch URL に basePath を前置。GitHub Pages のサブパス対応用。
- **チャートの動的色 / 一部の grid 系クラスは inline `style` で当てる** — `BarMeter` / `StackedShareBar` 等で軸別の色を切り替える際、Tailwind クラス文字列を `${var}-500` のように動的構築すると **Tailwind v3 JIT が検出できず未生成**になる（Turbopack 環境では safelist も効きが不安定だった）。SVG の `<rect>` 等も `className="fill-orange-100"` ではなく `fill={hex}` 属性を使う。**さらに、新規ファイルで初めて使う `grid-cols-N`（例: `grid-cols-7`）も同様に未生成になることがある**ので、その場合は `style={{ gridTemplateColumns: "repeat(N, minmax(0, 1fr))" }}` を使う（`Calendar.tsx` で実例）。固定の Tailwind クラス（テキスト・レイアウト・border 等）は普通に書いて OK。
- **`scripts/fetch_jma.py`** — JMA「サーバ高頻度アクセス禁止」遵守のため 3秒+ジッタ + 指数バックオフ。HTML月次表（`table#tablefix1`）を BeautifulSoup でカラムインデックス指定でパース。`.cache/<station>/<year>-<mm>.html` にキャッシュし再開可能。
- **`scripts/seed_dev_data.mjs`** — 緯度ベースの簡易気候モデルで全47地点の合成データを生成。peak phase は `doy=215`（早August）に固定。実JMA取得後は上書きされる。

## TypeScript / Lint 規約

- **strict mode** 有効。`any` は error。
- パスエイリアス: `@/*` → リポジトリルート。
- Next.js flat ESLint config。`react-hooks/set-state-in-effect` がデフォルト error なので、useEffect の中で同期 setState を呼ばないこと（debounce timer の中で呼ぶ等）。
- **静的エクスポート前提**: `app/api/` は使わない。Server Component から `fs` を読むのも避け（`output: "export"` 時にエラー）、`lib/*` は全て fetch ベースのブラウザ実行可能コードにする。`use client` は `CandidateForm` と `Calendar` のみ、それ以外（`DateDetailPanel`、`charts/*`）は静的レンダリング可能なまま保つ。

## テストスイート

無し。`npm test` 等は未定義。検証は `npm run build`（型チェック）+ `npm run lint` + ブラウザ手動確認の3点で行う。

## データソースとライセンス

- **気象庁オープンデータ**: 商用利用可。フッターに「気象庁データを加工して利用」のクレジットを表示。obsdlへの高頻度アクセスは禁止されているため、事前バッチ + キャッシュで運用。
- **Open-Meteo Geocoding API**: CC-BY 4.0。無料、APIキー不要、商用利用可。

## 既知の制約

1. **データは合成データ**（2026-05時点）— `public/data/jma/*.json` は `seed_dev_data.mjs` 由来の合成値。実データへの差し替えは `fetch_jma.py --all` で。
2. **観測点47地点のみ** — 観光地特化のAMeDAS追加は将来課題。
3. **用途別スコアなし** — MVP汎用スコアのみ。結婚式/前撮り/キャンプ別の重み付けは未実装。
4. **±2週間ランキング未実装** — 候補日のピンポイント比較のみ。
5. **台風接近傾向データなし** — 別データソース要。

## 拡張のヒント

- **新しい観測点追加**: `scripts/jma_stations.py` の `STATIONS` リストに追記 → `uv run python -m build_dataset --registry-only` で `stations.json` 再生成 → `fetch_jma.py --station <id>` で実データ取得 → `build_dataset.py --station <id>` でJSON生成。
- **用途別スコア**: `lib/scoring.ts` に `score(stats, useCase: 'wedding' | ...)` のオーバーロード追加。重み係数を用途別に。
- **台風データ**: 気象庁の「台風経路図」CSVや別データソース（Best Track）を `scripts/fetch_typhoon.py` として追加し、月別接近確率を集計。
