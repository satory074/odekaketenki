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
    * Both daily_s1.php (synoptic) and daily_a1.php (AMeDAS-only) are supported via
      a single header-aware parser. AMeDAS stations expose a subset of fields; missing
      fields are returned as None.
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
from bs4 import BeautifulSoup, Tag
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

from jma_stations import STATIONS, StationRef, by_id

CACHE_DIR = Path(__file__).resolve().parent / ".cache"
SLEEP_SECONDS = 3.0
JITTER_SECONDS = 1.0
USER_AGENT = "odekaketenki-ingest/0.1 (+https://github.com/satory074/odekaketenki)"

FIELDS = ("prcp", "tavg", "tmax", "tmin", "humidity", "wind", "sunshine")


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


def _build_field_map(table: Tag) -> dict[int, str]:
    """Walk the rowspan/colspan grid of header rows and return {col_index: field_name}.

    Works for both daily_s1.php (synoptic, 4 header rows, 21+ data cols) and
    daily_a1.php (AMeDAS, 3 header rows, 4–18 data cols). Returns columns
    that map to one of `FIELDS`. Missing fields simply don't appear in the map.
    """
    rows = table.find_all("tr")
    if not rows:
        return {}

    # Total columns determined from row 0 (top header) by summing colspans.
    first_cells = rows[0].find_all(["th", "td"])
    n_cols = sum(int(c.get("colspan", 1) or 1) for c in first_cells)
    if n_cols == 0:
        return {}

    grid: dict[tuple[int, int], str] = {}
    rowspan_remaining = [0] * n_cols  # how many MORE rows each col is still occupied
    rowspan_text = [""] * n_cols
    header_rows = 0

    for r_idx, row in enumerate(rows):
        cells = row.find_all(["th", "td"])
        first_text = cells[0].get_text(strip=True) if cells else ""
        if first_text.isdigit() and 1 <= int(first_text) <= 31:
            break
        cell_iter = iter(cells)
        c_idx = 0
        while c_idx < n_cols:
            if rowspan_remaining[c_idx] > 0:
                grid[(r_idx, c_idx)] = rowspan_text[c_idx]
                rowspan_remaining[c_idx] -= 1
                c_idx += 1
                continue
            try:
                cell = next(cell_iter)
            except StopIteration:
                break
            try:
                rs = int(cell.get("rowspan", 1) or 1)
                cs = int(cell.get("colspan", 1) or 1)
            except (TypeError, ValueError):
                rs, cs = 1, 1
            text = cell.get_text(" ", strip=True)
            for offset in range(cs):
                col = c_idx + offset
                if col < n_cols:
                    grid[(r_idx, col)] = text
                    if rs > 1:
                        rowspan_remaining[col] = rs - 1
                        rowspan_text[col] = text
            c_idx += cs
        header_rows = r_idx + 1

    if header_rows == 0:
        return {}

    field_map: dict[int, str] = {}
    for c in range(n_cols):
        chain = " | ".join(grid.get((r, c), "") for r in range(header_rows))
        if "降水量" in chain and "合計" in chain:
            field_map[c] = "prcp"
        elif "気温" in chain and "最高" in chain:
            field_map[c] = "tmax"
        elif "気温" in chain and "最低" in chain:
            field_map[c] = "tmin"
        elif "気温" in chain and "平均" in chain:
            field_map[c] = "tavg"
        elif "湿度" in chain and "平均" in chain:
            field_map[c] = "humidity"
        elif ("平均風速" in chain) or ("風速" in chain and "平均" in chain and "最大" not in chain):
            field_map[c] = "wind"
        elif "日照" in chain:
            field_map[c] = "sunshine"

    # Each field should appear at most once. If duplicates, keep the first.
    seen: set[str] = set()
    deduped: dict[int, str] = {}
    for c in sorted(field_map.keys()):
        f = field_map[c]
        if f not in seen:
            deduped[c] = f
            seen.add(f)
    return deduped


def parse_month_table(html: str) -> dict[int, dict[str, float | None]]:
    """Return mapping {day -> {tmax, tmin, tavg, prcp, sunshine, wind, humidity}}.

    Header-aware: works for both s1 (synoptic, full data) and a1 (AMeDAS, partial).
    Fields not measured at the station are returned as None.
    """
    soup = BeautifulSoup(html, "lxml")
    table = soup.select_one("table#tablefix1")
    if table is None:
        return {}

    field_map = _build_field_map(table)
    if not field_map:
        return {}

    rows = table.find_all("tr")
    out: dict[int, dict[str, float | None]] = {}
    for row in rows:
        cells = row.find_all(["td", "th"])
        if not cells:
            continue
        first_text = cells[0].get_text(strip=True)
        if not first_text.isdigit():
            continue
        try:
            day = int(first_text)
        except ValueError:
            continue
        if day < 1 or day > 31:
            continue
        record: dict[str, float | None] = {f: None for f in FIELDS}
        for col_idx, field in field_map.items():
            if col_idx < len(cells):
                record[field] = _parse_float(cells[col_idx].get_text())
        out[day] = record
    return out


def fetch_station(station: StationRef, years: int) -> None:
    end_year = date.today().year - 1
    start_year = end_year - years + 1
    station_dir = CACHE_DIR / station.id
    station_dir.mkdir(parents=True, exist_ok=True)
    parsed: dict[str, dict[str, float | None]] = {}

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
