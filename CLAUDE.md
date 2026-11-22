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
node scripts/seo-check.mjs out https://satory074.github.io/odekaketenki/ --require-backlink  # ビルド後の SEO 不変条件 (deploy.yml でも実行)
```

本番と同じパスで確かめるときは `out/` を一時ディレクトリの `odekaketenki/` にコピーし、その親を `python3 -m http.server 3100` で配信して `http://localhost:3100/odekaketenki/` を開く。

### データインジェスト (Python uv, scripts/)
```bash
cd scripts
uv sync                                                      # 依存導入
uv run python -m fetch_jma --station tokyo --years 30        # 1地点取得 (~18分)
uv run python -m fetch_jma --all --years 30                  # 全 s1 159地点 (~1.6日、3秒+ジッタ レート制御)
uv run python -m build_dataset --all                         # キャッシュ→public/data/jma/
uv run python -m build_dataset --registry-only               # stations.json再生成のみ
uv run python -m discover_stations                            # JMA select ページから観測点を再スクレイプ
```

### 開発用合成データ生成 (Node)
```bash
node scripts/seed_dev_data.mjs   # stations.json にある全地点分の合成データを public/data/jma/ に書き出し
```
気象庁実データ取得前のデモ用。緯度ベースで気候を近似生成。**現状は s1 159地点とも実データに差し替え済み**なので新規地点追加時のフォールバック用。

## アーキテクチャ

```
[ユーザー入力 (場所文字列 → カレンダー上の日付クリック)]
        │
        ▼
[Next.js App Router (静的エクスポート)]
   └─ app/page.tsx
        └─ CandidateForm (use client) — 全状態のオーナー
             └─ AppShell
                  ├─ AppHeader (sticky)  ← SearchCombobox / 現在地 / 観測地点ボタンを slot 経由で
                  └─ <main>: Calendar + (デスクトップ) DateDetailPanel
                       + Sheet で StationPicker / (モバイル) DateDetailPanel
        │
        ▼
[lib/diagnose.ts]  ※ ブラウザで完結
   ├─ searchPlaces() → Open-Meteo Geocoding API 直叩き
   ├─ prepareLocation()  ※ 任意座標 → 最寄り観測点（geocoding 経由 / 現在地ボタン経由）
   │     ├─ findNearestStation()  → fetch /data/stations.json
   │     └─ loadStationData(id)   → fetch /data/jma/<id>.json
   ├─ prepareLocationFromStation(stationId)  ※ StationPicker 経由（最寄り計算をスキップ、distanceKm=0）
   └─ diagnoseDate()  ※ カレンダー上の日付クリックごと（同期・I/Oなし）
         ├─ aggregateAroundDate()     → 純粋関数で集計
         ├─ score()                   → 純粋関数でスコアリング
         └─ generateComment()         → ルールベース日本語コメント

[public/data/]
   ├─ stations.json       → 159地点のID/名前/緯度経度/都道府県 (s1 のみ)
   └─ jma/<id>.json       → 各地点の30年分日次データ (mm-dd → 年配列、約 450KB × 159 ≈ 70MB)
```

**完全クライアント側**：API ルートは存在しない（GitHub Pages 静的ホスティング向け）。Open-Meteo Geocoding はブラウザから CORS で直叩き。観測点データは `public/data/` から `fetch()`、ブラウザ内 `Map` でプロセス内キャッシュ。

### 観測地点ページ（`/stations/` と `/stations/<id>/`、検索・AI クローラー向けの静的ページ）

