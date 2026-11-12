"use client";

import { useEffect, useState } from "react";
import { trackHomepageEvent } from "@/lib/homepage-analytics";
import { readGameStats, type GameType } from "@/lib/play/storage";

// Records one hub view per visit.
export function PlayHubSignals() {
  useEffect(() => { trackHomepageEvent("play_hub_view"); }, []);
  return null;
}

// This device's personal best for a game, if there is one.
export function PlayBest({ game }: { game: GameType }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let stats;
    try { stats = readGameStats(window.localStorage, game); } catch { return; }
    const text = stats.bestScore > 0
      ? `Best ${stats.bestScore.toLocaleString("en-US")}${game === "obby" && stats.highestLevel > 1 ? ` · level ${stats.highestLevel}` : ""}`
      : stats.gamesPlayed > 0 ? `${stats.gamesPlayed} ${stats.gamesPlayed === 1 ? "run" : "runs"}` : null;
    queueMicrotask(() => setLabel(text));
  }, [game]);
  if (!label) return null;
  return <span className="text-electric"> · {label}</span>;
}

export function PlayProgress({ game }: { game: GameType }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stats = readGameStats(window.localStorage, game);
      const next = game === "obby" && stats.highestLevel > 0 ? `Continue · level ${stats.highestLevel}` : stats.gamesPlayed > 0 ? `${stats.gamesPlayed} ${stats.gamesPlayed === 1 ? "run" : "runs"} logged` : null;
      queueMicrotask(() => setLabel(next));
    } catch { /* optional local progress */ }
  }, [game]);
  return label ? <span className="text-electric"> · {label}</span> : null;
}
