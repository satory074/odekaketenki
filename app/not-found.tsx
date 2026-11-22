import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SITE_NAME } from "@/lib/site";

// 404.html (GitHub Pages が存在しない URL で返す) の中身。Next の既定の 404 は本文側にも
// <title> を出すので <head> のタイトルが 2 つになっていた。noindex は Next が自動で付ける。
export const metadata: Metadata = {
  title: `ページが見つかりません｜${SITE_NAME}`,
};

export default function NotFound() {
  return (
    <AppShell titleAs="p">
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">ページが見つかりません</h1>
        <p className="text-sm text-slate-600">URL が変わったか、削除されたページです。</p>
        <p className="flex justify-center gap-4 text-sm">
          <Link href="/" className="text-sky-700 underline underline-offset-2">
            トップへ
          </Link>
          <Link href="/stations/" className="text-sky-700 underline underline-offset-2">
            観測地点の一覧
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
