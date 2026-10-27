import { describe, expect, it } from "vitest";
import { neighbors } from "../src/field.js";
import { generateBoard, generateDailyBoard, solve } from "../src/index.js";
import { A, D, E, M, ae, ne, x, type OracleBoard } from "./fixtures/campominado-generator.js";

function minesOf(board: { clue: readonly number[] }): boolean[] {
  return board.clue.map((value) => value === -1);
}

function referenceMines(board: OracleBoard): boolean[] {
  return board.cells.map((cell) => cell.mine);
}

function labelsOf(state: Int8Array): Array<"unknown" | "safe" | "mine"> {
  return [...state].map((value) => (value === 1 ? "safe" : value === 2 ? "mine" : "unknown"));
}

describe("parity with campominado.com", () => {
  const cases: Array<[string, number, number, number, number, number]> = [
    ["beginner center", 9, 9, 10, 4 * 9 + 4, 1],
    ["beginner corner", 9, 9, 10, 0, 8],
    ["intermediate", 16, 16, 40, 8 * 16 + 8, 3],
    ["expert center", 16, 30, 99, 8 * 30 + 15, 5],
    ["expert corner", 16, 30, 99, 0, 11],
    ["campo facil", 8, 10, 10, 3 * 10 + 4, 2],
    ["daily shape", 12, 12, 25, 77, 4],
  ];

  it.each(cases)("%s matches the production search", (_name, rows, cols, mines, start, seed) => {
    expect(neighbors(rows, cols)).toEqual(ne(rows, cols));
    const reference = x(rows, cols, mines);
    const attempts = A(reference, start, M(seed));
    expect(attempts).not.toBeNull();

    const board = generateBoard({
      width: cols,
      height: rows,
      mines,
      start: { row: Math.floor(start / cols), col: start % cols },
      seed,
    });
    expect(minesOf(board)).toEqual(referenceMines(reference));
    expect(board.attempts).toBe(attempts);
    expect(D(reference, start)).toBe(true);

    const state = E(reference, start);
    const solved = solve(board, board.start);
    expect(solved.cells).toEqual(labelsOf(state));
    expect(solved.solvable).toBe(true);
  });

  it("matches several seeds on the expert preset", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const rows = 16;
      const cols = 30;
      const start = 8 * cols + 15;
      const reference = x(rows, cols, 99);
      const attempts = A(reference, start, M(seed));
      expect(attempts).not.toBeNull();
      const board = generateBoard({
        width: cols,
        height: rows,
        mines: 99,
        start: { row: 8, col: 15 },
        seed,
      });
      expect(minesOf(board)).toEqual(referenceMines(reference));
    }
  });

  it("matches the daily board for several dates", () => {
    for (const date of ["2026-01-01", "2026-10-27", "2024-02-29"]) {
      const reference = ae(date);
      const board = generateDailyBoard(date);
      expect(minesOf(board)).toEqual(referenceMines(reference));
      expect(D(reference, 77)).toBe(true);
    }
  });
});
