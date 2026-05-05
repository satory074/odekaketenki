"""Discover all JMA observation stations (synoptic + AMeDAS) and emit a Python
literal compatible with `jma_stations.STATIONS`.

Strategy
--------
The JMA prefecture map page (`prefecture.php?prec_no=<n>`) embeds every
observation point as a `viewPoint('<kind>', '<block_no>', '<name>', '<kana>',
<lat_deg>, <lat_min>, <lng_deg>, <lng_min>, ...)` JavaScript call inside HTML
`<area>` onmouseover handlers. We harvest these for every prec_no listed on
`prefecture00.php` (excluding Antarctica), then convert kana → ASCII slugs
via pykakasi.

Output
------
- `scripts/discover_output.py` — Python literal of `list[StationRef]` ready
  to merge into `jma_stations.STATIONS`.
- `.cache/discover/raw.json` — intermediate JSON of all discovered stations
  (resumable; rerun without re-fetching cached pages).

Usage
-----
    cd scripts
    uv run python -m discover_stations               # full discovery (~3–10 min)
    uv run python -m discover_stations --rebuild     # force re-fetch all prefecture pages

The script respects JMA rate limits (3s sleep + jitter between requests).
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
from pathlib import Path

import httpx
import pykakasi
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

from jma_stations import STATIONS as EXISTING_STATIONS

CACHE_DIR = Path(__file__).resolve().parent / ".cache" / "discover"
SLEEP_SECONDS = 3.0
JITTER_SECONDS = 1.0
USER_AGENT = "odekaketenki-ingest/0.1 (+https://github.com/satory074/odekaketenki)"

PREFECTURE00_URL = (
    "https://www.data.jma.go.jp/obd/stats/etrn/select/prefecture00.php"
)
PREFECTURE_URL_FMT = (
    "https://www.data.jma.go.jp/obd/stats/etrn/select/prefecture.php?prec_no={prec_no}"
)

# Hokkaido is split across 14 sub-regional prec_no codes (11–24, excluding gaps).
# Map them all to prefecture="北海道" so the front-end region grouping stays clean.
HOKKAIDO_PREC_NOS = {11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24}

# Map prec_no → prefecture name (Japanese, with 県/府/都) for non-Hokkaido entries.
# Pulled from prefecture00.php; static so we never need to re-derive at runtime.
PREFECTURE_NAME: dict[int, str] = {
    31: "青森県", 32: "秋田県", 33: "岩手県", 34: "宮城県",
    35: "山形県", 36: "福島県",
    40: "茨城県", 41: "栃木県", 42: "群馬県", 43: "埼玉県",
    44: "東京都", 45: "千葉県", 46: "神奈川県",
    48: "長野県", 49: "山梨県", 50: "静岡県", 51: "愛知県",
    52: "岐阜県", 53: "三重県",
    54: "新潟県", 55: "富山県", 56: "石川県", 57: "福井県",
    60: "滋賀県", 61: "京都府", 62: "大阪府", 63: "兵庫県",
    64: "奈良県", 65: "和歌山県",
    66: "岡山県", 67: "広島県", 68: "島根県", 69: "鳥取県",
    71: "徳島県", 72: "香川県", 73: "愛媛県", 74: "高知県",
    81: "山口県",
    82: "福岡県", 83: "大分県", 84: "長崎県", 85: "佐賀県",
    86: "熊本県", 87: "宮崎県", 88: "鹿児島県",
    91: "沖縄県",
}

VIEWPOINT_RE = re.compile(
    r"viewPoint\("
    r"'([as])',"  # kind
    r"'(\d+)',"  # block_no
    r"'([^']*)',"  # name (kanji/kana mix)
    r"'([^']*)',"  # kana (katakana)
    r"'(\d+)',"  # lat deg
    r"'([\d.]+)',"  # lat min
    r"'(\d+)',"  # lng deg
    r"'([\d.]+)'",  # lng min
)


def _kakasi_converter() -> pykakasi.kakasi:
    return pykakasi.kakasi()


def name_to_slug(name: str, kakasi: pykakasi.kakasi) -> str:
    """Convert mixed kanji/kana name to lowercase ASCII passport-style slug.

    Uses pykakasi's "passport" field which simplifies long vowels (e.g.
    "東京" → "tokyo" not "toukyou", "大阪" → "osaka" not "oosaka"). This
    matches the style of existing curated 47-station slugs.
    """
    if not name:
        return ""
    parts = kakasi.convert(name)
    text = "".join(p.get("passport", p.get("hepburn", "")) for p in parts).lower()
    text = re.sub(r"[^a-z]", "", text)
    return text


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=2, min=4, max=60))
def fetch(client: httpx.Client, url: str) -> str:
    resp = client.get(url, timeout=30.0)
    resp.raise_for_status()
    return resp.text


def list_prec_nos(client: httpx.Client, *, rebuild: bool) -> list[int]:
    cache_path = CACHE_DIR / "prefecture00.html"
    if cache_path.exists() and not rebuild:
        html = cache_path.read_text(encoding="utf-8")
    else:
        html = fetch(client, PREFECTURE00_URL)
        cache_path.write_text(html, encoding="utf-8")
        time.sleep(SLEEP_SECONDS + random.random() * JITTER_SECONDS)
    matches = re.findall(
        r'href="prefecture\.php\?prec_no=(\d+)', html
    )
    seen: list[int] = []
    seen_set: set[int] = set()
    for m in matches:
        n = int(m)
        if n in seen_set:
            continue
        if n == 99:  # Antarctica (Showa base) — skip
            continue
        seen_set.add(n)
        seen.append(n)
    return seen


def fetch_prefecture(
    client: httpx.Client, prec_no: int, *, rebuild: bool
) -> str:
    cache_path = CACHE_DIR / f"prefecture-{prec_no}.html"
    if cache_path.exists() and not rebuild:
        return cache_path.read_text(encoding="utf-8")
    html = fetch(client, PREFECTURE_URL_FMT.format(prec_no=prec_no))
    cache_path.write_text(html, encoding="utf-8")
    time.sleep(SLEEP_SECONDS + random.random() * JITTER_SECONDS)
    return html


def parse_viewpoints(html: str) -> list[dict]:
    """Extract unique observation points from a prefecture page."""
    matches = VIEWPOINT_RE.findall(html)
    seen: dict[tuple[str, str], dict] = {}
    for m in matches:
        kind_letter, block_no, name_jp, kana, lat_d, lat_m, lng_d, lng_m = m
        key = (kind_letter, block_no)
        if key in seen:
            continue
        try:
            lat = float(lat_d) + float(lat_m) / 60.0
            lng = float(lng_d) + float(lng_m) / 60.0
        except ValueError:
            continue
        seen[key] = {
            "kind": "s1" if kind_letter == "s" else "a1",
            "block_no": block_no,
            "name": name_jp,
            "kana": kana,
            "lat": round(lat, 4),
            "lng": round(lng, 4),
        }
    return list(seen.values())


def discover(rebuild: bool = False) -> list[dict]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "ja"}
    all_stations: list[dict] = []

    with httpx.Client(headers=headers, follow_redirects=True) as client:
        prec_nos = list_prec_nos(client, rebuild=rebuild)
        print(f"discovered {len(prec_nos)} prec_no entries", file=sys.stderr)
        for prec_no in tqdm(prec_nos, desc="prefectures"):
            html = fetch_prefecture(client, prec_no, rebuild=rebuild)
            for st in parse_viewpoints(html):
                st["prec_no"] = prec_no
                if prec_no in HOKKAIDO_PREC_NOS:
                    st["prefecture"] = "北海道"
                elif prec_no in PREFECTURE_NAME:
                    st["prefecture"] = PREFECTURE_NAME[prec_no]
                else:
                    st["prefecture"] = f"prec_no={prec_no}"  # unknown
                all_stations.append(st)

    raw_path = CACHE_DIR / "raw.json"
    raw_path.write_text(
        json.dumps(all_stations, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"wrote {raw_path} ({len(all_stations)} stations)", file=sys.stderr)
    return all_stations


def emit_python_literal(stations: list[dict]) -> str:
    """Produce a Python literal of new StationRef entries (excluding existing 47)."""
    kakasi = _kakasi_converter()
    existing_ids = {s.id for s in EXISTING_STATIONS}
    existing_keys = {(s.prec_no, s.block_no) for s in EXISTING_STATIONS}

    lines = []
    used_ids: set[str] = set(existing_ids)
    skipped_existing = 0
    skipped_no_slug = 0

    for st in stations:
        key = (st["prec_no"], st["block_no"])
        if key in existing_keys:
            skipped_existing += 1
            continue
        slug = name_to_slug(st["name"], kakasi)
        if not slug:
            # Fallback: use prec_no + block_no
            slug = f"jma{st['prec_no']}{st['block_no']}"
        # Disambiguate collisions
        candidate = slug
        suffix = 2
        while candidate in used_ids:
            candidate = f"{slug}-{st['prec_no']}-{st['block_no']}"
            if candidate in used_ids:
                candidate = f"{slug}{suffix}"
                suffix += 1
        used_ids.add(candidate)
        st["id"] = candidate
        if not candidate:
            skipped_no_slug += 1
            continue
        lines.append(
            f'    StationRef("{candidate}", "{st["name"]}", "{st["prefecture"]}", '
            f'{st["lat"]}, {st["lng"]}, {st["prec_no"]}, "{st["block_no"]}", '
            f'kind="{st["kind"]}"),'
        )

    print(
        f"# stats: emit={len(lines)} existing-skip={skipped_existing} "
        f"no-slug-skip={skipped_no_slug}",
        file=sys.stderr,
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild", action="store_true",
                        help="re-fetch all prefecture pages (otherwise use cache)")
    parser.add_argument("--out", default="discover_output.py",
                        help="output file for Python literal (default: discover_output.py)")
    args = parser.parse_args(argv)

    stations = discover(rebuild=args.rebuild)
    literal = emit_python_literal(stations)
    out_path = Path(__file__).resolve().parent / args.out
    out_path.write_text(
        "# Auto-generated by discover_stations.py — paste into jma_stations.STATIONS\n"
        + literal
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
