# CLAUDE.md — odekaketenki

このファイルは Claude Code がこのプロジェクトで作業する際のガイダンスを提供します。

## サービス概要

**お出かけ天気ナビ** — 結婚式・旅行・前撮りなどイベントの日取りを決めるとき、候補日の過去30年（同日±7日）の天気統計から「雨・暑さ・寒さ・風」リスクを比較できる Web アプリ。

差別化軸: 単なる過去天気検索ではなく、**「日程決定のためのリスク比較 + 日本語コメント」** に特化。

## 主要コマンド

### Web アプリ (Next.js)
```bash
npm run dev      # 開発サーバー (http://localhost:3000)
npm run build    # 本番ビルド (TypeScript型チェック含む)
npm run lint     # ESLint
npm run start    # 本番サーバー
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
[Next.js App Router]
   ├─ app/api/geocode    → Open-Meteo Geocoding API (JP限定)
   ├─ app/api/diagnose   → 最寄JMA観測点 → 集計 → スコア → コメント
   └─ app/page.tsx       → クライアントUI
        │
        ▼
[public/data/]
   ├─ stations.json       → 47地点のID/名前/緯度経度/都道府県
   └─ jma/<id>.json       → 各地点の30年分日次データ (mm-dd → 年配列)
```

データは「事前バッチで取得→静的JSON→runtime read-only」の流れ。リクエスト時に外部APIを叩くのは Open-Meteo Geocoding のみ（24h キャッシュ）。

## 重要な設計判断

### なぜ気象庁 obsdl を直接スクレイピングしているか
公式APIなし。obsdl の HTML 月次表（`daily_s1.php?prec_no=&block_no=&year=&month=`）をパースして CSV 相当の値を抽出。JMA は「サーバ高頻度アクセス禁止」を明記しているため、`fetch_jma.py` は **3秒+ジッタの間隔** とtenacityでの指数バックオフでレート制御。

### なぜ100地点ではなく47地点か
都道府県ごとに県庁所在地相当の地方気象台を1つずつ。日本全土をカバーしつつ、commit可能なリポジトリサイズ（合成データで14MB）に収まる。観測史実件数も多く欠損が少ない。将来的には観光地系AMeDAS（軽井沢、河口湖など）を追加予定。

### なぜ ±7日を集計するか
特定の1日30サンプルだけだと外れ値の影響が大きい。±7日 × 30年 = 約450サンプルにすると、その時期の典型的な天候パターンが安定して見える。アドバイスメモ参照（"その日だけではなく±7日で見る"）。

### なぜルールベースコメントか
Gemini 等のLLM呼び出しは（1）コスト、（2）レイテンシ、（3）出力ぶれの3点でMVPに不向きと判断。閾値ベースの優先度ロジック（`lib/comments.ts` の `pickPrimary`）で、雨/暑さ/寒さ/風から最もリスクの高い1つを軸に1〜2文を組み立てる。

## ファイル構成（重要箇所）

| パス | 役割 |
|---|---|
| `app/page.tsx` | ホームページ（フォーム + 結果表示） |
| `app/api/geocode/route.ts` | Open-Meteo Geocoding ラッパー |
| `app/api/diagnose/route.ts` | メインAPI（集計→スコア→コメント） |
| `lib/types.ts` | 共通型定義 (Station, StationData, Aggregated, ScoreReport) |
| `lib/aggregate.ts` | ±7日×30年の集計ロジック |
| `lib/scoring.ts` | リスク3段階判定 + 総合スコア（0-100） |
| `lib/comments.ts` | 日本語コメント生成（テンプレ + 優先度） |
| `lib/stations.ts` | 観測点レジストリ + ハバーサイン最近傍探索 |
| `lib/jma-data.ts` | 観測点JSONの読み込み（プロセス内キャッシュ） |
| `lib/geocode.ts` | Open-Meteo Geocoding クライアント |
| `scripts/jma_stations.py` | 47地点の prec_no/block_no/緯度経度レジストリ |
| `scripts/fetch_jma.py` | 気象庁HTMLダウンロード+パース（rate-limited） |
| `scripts/build_dataset.py` | 生CSV→アプリ用JSON変換 |
| `scripts/seed_dev_data.mjs` | デモ用合成データ生成（Node） |

## TypeScript / Lint 規約

- **strict mode** 有効。`any` は error。
- パスエイリアス: `@/*` → リポジトリルート。
- Next.js flat ESLint config。`react-hooks/set-state-in-effect` がデフォルト error なので、useEffect の中で同期 setState を呼ばないこと（debounce timer の中で呼ぶ等）。

## データソースとライセンス

- **気象庁オープンデータ**: 商用利用可。フッターに「気象庁データを加工して利用」のクレジットを表示。obsdlへの高頻度アクセスは禁止されているため、事前バッチ + キャッシュで運用。
- **Open-Meteo Geocoding API**: CC-BY 4.0。無料、APIキー不要、商用利用可。

## デプロイ

未設定。basecampと同様にAWS Amplify想定だが、Vercelでも動く（標準的なNext.js App Router構成）。

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
