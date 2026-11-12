import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import GamePreview from "@/components/play/GamePreview";

// Homepage teaser for Play. Deliberately compact: it points to the games
// without competing with the editorial sections around it.
const GAMES = [
  { href: "/play/obby", name: "Brisa Obby", tagline: "Don't touch the floor." },
  { href: "/play/rush", name: "Brisa Rush", tagline: "Keep moving." },
  { href: "/play/breaker", name: "Brisa Breaker", tagline: "One ball. A lot of headlines." },
];

export default function PlaySection() {
  return (
    <section aria-labelledby="play-teaser-heading" data-homepage-module="play" className="py-2">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] sm:items-center sm:gap-10">
        <div>
          
          <h2 id="play-teaser-heading" className="mt-1.5 font-heading text-[26px] font-semibold leading-tight tracking-[-.02em] text-near-black sm:text-[32px]">
            <Link href="/play" className="hover:text-electric">Got a minute?</Link>
          </h2>
          <p className="mt-1 text-[14px] text-muted">Quick games for the train, the queue or a short break. Collect stories as you play.</p>
        </div>
        <ul className="divide-y divide-card-border border-t border-card-border sm:border-t-0">
          {GAMES.map((game) => (
            <li key={game.href}>
              <Link href={game.href} className="group flex min-h-14 items-center justify-between gap-4 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric">
                <div className="w-16 shrink-0 sm:w-20"><GamePreview game={game.href.split("/").pop() as "obby" | "rush" | "breaker"} /></div>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[.16em] text-near-black">{game.name}</span>
                  <span className="block truncate text-[14px] text-muted group-hover:text-electric">{game.tagline}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-[.14em] text-near-black group-hover:text-electric">
                  Play game <ArrowRight aria-hidden="true" size={12} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
