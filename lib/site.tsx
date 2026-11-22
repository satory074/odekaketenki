import type { Metadata } from "next";

// 公開 URL と、ページごとの <head> (canonical・OG・twitter) と JSON-LD の土台。
// canonical / og:url は「そのページ自身の絶対 URL・ディレクトリは末尾 /」で必ず一致させる
// (scripts/seo-check.mjs が検査する)。相対 URL を metadataBase に解決させると basePath の扱いで
// ずれやすいので、ここでは常に絶対 URL の文字列を渡す。

export const SITE_NAME = "お出かけ天気ナビ";
export const SITE_URL = "https://satory074.github.io/odekaketenki/";
export const OG_IMAGE = `${SITE_URL}og-image.png`;
export const WEBSITE_ID = `${SITE_URL}#website`;

/** satory074.com 側で Person として定義している作者。全アプリ共通の形 */
export const AUTHOR = {
  "@type": "Person",
  "@id": "https://satory074.com/#person",
  name: "satory074",
  url: "https://satory074.com/",
} as const;

/** "stations/tokyo/" → 絶対 URL。トップは "" */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.replace(/^\//, "")}`;
}

export function pageMetadata(args: {
  title: string;
  description: string;
  /** SITE_URL からの相対パス。末尾 / 付き ("" = トップ) */
  path: string;
  /** OG / twitter 用の短いタイトル (省略時は title) */
  shareTitle?: string;
  shareDescription?: string;
}): Metadata {
  const url = absoluteUrl(args.path);
  const shareTitle = args.shareTitle ?? args.title;
  const shareDescription = args.shareDescription ?? args.description;
  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: url },
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      type: "website",
      locale: "ja_JP",
      siteName: SITE_NAME,
      url,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: "お出かけ天気ナビ — 過去30年の天気統計で日取りを決める",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: [OG_IMAGE],
    },
  };
}

/** JSON-LD を 1 つ出す。`</script>` で閉じられないよう `<` をエスケープする */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(
          /</g,
          "\\u003c",
        ),
      }}
    />
  );
}
