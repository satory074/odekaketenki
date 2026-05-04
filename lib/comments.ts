import type { Aggregated, ScoreReport } from "./types";

function pickPrimary(scores: ScoreReport): "rain" | "heat" | "cold" | "wind" | null {
  const order: Array<["rain" | "heat" | "cold" | "wind", number]> = [
    ["heat", scores.heat === "high" ? 3 : scores.heat === "mid" ? 2 : 0],
    ["cold", scores.cold === "high" ? 3 : scores.cold === "mid" ? 2 : 0],
    ["rain", scores.rain === "high" ? 3 : scores.rain === "mid" ? 2 : 0],
    ["wind", scores.wind === "high" ? 3 : scores.wind === "mid" ? 2 : 0],
  ];
  order.sort((a, b) => b[1] - a[1]);
  return order[0][1] === 0 ? null : order[0][0];
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function generateComment(
  stats: Aggregated,
  scores: ScoreReport,
  context: { date: string; placeName?: string },
): string {
  const place = context.placeName ?? "この地点";
  const month = Number(context.date.slice(5, 7));
  const sentences: string[] = [];

  const primary = pickPrimary(scores);

  if (primary === "heat") {
    sentences.push(
      `${month}月の${place}は最高気温の平均が約${stats.avgTmax.toFixed(1)}℃で、暑さによるゲスト負担が大きい時期です。`,
    );
  } else if (primary === "cold") {
    sentences.push(
      `${month}月の${place}は最低気温の平均が約${stats.avgTmin.toFixed(1)}℃で、夜間や朝の冷え込みに注意が必要です。`,
    );
  } else if (primary === "rain") {
    sentences.push(
      `${month}月の${place}は同時期の雨日の割合が約${pct(stats.rainProb)}と高めで、雨対策を優先したい時期です。`,
    );
  } else if (primary === "wind") {
    sentences.push(
      `${month}月の${place}は平均風速が${stats.avgWind.toFixed(1)} m/sと強めで、屋外撮影や髪型の崩れに注意が必要です。`,
    );
  } else {
    sentences.push(
      `${month}月の${place}は天候面で目立った高リスクはなく、比較的安定して過ごしやすい時期です。`,
    );
  }

  if (stats.heavyRainProb >= 0.08) {
    sentences.push(
      `30mm以上の大雨日も約${pct(stats.heavyRainProb)}観測されており、屋外演出や移動経路は雨天時プランも検討しておくと安心です。`,
    );
  }

  if (primary === "heat" && stats.avgHumidity !== null && stats.avgHumidity >= 70) {
    sentences.push(
      `湿度の平均も約${Math.round(stats.avgHumidity)}%と高く、体感の蒸し暑さが想像以上になりやすい点も意識しておきたいところです。`,
    );
  }

  if (primary !== "rain" && stats.rainProb >= 0.2) {
    sentences.push(
      `雨日の割合は約${pct(stats.rainProb)}で、突発的な天候変化への備えはあった方が無難です。`,
    );
  }

  if (sentences.length === 1 && primary === null) {
    sentences.push(
      `平均最高 ${stats.avgTmax.toFixed(1)}℃ / 平均最低 ${stats.avgTmin.toFixed(1)}℃、雨日の割合は約${pct(stats.rainProb)}です。`,
    );
  }

  return sentences.join("");
}
