"use client";

import Link from "next/link";
import ArticleRecommendation from "@/components/play/ArticleRecommendation";
import type { GameType } from "@/lib/play/storage";
import type { ThemeId } from "@/lib/play/themes";
import type { PlayCandidate } from "@/lib/play/candidates";
import type { PlaySession } from "@/lib/play/analytics";

const ARCADE: { id: GameType; name: string; tagline: string; href: string; swatch: string }[] = [
  { id: "breaker", name: "Brisa Breaker", tagline: "Break the bricks", href: "/play/breaker", swatch: "linear-gradient(135deg,#0B1020 55%,#22D3EE 55%)" },
  { id: "rush", name: "Brisa Rush", tagline: "Dodge the traffic", href: "/play/rush", swatch: "linear-gradient(135deg,#18203A 55%,#F3C969 55%)" },
  { id: "obby", name: "Brisa Obby", tagline: "Don't touch the floor", href: "/play/obby", swatch: "linear-gradient(135deg,#F1E4CF 55%,#3F6FF2 55%)" },
];

// Below the result: the other two games first (the player is in Play mode),
// then one story as a way out.
export default function PlayNext({ game, candidates, session, collected }: {
  game: GameType;
  candidates: PlayCandidate[];
  session: PlaySession;
  collected: Partial<Record<ThemeId, number>>;
}) {
  const others = ARCADE.filter((item) => item.id !== game).slice(0, 2);
  return (
    <div className="mt-5 w-full text-left">
      <p className="text-[13px] font-semibold text-near-black">While you&apos;re here</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {others.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => session.playAnother(item.id)}
            className="group flex items-center gap-2.5 rounded-[10px] border border-card-border bg-white p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"
          >
            <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-[8px]" style={{ background: item.swatch }} />
            <span className="min-w-0">
              <span className="block truncate font-heading text-[14px] font-semibold text-near-black group-hover:text-electric">{item.name}</span>
              <span className="block truncate text-[12px] text-muted">{item.tagline}</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">2 stories picked for you</p>
      <div className="mt-2">
        <ArticleRecommendation candidates={candidates} session={session} collected={collected} />
      </div>
    </div>
  );
}
