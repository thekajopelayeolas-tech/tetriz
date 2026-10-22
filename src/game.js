// Core game state machine: movement, rotation, hold, locking, and scoring.
import { COLS, VISIBLE_ROWS, createBoard, collides, lockPiece, clearLines, ghostY } from './board.js';
import { getShape, getKickOffsets } from './pieces.js';
import { PieceQueue } from './bag.js';
import {
  scoreClear,
  gravityInterval,
  levelForLines,
  SOFT_DROP_POINTS,
  HARD_DROP_POINTS,
} from './scoring.js';

export const LOCK_DELAY = 0.5; // seconds a grounded piece waits before locking
export const MAX_LOCK_RESETS = 15; // moves/rotations allowed to extend lock delay
const SPAWN_X = 3;
const SPAWN_Y = 19; // rows 0-19 are the hidden buffer, so the piece's top row starts hidden

// Guideline bonus for clearing the whole board (before level multiplier).
const PERFECT_CLEAR_POINTS = { 1: 800, 2: 1200, 3: 1800, 4: 2000 };

export class Game {
  constructor({ random = Math.random, previewSize = 5 } = {}) {
    this.queue = new PieceQueue(random, previewSize);
    this.reset();
  }

  reset() {
    this.grid = createBoard();
    this.current = null;
    this.hold = null;
    this.canHold = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.backToBack = false;
    this.gameOver = false;
    this.lastAction = null; // { type: 'move' } or { type: 'rotate', kickIndex }
    this.lockTimer = 0;
    this.lockResets = 0;
    this.gravityTimer = 0;
    this.lastClear = null; // details of the most recent lock, used by the UI
    this.spawn(this.queue.next());
  }

  spawn(type) {
    this.current = { type, rotation: 0, x: SPAWN_X, y: SPAWN_Y };
    this.lockTimer = 0;
    this.lockResets = 0;
    this.gravityTimer = 0;
    this.lastAction = null;
    if (collides(this.grid, this.shape(), this.current.x, this.current.y)) {
      this.gameOver = true;
    }
  }

  shape() {
    return getShape(this.current.type, this.current.rotation);
  }

  isGrounded() {
    return collides(this.grid, this.shape(), this.current.x, this.current.y + 1);
  }

  // Resets the lock timer after a successful move or rotation while grounded.
  afterSuccessfulAction() {
    if (this.isGrounded() && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  move(dx) {
    if (this.gameOver || !this.current) return false;
    const { x, y } = this.current;
    if (collides(this.grid, this.shape(), x + dx, y)) return false;
    this.current.x = x + dx;
    this.lastAction = { type: 'move' };
    this.afterSuccessfulAction();
    return true;
  }

  // dir: 1 for clockwise, -1 for counterclockwise.
  rotate(dir) {
    if (this.gameOver || !this.current) return false;
    const from = this.current.rotation;
    const to = (from + dir + 4) % 4;
    const candidate = getShape(this.current.type, to);
    const kicks = getKickOffsets(this.current.type, from, to);
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i];
      const nx = this.current.x + kx;
      const ny = this.current.y + ky;
      if (!collides(this.grid, candidate, nx, ny)) {
        this.current = { ...this.current, rotation: to, x: nx, y: ny };
        this.lastAction = { type: 'rotate', kickIndex: i };
        this.afterSuccessfulAction();
        return true;
      }
    }
    return false;
  }

  // Moves the piece down one row. Returns true if it moved.
  softDrop() {
    if (this.gameOver || !this.current) return false;
    if (collides(this.grid, this.shape(), this.current.x, this.current.y + 1)) return false;
    this.current.y++;
    this.score += SOFT_DROP_POINTS;
    this.lastAction = { type: 'move' };
    this.gravityTimer = 0;
    return true;
  }

  hardDrop() {
    if (this.gameOver || !this.current) return;
    const landY = ghostY(this.grid, this.shape(), this.current.x, this.current.y);
    const distance = landY - this.current.y;
    this.score += distance * HARD_DROP_POINTS;
    if (distance > 0) {
      this.current.y = landY;
      this.lastAction = { type: 'move' };
    }
    this.lock();
  }

  holdPiece() {
    if (this.gameOver || !this.current || !this.canHold) return;
    const held = this.current.type;
    if (this.hold === null) {
      this.hold = held;
      this.spawn(this.queue.next());
    } else {
      const swapped = this.hold;
      this.hold = held;
      this.spawn(swapped);
    }
    this.canHold = false;
  }

  // Detects a T-spin using the 3-corner rule. Returns null, 'mini', or 'full'.
  detectTSpin() {
    const { type, rotation, x, y } = this.current;
    if (type !== 'T' || !this.lastAction || this.lastAction.type !== 'rotate') return null;
    const cx = x + 1;
    const cy = y + 1;
    const occupied = (gx, gy) =>
      gx < 0 || gx >= COLS || gy >= this.grid.length || (gy >= 0 && this.grid[gy][gx] !== null);
    const tl = occupied(cx - 1, cy - 1);
    const tr = occupied(cx + 1, cy - 1);
    const bl = occupied(cx - 1, cy + 1);
    const br = occupied(cx + 1, cy + 1);
    const count = [tl, tr, bl, br].filter(Boolean).length;
    if (count < 3) return null;
    // Front corners are the two on the side the T points toward.
    const frontPairs = [
      [tl, tr], // rotation 0: points up
      [tr, br], // rotation 1: points right
      [bl, br], // rotation 2: points down
      [tl, bl], // rotation 3: points left
    ];
    const [a, b] = frontPairs[rotation];
    const frontBoth = a && b;
    const kickedFully = this.lastAction.kickIndex === 4;
    return frontBoth || kickedFully ? 'full' : 'mini';
  }

  // Locks the current piece, clears lines, scores, and spawns the next piece.
  lock() {
    const tspin = this.detectTSpin();
    const { type, x, y } = this.current;
    const shape = this.shape();
    const lockedFullyHidden = shape.every((row, r) =>
      row.every((cell, c) => !cell || y + r < VISIBLE_ROWS)
    );

    this.grid = lockPiece(this.grid, shape, x, y, type);
    const result = clearLines(this.grid);
    this.grid = result.grid;
    this.lines += result.cleared;

    const scored = scoreClear({
      linesCleared: result.cleared,
      tspin,
      level: this.level,
      backToBack: this.backToBack,
      combo: this.combo,
    });
    let points = scored.points;
    const perfect = this.grid.every((row) => row.every((cell) => cell === null));
    if (perfect && result.cleared > 0) {
      points += (PERFECT_CLEAR_POINTS[result.cleared] || 0) * this.level;
    }
    this.score += points;
    this.combo = scored.combo;
    this.backToBack = scored.backToBack;
    this.level = levelForLines(this.lines);
    this.lastClear = { linesCleared: result.cleared, tspin, points, perfect };

    if (lockedFullyHidden) {
      this.gameOver = true;
      this.current = null;
      return;
    }
    this.canHold = true;
    this.spawn(this.queue.next());
  }

  // Advances time by dt seconds: applies gravity and lock delay.
  tick(dt) {
    if (this.gameOver || !this.current) return;
    if (this.isGrounded()) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) {
        this.lock();
      }
      return;
    }
    this.gravityTimer += dt;
    const interval = gravityInterval(this.level);
    while (this.gravityTimer >= interval && !this.isGrounded()) {
      this.current.y++;
      this.gravityTimer -= interval;
      this.lastAction = { type: 'move' };
    }
    if (this.isGrounded()) {
      this.gravityTimer = 0;
    }
  }
}
