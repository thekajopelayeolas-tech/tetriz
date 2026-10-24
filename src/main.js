// Browser entry point: wires the game state to the DOM, canvas, and keyboard.
import { Game } from './game.js';
import { renderBoard, renderHold, renderNext, CELL } from './render.js';

// Delayed Auto Shift timings (Guideline-style): hold a key this long before auto-repeat starts.
const DAS = 0.167; // seconds before repeat starts
const ARR = 0.033; // seconds between repeats

// Each level uses a background from body[data-level="1"] to body[data-level="N"] in style.css.
// Levels past N cycle back to the start.
const BACKGROUND_COUNT = 6;

const boardCanvas = document.getElementById('board');
const holdCanvas = document.getElementById('hold');
const nextCanvas = document.getElementById('next');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restart');

const boardCtx = boardCanvas.getContext('2d');
const holdCtx = holdCanvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

boardCanvas.width = 10 * CELL;
boardCanvas.height = 20 * CELL;

let game = new Game();
let paused = false;
let lastTime = performance.now();

// Auto-repeat state for left/right/soft drop.
const held = { ArrowLeft: null, ArrowRight: null, ArrowDown: null };

function updateHud() {
  scoreEl.textContent = game.score;
  linesEl.textContent = game.lines;
  levelEl.textContent = game.level;
  document.body.dataset.level = String(((game.level - 1) % BACKGROUND_COUNT) + 1);
}

function draw() {
  renderBoard(boardCtx, game);
  renderHold(holdCtx, game.hold);
  renderNext(nextCtx, game.queue.preview());
  updateHud();
  overlay.classList.toggle('hidden', !game.gameOver);
}

function startNewGame() {
  game = new Game();
  paused = false;
  for (const key of Object.keys(held)) held[key] = null;
  draw();
}

function handleAction(action) {
  switch (action) {
    case 'left':
      game.move(-1);
      break;
    case 'right':
      game.move(1);
      break;
    case 'softDrop':
      game.softDrop();
      break;
    case 'hardDrop':
      game.hardDrop();
      break;
    case 'rotateCW':
      game.rotate(1);
      break;
    case 'rotateCCW':
      game.rotate(-1);
      break;
    case 'hold':
      game.holdPiece();
      break;
    default:
      break;
  }
}

const keyMap = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  ' ': 'hardDrop',
  ArrowUp: 'rotateCW',
  x: 'rotateCW',
  X: 'rotateCW',
  z: 'rotateCCW',
  Z: 'rotateCCW',
  c: 'hold',
  C: 'hold',
};

window.addEventListener('keydown', (event) => {
  if (event.key === 'p' || event.key === 'P') {
    paused = !paused;
    return;
  }
  const action = keyMap[event.key];
  if (!action || game.gameOver || paused) return;
  event.preventDefault();
  if (event.repeat && (action === 'left' || action === 'right' || action === 'softDrop')) {
    return;
  }
  handleAction(action);
  if (held[event.key] !== undefined) {
    held[event.key] = { elapsed: 0, repeating: false };
  }
  draw();
});

window.addEventListener('keyup', (event) => {
  if (held[event.key] !== undefined) {
    held[event.key] = null;
  }
});

// Applies DAS/ARR auto-repeat to held directional keys.
function updateAutoRepeat(dt) {
  const actions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'softDrop' };
  for (const key of Object.keys(actions)) {
    const state = held[key];
    if (!state) continue;
    state.elapsed += dt;
    if (!state.repeating && state.elapsed >= DAS) {
      state.repeating = true;
      state.elapsed -= DAS;
    }
    if (state.repeating) {
      while (state.elapsed >= ARR) {
        handleAction(actions[key]);
        state.elapsed -= ARR;
      }
    }
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!paused && !game.gameOver) {
    updateAutoRepeat(dt);
    game.tick(dt);
  }
  draw();
  requestAnimationFrame(loop);
}

restartBtn.addEventListener('click', startNewGame);
draw();
requestAnimationFrame(loop);
