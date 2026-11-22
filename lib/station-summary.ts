// 観測地点ページ (/stations/<id>/) に出す要約。純粋関数 (I/O なし)。
// ビルド時にサーバーで 1 回だけ計算し、結果の小さな数値だけをページに描く
// (1 地点 約 460KB の日別データそのものは HTML にも RSC にも載せない)。
//
// 月別の表はその月の全観測日 (30 日前後 × 年数) をそのまま数える。
// スコアと「良い週・悪い週」は、アプリのカレンダーと同じ aggregateAroundDate (その日 ±7 日) +
// score() を 1 年の各日について回した結果から作る。アプリで同じ日付を押したときの数字と一致する。

import {
  aggregateAroundDate,
  COLD_C,
  HEAVY_RAIN_MM,
  HOT_C,
  RAIN_MM,
} from "./aggregate";
import { generateComment } from "./comments";
import { score } from "./scoring";
import type { StationData } from "./types";

/** 月の値を出すのに要る観測日数 (約 10 年分)。足りない項目は「—」にする */
const MIN_MONTH_OBS = 300;
/** 1 年を「観測がそろった年」と数える日数 */
const FULL_YEAR_DAYS = 330;
/** ページを作る条件: 降水量と気温がそろった年がこの数以上 */
export const MIN_FULL_YEARS = 20;
const WEEK_DAYS = 7;
const WEEKS_SHOWN = 3;

export type MonthRow = {
  month: number;
  /** 日降水量 1mm 以上の日の割合 (0–1) */
  rainDays: number | null;
  /** 日降水量 30mm 以上の日の割合 (0–1) */
  heavyRainDays: number | null;
  avgTmax: number | null;
  avgTmin: number | null;
  /** 最高気温 30℃ 以上の日の割合 */
  hotDays: number | null;
  /** 最低気温 5℃ 以下の日の割合 */
  coldDays: number | null;
  /** 1 日あたりの日照時間 (時間) */
  sunshine: number | null;
  /** 日平均風速の平均 (m/s) */
  wind: number | null;
  /** アプリの総合スコア (0–100) をその月の各日で出した平均 */
  score: number | null;
};

export type WeekRow = {
  /** "05-03" のような開始日・終了日 (年をまたぐ週もある) */
  start: string;
  end: string;
  score: number;
  rainDays: number;
};

export type StationSummary = {
  /** 降水量と気温がそろった年の数 */
  fullYears: number;
  /** 観測値がある最初と最後の年 */
  firstYear: number;
  lastYear: number;
  months: MonthRow[];
  bestWeeks: WeekRow[];
  worstWeeks: WeekRow[];
  /** 最も良い週・悪い週の中日について、アプリと同じ文面のコメント */
  bestComment: string | null;
  worstComment: string | null;
};

type Acc = { sum: number; n: number; hit: number };
const acc = (): Acc => ({ sum: 0, n: 0, hit: 0 });

function add(a: Acc, v: number | null | undefined, hit?: (v: number) => boolean) {
  if (v == null || !Number.isFinite(v)) return;
  a.sum += v;
  a.n += 1;
  if (hit && hit(v)) a.hit += 1;
}

const mean = (a: Acc) => (a.n >= MIN_MONTH_OBS ? a.sum / a.n : null);
const share = (a: Acc) => (a.n >= MIN_MONTH_OBS ? a.hit / a.n : null);

/** 年ごとに、降水量・最高気温の両方がある日数を数える */
export function fullYearCount(data: StationData): {
  fullYears: number;
  firstYear: number;
  lastYear: number;
} {
  const prcpDays = new Array<number>(data.years.length).fill(0);
  const tmaxDays = new Array<number>(data.years.length).fill(0);
  for (const day of Object.values(data.daily)) {
    for (let i = 0; i < data.years.length; i++) {
      if (day.prcp?.[i] != null) prcpDays[i]++;
      if (day.tmax?.[i] != null) tmaxDays[i]++;
    }
  }
  let fullYears = 0;
  let firstYear = Infinity;
  let lastYear = -Infinity;
  data.years.forEach((y, i) => {
    if (prcpDays[i] >= FULL_YEAR_DAYS && tmaxDays[i] >= FULL_YEAR_DAYS) fullYears++;
    if (prcpDays[i] > 0 || tmaxDays[i] > 0) {
      firstYear = Math.min(firstYear, y);
      lastYear = Math.max(lastYear, y);
    }
  });
  return { fullYears, firstYear, lastYear };
}

/** 降水量が記録されている日の中で、値が無い (null) 日の割合。データの取り込みが壊れていないかの検査用 */
export function prcpMissingShare(data: StationData): number {
  let total = 0;
  let missing = 0;
  for (const day of Object.values(data.daily)) {
    for (const v of day.prcp ?? []) {
      total++;
      if (v == null) missing++;
    }
  }
  return total === 0 ? 1 : missing / total;
}

