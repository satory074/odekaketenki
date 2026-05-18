"""Generate lib/rokuyou-table.ts with precomputed Japanese rokuyou (六曜) for a year range.

The algorithm follows Eiji Takano's qreki approach (Meeus simplified series) to compute
the solar/lunar longitudes, find new moons (朔) and 24 solar terms (中気), then derive
the Japanese lunisolar (旧暦) month and day for every Gregorian date. Rokuyou index is
(lunar_month + lunar_day) % 6 with the convention that lunar 1/1 = 先勝 (0).

Output: lib/rokuyou-table.ts in the repo root. One character per day from 2010-01-01.
Characters are '0'..'5' meaning the raw value of (lunar_month + lunar_day) % 6.
The mapping to rokuyou names is interpreted on the TypeScript side (lib/rokuyou.ts):
  0=大安 1=赤口 2=先勝 3=友引 4=先負 5=仏滅
This way, lunar 1月1日 = (1+1)%6 = 2 = 先勝 (the conventional rule).

Re-run with: cd scripts && uv run python -m build_rokuyou
"""
from __future__ import annotations

import argparse
import math
from datetime import date, timedelta
from pathlib import Path

from tqdm import tqdm


START_YEAR = 2010
END_YEAR = 2060
TZ_OFFSET_HOURS = 9.0  # JST


# Sun longitude coefficients (Meeus simplified, ported from koyomi.py).
# Each entry: (amplitude_deg, frequency_cyc_per_century_deg, phase_deg, t_correction_flag).
# t_correction_flag=1 means the term is multiplied by ((t-1)*0.0200 + 1).
# The first two are the linear/constant base; the rest are periodic perturbations.
_SUN_TERMS = [
    (36000.7695, 0,         0,       1),  # linear in t
    (280.4659,   0,         0,       0),  # constant base longitude
    (1.9147,     35999.05,  267.52,  0),
    (0.0200,     71998.1,   265.1,   0),
    (-0.0048,    35999,     268,     0),
    (0.0020,     32964,     158,     0),
    (0.0018,     19,        159,     0),
    (0.0018,     445267,    208,     0),
    (0.0015,     45038,     254,     0),
    (0.0013,     22519,     352,     0),
    (0.0007,     65929,     45,      0),
    (0.0007,     3035,      110,     0),
    (0.0007,     9038,      64,      0),
    (0.0006,     33718,     316,     0),
    (0.0005,     155,       118,     0),
    (0.0005,     2281,      221,     0),
    (0.0004,     29930,     48,      0),
    (0.0004,     31557,     161,     0),
]


# Moon longitude coefficients (Meeus simplified, from Takano's qreki).
# Format identical to _SUN_TERMS.
_MOON_TERMS = [
    (481267.8809, 0,           0,       1),
    (218.3162,    0,           0,       0),
    (6.2888,      477198.868,  44.963,  0),
    (1.2740,      413335.35,   10.74,   0),
    (0.6583,      890534.22,   145.7,   0),
    (0.2136,      954397.74,   179.93,  0),
    (0.1856,      35999.05,    87.53,   0),
    (0.1143,      966404.0,    276.5,   0),
    (0.0588,      63863.5,     124.2,   0),
    (0.0572,      377336.3,    13.2,    0),
    (0.0533,      1367733.1,   280.7,   0),
    (0.0459,      854535.2,    148.2,   0),
    (0.0410,      441199.8,    47.4,    0),
    (0.0348,      445267.1,    27.9,    0),
    (0.0305,      513197.9,    222.5,   0),
    (0.0153,      75870.0,     41.0,    0),
    (0.0125,      1443603.0,   52.0,    0),
    (0.0110,      489205.0,    142.0,   0),
    (0.0107,      1303870.0,   246.0,   0),
    (0.0100,      1431597.0,   315.0,   0),
    (0.0085,      826671.0,    111.0,   0),
    (0.0079,      449334.0,    188.0,   0),
    (0.0068,      926533.0,    149.0,   0),
    (0.0052,      31932.0,     107.0,   0),
    (0.0050,      481266.0,    323.0,   0),
    (0.0040,      1331734.0,   97.0,    0),
    (0.0040,      1844932.0,   90.0,    0),
    (0.0040,      133.0,       100.0,   0),
    (0.0038,      1781068.0,   117.0,   0),
    (0.0037,      541062.0,    206.0,   0),
    (0.0028,      1934.0,      183.0,   0),
    (0.0027,      918399.0,    220.0,   0),
    (0.0026,      1379739.0,   100.0,   0),
    (0.0024,      99863.0,     290.0,   0),
    (0.0023,      922466.0,    173.0,   0),
    (0.0022,      818536.0,    24.0,    0),
    (0.0021,      990397.0,    266.0,   0),
    (0.0021,      71998.0,     263.0,   0),
    (0.0021,      341337.0,    291.0,   0),
    (0.0018,      401329.0,    23.0,    0),
    (0.0016,      1856938.0,   299.0,   0),
    (0.0012,      1267871.0,   271.0,   0),
    (0.0011,      1331166.0,   159.0,   0),
    (0.0009,      1934.0,      32.0,    0),
    (0.0008,      1844932.0,   163.0,   0),
    (0.0008,      71998.0,     65.0,    0),
    (0.0007,      1789672.0,   314.0,   0),
    (0.0007,      7.0,         229.0,   0),
    (0.0007,      1865234.0,   341.0,   0),
    (0.0006,      133.0,       98.0,    0),
    (0.0006,      8905.0,      234.0,   0),
    (0.0005,      1276.0,      314.0,   0),
    (0.0005,      828.0,       133.0,   0),
]


