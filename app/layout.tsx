import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://satory074.github.io/odekaketenki";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const metadata: Metadata = {
  title: "お出かけ天気ナビ — 過去30年の天気から日取りを決める",
  description:
    "結婚式やお出かけの日程を決めるとき、候補日の過去30年の天気統計を比較して、雨・暑さ・寒さ・風のリスクを可視化します。",
  openGraph: {
    title: "お出かけ天気ナビ",
    description: "過去30年の天気統計で、日取りを決める。",
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
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
    title: "お出かけ天気ナビ",
    description: "過去30年の天気統計で、日取りを決める。",
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://geocoding-api.open-meteo.com; object-src 'none'; base-uri 'self'; form-action 'self';"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased pb-[calc(48px+env(safe-area-inset-bottom))]">
        <a href="#main-content" className="skip-to-content">
          メインコンテンツへスキップ
        </a>
        {children}
        {/* サイト間ナビ: 画面下端に常駐する控えめな逆リンクバー（→ satory074.com/apps） */}
        <nav
          aria-label="サイト間ナビゲーション"
          className="app-backlink-bar fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex h-9 items-center justify-center px-4">
            <a
              href="https://satory074.com/apps/"
              target="_blank"
              rel="noopener"
              aria-label="satory074 のほかのアプリ一覧を新しいタブで開く"
              className="inline-flex items-center gap-1 text-xs text-slate-600 transition-colors hover:text-sky-700"
            >
              satory074 のほかのアプリ <span aria-hidden="true">↗</span>
            </a>
          </div>
        </nav>
      </body>
    </html>
  );
}
