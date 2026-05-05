import type { DailyOffset } from "@/lib/types";

type Props = {
  data: DailyOffset[];
  variant: "temp" | "rain";
};

const COLOR = {
  tmax: { line: "#f97316", dot: "#c2410c", text: "#9a3412" },
  tmin: { line: "#0ea5e9", dot: "#0369a1", text: "#0c4a6e" },
  rain: { line: "#4f46e5", dot: "#3730a3", area: "#e0e7ff", text: "#3730a3" },
  axis: "#a8a29e",
  pin: "#b45309",
  pinBg: "#fef3c7",
};

const W = 240;
const H = 70;
const padX = 24;
const padTop = 10;
const padBottom = 14;

export function OffsetSparkline({ data, variant }: Props) {
  if (data.length === 0) return null;

  const offsets = data.map((d) => d.offset);
  const minOff = Math.min(...offsets);
  const maxOff = Math.max(...offsets);
  const offRange = Math.max(1, maxOff - minOff);
  const xOf = (off: number) => padX + ((off - minOff) / offRange) * (W - padX - 6);

  const xLabels = [
    { off: minOff, text: `${minOff}d` },
    { off: Math.round((minOff + 0) / 2), text: `${Math.round((minOff + 0) / 2)}d` },
    { off: 0, text: "候補日" },
    { off: Math.round((0 + maxOff) / 2), text: `+${Math.round(maxOff / 2)}d` },
    { off: maxOff, text: `+${maxOff}d` },
  ];

  const candidate = data.find((d) => d.offset === 0);
  const pinBandHalf = (W - padX - 6) / offRange / 2.4;

  if (variant === "temp") {
    const allTemps = data.flatMap((d) => [d.tmax, d.tmin]).filter((v) => Number.isFinite(v));
    if (allTemps.length === 0) return null;
    const lo = Math.min(...allTemps);
    const hi = Math.max(...allTemps);
    const span = Math.max(2, hi - lo);
    const yOf = (v: number) => padTop + (1 - (v - lo) / span) * (H - padTop - padBottom);

    const tmaxPath = data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(d.offset)} ${yOf(d.tmax)}`)
      .join(" ");
    const tminPath = data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(d.offset)} ${yOf(d.tmin)}`)
      .join(" ");

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y axis labels */}
        <text x="2" y={padTop + 3} fontSize="7" fill={COLOR.axis} fontFamily="ui-monospace, monospace">
          {hi.toFixed(0)}℃
        </text>
        <text x="2" y={H - padBottom + 1} fontSize="7" fill={COLOR.axis} fontFamily="ui-monospace, monospace">
          {lo.toFixed(0)}℃
        </text>
        {/* candidate-day band */}
        <rect
          x={xOf(0) - pinBandHalf}
          y={padTop - 2}
          width={pinBandHalf * 2}
          height={H - padTop - padBottom + 4}
          fill={COLOR.pinBg}
          opacity="0.6"
        />
        <line
          x1={xOf(0)}
          x2={xOf(0)}
          y1={padTop - 2}
          y2={H - padBottom + 2}
          strokeWidth="0.7"
          stroke={COLOR.pin}
          strokeDasharray="2 1.5"
        />
        {/* lines */}
        <path d={tmaxPath} fill="none" strokeWidth="1.6" stroke={COLOR.tmax.line} strokeLinejoin="round" />
        <path d={tminPath} fill="none" strokeWidth="1.6" stroke={COLOR.tmin.line} strokeLinejoin="round" />
        {/* dots */}
        {data.map((d) => (
          <g key={d.offset}>
            <circle
              cx={xOf(d.offset)}
              cy={yOf(d.tmax)}
              r={d.offset === 0 ? 2 : 1.2}
              fill={COLOR.tmax.dot}
            />
            <circle
              cx={xOf(d.offset)}
              cy={yOf(d.tmin)}
              r={d.offset === 0 ? 2 : 1.2}
              fill={COLOR.tmin.dot}
            />
          </g>
        ))}
        {/* candidate-day value labels */}
        {candidate && (
          <>
            <text
              x={xOf(0)}
              y={yOf(candidate.tmax) - 3.4}
              textAnchor="middle"
              fontSize="6.5"
              fontWeight="700"
              fill={COLOR.tmax.text}
              fontFamily="ui-monospace, monospace"
            >
              {candidate.tmax.toFixed(1)}
            </text>
            <text
              x={xOf(0)}
              y={yOf(candidate.tmin) + 7}
              textAnchor="middle"
              fontSize="6.5"
              fontWeight="700"
              fill={COLOR.tmin.text}
              fontFamily="ui-monospace, monospace"
            >
              {candidate.tmin.toFixed(1)}
            </text>
          </>
        )}
        {/* X axis labels */}
        {xLabels.map((l) => (
          <text
            key={l.text}
            x={xOf(l.off)}
            y={H - 2}
            textAnchor="middle"
            fontSize="6.5"
            fill={l.off === 0 ? COLOR.pin : COLOR.axis}
            fontWeight={l.off === 0 ? 700 : 400}
            fontFamily="ui-monospace, monospace"
          >
            {l.text}
          </text>
        ))}
      </svg>
    );
  }

  const probs = data.map((d) => d.rainProb);
  const hi = Math.max(0.4, ...probs);
  const yOf = (v: number) => padTop + (1 - v / hi) * (H - padTop - padBottom);
  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(d.offset)} ${yOf(d.rainProb)}`)
    .join(" ");
  const areaPath = `${path} L ${xOf(maxOff)} ${H - padBottom} L ${xOf(minOff)} ${H - padBottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Y axis labels */}
      <text x="2" y={padTop + 3} fontSize="7" fill={COLOR.axis} fontFamily="ui-monospace, monospace">
        {Math.round(hi * 100)}%
      </text>
      <text x="2" y={H - padBottom + 1} fontSize="7" fill={COLOR.axis} fontFamily="ui-monospace, monospace">
        0%
      </text>
      {/* candidate-day band */}
      <rect
        x={xOf(0) - pinBandHalf}
        y={padTop - 2}
        width={pinBandHalf * 2}
        height={H - padTop - padBottom + 4}
        fill={COLOR.pinBg}
        opacity="0.6"
      />
      <line
        x1={xOf(0)}
        x2={xOf(0)}
        y1={padTop - 2}
        y2={H - padBottom + 2}
        strokeWidth="0.7"
        stroke={COLOR.pin}
        strokeDasharray="2 1.5"
      />
      <path d={areaPath} fill={COLOR.rain.area} />
      <path d={path} fill="none" strokeWidth="1.6" stroke={COLOR.rain.line} strokeLinejoin="round" />
      {data.map((d) => (
        <circle
          key={d.offset}
          cx={xOf(d.offset)}
          cy={yOf(d.rainProb)}
          r={d.offset === 0 ? 2 : 1.2}
          fill={COLOR.rain.dot}
        />
      ))}
      {candidate && (
        <text
          x={xOf(0)}
          y={yOf(candidate.rainProb) - 3.4}
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="700"
          fill={COLOR.rain.text}
          fontFamily="ui-monospace, monospace"
        >
          {Math.round(candidate.rainProb * 100)}%
        </text>
      )}
      {xLabels.map((l) => (
        <text
          key={l.text}
          x={xOf(l.off)}
          y={H - 2}
          textAnchor="middle"
          fontSize="6.5"
          fill={l.off === 0 ? COLOR.pin : COLOR.axis}
          fontWeight={l.off === 0 ? 700 : 400}
          fontFamily="ui-monospace, monospace"
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