function monthRows(data: StationData, dailyScores: Map<string, number>): MonthRow[] {
  const rows: MonthRow[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    const prcp = acc();
    const heavy = acc();
    const tmax = acc();
    const tmin = acc();
    const sunshine = acc();
    const wind = acc();
    const scores = acc();
    for (const [key, day] of Object.entries(data.daily)) {
      if (!key.startsWith(`${mm}-`)) continue;
      for (let i = 0; i < data.years.length; i++) {
        add(prcp, day.prcp?.[i], (v) => v >= RAIN_MM);
        add(heavy, day.prcp?.[i], (v) => v >= HEAVY_RAIN_MM);
        add(tmax, day.tmax?.[i], (v) => v >= HOT_C);
        add(tmin, day.tmin?.[i], (v) => v <= COLD_C);
        add(sunshine, day.sunshine?.[i]);
        add(wind, day.wind?.[i]);
      }
      const s = dailyScores.get(key);
      if (s != null) {
        scores.sum += s;
        scores.n += 1;
      }
    }
    rows.push({
      month: m,
      rainDays: share(prcp),
      heavyRainDays: share(heavy),
      avgTmax: mean(tmax),
      avgTmin: mean(tmin),
      hotDays: share(tmax),
      coldDays: share(tmin),
      sunshine: mean(sunshine),
      wind: mean(wind),
      score: scores.n > 0 ? scores.sum / scores.n : null,
    });
  }
  return rows;
}

/** 平年 (2001 年) の 365 日。2/29 はアプリでも 3/1 と同じ窓になるので、週の計算には入れない */
function yearDays(): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(2001, 0, 1));
  while (d.getUTCFullYear() === 2001) {
    out.push(
      `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

type Week = WeekRow & { startIndex: number };

function pickWeeks(weeks: Week[], better: (a: Week, b: Week) => number, total: number): WeekRow[] {
  const sorted = [...weeks].sort(better);
  const chosen: Week[] = [];
  for (const w of sorted) {
    // 選んだ週と 1 日でも重なるものは飛ばす (年末年始をまたぐ週も考える)
    const overlaps = chosen.some((c) => {
      const diff = Math.abs(c.startIndex - w.startIndex);
      return Math.min(diff, total - diff) < WEEK_DAYS;
    });
    if (overlaps) continue;
    chosen.push(w);
    if (chosen.length === WEEKS_SHOWN) break;
  }
  return chosen.map(({ start, end, score, rainDays }) => ({ start, end, score, rainDays }));
}

export function summarizeStation(data: StationData, placeName: string): StationSummary {
  const days = yearDays();
  // アプリのカレンダーと同じ計算 (diagnoseMonth と同じく、降水量の観測が 0 件の日は飛ばす)
  const daily = days.map((md) => {
    const stats = aggregateAroundDate(data, `2001-${md}`);
    if (stats.n === 0) return null;
    return { md, stats, sc: score(stats) };
  });
  const dailyScores = new Map<string, number>();
  for (const d of daily) if (d) dailyScores.set(d.md, d.sc.total);

  const weeks: Week[] = [];
  for (let s = 0; s < days.length; s++) {
    let sum = 0;
    let rain = 0;
    let ok = true;
    for (let k = 0; k < WEEK_DAYS; k++) {
      const d = daily[(s + k) % days.length];
      if (!d) {
        ok = false;
        break;
      }
      sum += d.sc.total;
      rain += d.stats.rainProb;
    }
    if (!ok) continue;
    weeks.push({
      startIndex: s,
      start: days[s],
      end: days[(s + WEEK_DAYS - 1) % days.length],
      score: sum / WEEK_DAYS,
      rainDays: rain / WEEK_DAYS,
    });
  }

  const bestWeeks = pickWeeks(
    weeks,
    (a, b) => b.score - a.score || a.rainDays - b.rainDays || a.startIndex - b.startIndex,
    days.length,
  );
  const worstWeeks = pickWeeks(
    weeks,
    (a, b) => a.score - b.score || b.rainDays - a.rainDays || a.startIndex - b.startIndex,
    days.length,
  );

  const commentFor = (w: WeekRow | undefined): string | null => {
    if (!w) return null;
    const startIndex = days.indexOf(w.start);
    const mid = daily[(startIndex + Math.floor(WEEK_DAYS / 2)) % days.length];
    if (!mid) return null;
    return generateComment(mid.stats, mid.sc, { date: `2001-${mid.md}`, placeName });
  };

  return {
    ...fullYearCount(data),
    months: monthRows(data, dailyScores),
    bestWeeks,
    worstWeeks,
    bestComment: commentFor(bestWeeks[0]),
    worstComment: commentFor(worstWeeks[0]),
  };
}
