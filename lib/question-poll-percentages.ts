export function allocatePercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((count) => (count / total) * 100);
  const percentages = raw.map(Math.floor);
  let remaining = 100 - percentages.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, remainder: value - percentages[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < order.length && remaining > 0; index += 1, remaining -= 1) percentages[order[index].index] += 1;
  return percentages;
}
