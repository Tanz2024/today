import type { Icon } from "@phosphor-icons/react";
import { AirplaneTilt, BowlFood, Eyes, Heart, Money, Skull, SmileyMelting } from "@phosphor-icons/react";

// Game copy (static JSON and AI-generated daily items) can include emoji.
// Known ones render as Phosphor icons so Play matches the rest of the site;
// anything unrecognised is dropped rather than mixing emoji into the UI.
const EMOJI_ICONS: Record<string, Icon> = {
  "👀": Eyes,
  "😭": SmileyMelting,
  "✈": AirplaneTilt,
  "💸": Money,
  "💀": Skull,
  "🍜": BowlFood,
  "❤": Heart,
};

const EMOJI = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u;

export default function EmojiText({ text }: { text: string }) {
  const parts = text.split(EMOJI);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    // split() with a capture group puts matches at odd indexes.
    if (index % 2 === 0) {
      const next = parts[index + 1];
      const dropsFollowingEmoji = next !== undefined && !EMOJI_ICONS[next.replace(/️/g, "")];
      return dropsFollowingEmoji ? part.trimEnd() : part;
    }
    const IconComponent = EMOJI_ICONS[part.replace(/️/g, "")];
    return IconComponent
      ? <IconComponent key={index} aria-hidden="true" size="1.05em" className="inline-block align-[-0.15em]" />
      : null;
  });
}
