import GamingLanding from "@/components/gaming/GamingLanding";
import { getArticlesByCategory } from "@/lib/articles";
import { getLatestGames, getTopRatedGames } from "@/lib/rawg";
import { buildMetadata } from "@/lib/seo";

// The gaming hub (formerly at /play, which is now the Play games launcher).
export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Gaming",
  description:
    "BrisaStory gaming: new games worth playing, multiplayer picks, and the culture around gaming.",
  path: "/gaming",
});

export default async function GamingPage() {
  const articles = getArticlesByCategory("gaming");

  const latestGames = await getLatestGames(10);

  let games = latestGames;

  if (latestGames.length < 6) {
    const topRated = await getTopRatedGames(10);

    const existingIds = new Set(latestGames.map((game) => game.id));

    games = [
      ...latestGames,
      ...topRated.filter((game) => !existingIds.has(game.id)),
    ].slice(0, 10);
  }

  return <GamingLanding articles={articles} games={games} />;
}
