import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "お出かけ天気ナビ — 過去30年の天気から日取りを決める",
  description:
    "結婚式やお出かけの日程を決めるとき、候補日の過去30年の天気統計を比較して、雨・暑さ・寒さ・風のリスクを可視化します。",
  openGraph: {
    title: "お出かけ天気ナビ",
    description: "候補日の過去30年の天気統計を比較",
    type: "website",
    locale: "ja_JP",
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
      <body className="min-h-screen">
        <a href="#main-content" className="skip-to-content">
          メインコンテンツへスキップ
        </a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
