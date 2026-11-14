// Deterministic checks on AI rewrites. Small models drop or invent details;
// these functions find exactly which numbers, citations, links and technical
// terms changed so the UI can warn instead of trusting the model.

export type ProtectedKind = "number" | "citation" | "link" | "term";
export type ProtectedItem = { kind: ProtectedKind; value: string };

const PATTERNS: [ProtectedKind, RegExp][] = [
  ["link", /\bhttps?:\/\/[^\s)>\]]+|\b10\.\d{4,9}\/[^\s"<>]+|\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi],
  // (Smith, 2020), (Smith et al., 2021, p. 4), (Lee & Kim 2019; Ng, 2020)
  ["citation", /\((?:[A-Z][\p{L}'’-]+(?:\s+(?:et al\.|&|and)\s*(?:[A-Z][\p{L}'’-]+)?)?,?\s+(?:\d{4}[a-z]?|n\.d\.)(?:,\s*pp?\.\s*\d+(?:[-–]\d+)?)?(?:;\s*)?)+\)/gu],
  ["citation", /\[\d+(?:\s*[-–,]\s*\d+)*\]/g],
  ["number", /(?<![\p{L}\p{N}_.])[$€£¥]?\d+(?:[.,:]\d+)*(?:\s?%|st|nd|rd|th|am|pm|k|m|bn)?(?![\p{L}_])/giu],
  // Acronyms (GPU, ONNX), CamelCase (WebGPU, JavaScript), snake/dotted identifiers, inline code.
  ["term", /`[^`\n]+`|\b[A-Z]{2,}[A-Za-z0-9]*s?\b|\b[A-Z]?[a-z]+[A-Z][A-Za-z0-9]*\b|\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g],
];

const norm = (value: string) => value.toLowerCase().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");

export function extractProtected(text: string): ProtectedItem[] {
  const seen = new Set<string>();
  const items: ProtectedItem[] = [];
  let remaining = text;
  for (const [kind, pattern] of PATTERNS) {
    for (const match of remaining.matchAll(pattern)) {
      const value = match[0].replace(/[.,;:]+$/, "");
      const key = `${kind}:${norm(value)}`;
      if (!value || seen.has(key)) continue;
      seen.add(key);
      items.push({ kind, value });
    }
    // Don't count the year inside a citation again as a bare number.
    if (kind === "citation" || kind === "link") remaining = remaining.replace(pattern, " ");
  }
  return items;
}

/** Items in `source` that no longer appear in `output`. */
export function missingProtected(source: string, output: string): ProtectedItem[] {
  const haystack = norm(output);
  const compact = haystack.replace(/\s/g, "");
  return extractProtected(source).filter((item) => {
    const needle = norm(item.value);
    return !haystack.includes(needle) && !compact.includes(needle.replace(/\s/g, ""));
  });
}

/** Numbers, links, citations or terms the output introduced that no source contains. */
export function addedProtected(sources: string[], output: string): ProtectedItem[] {
  const haystack = norm(sources.join("\n"));
  return extractProtected(output).filter((item) => !haystack.includes(norm(item.value)));
}

const COMMON_CAPS = new Set("I A An The This That These Those It We You They He She My Our Your Their In On At For From With By To Of And But Or If When While As After Before During Dear Hello Hi Thank Thanks Best Regards Sincerely Kind Yours Please Additionally Also However Moreover Furthermore Overall Responsible Led Managed Developed Built Created Designed Improved Increased Reduced Delivered Collaborated Worked Supported Implemented Coordinated Achieved Experienced Skilled Proven Strong Excellent Here Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December".split(" "));

/** Capitalised names in the output that appear nowhere in the sources. */
export function addedNames(sources: string[], output: string): string[] {
  const vocabulary = new Set((sources.join(" ").match(/[\p{L}\p{N}][\p{L}\p{N}'’.+#-]*/gu) ?? []).map((w) => w.toLowerCase()));
  const found = new Set<string>();
  for (const match of output.matchAll(/\b[A-Z][\p{L}\p{N}+#.-]*[\p{L}\p{N}+#]/gu)) {
    const word = match[0];
    if (COMMON_CAPS.has(word) || vocabulary.has(word.toLowerCase())) continue;
    found.add(word);
  }
  return [...found];
}

export function describeItems(items: { value: string }[], max = 6) {
  const values = items.slice(0, max).map((item) => `“${item.value}”`);
  return values.join(", ") + (items.length > max ? ` and ${items.length - max} more` : "");
}