トップ（`/`）は場所を選ぶまで中身が出ないので、地点ごとの統計を **JS なしで読める HTML** として書き出している。
- `app/stations/[id]/page.tsx`（`generateStaticParams` + `dynamicParams = false`）が **ビルド時に `fs` で** `public/data/jma/<id>.json` を読み（`lib/station-pages.ts`）、`lib/station-summary.ts`（純粋関数）で要約した数字だけを描く。client component を置かないので、約 460KB の日別データは HTML にも RSC（`.txt`）にも載らない（1 ページ HTML 約 74KB・gzip 約 10KB）。
- 中身: 月別の表（雨の日 1mm 以上 / 大雨 30mm 以上 / 平均最高・最低 / 30℃以上・5℃以下の日 / 日照 / 風速 / アプリの総合スコアの月平均）、安定しやすい週・崩れやすい週（1 年 365 日それぞれにアプリと同じ `aggregateAroundDate`（±7 日）+ `score()` を回し、連続 7 日の平均で上位・下位を重ならないよう 3 つずつ。同点は雨の日の割合で順位付け）、近くの 5 地点（`haversineKm`）。閾値は `lib/aggregate.ts` から export したものを使い、アプリと数字が食い違わないようにしている。
- **2/29**: `aggregate.ts` は平年 2001 年で日付を計算するので、2/29 を選ぶと 3/1 の窓になる（アプリの既存挙動）。週の計算は平年の 365 日で回し、月別の表は 2 月の全観測日（うるう年の 2/29 も含む）を数える。
- **ページを作る地点**: 降水量と最高気温が 330 日以上そろった年が 20 年以上ある地点だけ（`MIN_FULL_YEARS`）。2026-11 時点で 159 地点中 154。作らないのは富士山 ×2（降水量を観測していない。山梨・静岡で同じ観測所が 2 件登録されている）、伊吹山・剣山（2001 年に観測終了）、阿蘇山（2017 年ごろまで）。アプリの地点ピッカーにはこれまでどおり全 159 地点が出る。
- **ビルドを止める不変条件**: 掲載地点の降水量の欠測率の中央値が 10% を超えたら throw する（`lib/station-pages.ts`）。気象庁の `--`（降水なし）を欠測として取り込む不具合（下の fetch_jma.py の項）が戻ると、雨の日の割合が約 2 倍のまま公開されるため。
- アプリへのリンクは `/?station=<id>`。`CandidateForm` がマウント後に `window.location` を読んで観測地点ボタンと同じ状態で始め、クエリは `history.replaceState` で消す（`useSearchParams` は静的書き出しで Suspense 境界が要るので使わない）。
- `<head>` は `lib/site.tsx` の `pageMetadata()`（canonical = og:url = 絶対 URL・末尾 `/`、OG 画像は共通の `og-image.png`）と `JsonLd`（トップ `WebSite`、一覧 `CollectionPage`、地点 `WebPage` + パンくず、author は `https://satory074.com/#person`）。`AppHeader` の h1 はトップだけで、地点ページ・一覧・404 は `titleAs="p"` にしてページ自身の h1 を持つ。
- `app/sitemap.ts` / `app/robots.ts`（`force-static`）。github.io のプロジェクトサイトなので、クローラーが読む robots.txt は `https://satory074.github.io/robots.txt`（別リポジトリ）の方。サイトマップの URL はそちらに書く。
- フッターの「集計範囲」の年は `next.config.ts` がデータから `NEXT_PUBLIC_DATA_YEARS` に入れる（以前は「1995–2024」と書いてあり、データの 1996–2025 とずれていた）。

### 主要ファイル索引

| ファイル | 役割 |
| --- | --- |
| `app/page.tsx` | エントリ。`CandidateForm` を読み込むだけ |
| `components/AppShell.tsx` | スティッキーヘッダー + メイン + フッターの全体シェル |
| `components/AppHeader.tsx` | sticky 上部ヘッダー。`searchSlot` / `placeBadge` / `actions` を受け取る |
| `components/CandidateForm.tsx` | 全状態の保持と AppShell へのプロップ供給 (`use client`) |
| `components/SearchCombobox.tsx` | 場所検索コンボボックス。AppHeader の `searchSlot` として注入 |
| `components/Sheet.tsx` | bottom-sheet/modal 兼用。StationPicker と詳細パネル（モバイル）に使用 |
| `components/Calendar.tsx` | 月次カレンダー。総合スコア色帯・雨日割合ミニバー・六曜ラベルをセルに重ねる (`use client`) |
| `components/StationPicker.tsx` | 地域タブ式の地点ピッカー。Sheet 内で表示 |
| `components/DateDetailPanel.tsx` | 単一日の詳細パネル。先頭に HeroBlock |
| `components/HeroBlock.tsx` | 日付・総合スコア（5xl）・コメント。emerald/amber/rose のグラデ背景 |
| `components/icons.tsx` | SVG アイコン群（依存ゼロ） |
| `components/charts/*` | 純 SVG プリミティブ（4種、依存ゼロ） |
| `lib/diagnose.ts` | 検索→地点準備→単日診断 (`diagnoseDate`) + 月内全日付一括集計 (`diagnoseMonth`) のクライアント側 API |
| `lib/aggregate.ts` | ±7日 × 30年の集計（純粋関数、I/Oなし） |
| `lib/scoring.ts` | 4軸リスク→`ScoreReport` への変換と総合スコア |
| `lib/comments.ts` | ルールベース日本語コメント生成 (`pickPrimary`) |
| `lib/stations.ts` / `lib/jma-data.ts` | `public/data/*` を fetch + module-level Map キャッシュ |
| `lib/recent-places.ts` | 最近選んだ場所の localStorage ラッパー |
| `lib/regions.ts` | `prefecture → Region`（6分類）の純データ |
| `lib/asset-path.ts` | `NEXT_PUBLIC_BASE_PATH` 前置ヘルパー |
| `lib/types.ts` | 共有型 (`Aggregated` / `ScoreReport` / `StationData` …) |
| `app/stations/[id]/page.tsx` / `app/stations/page.tsx` | 観測地点ページと一覧（ビルド時に静的生成） |
| `app/sitemap.ts` / `app/robots.ts` / `app/not-found.tsx` | サイトマップ・robots・404 |
| `lib/station-summary.ts` | 地点ページの要約（月別の表・良い週/悪い週。純粋関数） |
| `lib/station-pages.ts` | 地点ページのビルド時専用の読み込み（`fs`）・掲載地点の選別・不変条件 |
| `lib/site.tsx` | 公開 URL・`pageMetadata()`・`JsonLd`・作者 |
| `scripts/seo-check.mjs` | ビルド結果の SEO 不変条件の検査（原本は basecamp リポジトリ。中身は変えずにコピー） |
| `scripts/fetch_jma.py` | obsdl HTML 月次表のスクレイピング (uv) |
| `scripts/build_dataset.py` | `.cache/` → `public/data/jma/*.json` 変換 + `stations.json` 生成 |
| `scripts/discover_stations.py` | JMA select ページ巡回→地点レジストリ再構築 |
| `scripts/jma_stations.py` | `STATIONS` 159地点レジストリ（自動発見ブロック含む） |
| `scripts/seed_dev_data.mjs` | 緯度ベース合成データ生成（実データ未取得地点のフォールバック） |

