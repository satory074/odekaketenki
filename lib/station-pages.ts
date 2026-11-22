// 観測地点ページのビルド時専用のデータ読み込み (Server Component / sitemap からだけ import する)。
// `output: "export"` のビルドで静的に評価されるので fs で public/data を直接読める。
// ブラウザ側のアプリ (lib/jma-data.ts / lib/stations.ts の fetch) とは別経路。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { regionOf, REGIONS, type Region } from "./regions";
import {
  MIN_FULL_YEARS,
  fullYearCount,
  prcpMissingShare,
  summarizeStation,
  type StationSummary,
} from "./station-summary";
import { haversineKm } from "./stations";
import type { Station, StationData } from "./types";

const DATA_DIR = join(process.cwd(), "public", "data");

/**
 * 降水量の取り込みの不変条件。気象庁の表の "--" (降水なし) を欠測扱いにすると雨の降らない日が
 * 分母から消え、雨の日の割合が約 2 倍で載る (2026-11 に修正済み、scripts/fetch_jma.py)。
 * 掲載地点の降水量の欠測率の中央値がこれを超えたら、間違った数字を公開しないようビルドを止める。
 */
const MAX_MEDIAN_PRCP_MISSING = 0.1;

let registry: Station[] | null = null;
const dataCache = new Map<string, StationData>();
const summaryCache = new Map<string, StationSummary>();
let published: Station[] | null = null;

export function allStations(): Station[] {
  registry ??= JSON.parse(readFileSync(join(DATA_DIR, "stations.json"), "utf8")) as Station[];
  return registry;
}

function stationData(id: string): StationData {
  let d = dataCache.get(id);
  if (!d) {
    d = JSON.parse(readFileSync(join(DATA_DIR, "jma", `${id}.json`), "utf8")) as StationData;
    dataCache.set(id, d);
  }
  return d;
}

/**
 * ページを作る地点。降水量と気温がそろった年が MIN_FULL_YEARS 年以上ある地点だけ
 * (富士山は降水量を観測していない、伊吹山・剣山は 2001 年に観測を終えている → 作らない)。
 */
export function publishedStations(): Station[] {
  if (published) return published;
  const list = allStations().filter((s) => fullYearCount(stationData(s.id)).fullYears >= MIN_FULL_YEARS);
  const shares = list.map((s) => prcpMissingShare(stationData(s.id))).sort((a, b) => a - b);
  const median = shares[Math.floor(shares.length / 2)] ?? 1;
  if (list.length === 0 || median > MAX_MEDIAN_PRCP_MISSING) {
    throw new Error(
      `降水量の欠測率の中央値が ${(median * 100).toFixed(0)}% (掲載 ${list.length} 地点)。` +
        `気象庁の "--" (降水なし) が欠測として取り込まれている可能性がある。scripts/fetch_jma.py の _parse_value を確認`,
    );
  }
  published = list;
  return list;
}

export function findPublished(id: string): Station | undefined {
  return publishedStations().find((s) => s.id === id);
}

export function stationSummary(station: Station): StationSummary {
  let s = summaryCache.get(station.id);
  if (!s) {
    s = summarizeStation(stationData(station.id), station.name);
    summaryCache.set(station.id, s);
  }
  return s;
}

export function nearestStations(
  station: Station,
  count = 5,
): { station: Station; distanceKm: number }[] {
  return publishedStations()
    .filter((s) => s.id !== station.id)
    .map((s) => ({ station: s, distanceKm: haversineKm(station, s) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}

/** 一覧ページ用: 地域 → 都道府県 → 地点 (stations.json の並び = 都道府県の北から順) */
export function stationsByRegion(): { region: Region; prefectures: { name: string; stations: Station[] }[] }[] {
  const byRegion = new Map<Region, Map<string, Station[]>>();
  REGIONS.forEach((r) => byRegion.set(r, new Map()));
  for (const s of publishedStations()) {
    const prefs = byRegion.get(regionOf(s.prefecture))!;
    prefs.set(s.prefecture, [...(prefs.get(s.prefecture) ?? []), s]);
  }
  return REGIONS.map((region) => ({
    region,
    prefectures: [...byRegion.get(region)!.entries()].map(([name, stations]) => ({ name, stations })),
  }));
}
