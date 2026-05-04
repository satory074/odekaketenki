import { NextResponse } from "next/server";
import { searchPlace } from "@/lib/geocode";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (q.trim().length < 1) {
    return NextResponse.json({ candidates: [] });
  }
  try {
    const candidates = await searchPlace(q, { limit: 5 });
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("geocode error", err);
    return NextResponse.json(
      { candidates: [], error: "geocoding failed" },
      { status: 502 },
    );
  }
}
