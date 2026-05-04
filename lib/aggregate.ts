import type { Aggregated, DailyRecord, StationData } from "./types";

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

function pushDefined(target: number[], values: (number | null)[] | undefined) {
  if (!values) return;
  for (const v of values) {
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      target.push(v);
    }
  }
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

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`invalid date: ${iso}`);
  }
  return new Date(Date.UTC(y, m - 1, d));
}

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

  for (let off = -windowDays; off <= windowDays; off++) {
    const key = shiftedKey(baseKey, off);
    const day: DailyRecord | undefined = station.daily[key];
    if (!day) continue;
    pushDefined(tmax, day.tmax);
    pushDefined(tmin, day.tmin);
    pushDefined(tavg, day.tavg);
    pushDefined(prcp, day.prcp);
    pushDefined(sunshine, day.sunshine);
    pushDefined(wind, day.wind);
    pushDefined(humidity, day.humidity);
  }

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
  };
}
