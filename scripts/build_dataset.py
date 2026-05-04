"""Convert per-station raw daily JSON into the compact app-facing dataset.

Reads:  scripts/.cache/<station_id>/raw.json
Writes: public/data/jma/<station_id>.json
        public/data/stations.json (registry)
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

from jma_stations import STATIONS, StationRef, by_id

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "scripts" / ".cache"
PUBLIC_JMA_DIR = ROOT / "public" / "data" / "jma"
STATIONS_JSON = ROOT / "public" / "data" / "stations.json"

FIELDS = ("tmax", "tmin", "tavg", "prcp", "sunshine", "wind", "humidity")


def build_one(station: StationRef) -> dict | None:
    raw_path = CACHE_DIR / station.id / "raw.json"
    if not raw_path.exists():
        print(f"skip {station.id}: no raw.json — run fetch_jma first", file=sys.stderr)
        return None

    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    years_set: set[int] = set()
    # daily[mm-dd][field] -> list aligned with sorted years
    grouped: dict[str, dict[str, dict[int, float | None]]] = defaultdict(
        lambda: {f: {} for f in FIELDS},
    )
    for date_key, fields in raw.items():
        year_str, mm, dd = date_key.split("-")
        year = int(year_str)
        years_set.add(year)
        md = f"{mm}-{dd}"
        for f in FIELDS:
            grouped[md][f][year] = fields.get(f)

    years = sorted(years_set)
    daily: dict[str, dict[str, list[float | None]]] = {}
    for md, by_field in grouped.items():
        rec: dict[str, list[float | None]] = {}
        for f in FIELDS:
            rec[f] = [by_field[f].get(y) for y in years]
        daily[md] = rec

    return {
        "station_id": station.id,
        "name": station.name,
        "prefecture": station.prefecture,
        "lat": station.lat,
        "lng": station.lng,
        "years": years,
        "daily": daily,
    }


def write_stations_registry() -> None:
    """(Re)write public/data/stations.json from the in-code registry."""
    PUBLIC_JMA_DIR.mkdir(parents=True, exist_ok=True)
    payload = [
        {
            "id": s.id,
            "name": s.name,
            "prefecture": s.prefecture,
            "lat": s.lat,
            "lng": s.lng,
        }
        for s in STATIONS
    ]
    STATIONS_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"wrote {STATIONS_JSON}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--station")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--registry-only", action="store_true")
    args = parser.parse_args(argv)

    write_stations_registry()
    if args.registry_only:
        return 0

    if args.all:
        targets = list(STATIONS)
    elif args.station:
        targets = [by_id(args.station)]
    else:
        parser.print_help()
        return 2

    for st in targets:
        data = build_one(st)
        if data is None:
            continue
        out_path = PUBLIC_JMA_DIR / f"{st.id}.json"
        out_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        print(f"wrote {out_path} ({sum(len(d['tmax']) for d in data['daily'].values())} samples)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
