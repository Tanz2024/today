import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import Container from "@/components/ui/Container";
import GamePreview from "@/components/play/GamePreview";
import { PlayBest, PlayHubSignals, PlayProgress } from "@/components/play/PlayHubClient";
import { buildMetadata } from "@/lib/seo";
import type { GameType } from "@/lib/play/storage";

export const metadata = buildMetadata({
  title: "Games",
  description: "Quick games for the metro, the queue or a short break: TodayAI Obby, TodayAI Rush and TodayAI Breaker.",
  path: "/play",
});

const GAMES: Array<{ game: GameType; name: string; tagline: string; mechanic: string; meta: string }> = [
  { game: "obby", name: "TodayAI Obby", tagline: "Don't touch the floor.", mechanic: "Jump gaps, dodge hazards and reach checkpoints while collecting story tokens.", meta: "30 sec – 2 min" },
  { game: "rush", name: "TodayAI Rush", tagline: "Keep moving. Beat your best.", mechanic: "Switch lanes, clear obstacles and collect markers as the road gets faster.", meta: "Endless" },
  { game: "breaker", name: "TodayAI Breaker", tagline: "Clear as many boards as you can.", mechanic: "Steer the paddle, break patterned boards and catch falling story tokens.", meta: "Until you miss" },
];

export default function PlayPage() {
  return (
    <Container className="py-10 sm:py-14">
      <PlayHubSignals />
      <header className="max-w-2xl">
        <h1 className="font-heading text-[40px] font-semibold leading-[1] tracking-[-.04em] text-near-black sm:text-[54px]">Pick a game.</h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-muted">
          Quick games for the train, the queue or the few minutes in between. Collect story tokens as you play — no sign-up, and everything stays on this device.
        </p>
      </header>

      <Link href="/play/quick-draw" className="group mt-10 block border-y border-card-border py-7 sm:mt-12 sm:py-9"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-electric">New · Quick Draw</p><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-heading text-3xl font-black leading-[.98] tracking-[-.05em] sm:text-5xl group-hover:text-electric">Make a mark before time runs out.</h2><p className="mt-3 text-sm text-muted">A tiny drawing game. Save your masterpiece as a PNG or PDF.</p></div><span className="inline-flex min-h-11 items-center text-sm font-bold">Play Quick Draw <ArrowRight size={15} className="ml-2 transition-transform group-hover:translate-x-1" /></span></div></Link>

      <ol className="mt-9 border-t border-near-black/80 sm:mt-12">
        {GAMES.map(({ game, name, tagline, mechanic, meta }) => (
          <li key={game} className="border-b border-card-border">
            <Link
              href={`/play/${game}`}
              className="group grid grid-cols-[92px_minmax(0,1fr)] items-center gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:gap-8 sm:py-7"
            >
              <GamePreview game={game} />
              <div className="min-w-0">
                <h2 className="text-[12px] font-bold uppercase tracking-[.18em] text-near-black">{name}</h2>
                <p className="mt-1.5 font-heading text-[21px] font-semibold leading-[1.15] tracking-[-.02em] text-near-black transition-colors group-hover:text-electric sm:text-[28px]">{tagline}</p>
                <p className="mt-2 max-w-[48ch] text-[13px] leading-5 text-muted">{mechanic}</p>
                <p className="mt-2 text-[12px] text-muted">
                  {meta}
                  <PlayBest game={game} />
                  <PlayProgress game={game} />
                </p>
                <span className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[.14em] text-near-black group-hover:text-electric sm:hidden">
                  Play <ArrowRight aria-hidden="true" size={13} />
                </span>
              </div>
              <span className="hidden min-h-11 items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[.14em] text-near-black group-hover:text-electric sm:inline-flex">
                Play <ArrowRight aria-hidden="true" size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-8 max-w-2xl border-t border-card-border pt-5 text-sm leading-6 text-muted">Story tokens are collectible themes that add to your on-device TodayAI collection. They are optional, do not unlock paid content, and no account is required.</p>

    </Container>
  );
}
