import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, createBoard, collides, lockPiece, clearLines, ghostY } from '../src/board.js';
import { getShape, rotateMatrix, getKickOffsets, PIECE_TYPES } from '../src/pieces.js';

test('createBoard returns an empty 40x10 grid', () => {
  const grid = createBoard();
  assert.equal(grid.length, ROWS);
  assert.ok(grid.every((row) => row.length === COLS && row.every((c) => c === null)));
});

test('collides detects left and right walls', () => {
  const grid = createBoard();
  const shape = getShape('O', 0);
  assert.equal(collides(grid, shape, -1, 5), true);
  assert.equal(collides(grid, shape, COLS - 1, 5), true);
  assert.equal(collides(grid, shape, 0, 5), false);
});

test('collides detects the floor', () => {
  const grid = createBoard();
  const shape = getShape('O', 0);
  assert.equal(collides(grid, shape, 0, ROWS - 2), false);
  assert.equal(collides(grid, shape, 0, ROWS - 1), true);
});

test('lockPiece writes cells without mutating the input grid', () => {
  const grid = createBoard();
  const next = lockPiece(grid, getShape('O', 0), 0, ROWS - 2, 'O');
  assert.equal(grid[ROWS - 1][0], null);
  assert.equal(next[ROWS - 1][0], 'O');
  assert.equal(next[ROWS - 2][1], 'O');
});

test('clearLines removes full rows and adds empty rows on top', () => {
  let grid = createBoard();
  for (let c = 0; c < COLS; c++) grid[ROWS - 1][c] = 'I';
  grid[ROWS - 2][0] = 'T';
  const result = clearLines(grid);
  assert.equal(result.cleared, 1);
  assert.equal(result.grid.length, ROWS);
  assert.equal(result.grid[ROWS - 1][0], 'T');
  assert.equal(result.grid[0][0], null);
});

test('ghostY finds the landing row on an empty board', () => {
  const grid = createBoard();
  const shape = getShape('I', 0);
  assert.equal(ghostY(grid, shape, 3, 0), ROWS - 2);
});

test('rotateMatrix rotates a T piece clockwise', () => {
  const t = getShape('T', 0);
  const r = rotateMatrix(t);
  assert.deepEqual(r, [
    [0, 1, 0],
    [0, 1, 1],
    [0, 1, 0],
  ]);
});

test('four rotations return to the original shape', () => {
  for (const type of PIECE_TYPES) {
    let m = getShape(type, 0);
    for (let i = 0; i < 4; i++) m = rotateMatrix(m);
    assert.deepEqual(m, getShape(type, 0), type);
  }
});

test('kick offsets start with no displacement and O has only one option', () => {
  assert.deepEqual(getKickOffsets('O', 0, 1), [[0, 0]]);
  for (const type of ['I', 'T', 'S', 'Z', 'J', 'L']) {
    assert.deepEqual(getKickOffsets(type, 0, 1)[0], [0, 0], type);
  }
});
