import { describe, expect, it } from "vitest";
import { cellIndex, generateBoard, generateDailyBoard, reveal } from "../src/index.js";
import { centerOf, PRESETS } from "../src/presets.js";
import { ALGORITHM, MinesweeperError, SAFE_DISTANCE } from "../src/types.js";

function safeZoneClear(board: ReturnType<typeof generateBoard>): boolean {
  const start = cellIndex(board.width, board.start);
  const startRow = Math.floor(start / board.width);
  const startCol = start % board.width;
  for (let index = 0; index < board.clue.length; index++) {
    const row = Math.floor(index / board.width);
    const col = index % board.width;
    if (Math.abs(row - startRow) + Math.abs(col - startCol) <= SAFE_DISTANCE && board.clue[index] === -1) {
      return false;
    }
  }
  return true;
}

function cluesMatchMines(board: ReturnType<typeof generateBoard>): boolean {
  for (let index = 0; index < board.clue.length; index++) {
    const clue = board.clue[index]!;
    if (clue === -1) continue;
    const row = Math.floor(index / board.width);
    const col = index % board.width;
    let mines = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nc < 0 || nr >= board.height || nc >= board.width) continue;
        if (board.clue[nr * board.width + nc] === -1) mines++;
      }
    }
    if (mines !== clue) return false;
  }
  return true;
}

function hasEnclosed(board: ReturnType<typeof generateBoard>): boolean {
  for (let index = 0; index < board.clue.length; index++) {
    if (board.clue[index] === -1) continue;
    const row = Math.floor(index / board.width);
    const col = index % board.width;
    const around: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nc >= 0 && nr < board.height && nc < board.width) {
          around.push(nr * board.width + nc);
        }
      }
    }
    if (around.length === 8 && around.every((nb) => board.clue[nb] === -1)) return true;
  }
  return false;
}

describe("generateBoard", () => {
  it("keeps the first click safe and opens an area", () => {
    const starts = [
      { row: 4, col: 4 },
      { row: 0, col: 0 },
      { row: 0, col: 8 },
      { row: 8, col: 3 },
    ];
    for (const start of starts) {
      const board = generateBoard({ ...PRESETS.beginner, start, seed: 7 });
      const opened = reveal(board, start);
      expect(board.clue[cellIndex(board.width, start)]).toBe(0);
      expect(opened.hitMine).toBe(false);
      expect(opened.cells[0]).toBe(cellIndex(board.width, start));
      expect(opened.cells.length).toBeGreaterThan(1);
      expect(board.opening).toBe(opened.cells.length);
      expect(safeZoneClear(board)).toBe(true);
      expect(board.solvable).toBe(true);
      expect(board.mineCount).toBe(board.mines);
    }
  });

  it("reproduces a seeded board and changes with the seed", () => {
    const options = { ...PRESETS.intermediate, start: centerOf(16, 16) };
    const first = generateBoard({ ...options, seed: 42 });
    const second = generateBoard({ ...options, seed: 42 });
    const other = generateBoard({ ...options, seed: 43 });
    expect(second.clue).toEqual(first.clue);
    expect(second.attempts).toBe(first.attempts);
    expect(second.opening).toBe(first.opening);
    expect(second.seed).toBe(42);
    expect(other.clue).not.toEqual(first.clue);
  });

  it("maps a negative seed onto the same uint32", () => {
    const start = { row: 2, col: 2 };
    const spec = { width: 8, height: 8, mines: 8, start };
    expect(generateBoard({ ...spec, seed: -1 }).clue).toEqual(
      generateBoard({ ...spec, seed: 4294967295 }).clue,
    );
  });

  it("builds clues that agree with the mine layout and has no enclosed cell", () => {
    const board = generateBoard({
      ...PRESETS.expert,
      start: { row: 0, col: 0 },
      seed: 99,
    });
    expect(cluesMatchMines(board)).toBe(true);
    expect(hasEnclosed(board)).toBe(false);
    expect(board.solvable).toBe(true);
    expect(board.mineCount).toBe(99);
  });

  it("generates the standard presets quickly", () => {
    const cases = [
      { ...PRESETS.beginner, start: centerOf(9, 9), limit: 250 },
      { ...PRESETS.intermediate, start: centerOf(16, 16), limit: 400 },
      { ...PRESETS.expert, start: { row: 8, col: 15 }, limit: 1000 },
    ];
    for (const { limit, ...spec } of cases) {
      const started = performance.now();
      const board = generateBoard({ ...spec, seed: 12345 });
      const elapsed = performance.now() - started;
      expect(board.solvable).toBe(true);
      expect(board.opening).toBeGreaterThan(1);
      expect(elapsed).toBeLessThan(limit);
    }
  });

  it("places fewer mines when the safe zone occupies the whole board", () => {
    const board = generateBoard({
      width: 2,
      height: 2,
      mines: 3,
      start: { row: 0, col: 0 },
      seed: 1,
    });
    expect(board.mineCount).toBe(0);
    expect(board.mines).toBe(3);
    expect(board.solvable).toBe(true);
    expect(board.opening).toBe(4);
  });

  it("rejects invalid arguments", () => {
    const start = { row: 0, col: 0 };
    expect(() => generateBoard({ width: 0, height: 9, mines: 1, start })).toThrow(MinesweeperError);
    expect(() => generateBoard({ width: 9, height: 9, mines: 1, start: { row: 9, col: 0 } })).toThrow(
      MinesweeperError,
    );
    expect(() => generateBoard({ width: 9, height: 9, mines: 1, start, seed: 1.5 })).toThrow(
      MinesweeperError,
    );
    expect(() =>
      generateBoard({
        width: 9,
        height: 9,
        mines: 1,
        start,
        seed: 1,
        rng: Math.random,
      }),
    ).toThrow(MinesweeperError);
    expect(() =>
      generateBoard({ width: 300, height: 300, mines: 1, start, maxAttempts: 1 }),
    ).toThrow(MinesweeperError);
  });

  it("matches a seeded board when the time budget cannot run out", () => {
    const spec = { ...PRESETS.beginner, start: centerOf(9, 9), seed: 4 };
    const fixed = generateBoard(spec);
    const timed = generateBoard({ ...spec, timeBudgetMs: { attempt: 5_000, total: 20_000 } });
    expect(timed.clue).toEqual(fixed.clue);
    expect(timed.solvable).toBe(true);
    expect(timed.attempts).toBe(fixed.attempts);
  });

  it("follows a custom rng and still returns a solvable board", () => {
    let state = 1;
    const rng = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    const board = generateBoard({
      ...PRESETS.beginner,
      start: centerOf(9, 9),
      rng,
    });
    expect(board.seed).toBeUndefined();
    expect(board.solvable).toBe(true);
    expect(board.attempts).toBeGreaterThanOrEqual(1);
    expect(board.attempts).toBeLessThanOrEqual(ALGORITHM.maxAttempts);
  });
});

describe("generateDailyBoard", () => {
  it("is stable for a date and solvable from the published start cell", () => {
    const first = generateDailyBoard("2026-10-27");
    const second = generateDailyBoard("2026-10-27");
    expect(second.clue).toEqual(first.clue);
    expect(first.width).toBe(12);
    expect(first.height).toBe(12);
    expect(first.mineCount).toBe(25);
    expect(first.start).toEqual({ row: 6, col: 5 });
    expect(first.solvable).toBe(true);
    expect(first.opening).toBeGreaterThan(1);
    expect(first.seed).toBe(2919792200);
    expect(generateDailyBoard("2026-10-28").clue).not.toEqual(first.clue);
  });
});
