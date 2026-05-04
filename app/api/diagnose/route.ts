import { NextResponse } from "next/server";
import { aggregateAroundDate } from "@/lib/aggregate";
import { generateComment } from "@/lib/comments";
import { loadStationData } from "@/lib/jma-data";
import { score } from "@/lib/scoring";
import { findNearestStation } from "@/lib/stations";
import type { DiagnoseResponse, DiagnoseResult } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  lat: number;
  lng: number;
  dates: string[];
  placeName?: string;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (
    typeof body.lat !== "number" ||
    typeof body.lng !== "number" ||
    !Array.isArray(body.dates) ||
    body.dates.length === 0
  ) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (body.dates.length > 5) {
    return NextResponse.json(
      { error: "too many candidate dates (max 5)" },
      { status: 400 },
    );
  }
  for (const d of body.dates) {
    if (typeof d !== "string" || !ISO_DATE_RE.test(d)) {
      return NextResponse.json(
        { error: `invalid date: ${d}` },
        { status: 400 },
      );
    }
  }

  const nearest = await findNearestStation(body.lat, body.lng);
  if (!nearest) {
    return NextResponse.json(
      { error: "no station available" },
      { status: 503 },
    );
  }

  const stationData = await loadStationData(nearest.station.id);
  if (!stationData) {
    return NextResponse.json(
      { error: `data missing for station ${nearest.station.id}` },
      { status: 503 },
    );
  }

  const results: DiagnoseResult[] = body.dates.map((date) => {
    const stats = aggregateAroundDate(stationData, date);
    const sc = score(stats);
    const comment = generateComment(stats, sc, {
      date,
      placeName: body.placeName ?? nearest.station.name,
    });
    return { date, stats, scores: sc, comment };
  });

  results.sort((a, b) => b.scores.total - a.scores.total);

  const response: DiagnoseResponse = {
    station: {
      id: nearest.station.id,
      name: nearest.station.name,
      prefecture: nearest.station.prefecture,
      distanceKm: Math.round(nearest.distanceKm * 10) / 10,
    },
    results,
  };
  return NextResponse.json(response);
}
