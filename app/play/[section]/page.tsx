import { notFound } from "next/navigation";

import GamingLanding, {
  GAMING_SECTIONS,
} from "@/components/gaming/GamingLanding";

import { getArticlesByCategory } from "@/lib/articles";
import { getLatestGames, getTopRatedGames } from "@/lib/rawg";
import { buildMetadata } from "@/lib/seo";

import type { GamingCategory } from "@/types/article";
import type { Game } from "@/lib/rawg";

export const revalidate = 3600;
export const dynamicParams = false;

const SECTION_KEYS = Object.keys(GAMING_SECTIONS) as GamingCategory[];

function isGamingCategory(value: string): value is GamingCategory {
  return SECTION_KEYS.includes(value as GamingCategory);
}

export function generateStaticParams() {
  return SECTION_KEYS.map((section) => ({
    section,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isGamingCategory(section)) {
    notFound();
  }

  const meta = GAMING_SECTIONS[section];

  return buildMetadata({
    title: `${meta.label} — Gaming`,
    description: meta.seoDescription,
    path: meta.href,
  });
}

export default async function GamingSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isGamingCategory(section)) {
    notFound();
  }

  const articles = getArticlesByCategory("gaming").filter(
    (article) => article.gamingCategory === section,
  );

  let games: Game[] = [];

  if (section === "what-to-play") {
    const latestGames = await getLatestGames(18);

    if (latestGames.length >= 10) {
      games = latestGames;
    } else {
      const topRatedGames = await getTopRatedGames(18);
      const existingIds = new Set(latestGames.map((game) => game.id));

      games = [
        ...latestGames,
        ...topRatedGames.filter((game) => !existingIds.has(game.id)),
      ].slice(0, 18);
    }
  }

  return (
    <GamingLanding
      articles={articles}
      games={games}
      activeSection={section}
    />
  );
}