"use client";

import type { DayBrief } from "@/lib/diagnose";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

type Props = {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  viewYear: number;
  viewMonth: number;
  onChangeView: (year: number, month: number) => void;
  /** Per-date brief used to render the overlay (score color + rain bar) */
  monthData?: Map<string, DayBrief>;
};

const WEEK_HEADERS = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function todayIso(): string {
  const d = new Date();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}

function scoreColor(score: number): string {
  if (score >= 75) return "#10b981"; // emerald-500
  if (score >= 50) return "#f59e0b"; // amber-500
  return "#f43f5e"; // rose-500
}

const RAIN_COLOR = "#6366f1"; // indigo-500

const WEEKDAY_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

export function Calendar({
  selectedDate,
  onSelect,
  viewYear,
  viewMonth,
  onChangeView,
  monthData,
}: Props) {
  const today = todayIso();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: string; day: number; outside: boolean }[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ date: isoOf(y, m, day), day, outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: isoOf(viewYear, viewMonth, day), day, outside: false });
  }
  while (cells.length < 42) {
    const day = cells.length - (firstDow + daysInMonth) + 1;
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ date: isoOf(y, m, day), day, outside: true });
  }

  const goPrev = () => {
    if (viewMonth === 0) onChangeView(viewYear - 1, 11);
    else onChangeView(viewYear, viewMonth - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) onChangeView(viewYear + 1, 0);
    else onChangeView(viewYear, viewMonth + 1);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          aria-label="前の月"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <ChevronLeftIcon />
        </button>
        <div
          className="text-base font-semibold text-slate-900 tabular-nums"
          aria-live="polite"
        >
          {viewYear}年 {viewMonth + 1}月
        </div>
        <button
          type="button"
          onClick={goNext}
          aria-label="次の月"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div
        className="grid gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {WEEK_HEADERS.map((label, i) => (
          <div
            key={label}
            className={
              i === 0
                ? "py-1.5 text-rose-500"
                : i === 6
                  ? "py-1.5 text-sky-500"
                  : "py-1.5"
            }
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="mt-1 grid gap-1"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {cells.map((cell, i) => {
          const dow = i % 7;
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const brief = !cell.outside ? monthData?.get(cell.date) : undefined;

          const dowName = WEEKDAY_LABEL[dow] ?? "";
          const baseTextColor = cell.outside
            ? "text-slate-300"
            : dow === 0
              ? "text-rose-600"
              : dow === 6
                ? "text-sky-600"
                : "text-slate-800";

          const ariaLabel = (() => {
            const [yy, mm, dd] = cell.date.split("-");
            const base = `${yy}年${Number(mm)}月${Number(dd)}日 ${dowName}曜`;
            if (brief) {
              return `${base}、総合スコア${brief.score}、雨日割合${Math.round(brief.rainProb * 100)}%`;
            }
            return base;
          })();

          return (
            <button
              key={`${cell.date}-${i}`}
              type="button"
              onClick={() => onSelect(cell.date)}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              aria-label={ariaLabel}
              className={`relative flex min-h-12 flex-col items-center justify-start rounded-lg border border-transparent px-1 pt-1.5 pb-3 text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 sm:min-h-14 ${
                isSelected
                  ? "bg-sky-600 text-white shadow-sm hover:bg-sky-700"
                  : `${baseTextColor} hover:bg-slate-50 hover:border-slate-200 ${
                      isToday ? "ring-1 ring-sky-400" : ""
                    } ${cell.outside ? "opacity-50" : ""}`
              }`}
            >
              {/* Left score color bar */}
              {brief && !isSelected && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2.5 left-1 top-2 w-1 rounded-full"
                  style={{ backgroundColor: scoreColor(brief.score) }}
                />
              )}

              {/* Date number */}
              <span className={isSelected ? "font-semibold" : "font-medium"}>
                {cell.day}
              </span>

              {/* Bottom rain probability mini bar */}
              {brief && (
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute bottom-1 left-2 right-2 h-1 overflow-hidden rounded-full ${
                    isSelected ? "bg-white/30" : "bg-slate-100"
                  }`}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(4, Math.round(brief.rainProb * 100))}%`,
                      backgroundColor: isSelected ? "#ffffff" : RAIN_COLOR,
                    }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-1 rounded-full"
            style={{ backgroundColor: "#10b981" }}
          />
          <span>総合 ≥75</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-1 rounded-full"
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span>50–74</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-1 rounded-full"
            style={{ backgroundColor: "#f43f5e" }}
          />
          <span>&lt;50</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-1 w-6 rounded-full"
            style={{ backgroundColor: RAIN_COLOR }}
          />
          <span>下端バー = 雨日割合</span>
        </div>
      </div>
    </div>
  );
}
