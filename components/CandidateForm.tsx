"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  diagnoseDate,
  prepareLocation,
  prepareLocationFromStation,
  searchPlaces,
  type LocationContext,
} from "@/lib/diagnose";
import {
  loadRecentPlaces,
  saveRecentPlace,
  type RecentPlace,
} from "@/lib/recent-places";
import type { DiagnoseResult, GeocodeCandidate, Station } from "@/lib/types";
import { Calendar } from "./Calendar";
import { DateDetailPanel } from "./DateDetailPanel";
import { StationPicker } from "./StationPicker";

type SelectionSource = "geocoded" | "geolocation" | "station" | "recent";

type SelectedPlace = GeocodeCandidate & {
  source: SelectionSource;
  stationId?: string;
};

type ListItem =
  | { kind: "recent"; place: RecentPlace; index: number }
  | { kind: "candidate"; candidate: GeocodeCandidate; index: number };

export function CandidateForm() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<RecentPlace[]>([]);

  const [location, setLocation] = useState<LocationContext | null>(null);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const listboxId = useId();

  useEffect(() => {
    const id = setTimeout(() => setRecents(loadRecentPlaces()), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (selected) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed);
        setCandidates(results);
        setSearchError(null);
        setSearching(false);
      } catch {
        setCandidates([]);
        setSearchError("検索に失敗しました。通信状態をご確認ください。");
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, selected]);

  const resetLocationState = useCallback(() => {
    setLocation(null);
    setSelectedDate(null);
    setDiagnosis(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    Promise.resolve().then(async () => {
      try {
        const ctx =
          selected.source === "station" && selected.stationId
            ? await prepareLocationFromStation(selected.stationId)
            : await prepareLocation({ lat: selected.lat, lng: selected.lng });
        if (cancelled) return;
        setLocation(ctx);
        saveRecentPlace({
          name: selected.name,
          lat: selected.lat,
          lng: selected.lng,
        });
        const next = loadRecentPlaces();
        if (!cancelled) setRecents(next);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : "観測点データの取得に失敗しました。",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const items = useMemo<ListItem[]>(() => {
    if (selected) return [];
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return recents.map((p, i) => ({ kind: "recent" as const, place: p, index: i }));
    }
    if (trimmed.length < 2) return [];
    return candidates.map((c, i) => ({
      kind: "candidate" as const,
      candidate: c,
      index: i,
    }));
  }, [selected, query, recents, candidates]);

  const trimmedQuery = query.trim();
  const showNoResults =
    !selected &&
    !searching &&
    searchError === null &&
    trimmedQuery.length >= 2 &&
    candidates.length === 0;

  const dropdownOpen =
    isFocused &&
    !selected &&
    (items.length > 0 || searching || searchError !== null || showNoResults);

  const loadingLocation = selected !== null && location === null && error === null;

  const handleQueryChange = (value: string) => {
    const trimmed = value.trim();
    setSelected(null);
    setQuery(value);
    setGeoError(null);
    setActiveIndex(-1);
    resetLocationState();
    if (trimmed.length >= 2) {
      setSearching(true);
      setSearchError(null);
    } else {
      setCandidates([]);
      setSearching(false);
      setSearchError(null);
    }
  };

  const handleSelectCandidate = (c: GeocodeCandidate) => {
    setSelected({ ...c, source: "geocoded" });
    setQuery("");
    setCandidates([]);
    setSearchError(null);
    setSearching(false);
    setActiveIndex(-1);
    setIsFocused(false);
    resetLocationState();
  };

  const handleSelectRecent = (p: RecentPlace) => {
    setSelected({
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      source: "recent",
    });
    setQuery("");
    setCandidates([]);
    setSearchError(null);
    setSearching(false);
    setActiveIndex(-1);
    setIsFocused(false);
    resetLocationState();
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setCandidates([]);
    setSearchError(null);
    setSearching(false);
    setGeoError(null);
    setActiveIndex(-1);
    resetLocationState();
    inputRef.current?.focus();
  };

  const handleSelectStation = (s: Station) => {
    setSelected({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      prefecture: s.prefecture,
      source: "station",
      stationId: s.id,
    });
    setQuery("");
    setCandidates([]);
    setSearchError(null);
    setSearching(false);
    setGeoError(null);
    setActiveIndex(-1);
    setIsFocused(false);
    resetLocationState();
  };

  const handleLocateMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("お使いのブラウザは現在地取得に対応していません。");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setSelected({
          name: "現在地",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: "geolocation",
        });
        setQuery("");
        setCandidates([]);
        setSearchError(null);
        setSearching(false);
        setActiveIndex(-1);
        setIsFocused(false);
        resetLocationState();
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("現在地の利用が許可されませんでした。");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError("現在地を取得できませんでした。");
        } else if (err.code === err.TIMEOUT) {
          setGeoError("現在地の取得がタイムアウトしました。");
        } else {
          setGeoError("現在地を取得できませんでした。");
        }
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isFocused) {
        setIsFocused(true);
        return;
      }
      if (items.length > 0) {
        setActiveIndex((i) => (i + 1) % items.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length > 0) {
        setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
      }
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        const it = items[activeIndex];
        if (it.kind === "candidate") handleSelectCandidate(it.candidate);
        else handleSelectRecent(it.place);
      }
    } else if (e.key === "Escape") {
      if (dropdownOpen) {
        e.preventDefault();
        setIsFocused(false);
      }
    }
  };

  const inputValue = selected ? selected.name : query;
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  return (
    <div className="space-y-6">
      <div ref={containerRef}>
        <label
          htmlFor={`${listboxId}-input`}
          className="block text-sm font-medium"
        >
          場所
        </label>
        <div className="mt-1 flex items-stretch gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id={`${listboxId}-input`}
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 ? optionId(activeIndex) : undefined
              }
              value={inputValue}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="例: 大阪市、東京、京都駅、軽井沢"
              className="w-full rounded-md border border-stone-300 py-2 pl-8 pr-8 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {(query.length > 0 || selected) && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="クリア"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <ClearIcon />
              </button>
            )}
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg">
                {searching && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-stone-500">
                    <Spinner /> 検索中…
                  </div>
                )}
                {searchError && (
                  <div className="px-3 py-2 text-xs text-red-600">
                    {searchError}
                  </div>
                )}
                {showNoResults && (
                  <div className="px-3 py-2 text-xs text-stone-500">
                    「{trimmedQuery}」に一致する場所が見つかりません。
                    <br />
                    県庁所在地名や駅名でお試しください。
                  </div>
                )}
                {trimmedQuery.length === 0 && items.length > 0 && (
                  <div className="border-b border-stone-100 bg-stone-50 px-3 py-1 text-[10px] uppercase tracking-wide text-stone-500">
                    最近選んだ場所
                  </div>
                )}
                {items.length > 0 && (
                  <ul
                    id={listboxId}
                    role="listbox"
                    className="max-h-72 overflow-auto"
                  >
                    {items.map((it) => {
                      const isActive = it.index === activeIndex;
                      const baseClass =
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm";
                      const stateClass = isActive
                        ? "bg-sky-50 text-sky-900"
                        : "text-stone-800 hover:bg-stone-100";
                      if (it.kind === "candidate") {
                        const c = it.candidate;
                        const meta = c.prefecture ?? c.country ?? "";
                        return (
                          <li
                            key={`c-${it.index}`}
                            role="option"
                            aria-selected={isActive}
                            id={optionId(it.index)}
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectCandidate(c)}
                              onMouseEnter={() => setActiveIndex(it.index)}
                              className={`${baseClass} ${stateClass}`}
                            >
                              <span className="truncate">
                                {highlightMatch(c.name, trimmedQuery)}
                              </span>
                              {meta && (
                                <span className="shrink-0 text-xs text-stone-500">
                                  {meta}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      }
                      const p = it.place;
                      return (
                        <li
                          key={`r-${it.index}`}
                          role="option"
                          aria-selected={isActive}
                          id={optionId(it.index)}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectRecent(p)}
                            onMouseEnter={() => setActiveIndex(it.index)}
                            className={`${baseClass} ${stateClass}`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <ClockIcon className="text-stone-400" />
                              <span className="truncate">{p.name}</span>
                            </span>
                            <span className="shrink-0 text-xs text-stone-400">
                              再選択
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(items.length > 0 || searching || showNoResults) && (
                  <div className="border-t border-stone-100 bg-stone-50 px-3 py-1 text-[10px] text-stone-400">
                    ↑↓ 移動 / Enter 選択 / Esc 閉じる
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={geoLoading}
            aria-label="現在地から検索"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {geoLoading ? <Spinner /> : <LocateIcon />}
            <span className="hidden sm:inline">現在地</span>
          </button>
        </div>
        {geoError && (
          <p className="mt-1 text-xs text-red-600">{geoError}</p>
        )}
      </div>

      <StationPicker
        onSelectStation={handleSelectStation}
        activeStationId={location?.station.id ?? null}
      />

      {selected && (
        <div className="flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs text-stone-700">
          <PinIcon className="shrink-0 text-sky-600" />
          {loadingLocation && <span>観測点データを読み込み中…</span>}
          {location && (
            <span>
              {selected.source === "geolocation" ? (
                <>
                  現在地 → 観測地点{" "}
                  <strong>{location.station.name}</strong>
                  <span className="text-stone-500">
                    （{location.station.prefecture}・約{location.station.distanceKm}km）
                  </span>
                </>
              ) : location.station.distanceKm === 0 ? (
                <>
                  観測地点 <strong>{location.station.name}</strong>
                  <span className="text-stone-500">
                    （{location.station.prefecture}）
                  </span>
                </>
              ) : (
                <>
                  最寄観測地点 <strong>{location.station.name}</strong>
                  <span className="text-stone-500">
                    （{location.station.prefecture}・約{location.station.distanceKm}km）
                  </span>
                </>
              )}
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

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-stone-900">
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </svg>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className="animate-spin text-stone-500"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
