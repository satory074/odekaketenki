type Tier = "good" | "mid" | "bad";

type Props = {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Total score 0-100 */
  score: number;
  /** Generated comment text */
  comment: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function tierOf(score: number): Tier {
  if (score >= 75) return "good";
  if (score >= 50) return "mid";
  return "bad";
}

const TIER: Record<
  Tier,
  {
    label: string;
    container: string;
    accent: string;
    chip: string;
  }
> = {
  good: {
    label: "比較的良好",
    container: "from-emerald-50 to-emerald-100/70 ring-emerald-200",
    accent: "text-emerald-700",
    chip: "bg-white/80 text-emerald-700",
  },
  mid: {
    label: "やや注意",
    container: "from-amber-50 to-amber-100/70 ring-amber-200",
    accent: "text-amber-700",
    chip: "bg-white/80 text-amber-700",
  },
  bad: {
    label: "要注意",
    container: "from-rose-50 to-rose-100/70 ring-rose-200",
    accent: "text-rose-700",
    chip: "bg-white/80 text-rose-700",
  },
};

function formatDate(iso: string): string {
  const [yy, mm, dd] = iso.split("-").map(Number);
  const d = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
  const wd = WEEKDAYS[d.getDay()] ?? "";
  return `${yy}年${mm}月${dd}日（${wd}）`;
}

export function HeroBlock({ date, score, comment }: Props) {
  const tier = tierOf(score);
  const t = TIER[tier];

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-5 ring-1 sm:p-6 ${t.container}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        候補日の天気診断
      </p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">
        {formatDate(date)}
      </h3>

      <div className="mt-5 flex items-baseline gap-3">
        <div
          className={`text-5xl font-bold leading-none tracking-tight tabular-nums sm:text-6xl ${t.accent}`}
        >
          {score}
        </div>
        <div className="flex flex-col gap-1 text-sm text-slate-600">
          <span>
            <span className="tabular-nums">/ 100</span>
          </span>
          <span
            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${t.chip}`}
          >
            {t.label}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">{comment}</p>
    </div>
  );
}
