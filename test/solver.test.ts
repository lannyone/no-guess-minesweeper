import { describe, expect, it } from "vitest";
import { isSolvable, solve } from "../src/solver.js";
import { MinesweeperError } from "../src/types.js";

describe("solve", () => {
  it("opens a zero and flags the mine it touches", () => {
    const field = { width: 3, height: 1, clue: [0, 1, -1] };
    const result = solve(field, { row: 0, col: 0 });
    expect(result.hitMine).toBe(false);
    expect(result.solvable).toBe(true);
    expect(result.cells).toEqual(["safe", "safe", "mine"]);
    expect(isSolvable(field, { row: 0, col: 0 })).toBe(true);
  });

  it("reports a board the elementary rules cannot finish", () => {
    // Clicking the 1 flags the mine beside it and never reaches the far 1.
    const field = { width: 4, height: 1, clue: [1, -1, -1, 1] };
    const result = solve(field, { row: 0, col: 0 });
    expect(result.solvable).toBe(false);
    expect(result.cells[0]).toBe("safe");
    expect(result.cells[1]).toBe("mine");
    expect(result.cells[3]).toBe("unknown");
  });

  it("does not analyze a click on a mine", () => {
    const result = solve({ width: 1, height: 2, clue: [-1, 1] }, { row: 0, col: 0 });
    expect(result).toMatchObject({ solvable: false, hitMine: true, opened: 0 });
  });

  it("rejects a clue grid of the wrong shape", () => {
    expect(() => solve({ width: 2, height: 2, clue: [0, 0] }, { row: 0, col: 0 })).toThrow(
      MinesweeperError,
    );
  });
});
