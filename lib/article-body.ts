// Where things go inside an article body. Pure so placement rules (ads,
// read-next) can be tested together. Sections are split at "## " headings,
// so every insertion point is a complete-section boundary.

const splitSections = (content: string) => content.split(/\n(?=##\s)/);

export function splitBodyForAd(content: string) {
  // Do not interrupt short articles just because an ad component exists.
  // Only create one insertion point for articles with enough substance.
  if (content.length < 2200) return { before: content, after: "" };
  const sections = splitSections(content);
  if (sections.length < 3) return { before: content, after: "" };
  const insertAt = Math.max(1, Math.min(sections.length - 1, Math.floor(sections.length * 0.5)));
  return { before: sections.slice(0, insertAt).join("\n"), after: sections.slice(insertAt).join("\n") };
}

export function splitBodyForMobile(content: string) {
  const sections = splitSections(content);
  if (sections.length < 4) return { preview: content, remaining: "" };
  const splitAt = Math.max(2, Math.min(sections.length - 1, Math.round(sections.length * 0.42)));
  return { preview: sections.slice(0, splitAt).join("\n"), remaining: sections.slice(splitAt).join("\n") };
}

export interface BodyLayout {
  isLongForm: boolean;
  qualifiesForMidpointAd: boolean;
}

export function bodyLayout(readingMinutes: number): BodyLayout {
  return { isLongForm: readingMinutes >= 7, qualifiesForMidpointAd: readingMinutes >= 4 };
}

// Section boundary index (content before section i) where the midpoint ad
// renders, mirroring the two render paths in ArticleView, or null.
export function adBoundary(content: string, layout: BodyLayout): number | null {
  const sections = splitSections(content);
  if (layout.isLongForm && sections.length >= 4) {
    return Math.max(2, Math.min(sections.length - 1, Math.round(sections.length * 0.42)));
  }
  if (!layout.qualifiesForMidpointAd || content.length < 2200 || sections.length < 3) return null;
  return Math.max(1, Math.min(sections.length - 1, Math.floor(sections.length * 0.5)));
}

export const READ_NEXT_MARKER = "<ReadNext />";
export const MIN_READ_NEXT_MINUTES = 4;
export const MIN_READ_NEXT_SECTIONS = 5;

// Boundary for one contextual "Read next" link: 35–50% through, never right
// after the intro (index >= 2), never at the ad boundary (so a section always
// separates them), and never
// in short articles. Null when no boundary qualifies.
export function readNextBoundary(content: string, readingMinutes: number): number | null {
  const sections = splitSections(content);
  if (readingMinutes < MIN_READ_NEXT_MINUTES || sections.length < MIN_READ_NEXT_SECTIONS) return null;
  const ad = adBoundary(content, bodyLayout(readingMinutes));
  const low = Math.max(2, Math.ceil(sections.length * 0.35));
  const high = Math.floor(sections.length * 0.5);
  const target = sections.length * 0.4;
  const candidates = [];
  for (let index = low; index <= high; index += 1) {
    // A different boundary leaves at least one full section between them.
    if (index === ad) continue;
    candidates.push(index);
  }
  candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
  return candidates[0] ?? null;
}

// Inserts the marker as its own block at a section boundary. It attaches to
// the end of the previous section, so the ad/mobile splits are unchanged.
export function insertReadNext(content: string, boundary: number): string {
  const sections = splitSections(content);
  if (boundary <= 0 || boundary >= sections.length) return content;
  sections[boundary - 1] = `${sections[boundary - 1].trimEnd()}\n\n${READ_NEXT_MARKER}\n`;
  return sections.join("\n");
}
