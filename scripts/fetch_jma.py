"""Fetch monthly daily-value HTML pages from JMA and emit per-day records.

Usage:
    uv run python -m fetch_jma --station tokyo --years 30
    uv run python -m fetch_jma --all --years 30          # all stations in jma_stations.STATIONS

Output:
    .cache/<station_id>/<year>-<month>.html  (raw HTML, kept for re-parse)
    .cache/<station_id>/raw.json             (parsed daily records)

Notes:
    * The JMA stats site is for general public use; rate limiting is enforced via
      a 3-second sleep + jitter between requests, with exponential-backoff retries.
    * Run incrementally — the script skips months whose HTML is already cached.
    * Total volume per station: 30 years × 12 months = 360 requests ≈ 18 minutes.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

from jma_stations import STATIONS, StationRef, by_id

CACHE_DIR = Path(__file__).resolve().parent / ".cache"
SLEEP_SECONDS = 3.0
JITTER_SECONDS = 1.0
USER_AGENT = "odekaketenki-ingest/0.1 (+https://github.com/satory074/odekaketenki)"


def daily_url(station: StationRef, year: int, month: int) -> str:
    base = "https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php"
    if station.kind == "a1":
        base = "https://www.data.jma.go.jp/stats/etrn/view/daily_a1.php"
    return (
        f"{base}?prec_no={station.prec_no}&block_no={station.block_no}"
        f"&year={year}&month={month}&day=&view="
    )


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=2, min=4, max=60))
def fetch_month_html(client: httpx.Client, station: StationRef, year: int, month: int) -> str:
    url = daily_url(station, year, month)
    resp = client.get(url, timeout=30.0)
    resp.raise_for_status()
    return resp.text


def _parse_float(s: str) -> float | None:
    if s is None:
        return None
    s = s.strip().replace("\xa0", "")
    if s in ("", "--", "×", "///", ")"):
        return None
    # JMA marks suspect / preliminary values with trailing characters like ")", "]", "*"
    cleaned = "".join(c for c in s if c.isdigit() or c in ".-")
    if cleaned in ("", "-", "."):
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_month_table(html: str) -> dict[int, dict[str, float | None]]:
    """Return mapping {day -> {tmax, tmin, tavg, prcp, sunshine, wind, humidity}}."""
    soup = BeautifulSoup(html, "lxml")
    table = soup.select_one("table#tablefix1")
    if table is None:
        return {}
    rows = table.find_all("tr")
    out: dict[int, dict[str, float | None]] = {}
    for row in rows:
        cells = row.find_all(["td", "th"])
        if len(cells) < 12:
            continue
        try:
            day = int(cells[0].get_text(strip=True))
        except (ValueError, TypeError):
            continue
        # Column layout for daily_s1.php (verified 2026):
        #  0=day 1=気圧現地 2=気圧海面 3=降水量合計 4=降水量最大1h 5=降水量最大10min
        #  6=平均気温 7=最高気温 8=最低気温 9=平均湿度 10=最小湿度
        #  11=平均風速 12=最大風速 13=最大風速風向 14=最大瞬間風速 15=最大瞬間風向
        #  16=日照時間 17=降雪 ...
        out[day] = {
            "prcp": _parse_float(cells[3].get_text()),
            "tavg": _parse_float(cells[6].get_text()),
            "tmax": _parse_float(cells[7].get_text()),
            "tmin": _parse_float(cells[8].get_text()),
            "humidity": _parse_float(cells[9].get_text()) if len(cells) > 9 else None,
            "wind": _parse_float(cells[11].get_text()) if len(cells) > 11 else None,
            "sunshine": _parse_float(cells[16].get_text()) if len(cells) > 16 else None,
        }
    return out


def fetch_station(station: StationRef, years: int) -> None:
    end_year = date.today().year - 1
    start_year = end_year - years + 1
    station_dir = CACHE_DIR / station.id
    station_dir.mkdir(parents=True, exist_ok=True)
    parsed: dict[str, dict[str, dict[str, float | None]]] = {}

    months = [(y, m) for y in range(start_year, end_year + 1) for m in range(1, 13)]
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "ja"}
    with httpx.Client(headers=headers, follow_redirects=True) as client:
        for year, month in tqdm(months, desc=station.id):
            cache_path = station_dir / f"{year}-{month:02d}.html"
            if cache_path.exists():
                html = cache_path.read_text(encoding="utf-8")
            else:
                html = fetch_month_html(client, station, year, month)
                cache_path.write_text(html, encoding="utf-8")
                time.sleep(SLEEP_SECONDS + random.random() * JITTER_SECONDS)

            month_data = parse_month_table(html)
            for day, fields in month_data.items():
                key = f"{year}-{month:02d}-{day:02d}"
                parsed[key] = fields

    raw_path = station_dir / "raw.json"
    raw_path.write_text(json.dumps(parsed, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {raw_path} ({len(parsed)} days)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--station", help="station id (omit with --all)")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--years", type=int, default=30)
    args = parser.parse_args(argv)

    if args.all:
        targets = list(STATIONS)
    elif args.station:
        targets = [by_id(args.station)]
    else:
        parser.print_help()
        return 2

    for st in targets:
        try:
            fetch_station(st, args.years)
        except Exception as exc:
            print(f"FAILED {st.id}: {exc}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
