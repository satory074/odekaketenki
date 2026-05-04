import { promises as fs } from "node:fs";
import path from "node:path";
import type { StationData } from "./types";

const cache = new Map<string, StationData>();

export async function loadStationData(stationId: string): Promise<StationData | null> {
  const cached = cache.get(stationId);
  if (cached) return cached;
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "jma",
    `${stationId}.json`,
  );
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as StationData;
    cache.set(stationId, parsed);
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