## デプロイ

- 本番URL: **https://satory074.github.io/odekaketenki/**
- リポジトリ: https://github.com/satory074/odekaketenki

`.github/workflows/deploy.yml` が `main` push をトリガに `NEXT_PUBLIC_BASE_PATH=/odekaketenki npm run build` → `scripts/seo-check.mjs`（破ったら deploy しない）→ `actions/deploy-pages` で配信。ブランチの push では deploy は走らない。CSP は `app/layout.tsx` の `<meta http-equiv="Content-Security-Policy">` で実装（GitHub Pages はカスタムヘッダー不可のため）。Pages の Source は「GitHub Actions」を選択する設定（branch deploy ではない）。

## 可視化レイヤ

### 全体レイアウト
- **`components/AppShell.tsx` + `components/AppHeader.tsx`** — ページ全体のシェル。`AppHeader` は `position: sticky; top: 0; z-30` のスティッキーヘッダーで、`backdrop-blur` 付き半透明背景 (`bg-white/90`)。`searchSlot` / `placeBadge` / `actions` の3つの slot を受ける（`CandidateForm` から `SearchCombobox` / 現在地ボタン / 観測地点ボタンを注入）。h1（アプリ名）は header 内に1つだけ存在。`AppShell` が `<main id="main-content">` と `<footer>` も提供し、最大幅は `max-w-screen-2xl`、レスポンシブパディング `px-4 sm:px-6 lg:px-8`。
- **`components/CandidateForm.tsx`** — 全状態のオーナー (`use client`)。`useMatchMedia` 相当のロジックで `isDesktop`（≥ 1024px）を判定し、デスクトップは2カラム（左カレンダー / 右詳細パネル、`lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]`）、モバイルはカレンダー1列 + 日付選択で `Sheet` (bottom-sheet) が下から開く。
- **`components/Sheet.tsx`** — bottom-sheet/modal 兼用。`role="dialog" aria-modal="true"`、Esc で閉じる、背景クリックで閉じる、`body.style.overflow="hidden"` でページスクロール抑制、開閉時にフォーカスを管理。アニメーションは `globals.css` の `@keyframes odk-slide-up` / `odk-fade-in`、`prefers-reduced-motion` で自動短縮。

### 場所選択
- **`components/SearchCombobox.tsx`** — ARIA `combobox` 仕様準拠（`role="combobox"` / `aria-controls` / `aria-activedescendant` / ↑↓ Enter Esc 対応・マッチ部分太字・no-results メッセージ）。内部に query 状態、最近選んだ場所、debounce 検索、click-outside クローズ、`displayValue` プロップで外部選択（StationPicker / 現在地）と同期。Adjusting state during render パターンで外部変更時に内部 query を自動リセット（`useEffect` 同期 setState の lint 違反を回避）。
- **`components/StationPicker.tsx`** — 159地点を地域タブ（北海道・東北 / 関東 / 中部 / 近畿 / 中国・四国 / 九州・沖縄）でブラウズ。`Sheet` の中で表示されるため、`<details>` 折りたたみは廃止。地点ボタンのグリッドは `style={{ gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))" }}` を inline で指定（Tailwind の `grid-cols-N` 動的生成回避ルール準拠）。
- **`lib/regions.ts`** — `prefecture → Region` 対応の純データ（6地域分類）。
- **`lib/recent-places.ts`** — `localStorage` の薄いラッパー（`loadRecentPlaces` / `saveRecentPlace` / `clearRecentPlaces`）。SSR セーフ、quota エラーは `try/catch` で握りつぶす。

