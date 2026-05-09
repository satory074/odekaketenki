"use client";

import { useEffect, useMemo, useState } from "react";
import { regionOf, REGIONS, type Region } from "@/lib/regions";
import { loadStations } from "@/lib/stations";
import type { Station } from "@/lib/types";

type Props = {
  onSelectStation: (station: Station) => void;
  activeStationId?: string | null;
  defaultOpen?: boolean;
};

export function StationPicker({
  onSelectStation,
  activeStationId,
  defaultOpen = false,
}: Props) {
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
    <details
      className="rounded-md border border-stone-200 bg-white"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
        観測地点から直接えらぶ
        {totalCount > 0 && (
          <span className="ml-1 text-xs font-normal text-stone-500">
            （全{totalCount}地点）
          </span>
        )}
      </summary>
      <div className="space-y-3 border-t border-stone-200 px-3 py-3">
        <div role="tablist" aria-label="地域" className="flex flex-wrap gap-1">
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
                    ? "rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white"
                    : "rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600 hover:bg-stone-100"
                }
              >
                {r}
              </button>
            );
          })}
        </div>

        {stations === null ? (
          <p className="text-xs text-stone-400">観測地点を読み込み中…</p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-stone-400">この地域の地点がありません。</p>
        ) : (
          <div
            role="tabpanel"
            aria-label={activeRegion}
            className="grid gap-1"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
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
                        ? "rounded-md border border-sky-500 bg-sky-50 px-2 py-1.5 text-sm font-medium text-sky-700"
                        : "rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 hover:border-sky-400 hover:bg-sky-50"
                    }
                  >
                    {s.name}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </details>
  );
}
