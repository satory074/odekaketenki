"use client";

import { useEffect, useRef, useState } from "react";
import {
  diagnoseDate,
  prepareLocation,
  searchPlaces,
  type LocationContext,
} from "@/lib/diagnose";
import type { DiagnoseResult, GeocodeCandidate } from "@/lib/types";
import { Calendar } from "./Calendar";
import { DateDetailPanel } from "./DateDetailPanel";

export function CandidateForm() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selected, setSelected] = useState<GeocodeCandidate | null>(null);
  const [searching, setSearching] = useState(false);

  const [location, setLocation] = useState<LocationContext | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (query.trim().length < 2) {
        setCandidates([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchPlaces(query);
        setCandidates(results);
      } catch {
        setCandidates([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, selected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      try {
        const ctx = await prepareLocation({ lat: selected.lat, lng: selected.lng });
        if (cancelled) return;
        setLocation(ctx);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : "観測点データの取得に失敗しました。");
      } finally {
        if (!cancelled) setLoadingLocation(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const resetLocationState = () => {
    setLocation(null);
    setSelectedDate(null);
    setDiagnosis(null);
    setError(null);
  };

  const handleQueryChange = (value: string) => {
    setSelected(null);
    setQuery(value);
    setLoadingLocation(false);
    resetLocationState();
  };

  const handleSelectCandidate = (c: GeocodeCandidate) => {
    setSelected(c);
    setQuery("");
    setCandidates([]);
    resetLocationState();
    setLoadingLocation(true);
  };

  const handleSelectDate = (date: string) => {
    if (!location || !selected) return;
    try {
      const result = diagnoseDate({
        stationData: location.stationData,
        stationName: location.station.name,
        placeName: selected.name,
        date,
      });
      setSelectedDate(date);
      setDiagnosis(result);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "診断に失敗しました。");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium">場所</label>
        <div className="relative mt-1">
          <input
            type="text"
            value={selected ? selected.name : query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="例: 大阪市、東京、京都駅、軽井沢"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {!selected && candidates.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
              {candidates.map((c, i) => (
                <li key={`${c.lat}-${c.lng}-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectCandidate(c)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-100"
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-stone-400">
                      {c.lat.toFixed(2)}, {c.lng.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!selected && searching && (
            <p className="mt-1 text-xs text-stone-400">検索中…</p>
          )}
        </div>
      </div>

      {selected && (
        <div className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-600">
          {loadingLocation && <span>観測点データを読み込み中…</span>}
          {location && (
            <span>
              最寄観測地点: <strong>{location.station.name}</strong>
              <span className="text-stone-400"> ({location.station.prefecture})</span>
              <span className="ml-1">/ 距離 約{location.station.distanceKm}km</span>
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {location && (
        <div>
          <p className="mb-2 text-xs text-stone-500">
            日付をクリックすると、その日（前後7日 × 過去30年）の天気リスクを表示します。
          </p>
          <Calendar selectedDate={selectedDate} onSelect={handleSelectDate} />
        </div>
      )}

      {diagnosis && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-stone-800">
            {diagnosis.date.replace(/-/g, "/")} の天気リスク
          </h2>
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            <DateDetailPanel result={diagnosis} />
          </div>
        </section>
      )}
    </div>
  );
}
