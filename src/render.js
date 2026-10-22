// Canvas drawing for the playfield, ghost piece, hold box, and next queue.
import { COLS, VISIBLE_ROWS, ROWS, ghostY } from './board.js';
import { getShape, PIECE_COLORS } from './pieces.js';

export const CELL = 30;
const PREVIEW_CELL = 22;

// Draws one cell with a bevel so blocks look like the classic style.
function drawCell(ctx, x, y, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(x, y, size, 3);
  ctx.fillRect(x, y, 3, size);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x, y + size - 3, size, 3);
  ctx.fillRect(x + size - 3, y, 3, size);
  ctx.restore();
}

// Draws a shape matrix with its top-left at grid position (ox, oy).
function drawShape(ctx, shape, ox, oy, size, color, alpha = 1) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        drawCell(ctx, (ox + c) * size, (oy + r) * size, size, color, alpha);
      }
    }
  }
}

// Draws the visible part of the playfield, locked blocks, ghost, and active piece.
export function renderBoard(ctx, game) {
  const width = COLS * CELL;
  const height = VISIBLE_ROWS * CELL;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, height);
    ctx.stroke();
  }
  for (let r = 0; r <= VISIBLE_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(width, r * CELL);
    ctx.stroke();
  }

  const offset = ROWS - VISIBLE_ROWS; // rows 0-19 are the hidden buffer
  for (let r = offset; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const type = game.grid[r][c];
      if (type) drawCell(ctx, c * CELL, (r - offset) * CELL, CELL, PIECE_COLORS[type]);
    }
  }

  if (game.current) {
    const shape = game.shape();
    const { type, x, y } = game.current;
    const landY = ghostY(game.grid, shape, x, y);
    drawShape(ctx, shape, x, landY - offset, CELL, PIECE_COLORS[type], 0.25);
    drawShape(ctx, shape, x, y - offset, CELL, PIECE_COLORS[type]);
  }
}

// Draws one piece centered inside the rectangle (left, top, width, height).
function drawCentered(ctx, type, left, top, width, height, size) {
  const shape = getShape(type, 0);
  const rows = [];
  const cols = [];
  for (let r = 0; r < shape.length; r++) {
    if (shape[r].some(Boolean)) rows.push(r);
  }
  for (let c = 0; c < shape.length; c++) {
    if (shape.some((row) => row[c])) cols.push(c);
  }
  const w = (cols[cols.length - 1] - cols[0] + 1) * size;
  const h = (rows[rows.length - 1] - rows[0] + 1) * size;
  const px = left + (width - w) / 2 - cols[0] * size;
  const py = top + (height - h) / 2 - rows[0] * size;
  drawShape(ctx, shape, px / size, py / size, size, PIECE_COLORS[type]);
}

// Draws the held piece in the hold box.
export function renderHold(ctx, type) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (type) drawCentered(ctx, type, 0, 0, ctx.canvas.width, ctx.canvas.height, PREVIEW_CELL);
}

// Draws the upcoming pieces stacked vertically, one per slot.
export function renderNext(ctx, types) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const slot = ctx.canvas.height / types.length;
  types.forEach((type, i) => {
    drawCentered(ctx, type, 0, i * slot, ctx.canvas.width, slot, PREVIEW_CELL);
  });
}
