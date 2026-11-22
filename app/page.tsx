import { CandidateForm } from "@/components/CandidateForm";
import { AUTHOR, JsonLd, pageMetadata, SITE_NAME, SITE_URL, WEBSITE_ID } from "@/lib/site";

const DESCRIPTION =
  "結婚式やお出かけの日程を決めるとき、候補日の過去30年の天気統計を比較して、雨・暑さ・寒さ・風のリスクを可視化します。";

export const metadata = pageMetadata({
  title: "お出かけ天気ナビ — 過去30年の天気から日取りを決める",
  description: DESCRIPTION,
  path: "",
  shareTitle: SITE_NAME,
  shareDescription: "過去30年の天気統計で、日取りを決める。",
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@type": "WebSite",
          "@id": WEBSITE_ID,
          name: SITE_NAME,
          url: SITE_URL,
          description: DESCRIPTION,
          inLanguage: "ja",
          author: AUTHOR,
        }}
      />
      <CandidateForm />
    </>
  );
}
