"use client";

import { useState } from "react";
import type { DiagnoseResponse, DiagnoseResult } from "@/lib/types";
import { BarMeter } from "./charts/BarMeter";
import { OffsetSparkline } from "./charts/OffsetSparkline";
import { DateDetailPanel } from "./DateDetailPanel";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}/${m}/${d}`;
}

function weekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()];
}

function scoreColor(total: number): string {
  if (total >= 80) return "#047857"; // emerald-700
  if (total >= 60) return "#b45309"; // amber-700
  return "#be123c"; // rose-700
}

function scoreBg(total: number): string {
  if (total >= 80) return "#ecfdf5"; // emerald-50
  if (total >= 60) return "#fffbeb"; // amber-50
  return "#fff1f2"; // rose-50
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function CandidateCard({
  result,
  rank,
  total,
  expanded,
  onToggle,
}: {
  result: DiagnoseResult;
  rank: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { date, stats, scores } = result;
  const heatThreshold = { mid: 0.3, high: 0.6 };
  const coldThreshold = { mid: 0.3, high: 0.6 };
  const rainThreshold = { mid: 0.25, high: 0.45 };
  const windThreshold = { mid: 4, high: 6 };

  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <header
        className="flex items-baseline justify-between gap-3 border-b border-stone-100 px-4 py-3"
        style={{ backgroundColor: scoreBg(scores.total) }}
      >
        <div>
          <div className="text-base font-semibold text-stone-800">
            {formatDate(date)}{" "}
            <span className="ml-1 text-sm text-stone-500">({weekday(date)})</span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-stone-500">
            総合ランキング {rank} / {total}位
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-3xl font-bold leading-none"
            style={{ color: scoreColor(scores.total) }}
          >
            {scores.total}
          </div>
          <div className="text-[10px] text-stone-500">/100</div>
        </div>
      </header>

      <div className="space-y-2 px-4 py-3">
        <BarMeter
          axis="rain"
          label="雨"
          value={stats.rainProb}
          max={1}
          thresholds={rainThreshold}
          valueLabel={pct(stats.rainProb)}
        />
        <BarMeter
          axis="heat"
          label="暑さ"
          value={stats.hotDayProb}
          max={1}
          thresholds={heatThreshold}
          valueLabel={pct(stats.hotDayProb)}
        />
        <BarMeter
          axis="cold"
          label="寒さ"
          value={stats.coldDayProb}
          max={1}
          thresholds={coldThreshold}
          valueLabel={pct(stats.coldDayProb)}
        />
        <BarMeter
          axis="wind"
          label="風"
          value={stats.avgWind}
          max={Math.max(8, Math.ceil(stats.windDist.p90 + 1))}
          thresholds={windThreshold}
          valueLabel={`${stats.avgWind.toFixed(1)}m/s`}
        />
      </div>

      <div className="border-t border-stone-100 px-4 py-3">
        <p className="mb-1 text-[10px] text-stone-500">±7日 気温推移</p>
        <OffsetSparkline data={stats.byOffset} variant="temp" />
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-center gap-1 border-t border-stone-100 bg-stone-50 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
      >
        {expanded ? "詳細を閉じる" : "過去30年の詳細を見る"}
        <svg
          aria-hidden
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {expanded && <DateDetailPanel result={result} />}
    </article>
  );
}

export function CompareCards({ data }: { data: DiagnoseResponse }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([data.results[0]?.date]));

  const toggle = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">候補日の天気リスク比較</h2>
        <p className="text-xs text-stone-500">
          最寄観測地点: <strong>{data.station.name}</strong>
          <span className="text-stone-400"> ({data.station.prefecture})</span>
          <span className="ml-1">/ 距離 約{data.station.distanceKm}km</span>
        </p>
      </div>

      <p className="rounded-md bg-stone-50 px-3 py-2 text-[11px] text-stone-600">
        各バーのスケールは候補日全件で共通。中央のティック＝中リスク閾値、右寄りのティック＝高リスク閾値。
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {data.results.map((r, i) => (
          <CandidateCard
            key={r.date}
            result={r}
            rank={i + 1}
            total={data.results.length}
            expanded={expanded.has(r.date)}
            onToggle={() => toggle(r.date)}
          />
        ))}
      </div>
    </section>
  );
}
