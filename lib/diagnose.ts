import { aggregateAroundDate } from "./aggregate";
import { generateComment } from "./comments";
import { loadStationData } from "./jma-data";
import { score } from "./scoring";
import { findNearestStation } from "./stations";
import type { DiagnoseResult, StationData } from "./types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type StationMeta = {
  id: string;
  name: string;
  prefecture: string;
  distanceKm: number;
};

export type LocationContext = {
  station: StationMeta;
  stationData: StationData;
};

export async function prepareLocation(input: {
  lat: number;
  lng: number;
}): Promise<LocationContext> {
  const nearest = await findNearestStation(input.lat, input.lng);
  if (!nearest) {
    throw new Error("最寄りの観測地点が見つかりません。");
  }
  const stationData = await loadStationData(nearest.station.id);
  if (!stationData) {
    throw new Error(`観測地点 ${nearest.station.id} のデータが取得できません。`);
  }
  return {
    station: {
      id: nearest.station.id,
      name: nearest.station.name,
      prefecture: nearest.station.prefecture,
      distanceKm: Math.round(nearest.distanceKm * 10) / 10,
    },
    stationData,
  };
}

export function diagnoseDate(args: {
  stationData: StationData;
  stationName: string;
  placeName?: string;
  date: string;
}): DiagnoseResult {
  if (!ISO_DATE_RE.test(args.date)) {
    throw new Error(`不正な日付形式: ${args.date}`);
  }
  const stats = aggregateAroundDate(args.stationData, args.date);
  const sc = score(stats);
  const comment = generateComment(stats, sc, {
    date: args.date,
    placeName: args.placeName ?? args.stationName,
  });
  return { date: args.date, stats, scores: sc, comment };
}

export async function searchPlaces(query: string): Promise<
  {
    name: string;
    lat: number;
    lng: number;
    prefecture?: string;
    country?: string;
  }[]
> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const params = new URLSearchParams({
    name: trimmed,
    count: "5",
    language: "ja",
    format: "json",
    countryCode: "JP",
  });
  const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`geocoding failed: ${resp.status}`);
  }
  const data = (await resp.json()) as {
    results?: {
      name: string;
      latitude: number;
      longitude: number;
      country_code?: string;
      country?: string;
      admin1?: string;
      admin2?: string;
    }[];
  };
  if (!data.results) return [];
  return data.results.map((r) => ({
    name: [r.admin1, r.admin2, r.name].filter(Boolean).join(" / "),
    lat: r.latitude,
    lng: r.longitude,
    prefecture: r.admin1,
    country: r.country,
  }));
}
