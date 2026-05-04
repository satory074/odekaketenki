# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## サービス概要

**お出かけ天気ナビ** — 結婚式・旅行・前撮りなどイベントの日取りを決めるとき、候補日の過去30年（同日±7日）の天気統計から「雨・暑さ・寒さ・風」リスクを比較できる Web アプリ。

差別化軸: 単なる過去天気検索ではなく、**「日程決定のためのリスク比較 + 日本語コメント」** に特化。

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
[ユーザー入力 (場所文字列 + 候補日)]
        │
        ▼
[Next.js App Router (静的エクスポート)]
   └─ app/page.tsx → CandidateForm (use client)
        │
        ▼
[lib/diagnose.ts]  ※ ブラウザで完結
   ├─ searchPlaces() → Open-Meteo Geocoding API 直叩き
   └─ diagnose()
        ├─ findNearestStation()      → fetch /data/stations.json
        ├─ loadStationData(id)       → fetch /data/jma/<id>.json
        ├─ aggregateAroundDate()     → 純粋関数で集計
        ├─ score()                   → 純粋関数でスコアリング
        └─ generateComment()         → ルールベース日本語コメント

[public/data/]
   ├─ stations.json       → 47地点のID/名前/緯度経度/都道府県
   └─ jma/<id>.json       → 各地点の30年分日次データ (mm-dd → 年配列)
```

**完全クライアント側**：API ルートは存在しない（GitHub Pages 静的ホスティング向け）。Open-Meteo Geocoding はブラウザから CORS で直叩き。観測点データは `public/data/` から `fetch()`、ブラウザ内 `Map` でプロセス内キャッシュ。

## デプロイ

GitHub Pages (`gh-pages` 環境)。`.github/workflows/deploy.yml` が `main` push をトリガに `NEXT_PUBLIC_BASE_PATH=/odekaketenki npm run build` → `actions/deploy-pages` で配信。CSP は `app/layout.tsx` の `<meta http-equiv="Content-Security-Policy">` で実装（GitHub Pages はカスタムヘッダー不可のため）。

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

- **`lib/aggregate.ts`** — ±7日のキー計算は閏年を避けるため `2001` を基準年に固定して date math。集計結果は欠損値を除外して算術平均、`n` でサンプル数を返す（UIで表示）。
- **`lib/scoring.ts`** — 各リスクの閾値（rain≥0.45, hot≥0.6 等）と重み（heat 0.9, cold 0.7, wind 0.5）はここに集約。総合スコアは「100 - ペナルティ合計」で 0–100 にクランプ。
- **`lib/comments.ts`** — `pickPrimary` で最もリスクの高い1要素を主軸に文を組み立てる。優先順は heat > cold > rain > wind（同レベル時）。湿度70%以上 + 暑さ高リスク時は別文を追加。
- **`lib/jma-data.ts` / `lib/stations.ts`** — `fetch()` ベースでブラウザから取得。モジュール内 `Map` でセッション内キャッシュ。`public/data/jma/*.json` を更新した場合はブラウザのリロードで反映。
- **`lib/diagnose.ts`** — クライアント側で diagnose と geocode を一箇所に集約。`searchPlaces()` は Open-Meteo を直接叩く。`diagnose()` は station 検索 → 集計 → コメントまでブラウザ内で完結。
- **`lib/asset-path.ts`** — `NEXT_PUBLIC_BASE_PATH` を読んで `/data/...` 等の fetch URL に basePath を前置。GitHub Pages のサブパス対応用。
- **`scripts/fetch_jma.py`** — JMA「サーバ高頻度アクセス禁止」遵守のため 3秒+ジッタ + 指数バックオフ。HTML月次表（`table#tablefix1`）を BeautifulSoup でカラムインデックス指定でパース。`.cache/<station>/<year>-<mm>.html` にキャッシュし再開可能。
- **`scripts/seed_dev_data.mjs`** — 緯度ベースの簡易気候モデルで全47地点の合成データを生成。peak phase は `doy=215`（早August）に固定。実JMA取得後は上書きされる。

## TypeScript / Lint 規約

- **strict mode** 有効。`any` は error。
- パスエイリアス: `@/*` → リポジトリルート。
- Next.js flat ESLint config。`react-hooks/set-state-in-effect` がデフォルト error なので、useEffect の中で同期 setState を呼ばないこと（debounce timer の中で呼ぶ等）。

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
