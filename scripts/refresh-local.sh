#!/usr/bin/env bash
# Local manual refresh — JMA データを再取得して per-station JSON を再生成する
#
# 使い方:
#   bash scripts/refresh-local.sh           # 直近3ヶ月を再フェッチ
#   FORCE_RECENT_MONTHS=12 bash scripts/refresh-local.sh   # 直近12ヶ月を再フェッチ
#
# 完了後は手動で:
#   npm run lint && npm run build
#   git add public/data/jma scripts/jma_stations.py public/data/stations.json
#   git commit -m "JMA データ更新（手動）"

set -euo pipefail
cd "$(dirname "$0")"

FORCE_RECENT_MONTHS="${FORCE_RECENT_MONTHS:-3}"

echo "→ Dropping recent $FORCE_RECENT_MONTHS+1 months from cache..."
uv run python - <<PY
from datetime import date
from pathlib import Path

n = $FORCE_RECENT_MONTHS
today = date.today()
recent = set()
y, m = today.year, today.month
for _ in range(n + 1):
    recent.add((y, m))
    m -= 1
    if m == 0:
        y, m = y - 1, 12

dropped = 0
for f in Path(".cache").glob("*/*.html"):
    try:
        yy, mm = map(int, f.stem.split("-"))
    except ValueError:
        continue
    if (yy, mm) in recent:
        f.unlink()
        dropped += 1
print(f"dropped {dropped} stale HTML files")
PY

echo "→ Syncing Python deps..."
uv sync

echo "→ Fetching JMA observations (~hours depending on delta)..."
uv run python -m fetch_jma --all --years 30

echo "→ Building per-station JSON..."
uv run python -m build_dataset --all

cd ..
echo ""
echo "✅ Refresh done. Now run:"
echo "   npm run lint && npm run build"
echo "   git add public/data/jma scripts/jma_stations.py public/data/stations.json"
echo "   git commit -m 'JMA データ更新（手動）'"
