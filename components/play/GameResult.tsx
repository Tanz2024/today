"use client";

import { useState } from "react";
import { ArrowCounterClockwise, ShareNetwork } from "@phosphor-icons/react";
import type { PlaySession } from "@/lib/play/analytics";
import type { ResultCopy } from "@/lib/play/result-copy";

type Action = { label: string; onClick: () => void };
export type ResultVariant = "breaker" | "rush" | "obby";

// Per-game skin. The structure is shared; the look belongs to each game.
const SKINS: Record<ResultVariant, {
  status: string; value: string; muted: string; primary: string; share: string; chip: string;
}> = {
  breaker: {
    status: "text-[#5EE7F2]",
    value: "text-white",
    muted: "text-[#A9B4D0]",
    primary: "bg-[#5EE7F2] text-[#0B1020] hover:bg-white",
    share: "text-[#A9B4D0] hover:text-white",
    chip: "bg-[#F2B84B] text-[#0B1020]",
  },
  rush: {
    status: "text-[#F3C969]",
    value: "text-[#F8F5EF]",
    muted: "text-[#C8BFB6]",
    primary: "bg-[#F3C969] text-[#18203A] hover:bg-[#F8F5EF]",
    share: "text-[#C8BFB6] hover:text-[#F8F5EF]",
    chip: "bg-[#4F7CFF] text-white",
  },
  obby: {
    status: "text-[#3F6FF2]",
    value: "text-[#23272F]",
    muted: "text-[#5B6472]",
    primary: "bg-[#23272F] text-white hover:bg-[#3F6FF2]",
    share: "text-[#5B6472] hover:text-[#23272F]",
    chip: "bg-[#E6B84E] text-[#23272F]",
  },
};

// Small game-world marks above the result, so the ending still belongs to the game.
function Decoration({ variant }: { variant: ResultVariant }) {
  if (variant === "breaker") {
    const colors = ["#F2705E", "#F2B84B", "#22D3EE", "#4F7CFF", "#F2705E", "#22D3EE"];
    return (
      <div aria-hidden="true" className="flex items-end gap-1.5">
        {colors.map((color, index) => (
          <span key={index} className="block h-2.5 rounded-[2px]" style={{ width: index % 2 ? 14 : 22, background: color, opacity: index % 3 === 1 ? 0.35 : 0.9, transform: `rotate(${(index % 3) * 6 - 6}deg)` }} />
        ))}
      </div>
    );
  }
  if (variant === "rush") {
    return (
      <div aria-hidden="true" className="flex h-2.5 w-28 overflow-hidden rounded-[2px]">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="block h-full flex-1" style={{ background: index % 2 ? "#18203A" : "#F3C969" }} />
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="flex gap-1 text-[18px] leading-none text-[#E6B84E]">
      <span>★</span><span className="text-[#3F6FF2]">★</span><span>★</span>
    </div>
  );
}

// The arcade result: what happened, the number, best/progress, then one clear
// replay action. Everything else (another game, one story) sits below the stage.
export default function GameResult({
  variant, copy, primary, secondary, share, daily, session,
}: {
  variant: ResultVariant;
  copy: ResultCopy;
  primary: Action;
  secondary?: Action;
  /** Game name and path for the "beat my score" share link. */
  share?: { game: string; path: string };
  /** Today's target, kept small: it is a real, saved daily goal. */
  daily?: { hit: boolean; remaining: string; label: string };
  session: PlaySession;
}) {
  const skin = SKINS[variant];
  const [copied, setCopied] = useState(false);
  const shareResult = async () => {
    if (!share) return;
    const url = `${window.location.origin}${share.path}`;
    const text = `I got ${copy.value} in ${share.game} on BrisaStory. Challenge accepted? Play the game and see if you can beat my score: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: share.game, text, url });
        session.share("native");
        return;
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      session.share("copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="flex w-full max-w-[420px] flex-col items-center text-center">
      <Decoration variant={variant} />
      <p className={`mt-4 font-heading text-[15px] font-semibold uppercase tracking-[.16em] ${skin.status}`}>{copy.status}</p>
      <p className={`mt-1 font-heading text-[64px] font-semibold leading-none tracking-[-.04em] tabular-nums ${skin.value}`}>{copy.value}</p>
      {copy.caption && <p className={`mt-2 text-[14px] ${skin.muted}`}>{copy.caption}</p>}
      {copy.isNewBest && copy.status !== "New best" && (
        <p className={`mt-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[.12em] ${skin.chip}`}>New best</p>
      )}
      {copy.progress && <p className={`mt-2 text-[14px] font-medium ${skin.value}`}>{copy.progress}</p>}

      <button type="button" autoFocus onClick={primary.onClick} className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-7 font-heading text-[16px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric ${skin.primary}`}>
        <ArrowCounterClockwise aria-hidden="true" size={16} weight="bold" />
        {primary.label}
      </button>
      <div className="mt-2 flex items-center justify-center gap-5">
        {secondary && (
          <button type="button" onClick={secondary.onClick} className={`min-h-11 text-[14px] font-semibold ${skin.share}`}>{secondary.label}</button>
        )}
        {share && (
          <button type="button" onClick={shareResult} className={`inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold ${skin.share}`}>
            <ShareNetwork aria-hidden="true" size={15} weight="bold" />
            {copied ? "Challenge link copied" : "Challenge a friend"}
          </button>
        )}
      </div>

      {daily && (
        <p className={`mt-2 text-[12px] ${skin.muted}`}>
          {daily.hit ? `Today's target done ✓` : `Today's target: ${daily.label} · ${daily.remaining} to go`}
        </p>
      )}
    </div>
  );
}
