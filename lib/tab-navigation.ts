// Pure roving-tabindex arithmetic for arrow-key tab navigation (e.g.
// OnScreenMobileTabs). Kept alias-free and dependency-free so it's testable
// under the plain Node test runner, same pattern as the other lib/*.ts
// pure modules in this repo.
export function wrapTabIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}