### カレンダーと詳細
- **`components/Calendar.tsx`** — 依存ゼロの月次カレンダー。`viewYear` / `viewMonth` / `onChangeView` を親から受ける純粋プレゼンテーション。7列グリッドは Tailwind `grid-cols-7` ではなく **inline `style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}`** で当てる。各セルに `monthData?.get(date)` から取り出した `{score, rainProb}` を**左色帯（emerald ≥75 / amber 50-74 / rose <50）と下端ミニ雨日バー（indigo, 雨日割合 × 100%）**として重ねる（CLAUDE.md 動的色は inline `style={{ backgroundColor }}` を使うルール準拠）。tap target 確保のため `min-h-12 sm:min-h-14`、月送り `‹` `›` は `h-10 w-10` の丸ボタン（`ChevronLeftIcon` / `ChevronRightIcon`）。`focus-visible:ring-2 focus-visible:ring-sky-500` を全インタラクティブ要素に統一。日付数字の直下に **六曜ラベル**（`text-[10px]`、大安=`text-rose-500 font-semibold` で強調・仏滅=`text-slate-400` で控えめ・他=`text-slate-500`、選択時は `text-white/80`）を表示。月外セルには六曜を出さない（視認性優先）。
- **`components/HeroBlock.tsx`** — `DateDetailPanel` の先頭ブロック。日付の日本語フォーマット（曜日付き）+ 総合スコア **`text-5xl sm:text-6xl font-bold tabular-nums`** + tier ラベル（emerald「比較的良好」/ amber「やや注意」/ rose「要注意」）+ コメント本文。背景は `bg-gradient-to-br` で tier 色（emerald-50 → emerald-100 等）。
- **`components/DateDetailPanel.tsx`** — 詳細パネル。**縦並びは重要度降順**（ヒーロー → 集計根拠 → 要約カード → 主役の降水量構成 → 気温分布 → 風速 → 折りたたみ詳細2つ）。主役の section は `border-2 border-indigo-200` + 左に `w-1 bg-indigo-500` の縦帯 + 「主役」バッジで意図的に強調。新しいセクションを追加する際もこの優先順位を維持し、主役（降水量の構成）を中央より下に押し下げないこと。
- **`components/charts/*`** — 依存ゼロの純 SVG / テーブルプリミティブ 4種:
  - `StatCards` (雨日割合・気温帯・風速帯の3カード要約。リスクピル付き)
  - `RibbonBand` (P10–P90帯 + P25–P75 濃色 + P50中央線。**P10/P50/P90 の数値直書き**＋軸ティック5〜7個＋閾値タグ。現状は風速のみで使用)
  - `TempRibbonBand` (最高気温・最低気温の P10–P90 / P25–P75 / P50 を**同一温度軸の上下2段**で描画。橙=最高・青=最低、真夏日30℃/冷込5℃の閾値破線は両バンドを縦断、軸ティックは共有)
  - `StackedShareBar` (晴れ/小雨/雨/大雨の100%スタック。`totalDays`/`sampleN` で日数換算を表示。h-12 とヘッドライン「X% が雨」付き)
  - `SamplesTable` (集計の根拠となる全観測日（最大450件）の HTML テーブル。`max-h-96 overflow-auto` + sticky header、年降順→オフセット昇順、候補日行は amber 背景、雨/大雨セルは indigo 強調、欠損は「—」)
- 配色は **heat=橙 / cold=青(`blue`) / rain=indigo / wind=violet/purple** で固定（赤緑コンフリクト回避）。**UI制御色は `sky`**（フォーカスリング・選択ハイライト・アクセントボタン）で、データの寒さ色（`blue`）と意図的に分離。総合スコアの帯背景のみ emerald/amber/rose（独立指標なので OK）。
- フォーカスリングは全インタラクティブ要素で `focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2` に統一（`globals.css` でグローバルにも `outline: 2px solid #0284c7` を予防的に適用）。`prefers-reduced-motion: reduce` 時は `globals.css` の `@media` で全アニメ・トランジションを 0.001ms に短縮。
- タイポグラフィの段階: ヒーロー数値 `text-5xl/6xl font-bold tabular-nums tracking-tight` → 見出し `text-base/lg font-semibold` → 小見出し `text-xs font-semibold uppercase tracking-wider text-slate-500` → 本文 `text-sm leading-relaxed text-slate-700` → 補足 `text-xs text-slate-500`。`text-[10px]` / `text-[11px]` の混在は廃止（`text-xs` で統一）。

