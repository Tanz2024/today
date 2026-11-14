import Link from "next/link";
import type { ReactNode } from "react";
import Container from "@/components/ui/Container";
import JsonLd from "@/components/seo/JsonLd";
import { GameCard } from "@/components/discovery/Cards";
import { getGame, relatedGames } from "@/lib/site-catalog";
import { getSiteUrl } from "@/lib/seo";

/**
 * Game page order: breadcrumbs → title → one-line description → game →
 * how to play → related games → optional reading. Gameplay comes first and
 * no ads are placed inside or next to the game controls.
 */
export default function GameDetailLayout({ slug, children, howToPlay, about, reading }: { slug: string; children: ReactNode; howToPlay: string[]; about?: ReactNode; reading?: { title: string; href: string }[] }) {
  const game = getGame(slug)!;
  const related = relatedGames(slug, 3);
  return (
    <Container className="detail-page">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "VideoGame", name: game.title, description: game.description, url: new URL(game.href, getSiteUrl()).toString(), genre: game.category === "drawing" ? "Drawing" : "Word puzzle", playMode: "SinglePlayer", gamePlatform: "Web browser", isAccessibleForFree: true }} />
      <nav aria-label="Breadcrumb" className="breadcrumbs"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/play">AI Games</Link><span aria-hidden="true">/</span><span aria-current="page">{game.title}</span></nav>
      <header className="detail-header">
        <p className="eyebrow">{game.meta}</p>
        <h1 className="detail-title">{game.title}</h1>
        <p className="detail-dek">{game.description}</p>
      </header>
      <div className="detail-game">{children}</div>
      <div className="detail-columns">
        <section aria-labelledby="how-to-play">
          <h2 id="how-to-play" className="detail-section-title">How to play</h2>
          <ol className="detail-steps">{howToPlay.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        {about ? <section aria-labelledby="about-game"><h2 id="about-game" className="detail-section-title">How the AI works</h2><div className="detail-prose">{about}</div></section> : null}
      </div>
      <section aria-labelledby="related-games" className="detail-related">
        <h2 id="related-games" className="detail-section-title">More games</h2>
        <ul className="card-grid card-grid-3">{related.map((item) => <li key={item.slug}><GameCard game={item} /></li>)}</ul>
      </section>
      {reading?.length ? (
        <section aria-labelledby="game-reading" className="detail-related">
          <h2 id="game-reading" className="detail-section-title">Related reading</h2>
          <ul className="link-list">{reading.map((item) => <li key={item.href}><Link href={item.href}>{item.title}</Link></li>)}</ul>
        </section>
      ) : null}
    </Container>
  );
}
