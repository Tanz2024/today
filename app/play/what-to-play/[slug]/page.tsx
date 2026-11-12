import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameBySlug, getGameScreenshots } from "@/lib/rawg";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

// Templated RAWG data (artwork, ratings, platforms) with no BrisaStory
// writing: useful to readers, not an indexable page.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return {};
  return buildMetadata({ title: `${game.name} — What to Play`, description: `Details, ratings, platforms and screenshots for ${game.name}.`, path: `/play/what-to-play/${game.slug}`, noindex: true });
}

export default async function GameDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  const screenshots = await getGameScreenshots(game.slug, 6);
  return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
    <Link href="/play/what-to-play" className="text-sm font-semibold text-muted hover:text-electric">← Back to What to Play</Link>
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-12">
      <div className="relative aspect-[16/10] overflow-hidden bg-black/[0.04]">
        {game.image ? <Image src={game.image} alt={`${game.name} game artwork`} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-muted">{game.name}</div>}
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-electric">Game details</p>
        <h1 className="mt-3 font-heading text-4xl font-bold leading-tight sm:text-6xl">{game.name}</h1>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {game.released && <span>Released {game.released}</span>}
          {game.genres.length > 0 && <span>{game.genres.join(" · ")}</span>}
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-card-border py-5 text-sm">
          <div><dt className="text-muted">Rating</dt><dd className="mt-1 font-semibold">{game.rating ?? "—"}</dd></div>
          <div><dt className="text-muted">Metacritic</dt><dd className="mt-1 font-semibold">{game.metacritic ?? "—"}</dd></div>
          <div className="col-span-2"><dt className="text-muted">Platforms</dt><dd className="mt-1 font-semibold">{game.platforms.join(" · ") || "—"}</dd></div>
        </dl>
        <a href={game.rawgUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center bg-electric px-5 text-sm font-semibold text-white hover:opacity-90">View on RAWG ↗</a>
      </div>
    </div>
    {screenshots.length > 0 && <section className="mt-14 border-t border-card-border pt-8"><h2 className="font-heading text-2xl font-bold sm:text-3xl">Screenshots</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{screenshots.map((shot) => <div key={shot.image} className="relative aspect-video overflow-hidden bg-black/[0.04]"><Image src={shot.image} alt={`${game.name} screenshot`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" /></div>)}</div></section>}
  </main>;
}