def jd_from_jst(year: int, month: int, day: int, hour: float = 0.0) -> float:
    """Julian Day Number for the given JST date/time (hour in JST decimal)."""
    if month <= 2:
        year -= 1
        month += 12
    a = year // 100
    b = 2 - a + a // 4
    jd = (
        math.floor(365.25 * (year + 4716))
        + math.floor(30.6001 * (month + 1))
        + day
        + b
        - 1524.5
    )
    jd += (hour - TZ_OFFSET_HOURS) / 24.0
    return jd


def _t_centuries(jd: float) -> float:
    """Julian centuries from J2000.0 (TT approximation, ignoring delta-T below 1 minute)."""
    # Takano's approximation for delta-T (seconds), good enough for 1900-2100.
    year_frac = 2000.0 + (jd - 2451545.0) / 365.25
    delta_t_sec = 65.0 + 0.44 * (year_frac - 1990.0)
    return (jd - 2451545.0 + delta_t_sec / 86400.0) / 36525.0


def _eval_series(terms: list[tuple[float, float, float, int]], t: float) -> float:
    total = 0.0
    for amp, freq, phase, tflag in terms:
        # tflag=1 means the term scales linearly with t (e.g., the mean motion).
        # tflag=0 means the term is constant in amplitude.
        coef = amp * t if tflag else amp
        total += coef * math.cos(math.radians(freq * t + phase))
    return total % 360.0


def sun_lng(jd: float) -> float:
    return _eval_series(_SUN_TERMS, _t_centuries(jd))


def moon_lng(jd: float) -> float:
    return _eval_series(_MOON_TERMS, _t_centuries(jd))


def _norm180(x: float) -> float:
    """Normalize to (-180, 180]."""
    x = x % 360.0
    if x > 180.0:
        x -= 360.0
    return x


def new_moon_jd(jd_guess: float) -> float:
    """Return JD of the new moon closest to jd_guess (lunar - solar longitude == 0)."""
    jd = jd_guess
    for _ in range(30):
        diff = _norm180(moon_lng(jd) - sun_lng(jd))
        if abs(diff) < 1e-7:
            break
        # Moon - Sun longitude grows ~12.19 deg/day on average.
        jd -= diff / 12.1907
    return jd


def chuki_jd(jd_guess: float, target_deg: float) -> float:
    """Return JD where sun longitude reaches target_deg (modulo 360), near jd_guess."""
    jd = jd_guess
    for _ in range(30):
        diff = _norm180(sun_lng(jd) - target_deg)
        if abs(diff) < 1e-7:
            break
        # Sun longitude grows ~0.9856 deg/day on average.
        jd -= diff / 0.9856473
    return jd


