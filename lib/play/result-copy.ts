// Result-screen wording for the arcade games. A small fixed phrase set picked
// from the run's numbers — deterministic, so the same run always reads the
// same and nothing is generated at runtime.

export type ResultCopy = {
  /** What happened, e.g. "New best" or "So close". */
  status: string;
  /** The main number, already formatted. */
  value: string;
  /** Secondary metric under the number. */
  caption: string | null;
  /** Best score / progress line. */
  progress: string | null;
  isNewBest: boolean;
};

const fmt = (value: number) => Math.max(0, Math.round(value)).toLocaleString("en-US");

/** Close enough to the best to say "so close": within 10% (and at least a small margin). */
function isClose(gap: number, best: number, minimum: number) {
  return gap > 0 && gap <= Math.max(minimum, best * 0.1);
}

export function breakerResultCopy(run: { score: number; board: number; previousBest: number; isNewBest: boolean; cleared: boolean }): ResultCopy {
  const gap = run.previousBest - run.score;
  const base = { value: fmt(run.score), isNewBest: run.isNewBest };
  if (run.cleared) {
    return { ...base, status: `Board ${run.board} cleared`, caption: null, progress: run.previousBest > 0 ? `Best ${fmt(Math.max(run.previousBest, run.score))}` : null };
  }
  if (run.isNewBest) return { ...base, status: "New best", caption: `Board ${run.board}`, progress: `Previous best ${fmt(run.previousBest)}` };
  if (run.previousBest <= 0) return { ...base, status: `Board ${run.board}`, caption: null, progress: "First score on the board" };
  if (isClose(gap, run.previousBest, 40)) return { ...base, status: "So close", caption: `Board ${run.board}`, progress: `${fmt(gap)} points to your best` };
  return { ...base, status: `Board ${run.board}`, caption: null, progress: gap > 0 ? `${fmt(gap)} points to your best` : `Best ${fmt(run.previousBest)}` };
}

export function rushResultCopy(run: { meters: number; previousBest: number; isNewBest: boolean }): ResultCopy {
  const gap = run.previousBest - run.meters;
  const base = { value: `${fmt(run.meters)}m`, isNewBest: run.isNewBest };
  if (run.isNewBest) return { ...base, status: "New best", caption: null, progress: `Previous best ${fmt(run.previousBest)}m` };
  if (run.previousBest <= 0) return { ...base, status: "First run", caption: null, progress: "Now beat it" };
  if (isClose(gap, run.previousBest, 15)) return { ...base, status: `${fmt(gap)}m to go`, caption: null, progress: `Best ${fmt(run.previousBest)}m` };
  return { ...base, status: "Run over", caption: null, progress: gap > 0 ? `${fmt(gap)}m short of your best` : `Best ${fmt(run.previousBest)}m` };
}

export function obbyResultCopy(run: {
  complete: boolean; level: number; progress: number; seconds: number; reason: "gap" | "hazard" | null;
  stories: number; totalStories: number; isNewBest: boolean;
}): ResultCopy {
  const stars = `${run.stories}/${run.totalStories} stars`;
  if (run.complete) {
    return { status: "You made it", value: `Level ${run.level}`, caption: `Cleared in ${run.seconds.toFixed(1)}s`, progress: stars, isNewBest: run.isNewBest };
  }
  const status = run.progress >= 60 ? "Almost there" : run.reason === "hazard" ? "Watch your step" : "Missed the gap";
  return { status, value: `${Math.round(run.progress)}%`, caption: `Level ${run.level}`, progress: stars, isNewBest: run.isNewBest };
}
