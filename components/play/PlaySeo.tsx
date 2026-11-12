import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/seo";

type PlaySeoProps = {
  name: string;
  path: string;
  description: string;
  genre: string;
  controls: string;
};

export default function PlaySeo({ name, path, description, genre, controls }: PlaySeoProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name,
    description,
    genre,
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    url: `${getSiteUrl()}${path}`,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: "TodayAI", url: getSiteUrl() },
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <section aria-labelledby={`${name.toLowerCase().replaceAll(" ", "-")}-seo-heading`} className="mx-auto mt-8 max-w-[720px] border-t border-card-border pt-6 text-center sm:mt-10">
        <h2 id={`${name.toLowerCase().replaceAll(" ", "-")}-seo-heading`} className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-near-black">
          {name}: a free browser game from TodayAI
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-muted">{description}</p>
        <p className="mt-2 text-[13px] leading-6 text-muted"><span className="font-semibold text-near-black">How to play:</span> {controls}</p>
        <p className="mt-4 text-[12px] font-semibold uppercase tracking-[.14em] text-muted">
          <Link href="/play" className="inline-flex min-h-11 items-center hover:text-electric">Browse all TodayAI games →</Link>
        </p>
      </section>
    </>
  );
}