## 重要な設計判断

### なぜ気象庁 obsdl を直接スクレイピングしているか
公式APIなし。obsdl の HTML 月次表（`daily_s1.php?prec_no=&block_no=&year=&month=`）をパースして CSV 相当の値を抽出。JMA は「サーバ高頻度アクセス禁止」を明記しているため、`fetch_jma.py` は **3秒+ジッタの間隔** とtenacityでの指数バックオフでレート制御。

### 観測地点の規模（s1 159地点）
気象台等 (s1, full data) **159地点**を `scripts/jma_stations.py` の `STATIONS` に登録（地方気象台 + 特別地域気象観測所 + 残存測候所）。`scripts/discover_stations.py` で JMA 都府県別 select ページの `viewPoint()` 呼び出しを巡回スクレイプして自動生成し、`kind="s1"` のみ採用。`fetch_jma.py` の HTML パーサは `<table id="tablefix1">` のヘッダー行を解釈して動的に column→field マッピングを構築（s1 / a1 共通実装、a1 用は将来拡張に備えて残置）。**初期 47地点（都道府県の地方気象台）は id・順序を維持**して後方互換を保ち、新規 112 地点は末尾に追加。データ量は実測 **約 70MB**（`du -sh public/data/jma`）で GitHub Pages 推奨内（100MB 以下）。

### なぜ ±7日を集計するか
特定の1日30サンプルだけだと外れ値の影響が大きい。±7日 × 30年 = 約450サンプルにすると、その時期の典型的な天候パターンが安定して見える。アドバイスメモ参照（"その日だけではなく±7日で見る"）。

### なぜルールベースコメントか
Gemini 等のLLM呼び出しは（1）コスト、（2）レイテンシ、（3）出力ぶれの3点でMVPに不向きと判断。閾値ベースの優先度ロジック（`lib/comments.ts` の `pickPrimary`）で、雨/暑さ/寒さ/風から最もリスクの高い1つを軸に1〜2文を組み立てる。

### なぜ六曜は Python 事前計算 + TS テーブル埋め込みか
六曜は旧暦の月と日から `(月+日)%6` で機械的に決まるが、肝心の **旧暦変換が天文計算依存**（朔・中気の正確な時刻が必要、閏月判定もある）。PyPI にも NPM にも信頼できる現役メンテのライブラリが見当たらず、`koyomi`(PyPI) は二十四節気のみ、`lunardate` は中国旧暦で日本暦と微妙にずれる。そこで `scripts/build_rokuyou.py` で Meeus 簡易公式（高野英資の qreki アルゴリズム流）を自前実装し、**2010–2060 の 51 年分を事前計算して `lib/rokuyou-table.ts` に 1 文字 1 日のエンコード文字列として埋め込む**（合計約 18KB、gzip 後 ~4KB）。ランタイムは O(1) の文字列インデックス参照のみで、`monthData` のような async fetch を増やさず Calendar の同期レンダーに収まる。検証は Wikipedia の (旧暦月+日)%6 → 0=大安・1=赤口・2=先勝・3=友引・4=先負・5=仏滅 公式に合致することと、複数年の旧暦元日が必ず「先勝」になることで担保。

## 非自明な実装ポイント

- **`lib/aggregate.ts`** — ±7日のキー計算は閏年を避けるため `2001` を基準年に固定して date math。集計結果は欠損値を除外して算術平均、`n` でサンプル数を返す。1パスのループで全集計を行うため、`tmaxDist` 等の percentile 計算用配列も同時に貯める。
- **`lib/types.ts` の `Aggregated`** — 平均値（`avgTmax` 等）の他に **チャート用フィールド**を多数保持:
  - `tmaxDist / tminDist / windDist` — `Percentiles` (P10/P25/P50/P75/P90)
  - `rainShare` — `{none, light, moderate, heavy}` の比率（晴れ <1mm, 小雨 1-10mm, 雨 10-30mm, 大雨 ≥30mm）
  - `samples` — `SampleRecord[]`（最大 15日 × 30年 ≒ 450件。集計の根拠となる生レコードを `null` 含めて保持。`SamplesTable` で表示）
  - `expectedSampleDays`、`yearRange`
  新しい集計を書く前に既存フィールドを確認すること。
