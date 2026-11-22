import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// 注意: github.io のプロジェクトサイトでは、クローラーが読むのはドメイン直下の
// https://satory074.github.io/robots.txt だけで、この /odekaketenki/robots.txt は読まれない。
// サイトマップの場所はそちら (satory074/satory074.github.io リポジトリ) にも書く。
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("sitemap.xml"),
  };
}