def jd_to_jst_date(jd: float) -> date:
    """JST calendar date for the given JD (round down to local midnight)."""
    jd_jst = jd + TZ_OFFSET_HOURS / 24.0
    z = math.floor(jd_jst + 0.5)
    a = z
    if z >= 2299161:
        alpha = math.floor((z - 1867216.25) / 36524.25)
        a = z + 1 + alpha - math.floor(alpha / 4)
    b = a + 1524
    c = math.floor((b - 122.1) / 365.25)
    d = math.floor(365.25 * c)
    e = math.floor((b - d) / 30.6001)
    day = b - d - math.floor(30.6001 * e)
    month = e - 1 if e < 14 else e - 13
    year = c - 4716 if month > 2 else c - 4715
    return date(int(year), int(month), int(day))


def _midnight_jd(d: date) -> float:
    """JD at JST midnight (00:00 JST) on the given date."""
    return jd_from_jst(d.year, d.month, d.day, 0.0)


def _floor_to_jst_date(jd: float) -> date:
    """The JST calendar day that contains the moment jd."""
    return jd_to_jst_date(jd)


def _winter_solstice_before(jd: float) -> float:
    """JD of the winter solstice (sun_lng = 270°) at or before jd."""
    # Try a guess near jd, then walk back by year if necessary.
    guess = chuki_jd(jd, 270.0)
    while guess > jd + 0.5:
        guess = chuki_jd(guess - 365.0, 270.0)
    return guess


def _new_moon_at_or_before(jd: float) -> float:
    """JD of the new moon at or before jd."""
    nm = new_moon_jd(jd)
    while nm > jd + 0.5:
        nm = new_moon_jd(nm - 29.0)
    return nm


def _build_lunar_year(year: int) -> list[tuple[date, int, bool]]:
    """Return list of (new_moon_date_jst, lunar_month, is_leap) entries covering year.

    The list spans from the new moon containing the previous winter solstice (旧暦11月初日)
    through enough subsequent new moons to fully cover Gregorian `year`.
    """
    # 冬至 of (year - 1) — the lunar month that contains this is 11月.
    ws_prev = _winter_solstice_before(_midnight_jd(date(year, 1, 15)))
    # Find new moon at or before ws_prev — start of 11月.
    nm0 = _new_moon_at_or_before(ws_prev)

    new_moons: list[float] = [nm0]
    # Collect enough new moons to go past Dec 31 of `year`.
    end_jd = _midnight_jd(date(year + 1, 2, 28))
    while new_moons[-1] < end_jd:
        new_moons.append(new_moon_jd(new_moons[-1] + 29.6))

    # Now assign lunar month numbers. Start: nm0 = 11月.
    # 中気 (major solar terms) are sun_lng = 270, 300, 330, 0, 30, 60, 90, 120, 150, 180, 210, 240.
    # These correspond to lunar months 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.
    chuki_to_lunar_month = {
        270: 11, 300: 12, 330: 1, 0: 2, 30: 3, 60: 4,
        90: 5, 120: 6, 150: 7, 180: 8, 210: 9, 240: 10,
    }

    # For each new moon span [nm_i, nm_{i+1}), find which 中気 it contains.
    # If exactly one 中気, that's the lunar month. If zero (and previous month was not leap),
    # this is a leap month duplicating the previous month's number.
    entries: list[tuple[date, int, bool]] = []
    prev_month: int | None = None
    prev_was_leap = False

    for i, nm_start in enumerate(new_moons[:-1]):
        nm_end = new_moons[i + 1]
        # Find all chuki within [nm_start, nm_end).
        contained: list[int] = []
        # Search chuki by stepping degrees around the year matching nm_start.
        for target in (270, 300, 330, 0, 30, 60, 90, 120, 150, 180, 210, 240):
            ck = chuki_jd((nm_start + nm_end) / 2.0, float(target))
            if nm_start - 0.5 <= ck < nm_end - 0.5:
                contained.append(target)

        if not contained:
            # Leap month: duplicates the previous lunar month's number.
            assert prev_month is not None
            lunar_month = prev_month
            is_leap = True
            prev_was_leap = True
        else:
            # Use the contained chuki to determine lunar month.
            # (If somehow >1, pick the first; for our era this shouldn't happen.)
            lunar_month = chuki_to_lunar_month[contained[0]]
            is_leap = False
            prev_was_leap = False

        entries.append((jd_to_jst_date(nm_start), lunar_month, is_leap))
        prev_month = lunar_month

    return entries