- **`lib/scoring.ts`** — 各リスクの閾値（rain≥0.45, hot≥0.6 等）と重み（heat 0.9, cold 0.7, wind 0.5）はここに集約。総合スコアは「100 - ペナルティ合計」で 0–100 にクランプ。
- **`lib/comments.ts`** — `pickPrimary` で最もリスクの高い1要素を主軸に文を組み立てる。優先順は heat > cold > rain > wind（同レベル時）。湿度70%以上 + 暑さ高リスク時は別文を追加。
- **`lib/jma-data.ts` / `lib/stations.ts`** — `fetch()` ベースでブラウザから取得。モジュール内 `Map` でセッション内キャッシュ。`public/data/jma/*.json` を更新した場合はブラウザのリロードで反映。
- **`lib/diagnose.ts`** — クライアント側 API。`searchPlaces()` は Open-Meteo を直接叩く。`prepareLocation()` は場所決定時に観測点検索 + データ取得を1回だけ実行（I/Oあり、async）。`diagnoseDate()` はその後の日付クリックごとに集計 + スコアリング + コメント生成を同期で行う（純粋関数、I/Oなし）。
- **`lib/asset-path.ts`** — `NEXT_PUBLIC_BASE_PATH` を読んで `/data/...` 等の fetch URL に basePath を前置。GitHub Pages のサブパス対応用。
- **チャートの動的色 / 一部の grid 系クラスは inline `style` で当てる** — `StackedShareBar` / `StatCards` / `Calendar` のセル色帯・ミニバー等で軸別の色を切り替える際、Tailwind クラス文字列を `${var}-500` のように動的構築すると **Tailwind v3 JIT が検出できず未生成**になる（Turbopack 環境では safelist も効きが不安定）。SVG の `<rect>` 等も `className="fill-orange-100"` ではなく `fill={hex}` 属性を使う。**さらに、新規ファイルで初めて使う `grid-cols-N`（例: `grid-cols-7`）も同様に未生成になることがある**ので、その場合は `style={{ gridTemplateColumns: "repeat(N, minmax(0, 1fr))" }}` を使う（`Calendar.tsx` / `StationPicker.tsx` で実例）。固定の Tailwind クラス（テキスト・レイアウト・border 等）は普通に書いて OK。なお `tailwind.config.js` の `safelist` で `(bg|text|ring|border|fill|stroke|from|to)-(orange|sky|blue|indigo|violet|amber|emerald|rose|stone|slate)-(50..900)` を一括許可しており、データ駆動の固定パレットは概ね生成される。
- **`scripts/fetch_jma.py`** — JMA「サーバ高頻度アクセス禁止」遵守のため 3秒+ジッタ + 指数バックオフ。HTML月次表（`table#tablefix1`）を BeautifulSoup でパース。`_build_field_map()` がヘッダー行の rowspan/colspan を展開して動的に column→field マッピングを構築するため、s1 (synoptic, 4ヘッダー行 21+列) と a1 (AMeDAS, 3ヘッダー行 4-18列) の両方を共通ロジックで処理。`.cache/<station>/<year>-<mm>.html` にキャッシュし再開可能。`StationRef.kind` で `daily_s1.php` / `daily_a1.php` を切替。
  - **表の記号 (ハマりどころ)**: `--` は「該当現象なし」で**欠測ではない**。降水量の `--` は 0mm、2008 年ごろまでの日照時間の `--` は 0 時間なので、`_parse_value()` が `prcp` / `sunshine` に限って 0 にする (`-- )` `-- ]` も 0)。空欄・`///` は観測していない項目、`×` は欠測で、どちらも `null`。2026-11 まではこれを全部 `null` にしていて、雨の降らない日 (東京で年の約半分) が分母から消え、雨の日の割合が約 2 倍 (東京の年間 52% → 正しくは 28%)・年降水量も約 2 倍で出ていた。
  - **キャッシュだけで作り直す**: パーサを直したときは、気象庁にアクセスせず `.cache/<id>/*.html` を読み直して `raw.json` を書き、`build_dataset --all` を回す (`fetch_jma --all` はキャッシュに無い月だけ取りに行くので、キャッシュが揃っていれば同じ結果になる)。
