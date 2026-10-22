// Tetromino definitions following the Tetris Guideline (SRS).
// Each shape is a square matrix; rotation state 0 is the spawn orientation.
// Rotation states: 0 = spawn, 1 = clockwise (R), 2 = 180, 3 = counterclockwise (L).

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// Guideline colors for each piece type.
export const PIECE_COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

// Wall-kick offsets as [x, y] with y pointing UP (Guideline convention).
// Keys are "fromState>toState".
const JLSTZ_KICKS = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// Rotate a square matrix 90 degrees clockwise.
export function rotateMatrix(matrix) {
  const n = matrix.length;
  const result = [];
  for (let r = 0; r < n; r++) {
    result.push([]);
    for (let c = 0; c < n; c++) {
      result[r][c] = matrix[n - 1 - c][r];
    }
  }
  return result;
}

// Returns the shape matrix for a piece type and rotation state (0-3).
export function getShape(type, rotation) {
  let matrix = SHAPES[type];
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    matrix = rotateMatrix(matrix);
  }
  return matrix;
}

// Returns the list of [x, y] kick offsets (y pointing DOWN, screen convention)
// to try when rotating from one state to another. The first entry is always [0, 0].
export function getKickOffsets(type, from, to) {
  if (type === 'O') return [[0, 0]];
  const table = type === 'I' ? I_KICKS : JLSTZ_KICKS;
  const entries = table[`${from}>${to}`] || [[0, 0]];
  return entries.map(([x, y]) => [x, y === 0 ? 0 : -y]);
}