def _rokuyou_index(lunar_month: int, lunar_day: int) -> int:
    """Raw (lunar_month + lunar_day) % 6. TS side maps 2 → 先勝, etc."""
    return (lunar_month + lunar_day) % 6


def _solar_to_lunar_day(d: date, entries: list[tuple[date, int, bool]]) -> tuple[int, int]:
    """Given a Gregorian date and a covering lunar-month list, return (lunar_month, lunar_day)."""
    # Find the latest entry whose start_date <= d.
    chosen = entries[0]
    for entry in entries:
        if entry[0] <= d:
            chosen = entry
        else:
            break
    start_date, month, _is_leap = chosen
    day = (d - start_date).days + 1
    return month, day


def _build_table_for_year(year: int) -> str:
    """Compute rokuyou for each day in `year`. Length = 366 if leap else 365."""
    # Build enough lunar months covering both this year and into next year a bit.
    entries = _build_lunar_year(year)
    # Also seed with previous year for early-January days that fall in lunar 11月/12月.
    prev_entries = _build_lunar_year(year - 1)
    # Combine, but only keep entries that cover dates within `year`.
    combined = prev_entries + entries
    # Deduplicate while preserving order (entries may overlap near year boundary).
    seen: set[tuple[date, int, bool]] = set()
    deduped: list[tuple[date, int, bool]] = []
    for e in combined:
        if e in seen:
            continue
        seen.add(e)
        deduped.append(e)
    deduped.sort(key=lambda x: x[0])

    out: list[str] = []
    d = date(year, 1, 1)
    while d.year == year:
        lm, ld = _solar_to_lunar_day(d, deduped)
        out.append(str(_rokuyou_index(lm, ld)))
        d += timedelta(days=1)
    return "".join(out)


def build_table(start_year: int = START_YEAR, end_year: int = END_YEAR) -> str:
    chunks: list[str] = []
    for y in tqdm(range(start_year, end_year + 1), desc="years"):
        chunks.append(_build_table_for_year(y))
    return "".join(chunks)


def _ts_output(table: str, start_year: int, end_year: int) -> str:
    header = (
        "// Auto-generated by scripts/build_rokuyou.py. Do not edit by hand.\n"
        f"// Years: {start_year} - {end_year} (inclusive). One ASCII char per day.\n"
        "// Raw value = (lunar_month + lunar_day) % 6. Mapping in lib/rokuyou.ts:\n"
        "//   0=大安 1=赤口 2=先勝 3=友引 4=先負 5=仏滅\n\n"
    )
    body = (
        f"export const ROKUYOU_START_YEAR = {start_year};\n"
        f"export const ROKUYOU_END_YEAR = {end_year};\n"
        f"export const ROKUYOU_TABLE = {table!r};\n"
    )
    # Python's repr uses single quotes; TypeScript accepts them but prefer double.
    body = body.replace(f"= '{table}'", f'= "{table}"')
    return header + body


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-year", type=int, default=START_YEAR)
    parser.add_argument("--end-year", type=int, default=END_YEAR)
    args = parser.parse_args()

    start_year = args.start_year
    end_year = args.end_year

    print(f"Building rokuyou table for {start_year}..{end_year}...")
    table = build_table(start_year, end_year)
    out_path = Path(__file__).resolve().parent.parent / "lib" / "rokuyou-table.ts"
    out_path.write_text(_ts_output(table, start_year, end_year), encoding="utf-8")
    expected_days = sum(366 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 365
                        for y in range(start_year, end_year + 1))
    print(f"  table length: {len(table)} chars (expected {expected_days})")
    print(f"  wrote: {out_path}")

    # Sanity print: a few well-known dates that fall within the table range.
    candidates = [
        date(2024, 1, 1),
        date(2025, 1, 1),
        date(2026, 1, 1),
        date(2026, 5, 18),
        date(2024, 2, 29),
    ]
    sample_dates = [d for d in candidates if start_year <= d.year <= end_year]
    labels = ["大安", "赤口", "先勝", "友引", "先負", "仏滅"]
    print("\n  sample dates:")
    for d in sample_dates:
        offset = 0
        for y in range(start_year, d.year):
            offset += 366 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 365
        doy = (d - date(d.year, 1, 1)).days
        idx = int(table[offset + doy])
        print(f"    {d.isoformat()} = {labels[idx]}")


if __name__ == "__main__":
    main()
