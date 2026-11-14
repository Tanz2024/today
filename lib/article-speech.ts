// Plain text for "Listen to this article" (browser text-to-speech).
//
// Articles are MDX, so the raw body contains Markdown syntax, JSX components,
// code and image references that should never be read aloud. This turns an
// article into speakable paragraphs and then into short chunks, because
// browsers' speechSynthesis cuts off or stalls on very long utterances.
//
// Line-anchored patterns use [ \t] rather than \s so they never swallow the
// blank line that separates paragraphs.
//
// Keep this file free of path aliases so the Node test runner can import it.

/** Markdown/MDX body to speakable paragraphs (no syntax, no code, no components). */
export function markdownToSpeechParagraphs(markdown: string): string[] {
  const text = markdown
    .replace(/\r\n?/g, "\n")
    // Fenced code blocks and import/export lines are not prose.
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/~~~[\s\S]*?~~~/g, "\n")
    .replace(/^[ \t]*(import|export)[ \t].*$/gm, "")
    // HTML/MDX comments.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    // Self-closing components (<ReadNext />, <Video ... />) carry no prose.
    .replace(/<[A-Z][\w.]*\b[^>]*\/>/g, "\n")
    // Keep the text inside wrapping components (<Callout>…</Callout>) and HTML tags.
    .replace(/<\/?[A-Za-z][\w.-]*\b[^>]*>/g, "\n")
    // Images are skipped; links keep their label.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/^[ \t]*\[[^\]]+\]:[ \t]*\S+.*$/gm, "")
    // Bare URLs read badly; drop them.
    .replace(/https?:\/\/\S+/g, "")
    // Tables: drop separator rows, read each remaining row as "cell, cell."
    .replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*$/gm, "")
    .replace(/^[ \t]*\|?(.*?)\|?[ \t]*$/gm, (line, inner: string) =>
      line.includes("|") ? inner.split("|").map((cell) => cell.trim()).filter(Boolean).join(", ") + "." : line)
    // Headings, quotes and rules lose their markers.
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, "")
    // Each list item becomes its own paragraph, so items get a pause between them.
    .replace(/^[ \t]*([-*+]|\d+[.)])[ \t]+/gm, "\n")
    // Inline emphasis and code markers (underscores only at word edges, so snake_case survives).
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/\*(\S(?:.*?\S)?)\*/g, "$1")
    .replace(/(^|[^\w])_(\S(?:.*?\S)?)_(?=[^\w]|$)/gm, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    // Leftover JSX expressions and HTML entities.
    .replace(/\{[^{}\n]*\}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/g, " ");

  return text
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, " ").replace(/^[,\s]+|[,\s]+$/g, "").replace(/\s{2,}/g, " ").trim())
    .filter((block) => /[A-Za-z0-9]/.test(block));
}

/*
 * Voice choice. The Web Speech API doesn't say whether a voice is female or
 * male, so known voice names are used: Windows (Microsoft …), Chrome
 * (Google …), macOS/iOS, and Android's "en-xx-x-<code>" voices.
 */
const FEMALE_VOICE = /\b(female|woman|zira|aria|jenny|michelle|ana|emma|ava|sonia|libby|maisie|hazel|susan|catherine|clara|natasha|heera|neerja|emily|samantha|victoria|karen|moira|tessa|fiona|veena|serena|allison|kate|zoe|nicky|joelle|ellie|martha|kathy|shelley|sandy|flo|grandma|amy|salli|joanna|kendra|kimberly|ivy|olivia|ruth|danielle|niamh|molly|natalie|jane|nancy|sara|ashley|elizabeth|cora|monica|aditi|raveena|google us english)\b|-x-(sfg|tpc|tpf|iob|iog|fis|gba)-/i;
const MALE_VOICE = /\b(male|man|david|mark|george|guy|ryan|daniel|alex|fred|thomas|rishi|christopher|eric|steffan|roger|brian|andrew|james|william|liam|connor|mitchell|ravi|prabhat|aaron|arthur|gordon|oliver|reed|rocko|grandpa|eddy|ralph|albert|junior|matthew|joey|justin|kevin|russell|geraint|tom|nathan|evan|lee)\b|-x-(iom|rjs|tpd|gbb|gbd)-/i;

type VoiceLike = { name: string; lang: string; localService: boolean };

/**
 * Pick the reading voice: an English female voice when one is installed,
 * preferring natural/neural ones; otherwise the best English voice that isn't
 * a known male voice; otherwise any English voice.
 */
export function pickReadingVoice<T extends VoiceLike>(voices: T[]): T | undefined {
  const english = voices.filter((voice) => /^en([-_]|$)/i.test(voice.lang));
  const pool = english.length ? english : voices;
  const score = (voice: T) => {
    const female = FEMALE_VOICE.test(voice.name) && !/\bmale\b/i.test(voice.name.replace(/female/i, ""));
    const male = !female && MALE_VOICE.test(voice.name);
    return (female ? 100 : male ? -100 : 0) +
      (/natural|neural|online|premium|enhanced/i.test(voice.name) ? 8 : 0) +
      (/google/i.test(voice.name) ? 4 : 0) +
      (/^en[-_](gb|us)/i.test(voice.lang) ? 2 : 0) +
      (voice.localService ? 0 : 1);
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** Everything a listener hears: headline, summary, then the body. */
export function articleSpeechParagraphs(article: { title: string; description?: string; content: string }): string[] {
  const head = [article.title, article.description ?? ""].map((part) => part.trim()).filter(Boolean);
  return [...head, ...markdownToSpeechParagraphs(article.content)];
}

/**
 * Split paragraphs into chunks of at most `max` characters, breaking at
 * sentence ends first, then at commas or spaces. Each chunk remembers its
 * paragraph so the player can show progress and resume mid-article.
 */
export function speechChunks(paragraphs: string[], max = 220): { text: string; paragraph: number }[] {
  const chunks: { text: string; paragraph: number }[] = [];
  paragraphs.forEach((paragraph, index) => {
    const sentences = paragraph.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) ?? [paragraph];
    let current = "";
    const push = (value: string) => { const trimmed = value.trim(); if (trimmed) chunks.push({ text: trimmed, paragraph: index }); };
    for (const sentence of sentences) {
      if ((current + sentence).length <= max) { current += sentence; continue; }
      push(current);
      current = "";
      let rest = sentence;
      while (rest.length > max) {
        const window = rest.slice(0, max);
        const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(" "));
        const at = cut > max * 0.4 ? cut + 1 : max;
        push(rest.slice(0, at));
        rest = rest.slice(at);
      }
      current = rest;
    }
    push(current);
  });
  return chunks;
}