- **`scripts/discover_stations.py`** — JMA 都府県別 select ページ（`prefecture.php?prec_no=<n>`）から `viewPoint('<kind>','<block_no>','<name>','<kana>',<lat_d>,<lat_m>,<lng_d>,<lng_m>,...)` JS呼び出しを正規表現抽出 → `pykakasi` で漢字→ローマ字（passport式: 東京→tokyo）スラグ生成 → `discover_output.py` に Python リテラルで吐き出して `jma_stations.STATIONS` にマージ。北海道（11–24）は14のサブ地域 prec_no を `北海道` に統合。重複スラグは `<slug>-<prec_no>-<block_no>` で disambiguate。再実行は `.cache/discover/` のキャッシュで爆速。
- **`scripts/seed_dev_data.mjs`** — 緯度ベースの簡易気候モデルで `public/data/stations.json` にある全地点（現状159）の合成データを生成。peak phase は `doy=215`（早August）に固定。実JMA取得後は上書きされる（**現状は s1 159地点とも実データに差し替え済み**）。
- **`scripts/build_rokuyou.py` / `lib/rokuyou.ts`** — 旧暦変換は Meeus 簡易公式で太陽・月の視黄経を求め、朔（黄経差 0）と中気（太陽黄経 30°刻み）を Newton 法で反復近似。`_build_lunar_year(year)` が冬至を含む朔を旧暦11月とし、その後の各朔について「中気を含むか」で月番号を決定（含まない月が閏月）。**ハマりどころ**: 太陽黄経の係数表で「t に比例する項」を識別するフラグ（koyomi.py の `sl[3]`）を移植する際、t 補正係数を `(t-1)*0.0200+1` のような別公式と混同すると太陽黄経が ~190° ずれる（実害テスト 2024-01-01 で 280° → 94° に化けた経緯あり）。正しい補正は `tflag=1` のとき `amp * t`、`tflag=0` のとき `amp`。六曜の数値→ラベル対応も罠で、旧暦1月1日 = (1+1)%6 = 2 が **先勝** にマップされる必要があるため `INDEX_TO_KEY = ["taian","shakkou","senshou","tomobiki","senbu","butsumetsu"]` の順（Wikipedia 公式と一致）。Meeus 簡易公式の精度は新月時刻 ±0.4 日程度で、JST 0:00 をまたぐ稀なケースでは月境界が 1 日ずれうるが、検算した範囲（2024–2026 旧暦元日 3 件）では国立天文台と一致。

## TypeScript / Lint 規約

- **strict mode** 有効。`any` は error。
- パスエイリアス: `@/*` → リポジトリルート。
- Next.js flat ESLint config。`react-hooks/set-state-in-effect` がデフォルト error なので、useEffect の中で同期 setState を呼ばないこと（debounce timer の中で呼ぶ等）。
- **静的エクスポート前提**: `app/api/` は使わない。ブラウザで動くアプリ側の `lib/*` は fetch ベースのまま保つ。例外は **ビルド時にだけ評価される** 地点ページ・サイトマップで、`lib/station-pages.ts` が `fs` で `public/data` を読む（`output: "export"` の静的生成で問題なく動く）。このファイルを client component から import しないこと。`use client` はインタラクション・状態管理が必要なもののみ（`CandidateForm` / `Calendar` / `Sheet` / `SearchCombobox` / `StationPicker`）。`DateDetailPanel` / `HeroBlock` / `AppShell` / `AppHeader` / `charts/*` / `icons` は静的レンダリング可能なまま保つ。

## テストスイート

`npm test` は無い。テストの件数は増やさず、壊れたら困る不変条件だけをビルドに置いている:
- `scripts/seo-check.mjs`（deploy.yml のビルド直後）: タイトル・説明文が重複しない / canonical = og:url = 自分の URL / サイトマップ = noindex でないページ / JSON-LD の作者 / サイト内リンクが実在
- `lib/station-pages.ts`: 降水量の欠測率の中央値が 10% 以下（気象庁の `--` の取り込みが壊れていない）

ほかは `npm run build`（型チェック）+ `npm run lint` + ブラウザ手動確認で行う。

## データソースとライセンス

- **気象庁オープンデータ**: 商用利用可。フッターに「気象庁データを加工して利用」のクレジットを表示。obsdlへの高頻度アクセスは禁止されているため、事前バッチ + キャッシュで運用。
- **Open-Meteo Geocoding API**: CC-BY 4.0。無料、APIキー不要、商用利用可。
- **六曜**: 旧暦変換のロジックは Meeus の天文公式（数式は public domain）を `scripts/build_rokuyou.py` に自前実装。六曜の (月+日)%6 公式は伝統暦で著作権なし。生成された `lib/rokuyou-table.ts` は本プロジェクトのソース扱い。

## 既知の制約

