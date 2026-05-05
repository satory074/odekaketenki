"use client";

import { useState } from "react";

type Props = {
  selectedDate: string | null;
  onSelect: (date: string) => void;
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

export function Calendar({ selectedDate, onSelect }: Props) {
  const now = new Date();
  const [view, setView] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const today = todayIso();
  const firstDow = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const prevMonthDays = new Date(view.year, view.month, 0).getDate();
  const cells: { date: string; day: number; outside: boolean }[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = view.month === 0 ? 11 : view.month - 1;
    const y = view.month === 0 ? view.year - 1 : view.year;
    cells.push({ date: isoOf(y, m, day), day, outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: isoOf(view.year, view.month, day), day, outside: false });
  }
  while (cells.length < 42) {
    const day = cells.length - (firstDow + daysInMonth) + 1;
    const m = view.month === 11 ? 0 : view.month + 1;
    const y = view.month === 11 ? view.year + 1 : view.year;
    cells.push({ date: isoOf(y, m, day), day, outside: true });
  }

  const goPrev = () => {
    setView((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { year: v.year, month: v.month - 1 },
    );
  };
  const goNext = () => {
    setView((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { year: v.year, month: v.month + 1 },
    );
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          aria-label="前の月"
          className="rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
        >
          ‹
        </button>
        <div className="text-sm font-semibold text-stone-800">
          {view.year}年 {view.month + 1}月
        </div>
        <button
          type="button"
          onClick={goNext}
          aria-label="次の月"
          className="rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
        >
          ›
        </button>
      </div>

      <div
        className="grid gap-1 text-center text-[11px] font-medium text-stone-500"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {WEEK_HEADERS.map((label, i) => (
          <div
            key={label}
            className={
              i === 0
                ? "py-1 text-rose-500"
                : i === 6
                  ? "py-1 text-sky-500"
                  : "py-1"
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
          const baseColor = cell.outside
            ? "text-stone-300"
            : dow === 0
              ? "text-rose-600"
              : dow === 6
                ? "text-sky-600"
                : "text-stone-800";
          const bg = isSelected
            ? "bg-sky-600 text-white hover:bg-sky-700"
            : "hover:bg-stone-100";
          const ring = isToday && !isSelected ? "ring-1 ring-sky-400" : "";
          return (
            <button
              key={`${cell.date}-${i}`}
              type="button"
              onClick={() => onSelect(cell.date)}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              className={`aspect-square rounded text-sm tabular-nums ${
                isSelected ? "" : baseColor
              } ${bg} ${ring}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
