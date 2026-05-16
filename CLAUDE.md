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
   └─ app/page.tsx → CandidateForm (use client) → Calendar / DateDetailPanel
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
   └─ jma/<id>.json       → 各地点の30年分日次データ (mm-dd → 年配列、約 320KB × 159 ≈ 70MB)
```

**完全クライアント側**：API ルートは存在しない（GitHub Pages 静的ホスティング向け）。Open-Meteo Geocoding はブラウザから CORS で直叩き。観測点データは `public/data/` から `fetch()`、ブラウザ内 `Map` でプロセス内キャッシュ。

## デプロイ

- 本番URL: **https://satory074.github.io/odekaketenki/**
- リポジトリ: https://github.com/satory074/odekaketenki

`.github/workflows/deploy.yml` が `main` push をトリガに `NEXT_PUBLIC_BASE_PATH=/odekaketenki npm run build` → `actions/deploy-pages` で配信。CSP は `app/layout.tsx` の `<meta http-equiv="Content-Security-Policy">` で実装（GitHub Pages はカスタムヘッダー不可のため）。Pages の Source は「GitHub Actions」を選択する設定（branch deploy ではない）。

## 可視化レイヤ

- **`components/CandidateForm.tsx`** — 場所検索・観測点先読み・カレンダー・詳細パネルのオーケストレータ。地点選択は ①検索コンボボックス（ARIA `role="combobox"` / `aria-activedescendant` / ↑↓ Enter Esc 対応・マッチ部分太字・`No results` メッセージ）②`📍 現在地` ボタン（`navigator.geolocation` 経由、許可拒否/タイムアウトのインラインエラー）③`StationPicker`（s1 全 159地点を地域別に直接） の3経路を提供。場所決定で `prepareLocation()` または `prepareLocationFromStation()` を `useEffect` で1度だけ呼び `LocationContext` として保持、`Calendar` の `onSelect` から `diagnoseDate()` を同期で叩いて単一日の詳細を表示。最近選んだ場所は `lib/recent-places.ts` 経由で localStorage に最大5件保存、検索ボックスフォーカス時にドロップダウン頭に表示。
- **`components/StationPicker.tsx`** — 159地点を地域タブ（北海道・東北 / 関東 / 中部 / 近畿 / 中国・四国 / 九州・沖縄）でブラウズできる折りたたみピッカー。`<details>` ベース・依存ゼロ。タブとボタンは `role="tab"` / `aria-selected` 付き、地点ボタンは `aria-label="<station>（<prefecture>）"`。地点ボタンのグリッドは `style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}` を inline で指定（Tailwind の `grid-cols-N` 動的生成回避ルール準拠）。
- **`lib/regions.ts`** — `prefecture → Region` 対応の純データ（6地域分類）。
- **`lib/recent-places.ts`** — `localStorage` の薄いラッパー（`loadRecentPlaces` / `saveRecentPlace` / `clearRecentPlaces`）。SSR セーフ、quota エラーは `try/catch` で握りつぶす。
- **`components/Calendar.tsx`** — 依存ゼロの月次カレンダー（外部ライブラリなし）。7列グリッドは Tailwind `grid-cols-7` ではなく **inline `style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}`** で当てる（Turbopack + Tailwind v3 で `grid-cols-7` が未生成になるため）。今日にリング、選択日に sky 塗り、日曜=赤系・土曜=青系。月送り `‹` `›`。
- **`components/DateDetailPanel.tsx`** — カレンダー直下に表示される詳細パネル。**縦並びは重要度降順**（コメント → 要約カード → サンプル数バナー → 主役の降水量構成 → 気温分布 → 風速 → 折りたたみ詳細）。末尾の `<details>` 2つ（平均値テーブル ／ 全観測データ一覧 `SamplesTable`）は補助情報。新しいセクションを追加する際もこの優先順位を維持し、主役（降水量の構成）を中央より下に押し下げないこと。
- **`components/charts/*`** — 依存ゼロの純 SVG / テーブルプリミティブ 5種:
  - `StatCards` (雨日割合・気温帯・風速帯の3カード要約。リスクピル付き)
  - `BarMeter` (横バー + 中/高リスク閾値ティック、現状未使用)
  - `RibbonBand` (P10–P90帯 + P25–P75 濃色 + P50中央線。**P10/P50/P90 の数値直書き**＋軸ティック5〜7個＋閾値タグ。現状は風速のみで使用)
  - `TempRibbonBand` (最高気温・最低気温の P10–P90 / P25–P75 / P50 を**同一温度軸の上下2段**で描画。橙=最高・青=最低、真夏日30℃/冷込5℃の閾値破線は両バンドを縦断、軸ティックは共有)
  - `StackedShareBar` (晴れ/小雨/雨/大雨の100%スタック。`totalDays`/`sampleN` で日数換算を表示。h-12 とヘッドライン「X% が雨」付き)
  - `SamplesTable` (集計の根拠となる全観測日（最大450件）の HTML テーブル。`max-h-96 overflow-auto` + sticky header、年降順→オフセット昇順、候補日行は amber 背景、雨/大雨セルは indigo 強調、欠損は「—」)
- 配色は **heat=橙 / cold=青 / rain=indigo / wind=紫** で固定（赤緑コンフリクト回避）。総合スコアの帯背景のみ emerald/amber/rose（独立指標なので OK）。

## 重要な設計判断

### なぜ気象庁 obsdl を直接スクレイピングしているか
公式APIなし。obsdl の HTML 月次表（`daily_s1.php?prec_no=&block_no=&year=&month=`）をパースして CSV 相当の値を抽出。JMA は「サーバ高頻度アクセス禁止」を明記しているため、`fetch_jma.py` は **3秒+ジッタの間隔** とtenacityでの指数バックオフでレート制御。

### 観測地点の規模（s1 159地点）
気象台等 (s1, full data) **159地点**を `scripts/jma_stations.py` の `STATIONS` に登録（地方気象台 + 特別地域気象観測所 + 残存測候所）。`scripts/discover_stations.py` で JMA 都府県別 select ページの `viewPoint()` 呼び出しを巡回スクレイプして自動生成し、`kind="s1"` のみ採用。`fetch_jma.py` の HTML パーサは `<table id="tablefix1">` のヘッダー行を解釈して動的に column→field マッピングを構築（s1 / a1 共通実装、a1 用は将来拡張に備えて残置）。**初期 47地点（都道府県の地方気象台）は id・順序を維持**して後方互換を保ち、新規 112 地点は末尾に追加。データ量は実測 **約 70MB**（`du -sh public/data/jma`）で GitHub Pages 推奨内（100MB 以下）。

### なぜ ±7日を集計するか
特定の1日30サンプルだけだと外れ値の影響が大きい。±7日 × 30年 = 約450サンプルにすると、その時期の典型的な天候パターンが安定して見える。アドバイスメモ参照（"その日だけではなく±7日で見る"）。

### なぜルールベースコメントか
Gemini 等のLLM呼び出しは（1）コスト、（2）レイテンシ、（3）出力ぶれの3点でMVPに不向きと判断。閾値ベースの優先度ロジック（`lib/comments.ts` の `pickPrimary`）で、雨/暑さ/寒さ/風から最もリスクの高い1つを軸に1〜2文を組み立てる。

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
- **`lib/diagnose.ts`** — クライアント側 API。`searchPlaces()` は Open-Meteo を直接叩く。`prepareLocation()` は場所決定時に観測点検索 + データ取得を1回だけ実行（I/Oあり、async）。`diagnoseDate()` はその後の日付クリックごとに集計 + スコアリング + コメント生成を同期で行う（純粋関数、I/Oなし）。`diagnose()` も互換のため残してあるが現状未使用。
- **`lib/asset-path.ts`** — `NEXT_PUBLIC_BASE_PATH` を読んで `/data/...` 等の fetch URL に basePath を前置。GitHub Pages のサブパス対応用。
- **チャートの動的色 / 一部の grid 系クラスは inline `style` で当てる** — `BarMeter` / `StackedShareBar` 等で軸別の色を切り替える際、Tailwind クラス文字列を `${var}-500` のように動的構築すると **Tailwind v3 JIT が検出できず未生成**になる（Turbopack 環境では safelist も効きが不安定だった）。SVG の `<rect>` 等も `className="fill-orange-100"` ではなく `fill={hex}` 属性を使う。**さらに、新規ファイルで初めて使う `grid-cols-N`（例: `grid-cols-7`）も同様に未生成になることがある**ので、その場合は `style={{ gridTemplateColumns: "repeat(N, minmax(0, 1fr))" }}` を使う（`Calendar.tsx` で実例）。固定の Tailwind クラス（テキスト・レイアウト・border 等）は普通に書いて OK。
- **`scripts/fetch_jma.py`** — JMA「サーバ高頻度アクセス禁止」遵守のため 3秒+ジッタ + 指数バックオフ。HTML月次表（`table#tablefix1`）を BeautifulSoup でパース。`_build_field_map()` がヘッダー行の rowspan/colspan を展開して動的に column→field マッピングを構築するため、s1 (synoptic, 4ヘッダー行 21+列) と a1 (AMeDAS, 3ヘッダー行 4-18列) の両方を共通ロジックで処理。`.cache/<station>/<year>-<mm>.html` にキャッシュし再開可能。`StationRef.kind` で `daily_s1.php` / `daily_a1.php` を切替。
- **`scripts/discover_stations.py`** — JMA 都府県別 select ページ（`prefecture.php?prec_no=<n>`）から `viewPoint('<kind>','<block_no>','<name>','<kana>',<lat_d>,<lat_m>,<lng_d>,<lng_m>,...)` JS呼び出しを正規表現抽出 → `pykakasi` で漢字→ローマ字（passport式: 東京→tokyo）スラグ生成 → `discover_output.py` に Python リテラルで吐き出して `jma_stations.STATIONS` にマージ。北海道（11–24）は14のサブ地域 prec_no を `北海道` に統合。重複スラグは `<slug>-<prec_no>-<block_no>` で disambiguate。再実行は `.cache/discover/` のキャッシュで爆速。
- **`scripts/seed_dev_data.mjs`** — 緯度ベースの簡易気候モデルで `public/data/stations.json` にある全地点（現状159）の合成データを生成。peak phase は `doy=215`（早August）に固定。実JMA取得後は上書きされる（**現状は s1 159地点とも実データに差し替え済み**）。スクリプト先頭コメントは 47地点時代のままだが、実挙動は stations.json の件数に追従。

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

1. **アメダス (a1) 未対応** — `STATIONS` は s1 のみ（159地点、全て実データ取得済み）。観測項目が地点ごとに異なる a1 1519地点は `discover_stations.py` の出力には含まれるが `jma_stations.py` には取り込んでいない（湿度・日照欠落地点が大半で日取り判定に寄与しないため）。`fetch_jma.py` の a1 パーサは将来拡張用に残置。
2. **用途別スコアなし** — MVP汎用スコアのみ。結婚式/前撮り/キャンプ別の重み付けは未実装。
3. **±2週間ランキング未実装** — 候補日のピンポイント比較のみ。
4. **台風接近傾向データなし** — 別データソース要。

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
```bash
cd scripts && bash refresh-local.sh
# 完了後:
npm run lint && npm run build
git add public/data/jma scripts/jma_stations.py public/data/stations.json
git commit -m "JMA データ更新（手動）"
```
直近3ヶ月再フェッチがデフォルト。多めに取り直す場合は `FORCE_RECENT_MONTHS=12 bash scripts/refresh-local.sh`。
