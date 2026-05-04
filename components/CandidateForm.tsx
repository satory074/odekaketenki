"use client";

import { useEffect, useRef, useState } from "react";
import { diagnose, searchPlaces } from "@/lib/diagnose";
import type {
  DiagnoseResponse,
  GeocodeCandidate,
} from "@/lib/types";
import { CompareCards } from "./CompareCards";

const MAX_DATES = 5;

function todayPlus(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CandidateForm() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selected, setSelected] = useState<GeocodeCandidate | null>(null);
  const [searching, setSearching] = useState(false);
  const [dates, setDates] = useState<string[]>([todayPlus(2)]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
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

  const updateDate = (i: number, value: string) => {
    setDates((prev) => prev.map((d, idx) => (idx === i ? value : d)));
  };
  const addDate = () => {
    if (dates.length >= MAX_DATES) return;
    setDates((prev) => [...prev, todayPlus(prev.length + 2)]);
  };
  const removeDate = (i: number) => {
    setDates((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError("場所を選択してください。");
      return;
    }
    const cleaned = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (cleaned.length === 0) {
      setError("有効な候補日を1件以上入力してください。");
      return;
    }
    setSubmitting(true);
    try {
      const data = await diagnose({
        lat: selected.lat,
        lng: selected.lng,
        dates: cleaned,
        placeName: selected.name,
      });
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "診断に失敗しました。");
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium">場所</label>
          <div className="relative mt-1">
            <input
              type="text"
              value={selected ? selected.name : query}
              onChange={(e) => {
                setSelected(null);
                setQuery(e.target.value);
              }}
              placeholder="例: 大阪市、東京、京都駅、軽井沢"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {!selected && candidates.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
                {candidates.map((c, i) => (
                  <li key={`${c.lat}-${c.lng}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(c);
                        setQuery("");
                        setCandidates([]);
                      }}
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

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">候補日（最大{MAX_DATES}件）</label>
            {dates.length < MAX_DATES && (
              <button
                type="button"
                onClick={addDate}
                className="text-xs text-sky-700 hover:underline"
              >
                + 追加
              </button>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {dates.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="date"
                  value={d}
                  onChange={(e) => updateDate(i, e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                {dates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDate(i)}
                    className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100"
                    aria-label="この候補日を削除"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {submitting ? "診断中…" : "天気リスクを診断する"}
        </button>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      {result && <CompareCards data={result} />}
    </>
  );
}
