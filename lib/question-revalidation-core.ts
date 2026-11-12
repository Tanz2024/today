export function questionPath(slug: string, validSlugs: ReadonlySet<string>) {
  return validSlugs.has(slug) ? `/questions/${slug}` : null;
}

export function revalidateQuestionPath(slug: string, validSlugs: ReadonlySet<string>, revalidator: (path: string) => void) {
  const path = questionPath(slug, validSlugs);
  if (!path) return false;
  try { revalidator(path); return true; } catch { return false; }
}
