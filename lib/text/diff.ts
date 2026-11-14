// Word-level diff for side-by-side comparison. Deterministic, no AI.

export type DiffPart = { type: "same" | "added" | "removed"; text: string };

/** Words, runs of whitespace and single punctuation marks. */
export function tokenize(text: string): string[] {
  return text.match(/\s+|[\p{L}\p{N}][\p{L}\p{N}'’_-]*|[^\s\p{L}\p{N}]/gu) ?? [];
}

const MAX_CELLS = 3_000_000;

export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length * b.length > MAX_CELLS) return [{ type: "removed", text: before }, { type: "added", text: after }];
  // LCS table over tokens (rows = a suffixes).
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] = a[i] === b[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push("same", a[i]); i += 1; j += 1; }
    else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) { push("removed", a[i]); i += 1; }
    else { push("added", b[j]); j += 1; }
  }
  while (i < a.length) push("removed", a[i++]);
  while (j < b.length) push("added", b[j++]);
  return parts;
}

/** Share of the original's word tokens that survived (0–1). */
export function similarity(before: string, after: string) {
  const parts = diffWords(before, after);
  const words = (s: string) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length;
  const same = parts.filter((p) => p.type === "same").reduce((n, p) => n + words(p.text), 0);
  return same / Math.max(1, words(before));
}
