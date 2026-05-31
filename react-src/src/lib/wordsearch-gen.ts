/**
 * Wordsearch grid generator.
 * Places words in 8 directions (E, SE, S, SW, W, NW, N, NE)
 * and fills remaining cells with random letters.
 */

import type { WordSearchEntry, WordSearchSolution } from './test-types';

// 8 directions: [dRow, dCol]
const DIRS: [number, number][] = [
  [0,  1],  // 0: E
  [1,  1],  // 1: SE
  [1,  0],  // 2: S
  [1, -1],  // 3: SW
  [0, -1],  // 4: W
  [-1,-1],  // 5: NW
  [-1, 0],  // 6: N
  [-1, 1],  // 7: NE
];

const FILL_CHARS = 'ABCDEFGHIJKLMNOPRSTUVWXYÅÄÖ';

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number, col: number,
  dir: number,
  N: number,
): boolean {
  const [dr, dc] = DIRS[dir];
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    const existing = grid[r][c];
    if (existing !== null && existing !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: (string | null)[][],
  word: string,
  row: number, col: number,
  dir: number,
): void {
  const [dr, dc] = DIRS[dir];
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

export function generateWordSearch(
  entries: WordSearchEntry[],
  gridSize = 16,
): { grid: string[][]; solution: WordSearchSolution[]; skipped: string[] } {
  const N = gridSize;
  const grid: (string | null)[][] = Array.from({ length: N }, () =>
    Array(N).fill(null),
  );
  const solution: WordSearchSolution[] = [];
  const skipped: string[] = [];

  // Sort longest first (hardest to place)
  const sorted = [...entries].sort((a, b) => b.word.length - a.word.length);

  for (const entry of sorted) {
    const word = entry.word.toUpperCase().replace(/[^A-ZÅÄÖ]/g, '');
    if (!word) continue;

    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const dir = randomInt(8);
      const row = randomInt(N);
      const col = randomInt(N);
      if (canPlace(grid, word, row, col, dir, N)) {
        placeWord(grid, word, row, col, dir);
        solution.push({ word: entry.word, row, col, dir });
        placed = true;
      }
    }
    if (!placed) {
      // Word could not fit — record it so callers can warn the user
      skipped.push(entry.word);
    }
  }

  // Fill remaining cells
  const filled: string[][] = grid.map(row =>
    row.map(cell =>
      cell ?? FILL_CHARS[randomInt(FILL_CHARS.length)],
    ),
  );

  return { grid: filled, solution, skipped };
}
