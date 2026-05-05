import type {
  Aggregated,
  DailyOffset,
  DailyRecord,
  Percentiles,
  RainShare,
  SampleRecord,
  StationData,
  YearOutcome,
} from "./types";

const RAIN_MM = 1.0;
const HEAVY_RAIN_MM = 30.0;
const HOT_C = 30.0;
const COLD_C = 5.0;

function mmdd(date: Date): string {
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${m}-${d}`;
}

function shiftedKey(monthDay: string, offsetDays: number): string {
  const [m, d] = monthDay.split("-").map(Number);
  // Use a non-leap reference year so date math is consistent.
  const base = new Date(Date.UTC(2001, m - 1, d));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return mmdd(base);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function fraction(values: number[], pred: (v: number) => boolean): number {
  if (values.length === 0) return 0;
  let n = 0;
  for (const v of values) if (pred(v)) n++;
  return n / values.length;
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function percentilesOf(values: number[]): Percentiles {
  if (values.length === 0) {
    return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
  };
}

function rainShareOf(prcp: number[]): RainShare {
  if (prcp.length === 0) {
    return { none: 0, light: 0, moderate: 0, heavy: 0 };
  }
  let none = 0;
  let light = 0;
  let moderate = 0;
  let heavy = 0;
  for (const v of prcp) {
    if (v < RAIN_MM) none++;
    else if (v < 10) light++;
    else if (v < HEAVY_RAIN_MM) moderate++;
    else heavy++;
  }
  const n = prcp.length;
  return {
    none: none / n,
    light: light / n,
    moderate: moderate / n,
    heavy: heavy / n,
  };
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`invalid date: ${iso}`);
  }
  return new Date(Date.UTC(y, m - 1, d));
}

type YearAcc = {
  tmax: number[];
  tmin: number[];
  prcp: number[];
};

export function aggregateAroundDate(
  station: StationData,
  isoDate: string,
  windowDays = 7,
): Aggregated {
  const target = parseIsoDate(isoDate);
  const baseKey = mmdd(target);

  const tmax: number[] = [];
  const tmin: number[] = [];
  const tavg: number[] = [];
  const prcp: number[] = [];
  const sunshine: number[] = [];
  const wind: number[] = [];
  const humidity: number[] = [];

  const yearAcc = new Map<number, YearAcc>();
  for (const y of station.years) {
    yearAcc.set(y, { tmax: [], tmin: [], prcp: [] });
  }

  const byOffset: DailyOffset[] = [];
  const samples: SampleRecord[] = [];

  const finiteOrNull = (v: number | null | undefined): number | null =>
    v != null && Number.isFinite(v) ? v : null;

  for (let off = -windowDays; off <= windowDays; off++) {
    const key = shiftedKey(baseKey, off);
    const day: DailyRecord | undefined = station.daily[key];

    const offTmax: number[] = [];
    const offTmin: number[] = [];
    const offPrcp: number[] = [];

    if (day) {
      for (let i = 0; i < station.years.length; i++) {
        const year = station.years[i];
        const acc = yearAcc.get(year);
        if (!acc) continue;

        const tmaxV = day.tmax?.[i];
        const tminV = day.tmin?.[i];
        const tavgV = day.tavg?.[i];
        const prcpV = day.prcp?.[i];
        const sunshineV = day.sunshine?.[i];
        const windV = day.wind?.[i];
        const humidityV = day.humidity?.[i];

        if (tmaxV != null && Number.isFinite(tmaxV)) {
          tmax.push(tmaxV);
          acc.tmax.push(tmaxV);
          offTmax.push(tmaxV);
        }
        if (tminV != null && Number.isFinite(tminV)) {
          tmin.push(tminV);
          acc.tmin.push(tminV);
          offTmin.push(tminV);
        }
        if (tavgV != null && Number.isFinite(tavgV)) tavg.push(tavgV);
        if (prcpV != null && Number.isFinite(prcpV)) {
          prcp.push(prcpV);
          acc.prcp.push(prcpV);
          offPrcp.push(prcpV);
        }
        if (sunshineV != null && Number.isFinite(sunshineV)) sunshine.push(sunshineV);
        if (windV != null && Number.isFinite(windV)) wind.push(windV);
        if (humidityV != null && Number.isFinite(humidityV)) humidity.push(humidityV);

        samples.push({
          year,
          offset: off,
          monthDay: key,
          tmax: finiteOrNull(tmaxV),
          tmin: finiteOrNull(tminV),
          tavg: finiteOrNull(tavgV),
          prcp: finiteOrNull(prcpV),
          sunshine: finiteOrNull(sunshineV),
          wind: finiteOrNull(windV),
          humidity: finiteOrNull(humidityV),
        });
      }
    }

    byOffset.push({
      offset: off,
      tmax: avg(offTmax),
      tmin: avg(offTmin),
      rainProb: fraction(offPrcp, (v) => v >= RAIN_MM),
    });
  }

  const byYear: YearOutcome[] = station.years.map((year) => {
    const acc = yearAcc.get(year)!;
    let maxPrcp = 0;
    for (const v of acc.prcp) if (v > maxPrcp) maxPrcp = v;
    return {
      year,
      n: acc.prcp.length,
      rainDays: acc.prcp.filter((v) => v >= RAIN_MM).length,
      maxPrcp,
      tmaxMean: avg(acc.tmax),
      tminMean: avg(acc.tmin),
    };
  });

  const expectedSampleDays = (windowDays * 2 + 1) * station.years.length;

  const sortedYears = [...station.years].sort((a, b) => a - b);
  const yearRange =
    sortedYears.length > 0
      ? { start: sortedYears[0], end: sortedYears[sortedYears.length - 1] }
      : { start: 0, end: 0 };

  return {
    n: prcp.length,
    rainProb: fraction(prcp, (v) => v >= RAIN_MM),
    heavyRainProb: fraction(prcp, (v) => v >= HEAVY_RAIN_MM),
    avgPrcp: avg(prcp),
    avgTmax: avg(tmax),
    avgTmin: avg(tmin),
    avgTavg: avg(tavg),
    hotDayProb: fraction(tmax, (v) => v >= HOT_C),
    coldDayProb: fraction(tmin, (v) => v <= COLD_C),
    avgSunshine: avg(sunshine),
    avgWind: avg(wind),
    avgHumidity: humidity.length > 0 ? avg(humidity) : null,
    tmaxDist: percentilesOf(tmax),
    tminDist: percentilesOf(tmin),
    windDist: percentilesOf(wind),
    rainShare: rainShareOf(prcp),
    byYear,
    byOffset,
    samples,
    expectedSampleDays,
    yearRange,
  };
}
