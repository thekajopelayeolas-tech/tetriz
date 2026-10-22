// Scoring and gravity rules based on the Tetris Guideline.

// Points for clearing 1-4 lines (before level multiplier), keyed by line count.
const LINE_POINTS = { 1: 100, 2: 300, 3: 500, 4: 800 };

// Points for T-spin clears (before level multiplier).
const TSPIN_POINTS = {
  mini: { 0: 100, 1: 200, 2: 400 },
  full: { 0: 400, 1: 800, 2: 1200, 3: 1600 },
};

// Seconds per row of gravity at a given level (level starts at 1).
export function gravityInterval(level) {
  const base = 0.8 - (level - 1) * 0.007;
  return Math.pow(Math.max(base, 0.001), level - 1);
}

// Computes points for one lock event.
// linesCleared: rows removed; tspin: null | 'mini' | 'full'; level: current level;
// backToBack: whether the previous scoring move was a difficult clear;
// combo: number of consecutive clearing locks before this one (-1 when none).
export function scoreClear({ linesCleared, tspin, level, backToBack, combo }) {
  let base = 0;
  let difficult = false;

  if (tspin) {
    base = TSPIN_POINTS[tspin][linesCleared] ?? 0;
    difficult = tspin === 'full' || linesCleared > 0;
  }
  if (linesCleared > 0 && !tspin) {
    base = LINE_POINTS[linesCleared] ?? 0;
    difficult = linesCleared === 4;
  }

  let points = base * level;
  if (difficult && backToBack && linesCleared > 0) {
    points = Math.floor(points * 1.5);
  }

  const nextCombo = linesCleared > 0 ? combo + 1 : -1;
  if (linesCleared > 0 && nextCombo > 0) {
    points += 50 * nextCombo * level;
  }

  const nextBackToBack = linesCleared > 0 ? difficult : backToBack;
  return { points, combo: nextCombo, backToBack: nextBackToBack };
}

// Points for soft drop (1 per cell) and hard drop (2 per cell).
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

// Total lines needed to advance one level.
export const LINES_PER_LEVEL = 10;

export function levelForLines(lines) {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}
