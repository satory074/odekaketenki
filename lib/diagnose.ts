import { aggregateAroundDate } from "./aggregate";
import { generateComment } from "./comments";
import { loadStationData } from "./jma-data";
import { score } from "./scoring";
import { findNearestStation } from "./stations";
import type { DiagnoseResponse, DiagnoseResult } from "./types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DiagnoseInput = {
  lat: number;
  lng: number;
  dates: string[];
  placeName?: string;
};

export async function diagnose(input: DiagnoseInput): Promise<DiagnoseResponse> {
  if (!Array.isArray(input.dates) || input.dates.length === 0) {
    throw new Error("候補日が空です。");
  }
  if (input.dates.length > 5) {
    throw new Error("候補日は最大5件までです。");
  }
  for (const d of input.dates) {
    if (!ISO_DATE_RE.test(d)) {
      throw new Error(`不正な日付形式: ${d}`);
    }
  }

  const nearest = await findNearestStation(input.lat, input.lng);
  if (!nearest) {
    throw new Error("最寄りの観測地点が見つかりません。");
  }
  const stationData = await loadStationData(nearest.station.id);
  if (!stationData) {
    throw new Error(`観測地点 ${nearest.station.id} のデータが取得できません。`);
  }

  const results: DiagnoseResult[] = input.dates.map((date) => {
    const stats = aggregateAroundDate(stationData, date);
    const sc = score(stats);
    const comment = generateComment(stats, sc, {
      date,
      placeName: input.placeName ?? nearest.station.name,
    });
    return { date, stats, scores: sc, comment };
  });

  results.sort((a, b) => b.scores.total - a.scores.total);

  return {
    station: {
      id: nearest.station.id,
      name: nearest.station.name,
      prefecture: nearest.station.prefecture,
      distanceKm: Math.round(nearest.distanceKm * 10) / 10,
    },
    results,
  };
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
