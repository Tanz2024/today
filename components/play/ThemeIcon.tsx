"use client";

import { AirplaneTilt, BookOpen, Coffee, Coins, GameController, Heart, MusicNotes, Sparkle } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { THEMES, type ThemeId } from "@/lib/play/themes";

const ICONS: Record<ThemeId, Icon> = {
  cafe: Coffee, music: MusicNotes, travel: AirplaneTilt, heart: Heart, style: Sparkle, money: Coins, campus: BookOpen, games: GameController,
};

// DOM version of the in-game story tokens, for results and the collection shelf.
// `decorative` skips the hidden label when visible text already names the theme.
export default function ThemeIcon({ theme, size = 16, withLabel = false, decorative = false }: { theme: ThemeId; size?: number; withLabel?: boolean; decorative?: boolean }) {
  const IconComponent = ICONS[theme];
  return (
    <span className="inline-flex items-center gap-1.5" title={THEMES[theme].label} aria-hidden={decorative || undefined}>
      <span className="inline-flex items-center justify-center rounded-full border-2 border-electric bg-white text-near-black" style={{ width: size + 12, height: size + 12 }}>
        <IconComponent aria-hidden="true" size={size} weight="bold" />
      </span>
      {withLabel ? <span>{THEMES[theme].label}</span> : decorative ? null : <span className="sr-only">{THEMES[theme].label}</span>}
    </span>
  );
}