1. **アメダス (a1) 未対応** — `STATIONS` は s1 のみ（159地点、全て実データ取得済み）。観測項目が地点ごとに異なる a1 1519地点は `discover_stations.py` の出力には含まれるが `jma_stations.py` には取り込んでいない（湿度・日照欠落地点が大半で日取り判定に寄与しないため）。`fetch_jma.py` の a1 パーサは将来拡張用に残置。
2. **用途別スコアなし** — MVP汎用スコアのみ。結婚式/前撮り/キャンプ別の重み付けは未実装。
3. **±2週間ランキング未実装** — 候補日のピンポイント比較のみ。
4. **台風接近傾向データなし** — 別データソース要。
5. **観測所の移転を補正していない** — 気象庁の生の日別値をそのまま使っている（平年値のような移転補正なし）。例: 東京は 2014 年 12 月に大手町→北の丸公園へ移り、1 月の最低気温の平均が 2014 年以前は約 2.7℃、2015 年以降は約 1.9℃。地点ページの月別の値は両方を混ぜた平均。

## 拡張のヒント

- **新しい観測点追加（個別）**: `scripts/jma_stations.py` の `STATIONS` リストに追記 → `uv run python -m build_dataset --registry-only` で `stations.json` 再生成 → `fetch_jma.py --station <id>` で実データ取得 → `build_dataset.py --station <id>` でJSON生成。
- **JMA 全地点の自動発見と再取り込み**: `cd scripts && uv run python -m discover_stations` で `viewPoint()` を再スクレイプ → `discover_output.py` の **`kind="s1"` のみ**（または必要に応じて a1 も）を `jma_stations.py` の `DISCOVERED_BLOCK_START`/`END` 間に貼替。既存47件の id は `discover_stations.py` の dedup ロジックで保護される。
- **大量データ取得運用**: `cd scripts && nohup uv run python -m fetch_jma --all --years 30 > fetch.log 2>&1 &` でバックグラウンド実行（s1 159地点で ~1.6日、3秒+ジッタのレート制御）。中断時は同コマンドで再開可能（`.cache/<id>/YYYY-MM.html` 再利用）。完了後 `uv run python -m build_dataset --all` で per-station JSON 再生成。
- **AMeDAS (a1) 拡張**: 将来 a1 地点を追加する場合は `scripts/discover_output.py` の `kind="a1"` 行を `jma_stations.py` の `DISCOVERED_BLOCK_START`/`END` 間に追記し、`fetch_jma --all` 再実行。a1 パーサ (`_build_field_map`) は実装済み、地点ごとに観測項目が異なる点に注意（湿度・日照欠落あり、`scoring.ts` の閾値判定で偽陽性は回避済み）。

用途別スコア・台風接近データなど構想止まりの拡張は「既知の制約」を参照（実装ポインタが必要になった時点で本節に移す）。

## 更新運用

### 年次データ更新（自動 / GitHub Actions）
- `.github/workflows/refresh-jma-data.yml` が **毎年 2/7 00:00 UTC** に起動
- 前年分の追加 + 直近3ヶ月の後追い訂正再フェッチ
- `auto/refresh-jma-data` ブランチに PR が自動作成される → 内容確認後マージ → `deploy.yml` で本番反映
- 手動起動: GitHub Actions タブ → `Refresh JMA data (annual)` → Run workflow（`force_recent_months` で再取得月数を変更可能）
- 必要な GH 設定: Settings → Actions → General → ① Workflow permissions: **Read and write** ② **Allow GitHub Actions to create and approve pull requests** を有効化

### 観測地点リスト監査（四半期 / GitHub Actions）
- `.github/workflows/audit-stations.yml` が **1/1, 4/1, 7/1, 10/1 00:00 UTC** に起動
- `discover_stations.py --rebuild` で JMA select ページを再スクレイプ → `STATIONS` レジストリと s1 のみで差分比較
- 新設・廃止があれば Issue を自動作成（label `maintenance, jma-audit`）
- **コードは自動編集しない**。採否は人間判断（`discover_output.py` の取り込み → `jma_stations.py` 編集）

### 手動更新（緊急時 / Actions 障害時）
`refresh-local.sh` は `fetch_jma` → `build_dataset` を直近3ヶ月再フェッチ込みでまとめたショートカット（「主要コマンド」の個別呼び出しと同等）。

```bash
cd scripts && bash refresh-local.sh
# 完了後:
npm run lint && npm run build
git add public/data/jma scripts/jma_stations.py public/data/stations.json
git commit -m "JMA データ更新（手動）"
```
直近3ヶ月再フェッチがデフォルト。多めに取り直す場合は `FORCE_RECENT_MONTHS=12 bash scripts/refresh-local.sh`。
