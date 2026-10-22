// 7-bag randomizer: every piece appears exactly once in each shuffled bag of seven.
import { PIECE_TYPES } from './pieces.js';

// Fisher-Yates shuffle. `random` returns a float in [0, 1) and defaults to Math.random.
export function shuffle(items, random = Math.random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createBag(random = Math.random) {
  return shuffle(PIECE_TYPES, random);
}

// Keeps a queue of upcoming pieces filled from successive bags.
export class PieceQueue {
  constructor(random = Math.random, previewSize = 5) {
    this.random = random;
    this.previewSize = previewSize;
    this.items = [];
    this.refill();
  }

  refill() {
    while (this.items.length < this.previewSize + 1) {
      this.items.push(...createBag(this.random));
    }
  }

  // Removes and returns the next piece type.
  next() {
    const type = this.items.shift();
    this.refill();
    return type;
  }

  // Returns the upcoming piece types without removing them.
  preview() {
    return this.items.slice(0, this.previewSize);
  }
}
