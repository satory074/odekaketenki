import type { DailyOffset } from "@/lib/types";

type Props = {
  data: DailyOffset[];
  variant: "temp" | "rain";
};

const COLOR = {
  tmax: { line: "#f97316", dot: "#c2410c" },
  tmin: { line: "#0ea5e9", dot: "#0369a1" },
  rain: { line: "#4f46e5", dot: "#3730a3", area: "#e0e7ff" },
  axis: "#a8a29e",
  pin: "#78716c",
};

export function OffsetSparkline({ data, variant }: Props) {
  if (data.length === 0) return null;

  const W = 200;
  const H = 50;
  const padX = 4;
  const padY = 6;

  const offsets = data.map((d) => d.offset);
  const minOff = Math.min(...offsets);
  const maxOff = Math.max(...offsets);
  const offRange = Math.max(1, maxOff - minOff);
  const xOf = (off: number) => padX + ((off - minOff) / offRange) * (W - padX * 2);

  if (variant === "temp") {
    const allTemps = data.flatMap((d) => [d.tmax, d.tmin]).filter((v) => Number.isFinite(v));
    if (allTemps.length === 0) return null;
    const lo = Math.min(...allTemps);
    const hi = Math.max(...allTemps);
    const span = Math.max(2, hi - lo);
    const yOf = (v: number) => padY + (1 - (v - lo) / span) * (H - padY * 2);

    const tmaxPath = data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(d.offset)} ${yOf(d.tmax)}`)
      .join(" ");
    const tminPath = data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(d.offset)} ${yOf(d.tmin)}`)
      .join(" ");

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <line
          x1={xOf(0)}
          x2={xOf(0)}
          y1={padY - 2}
          y2={H - padY + 2}
          strokeWidth="0.6"
          stroke={COLOR.pin}
          strokeDasharray="1.5 1.5"
        />
        <path d={tmaxPath} fill="none" strokeWidth="1.6" stroke={COLOR.tmax.line} />
        <path d={tminPath} fill="none" strokeWidth="1.6" stroke={COLOR.tmin.line} />
        {data.map((d) => (
          <g key={d.offset}>
            <circle
              cx={xOf(d.offset)}
              cy={yOf(d.tmax)}
              r={d.offset === 0 ? 1.6 : 0.8}
              fill={COLOR.tmax.dot}
            />
            <circle
              cx={xOf(d.offset)}
              cy={yOf(d.tmin)}
              r={d.offset === 0 ? 1.6 : 0.8}
              fill={COLOR.tmin.dot}
            />
          </g>
        ))}
        <text x={xOf(minOff)} y={H - 1} fontSize="5" fill={COLOR.axis} fontFamily="ui-monospace, monospace">
          -7d
        </text>
        <text
          x={xOf(0)}
          y={H - 1}
          textAnchor="middle"
          fontSize="5"
          fill={COLOR.pin}
          fontFamily="ui-monospace, monospace"
          fontWeight="600"
        >
          候補日
        </text>
        <text
          x={xOf(maxOff)}
          y={H - 1}
          textAnchor="end"
          fontSize="5"
          fill={COLOR.axis}
          fontFamily="ui-monospace, monospace"
        >
          +7d
        </text>
      </svg>
    );
  }

  const probs = data.map((d) => d.rainProb);
  const hi = Math.max(0.4, ...probs);
  const yOf = (v: number) => padY + (1 - v / hi) * (H - padY * 2);
  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(d.offset)} ${yOf(d.rainProb)}`)
    .join(" ");
  const areaPath = `${path} L ${xOf(maxOff)} ${H - padY} L ${xOf(minOff)} ${H - padY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <line
        x1={xOf(0)}
        x2={xOf(0)}
        y1={padY - 2}
        y2={H - padY + 2}
        strokeWidth="0.6"
        stroke={COLOR.pin}
        strokeDasharray="1.5 1.5"
      />
      <path d={areaPath} fill={COLOR.rain.area} />
      <path d={path} fill="none" strokeWidth="1.6" stroke={COLOR.rain.line} />
      {data.map((d) => (
        <circle
          key={d.offset}
          cx={xOf(d.offset)}
          cy={yOf(d.rainProb)}
          r={d.offset === 0 ? 1.6 : 0.8}
          fill={COLOR.rain.dot}
        />
      ))}
      <text x={xOf(minOff)} y={H - 1} fontSize="5" fill={COLOR.axis} fontFamily="ui-monospace, monospace">
        -7d
      </text>
      <text
        x={xOf(0)}
        y={H - 1}
        textAnchor="middle"
        fontSize="5"
        fill={COLOR.pin}
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
      >
        候補日
      </text>
      <text
        x={xOf(maxOff)}
        y={H - 1}
        textAnchor="end"
        fontSize="5"
        fill={COLOR.axis}
        fontFamily="ui-monospace, monospace"
      >
        +7d
      </text>
    </svg>
  );
}
