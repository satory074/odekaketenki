"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { searchPlaces } from "@/lib/diagnose";
import {
  loadRecentPlaces,
  saveRecentPlace,
  type RecentPlace,
} from "@/lib/recent-places";
import type { GeocodeCandidate } from "@/lib/types";
import { ClearIcon, ClockIcon, SearchIcon, Spinner } from "./icons";

export type SearchSelection = GeocodeCandidate & {
  source: "geocoded" | "recent";
};

type Props = {
  /** When non-null, the input is locked to this label (a place is selected upstream). */
  displayValue: string | null;
  onSelectPlace: (place: SearchSelection) => void;
  onClear: () => void;
};

type ListItem =
  | { kind: "recent"; place: RecentPlace; index: number }
  | { kind: "candidate"; candidate: GeocodeCandidate; index: number };

export function SearchCombobox({ displayValue, onSelectPlace, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<RecentPlace[]>([]);
  const [prevDisplayValue, setPrevDisplayValue] = useState<string | null>(
    displayValue,
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  // Adjust internal state when displayValue changes externally (e.g. station picker)
  if (displayValue !== prevDisplayValue) {
    setPrevDisplayValue(displayValue);
    if (displayValue !== null) {
      setQuery("");
      setCandidates([]);
      setSearching(false);
      setSearchError(null);
      setActiveIndex(-1);
      setIsFocused(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => setRecents(loadRecentPlaces()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (displayValue !== null) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed);
        setCandidates(results);
        setSearchError(null);
      } catch {
        setCandidates([]);
        setSearchError("検索に失敗しました。通信状態をご確認ください。");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, displayValue]);

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
    if (displayValue !== null) return [];
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
  }, [displayValue, query, recents, candidates]);

  const trimmedQuery = query.trim();
  const showNoResults =
    displayValue === null &&
    !searching &&
    searchError === null &&
    trimmedQuery.length >= 2 &&
    candidates.length === 0;

  const dropdownOpen =
    isFocused &&
    displayValue === null &&
    (items.length > 0 || searching || searchError !== null || showNoResults);

  const handleQueryChange = (value: string) => {
    const trimmed = value.trim();
    setQuery(value);
    setActiveIndex(-1);
    if (trimmed.length >= 2) {
      setSearching(true);
      setSearchError(null);
    } else {
      setCandidates([]);
      setSearching(false);
      setSearchError(null);
    }
  };

  const handleSelectCandidate = useCallback(
    (c: GeocodeCandidate) => {
      saveRecentPlace({ name: c.name, lat: c.lat, lng: c.lng });
      setRecents(loadRecentPlaces());
      onSelectPlace({ ...c, source: "geocoded" });
    },
    [onSelectPlace],
  );

  const handleSelectRecent = useCallback(
    (p: RecentPlace) => {
      saveRecentPlace({ name: p.name, lat: p.lat, lng: p.lng });
      setRecents(loadRecentPlaces());
      onSelectPlace({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        source: "recent",
      });
    },
    [onSelectPlace],
  );

  const handleClearClick = () => {
    onClear();
    setQuery("");
    setCandidates([]);
    setActiveIndex(-1);
    setIsFocused(true);
    inputRef.current?.focus();
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

  const inputValue = displayValue ?? query;
  const optionId = (i: number) => `${listboxId}-opt-${i}`;
  const showClearButton = displayValue !== null || query.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        id={`${listboxId}-input`}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="場所を検索"
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
        placeholder="場所を検索（例: 大阪市、東京、京都駅）"
        className="w-full rounded-full border border-slate-300 bg-white py-2 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
      />
      {showClearButton && (
        <button
          type="button"
          onClick={handleClearClick}
          aria-label="クリア"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <ClearIcon size={14} />
        </button>
      )}
      {dropdownOpen && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
          {searching && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              <Spinner size={14} /> 検索中…
            </div>
          )}
          {searchError && (
            <div className="px-3 py-2 text-xs text-rose-700">{searchError}</div>
          )}
          {showNoResults && (
            <div className="px-3 py-2 text-xs text-slate-500">
              「{trimmedQuery}」に一致する場所が見つかりません。
              <br />
              県庁所在地名や駅名でお試しください。
            </div>
          )}
          {trimmedQuery.length === 0 && items.length > 0 && (
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
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
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors";
                const stateClass = isActive
                  ? "bg-sky-50 text-sky-900"
                  : "text-slate-800 hover:bg-slate-50";
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
                          <span className="shrink-0 text-xs text-slate-500">
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
                        <ClockIcon className="text-slate-400" />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        再選択
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {(items.length > 0 || searching || showNoResults) && (
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
              ↑↓ 移動 / Enter 選択 / Esc 閉じる
            </div>
          )}
        </div>
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
      <strong className="font-semibold text-slate-900">
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  );
}
