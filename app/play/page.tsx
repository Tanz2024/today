import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/editorial/SectionHeading";
import JsonLd from "@/components/seo/JsonLd";
import { FeaturedGameCard, GameCard } from "@/components/discovery/Cards";
import { CATALOG_GAMES, GAME_CATEGORIES } from "@/lib/site-catalog";
import { buildMetadata, getSiteUrl } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI games: word puzzles and drawing challenges",
  description: "Free AI browser games: AI Word Detective, a daily semantic word puzzle, and AI Draw & Guess, where an image-recognition model guesses your sketch. No sign-up.",
  path: "/play",
});

export default function PlayPage() {
  const [hero, ...rest] = CATALOG_GAMES.filter((game) => game.featured);
  const categories = GAME_CATEGORIES.filter((category) => CATALOG_GAMES.some((game) => game.category === category.slug));
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "TodayAI games",
    itemListElement: CATALOG_GAMES.map((game, index) => ({ "@type": "ListItem", position: index + 1, name: game.title, url: new URL(game.href, getSiteUrl()).toString() })),
  };

  return (
    <Container className="hub">
      <JsonLd data={itemList} />
      <PageHeader eyebrow="AI Games" title="Play with AI" description="Short browser games where a real AI model is part of the gameplay. Free, no sign-up, and everything runs in your browser." />

      {hero ? (
        <section aria-labelledby="featured-game" className="hub-section">
          <h2 id="featured-game" className="sr-only">Featured game</h2>
          <div className="d-feature-row">
            <FeaturedGameCard game={hero} priority />
            <ul className="d-feature-side">{rest.map((game) => <li key={game.slug}><GameCard game={game} /></li>)}</ul>
          </div>
        </section>
      ) : null}

      {categories.map((category) => (
        <section key={category.slug} id={category.slug} aria-labelledby={`games-${category.slug}`} className="hub-section">
          <SectionHeading id={`games-${category.slug}`} title={category.name} />
          <ul className="card-grid card-grid-3">{CATALOG_GAMES.filter((game) => game.category === category.slug).map((game) => <li key={game.slug}><GameCard game={game} /></li>)}</ul>
        </section>
      ))}

      <p className="hub-footnote">Both games load a small open-source model into your browser the first time you play, so your guesses and drawings aren&apos;t sent to a server.</p>
    </Container>
  );
}
