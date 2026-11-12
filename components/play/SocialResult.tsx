import type { ReactNode } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import TryAnotherGame from "@/components/play/TryAnotherGame";

// End card for the social and quiz games: light and conversational, not an
// arcade screen. One clear next action, share as a quiet secondary, then a
// compact "play something else".
export default function SocialResult({
  game, headline, body, picks, accent, primary, share, currentHref, children,
}: {
  game: string;
  headline: ReactNode;
  body?: string;
  /** The player's own answers, shown as chips. */
  picks?: string[];
  /** Colour for the card's top edge and the primary button. */
  accent: string;
  primary: { label: string; onClick: () => void };
  share?: ReactNode;
  currentHref: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg py-6 sm:py-10" aria-live="polite">
      <div className="overflow-hidden rounded-[16px] border border-card-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div aria-hidden="true" className="h-1.5" style={{ background: accent }} />
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <p className="text-[13px] font-semibold text-muted">{game}</p>
          <h2 className="mt-1 font-heading text-[30px] font-bold leading-[1.1] tracking-[-.03em] text-near-black sm:text-[38px]">{headline}</h2>
          {body && <p className="mt-3 text-[15px] leading-[1.55] text-muted">{body}</p>}
          {children}
          {picks && picks.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Your picks">
              {picks.map((pick, index) => (
                <li key={`${pick}-${index}`} className="rounded-full bg-black/[.05] px-3 py-1 text-[13px] font-medium text-near-black">{pick}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={primary.onClick}
              className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-heading text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric"
              style={{ background: accent }}
            >
              <ArrowCounterClockwise aria-hidden="true" size={16} weight="bold" />
              {primary.label}
            </button>
            {share}
          </div>
        </div>
      </div>
      <TryAnotherGame currentHref={currentHref} />
    </div>
  );
}
