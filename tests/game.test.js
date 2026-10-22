import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, LOCK_DELAY } from '../src/game.js';
import { ROWS, COLS, createBoard } from '../src/board.js';
import { gravityInterval, levelForLines, scoreClear } from '../src/scoring.js';
import { shuffle, PieceQueue } from '../src/bag.js';

// Deterministic random source so piece order is predictable in tests.
const fixedRandom = () => 0;

test('shuffle is deterministic with a fixed random source and keeps all items', () => {
  const items = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const result = shuffle(items, fixedRandom);
  assert.deepEqual([...result].sort(), [...items].sort());
});

test('PieceQueue yields each of the 7 piece types once per bag', () => {
  const q = new PieceQueue(() => 0.5, 5);
  const bag = [q.next(), q.next(), q.next(), q.next(), q.next(), q.next(), q.next()];
  assert.equal(new Set(bag).size, 7);
});

test('new game spawns a piece and sets initial stats', () => {
  const g = new Game({ random: fixedRandom });
  assert.ok(g.current);
  assert.equal(g.score, 0);
  assert.equal(g.level, 1);
  assert.equal(g.gameOver, false);
});

test('move shifts the piece and rejects out-of-bounds moves', () => {
  const g = new Game({ random: fixedRandom });
  const startX = g.current.x;
  assert.equal(g.move(-1), true);
  assert.equal(g.current.x, startX - 1);
  for (let i = 0; i < COLS; i++) g.move(-1);
  assert.equal(g.move(-1), false);
});

test('hard drop adds 2 points per cell and locks the piece', () => {
  const g = new Game({ random: fixedRandom });
  const before = g.score;
  g.hardDrop();
  assert.ok(g.score > before);
  assert.equal(g.score % 2, 0);
  assert.ok(g.grid.some((row) => row.some((c) => c !== null)));
});

test('hold stores the current piece and only allows one hold per drop', () => {
  const g = new Game({ random: fixedRandom });
  const first = g.current.type;
  g.holdPiece();
  assert.equal(g.hold, first);
  assert.equal(g.canHold, false);
  const current = g.current.type;
  g.holdPiece();
  assert.equal(g.current.type, current);
});

test('gravity moves the piece down over time', () => {
  const g = new Game({ random: fixedRandom });
  const startY = g.current.y;
  g.tick(gravityInterval(1) * 2 + 0.01);
  assert.ok(g.current.y > startY);
});

test('piece locks after lock delay when grounded', () => {
  const g = new Game({ random: fixedRandom });
  g.spawn('O');
  g.grid = createBoard();
  g.current.y = ROWS - 2; // O piece resting on the floor
  const before = g.grid.flat().filter(Boolean).length;
  g.tick(LOCK_DELAY / 2);
  assert.equal(g.grid.flat().filter(Boolean).length, before);
  g.tick(LOCK_DELAY);
  assert.equal(g.grid.flat().filter(Boolean).length, before + 4);
});

test('scoreClear awards single, double, triple, and tetris points at level 1', () => {
  const base = { tspin: null, level: 1, backToBack: false, combo: -1 };
  assert.equal(scoreClear({ ...base, linesCleared: 1 }).points, 100);
  assert.equal(scoreClear({ ...base, linesCleared: 2 }).points, 300);
  assert.equal(scoreClear({ ...base, linesCleared: 3 }).points, 500);
  assert.equal(scoreClear({ ...base, linesCleared: 4 }).points, 800);
});

test('back-to-back tetris gets a 1.5x bonus', () => {
  const r = scoreClear({ linesCleared: 4, tspin: null, level: 1, backToBack: true, combo: -1 });
  assert.equal(r.points, 1200);
  assert.equal(r.backToBack, true);
});

test('T-spin single awards 800 at level 1', () => {
  const r = scoreClear({ linesCleared: 1, tspin: 'full', level: 1, backToBack: false, combo: -1 });
  assert.equal(r.points, 800);
});

test('combo adds 50 points per consecutive clear times level', () => {
  const r = scoreClear({ linesCleared: 1, tspin: null, level: 2, backToBack: false, combo: 0 });
  assert.equal(r.points, 100 * 2 + 50 * 1 * 2);
  assert.equal(r.combo, 1);
});

test('level increases every 10 lines', () => {
  assert.equal(levelForLines(0), 1);
  assert.equal(levelForLines(9), 1);
  assert.equal(levelForLines(10), 2);
  assert.equal(levelForLines(25), 3);
});

test('gravity gets faster as level rises', () => {
  assert.ok(gravityInterval(5) < gravityInterval(1));
});

test('game ends when a new piece cannot spawn', () => {
  const g = new Game({ random: fixedRandom });
  g.grid = createBoard();
  for (let r = 0; r < ROWS; r++) g.grid[r].fill('I');
  g.spawn('T');
  assert.equal(g.gameOver, true);
});
