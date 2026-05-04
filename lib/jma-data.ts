import { assetPath } from "./asset-path";
import type { StationData } from "./types";

const cache = new Map<string, StationData>();

export async function loadStationData(stationId: string): Promise<StationData | null> {
  const cached = cache.get(stationId);
  if (cached) return cached;
  const resp = await fetch(assetPath(`/data/jma/${stationId}.json`));
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`station data load failed: ${resp.status}`);
  const parsed = (await resp.json()) as StationData;
  cache.set(stationId, parsed);
  return parsed;
}
