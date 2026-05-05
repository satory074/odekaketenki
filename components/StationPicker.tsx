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

const PREFECTURE_ORDER: Record<Region, string[]> = {
  "北海道・東北": ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  関東: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
  中部: [
    "新潟県",
    "富山県",
    "石川県",
    "福井県",
    "山梨県",
    "長野県",
    "岐阜県",
    "静岡県",
    "愛知県",
  ],
  近畿: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
  "中国・四国": [
    "鳥取県",
    "島根県",
    "岡山県",
    "広島県",
    "山口県",
    "徳島県",
    "香川県",
    "愛媛県",
    "高知県",
  ],
  "九州・沖縄": [
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
    "沖縄県",
  ],
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

  const groupedByRegionPref = useMemo(() => {
    const map = new Map<Region, Map<string, Station[]>>();
    REGIONS.forEach((r) => map.set(r, new Map()));
    (stations ?? []).forEach((s) => {
      const region = regionOf(s.prefecture);
      const regionMap = map.get(region);
      if (!regionMap) return;
      const list = regionMap.get(s.prefecture) ?? [];
      list.push(s);
      regionMap.set(s.prefecture, list);
    });
    return map;
  }, [stations]);

  const totalCount = stations?.length ?? 0;
  const regionPrefMap = groupedByRegionPref.get(activeRegion) ?? new Map();
  const orderedPrefs = PREFECTURE_ORDER[activeRegion].filter((p) =>
    regionPrefMap.has(p),
  );
  const regionTotal = orderedPrefs.reduce(
    (sum, p) => sum + (regionPrefMap.get(p)?.length ?? 0),
    0,
  );

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
        ) : regionTotal === 0 ? (
          <p className="text-xs text-stone-400">この地域の地点がありません。</p>
        ) : (
          <div role="tabpanel" aria-label={activeRegion} className="space-y-2">
            <p className="text-xs text-stone-500">
              {activeRegion}: {regionTotal}地点（都道府県を開くと地点が表示されます）
            </p>
            {orderedPrefs.map((pref) => {
              const list = regionPrefMap.get(pref) ?? [];
              const sorted = [...list].sort((a, b) => {
                if (a.kind === "s1" && b.kind !== "s1") return -1;
                if (b.kind === "s1" && a.kind !== "s1") return 1;
                return a.name.localeCompare(b.name, "ja");
              });
              const hasActive = sorted.some((s) => s.id === activeStationId);
              return (
                <details
                  key={pref}
                  open={hasActive}
                  className="rounded border border-stone-200 bg-stone-50"
                >
                  <summary className="cursor-pointer select-none px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100">
                    {pref}
                    <span className="ml-1 font-normal text-stone-500">
                      ({list.length})
                    </span>
                  </summary>
                  <div
                    className="grid gap-1 px-2 pb-2 pt-1"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    }}
                  >
                    {sorted.map((s) => {
                      const isActive = s.id === activeStationId;
                      const isAmedas = s.kind === "a1";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onSelectStation(s)}
                          aria-label={`${s.name}（${s.prefecture}${isAmedas ? "・アメダス" : ""}）`}
                          title={`${s.name}（${s.prefecture}）${isAmedas ? " ※アメダス: 観測項目限定" : ""}`}
                          className={
                            isActive
                              ? "flex items-center justify-between gap-1 rounded-md border border-sky-500 bg-sky-50 px-2 py-1 text-sm font-medium text-sky-700"
                              : "flex items-center justify-between gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-sm text-stone-700 hover:border-sky-400 hover:bg-sky-50"
                          }
                        >
                          <span className="truncate">{s.name}</span>
                          {isAmedas && (
                            <span
                              className="shrink-0 rounded bg-stone-100 px-1 text-[10px] font-normal text-stone-500"
                              aria-hidden="true"
                            >
                              A
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
            <p className="pt-1 text-[10px] text-stone-400">
              <span className="inline-block rounded bg-stone-100 px-1 text-stone-500">A</span>{" "}
              = アメダス（観測項目が地点ごとに異なる）
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
