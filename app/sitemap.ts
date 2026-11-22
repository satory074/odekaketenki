import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { publishedStations } from "@/lib/station-pages";

// 検索に出すページ = ここに載るページ (scripts/seo-check.mjs が一致を検査する)。
// Google が使わない changefreq / priority は書かない。
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("") },
    { url: absoluteUrl("stations/") },
    ...publishedStations().map((s) => ({ url: absoluteUrl(`stations/${s.id}/`) })),
  ];
}
