import { assetPath } from "./asset-path";
import type { Station } from "./types";

let cache: Station[] | null = null;
let inflight: Promise<Station[]> | null = null;

export async function loadStations(): Promise<Station[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const resp = await fetch(assetPath("/data/stations.json"));
    if (!resp.ok) throw new Error(`stations load failed: ${resp.status}`);
    const parsed = (await resp.json()) as Station[];
    cache = parsed;
    return parsed;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function findNearestStation(
  lat: number,
  lng: number,
): Promise<{ station: Station; distanceKm: number } | null> {
  const stations = await loadStations();
  if (stations.length === 0) return null;
  let best: Station | null = null;
  let bestDist = Infinity;
  for (const s of stations) {
    const d = haversineKm({ lat, lng }, { lat: s.lat, lng: s.lng });
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  if (!best) return null;
  return { station: best, distanceKm: bestDist };
}
