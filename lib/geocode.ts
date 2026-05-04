import type { GeocodeCandidate } from "./types";

type OpenMeteoGeocodeResult = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country_code?: string;
    country?: string;
    admin1?: string;
    admin2?: string;
  }>;
};

export async function searchPlace(
  query: string,
  options: { onlyJapan?: boolean; limit?: number } = {},
): Promise<GeocodeCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const params = new URLSearchParams({
    name: trimmed,
    count: String(options.limit ?? 5),
    language: "ja",
    format: "json",
  });
  if (options.onlyJapan ?? true) {
    params.set("countryCode", "JP");
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
  const resp = await fetch(url, {
    next: { revalidate: 86400 },
  });
  if (!resp.ok) {
    throw new Error(`geocoding failed: ${resp.status}`);
  }
  const data = (await resp.json()) as OpenMeteoGeocodeResult;
  if (!data.results) return [];
  return data.results.map((r) => ({
    name: [r.admin1, r.admin2, r.name].filter(Boolean).join(" / "),
    lat: r.latitude,
    lng: r.longitude,
    prefecture: r.admin1,
    country: r.country,
  }));
}
