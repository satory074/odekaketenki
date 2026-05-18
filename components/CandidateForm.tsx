"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  diagnoseDate,
  diagnoseMonth,
  prepareLocation,
  prepareLocationFromStation,
  type LocationContext,
} from "@/lib/diagnose";
import type { DiagnoseResult, Station } from "@/lib/types";
import { AppShell } from "./AppShell";
import { Calendar } from "./Calendar";
import { DateDetailPanel } from "./DateDetailPanel";
import {
  GridIcon,
  LocateIcon,
  PinIcon,
  Spinner,
} from "./icons";
import {
  SearchCombobox,
  type SearchSelection,
} from "./SearchCombobox";
import { Sheet } from "./Sheet";
import { StationPicker } from "./StationPicker";

type SelectionSource = "geocoded" | "geolocation" | "station" | "recent";

type SelectedPlace = {
  name: string;
  lat: number;
  lng: number;
  prefecture?: string;
  source: SelectionSource;
  stationId?: string;
};

export function CandidateForm() {
  const now = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [location, setLocation] = useState<LocationContext | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stationSheetOpen, setStationSheetOpen] = useState(false);
  const [detailDismissed, setDetailDismissed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (matches: boolean) => setIsDesktop(matches);
    const id = window.setTimeout(() => onChange(mq.matches), 0);
    const listener = (e: MediaQueryListEvent) => onChange(e.matches);
    mq.addEventListener("change", listener);
    return () => {
      window.clearTimeout(id);
      mq.removeEventListener("change", listener);
    };
  }, []);

  const monthData = useMemo(() => {
    if (!location) return undefined;
    return diagnoseMonth({
      stationData: location.stationData,
      year: viewYear,
      month: viewMonth,
    });
  }, [location, viewYear, viewMonth]);

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
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "観測点データの取得に失敗しました。",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const handleSelectFromSearch = (place: SearchSelection) => {
    setSelected({
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      prefecture: place.prefecture,
      source: place.source,
    });
    setGeoError(null);
    resetLocationState();
  };

  const handleClear = () => {
    setSelected(null);
    setGeoError(null);
    resetLocationState();
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
    setGeoError(null);
    setStationSheetOpen(false);
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
      setDetailDismissed(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "診断に失敗しました。");
    }
  };

  const loadingLocation =
    selected !== null && location === null && error === null;

  return (
    <AppShell
      headerSearch={
        <SearchCombobox
          displayValue={selected?.name ?? null}
          onSelectPlace={handleSelectFromSearch}
          onClear={handleClear}
        />
      }
      headerActions={
        <>
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={geoLoading}
            aria-label="現在地から検索"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            {geoLoading ? <Spinner size={14} /> : <LocateIcon size={14} />}
            <span className="hidden md:inline">現在地</span>
          </button>
          <button
            type="button"
            onClick={() => setStationSheetOpen(true)}
            aria-label="観測地点から選ぶ"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <GridIcon size={14} />
            <span className="hidden md:inline">観測地点</span>
          </button>
        </>
      }
    >
      <section className="mb-6 sm:mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          候補日の天気リスクを、過去30年のデータで比較
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          結婚式・旅行・前撮りなど、イベントの日取りに迷ったら。場所を選んでカレンダーの日付をクリックすると、その日（±7日 × 過去30年）の
          <strong className="font-medium text-slate-900">
            雨・暑さ・寒さ・風
          </strong>
          リスクが分かります。
        </p>
      </section>

      <div className="space-y-5">
        {geoError && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {geoError}
          </p>
        )}

        {selected && (
          <div className="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
            <PinIcon className="shrink-0 text-sky-600" size={16} />
            {loadingLocation && (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Spinner size={14} className="text-sky-500" />
                観測点データを読み込み中…
              </span>
            )}
            {location && (
              <span className="truncate">
                {selected.source === "geolocation" ? (
                  <>
                    現在地 → 観測地点{" "}
                    <strong className="font-semibold">
                      {location.station.name}
                    </strong>
                    <span className="text-slate-500">
                      （{location.station.prefecture}・約
                      {location.station.distanceKm}km）
                    </span>
                  </>
                ) : location.station.distanceKm === 0 ? (
                  <>
                    観測地点{" "}
                    <strong className="font-semibold">
                      {location.station.name}
                    </strong>
                    <span className="text-slate-500">
                      （{location.station.prefecture}）
                    </span>
                  </>
                ) : (
                  <>
                    最寄観測地点{" "}
                    <strong className="font-semibold">
                      {location.station.name}
                    </strong>
                    <span className="text-slate-500">
                      （{location.station.prefecture}・約
                      {location.station.distanceKm}km）
                    </span>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        {!selected && !geoError && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <p className="text-sm text-slate-600">
              まずは上の検索バーから場所を選ぶか、「現在地」「観測地点」ボタンから始めましょう。
            </p>
          </div>
        )}

        {location && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                日付をクリックすると、その日（±7日 × 過去30年）の天気リスクを表示します。
              </p>
              <Calendar
                selectedDate={selectedDate}
                onSelect={handleSelectDate}
                viewYear={viewYear}
                viewMonth={viewMonth}
                onChangeView={(y, m) => {
                  setViewYear(y);
                  setViewMonth(m);
                }}
                monthData={monthData}
              />
            </div>
            <div className="hidden lg:block">
              {diagnosis ? (
                <section
                  aria-live="polite"
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <DateDetailPanel result={diagnosis} />
                </section>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                  カレンダーの日付をクリックすると、ここに詳細が表示されます。
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <Sheet
        open={stationSheetOpen}
        onClose={() => setStationSheetOpen(false)}
        title="観測地点から選ぶ"
        size="tall"
      >
        <div className="px-5 pb-6 pt-2">
          <StationPicker
            onSelectStation={handleSelectStation}
            activeStationId={location?.station.id ?? null}
          />
        </div>
      </Sheet>

      <Sheet
        open={!isDesktop && diagnosis !== null && !detailDismissed}
        onClose={() => setDetailDismissed(true)}
        title={
          diagnosis ? `${diagnosis.date.replace(/-/g, "/")} の天気リスク` : ""
        }
        size="tall"
      >
        {diagnosis && <DateDetailPanel result={diagnosis} />}
      </Sheet>
    </AppShell>
  );
}
