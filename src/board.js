// Playfield logic: a 10x40 grid where rows 0-19 are the hidden buffer zone
// and rows 20-39 are visible. Row 0 is the top of the grid.

export const COLS = 10;
export const ROWS = 40;
export const VISIBLE_ROWS = 20;

// Creates an empty grid. Each cell is either null or a piece type letter.
export function createBoard() {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push(new Array(COLS).fill(null));
  }
  return grid;
}

// Returns true if the shape placed at (x, y) collides with walls, floor, or locked cells.
export function collides(grid, shape, x, y) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const gx = x + c;
      const gy = y + r;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx] !== null) return true;
    }
  }
  return false;
}

// Writes the shape's cells into the grid with the given piece type.
// Returns a new grid; the input is not mutated.
export function lockPiece(grid, shape, x, y, type) {
  const next = grid.map((row) => row.slice());
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const gy = y + r;
      const gx = x + c;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
        next[gy][gx] = type;
      }
    }
  }
  return next;
}

// Removes full rows. Returns the new grid and the number of cleared rows.
export function clearLines(grid) {
  const remaining = grid.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - remaining.length;
  while (remaining.length < ROWS) {
    remaining.unshift(new Array(COLS).fill(null));
  }
  return { grid: remaining, cleared };
}

// Returns the row a piece would land on if dropped straight down (ghost piece).
export function ghostY(grid, shape, x, y) {
  let gy = y;
  while (!collides(grid, shape, x, gy + 1)) {
    gy++;
  }
  return gy;
}
