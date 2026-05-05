const KEY = "odekaketenki:recent-places";
const MAX = 5;

export type RecentPlace = {
  name: string;
  lat: number;
  lng: number;
  ts: number;
};

export function loadRecentPlaces(): RecentPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is RecentPlace => {
        if (!p || typeof p !== "object") return false;
        const r = p as Partial<RecentPlace>;
        return (
          typeof r.name === "string" &&
          typeof r.lat === "number" &&
          typeof r.lng === "number" &&
          typeof r.ts === "number"
        );
      })
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveRecentPlace(place: Omit<RecentPlace, "ts">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecentPlaces();
    const dedup = existing.filter(
      (p) => !(p.name === place.name && p.lat === place.lat && p.lng === place.lng),
    );
    const next: RecentPlace[] = [{ ...place, ts: Date.now() }, ...dedup].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota/serialization errors
  }
}

export function clearRecentPlaces(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
