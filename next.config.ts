import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// フッターの「集計範囲」の年 (例: 1996–2025)。全地点が同じ年の並びを持つので先頭の地点から読む。
// 以前は文字列で書いていて、データ (1996–2025) とずれていた (1995–2024 と表示)。
function dataYears(): string {
  const dir = join(process.cwd(), "public", "data");
  const stations = JSON.parse(readFileSync(join(dir, "stations.json"), "utf8")) as { id: string }[];
  const { years } = JSON.parse(
    readFileSync(join(dir, "jma", `${stations[0].id}.json`), "utf8"),
  ) as { years: number[] };
  return `${Math.min(...years)}–${Math.max(...years)}`;
}

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  env: { NEXT_PUBLIC_DATA_YEARS: dataYears() },
};

export default nextConfig;
