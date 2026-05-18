"use client";

import { useEffect, useMemo, useState } from "react";
import { regionOf, REGIONS, type Region } from "@/lib/regions";
import { loadStations } from "@/lib/stations";
import type { Station } from "@/lib/types";

type Props = {
  onSelectStation: (station: Station) => void;
  activeStationId?: string | null;
};

export function StationPicker({ onSelectStation, activeStationId }: Props) {
  const [stations, setStations] = useState<Station[] | null>(null);
  const [activeRegion, setActiveRegion] = useState<Region>("関東");

  useEffect(() => {
    let cancelled = false;
    loadStations()
      .then((list) => {
        if (!cancelled) setStations(list);
      })
      .catch(() => {
        if (!cancelled) setStations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<Region, Station[]>();
    REGIONS.forEach((r) => map.set(r, []));
    (stations ?? []).forEach((s) => {
      map.get(regionOf(s.prefecture))?.push(s);
    });
    return map;
  }, [stations]);

  const totalCount = stations?.length ?? 0;
  const visible = grouped.get(activeRegion) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        全 {totalCount} 地点（s1 観測点）。地域を切り替えて選んでください。
      </p>

      <div role="tablist" aria-label="地域" className="flex flex-wrap gap-1.5">
        {REGIONS.map((r) => {
          const isActive = r === activeRegion;
          return (
            <button
              key={r}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveRegion(r)}
              className={
                isActive
                  ? "rounded-full bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              }
            >
              {r}
            </button>
          );
        })}
      </div>

      {stations === null ? (
        <p className="py-6 text-center text-xs text-slate-400">
          観測地点を読み込み中…
        </p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          この地域の地点がありません。
        </p>
      ) : (
        <div
          role="tabpanel"
          aria-label={activeRegion}
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
          }}
        >
          {[...visible]
            .sort((a, b) => a.name.localeCompare(b.name, "ja"))
            .map((s) => {
              const isActive = s.id === activeStationId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStation(s)}
                  aria-label={`${s.name}（${s.prefecture}）`}
                  title={`${s.name}（${s.prefecture}）`}
                  className={
                    isActive
                      ? "rounded-lg border border-sky-500 bg-sky-50 px-2.5 py-2 text-sm font-medium text-sky-700 shadow-sm focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                      : "rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  }
                >
                  {s.name}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
