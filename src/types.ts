/** A cell on the board. Row 0 is the top, column 0 is the left. */
export interface CellCoord {
  row: number;
  col: number;
}

/**
 * A minefield the solver can read.
 * `clue[row * width + col]` is `-1` for a mine and `0`–`8` for a safe cell.
 */
export interface Minefield {
  width: number;
  height: number;
  clue: readonly number[];
}

/** A generated board. `solvable` is true unless a time budget ran out. */
export interface Board extends Minefield {
  clue: number[];
  /** Mine count requested by the caller. */
  mines: number;
  /**
   * Mines actually placed. Lower than `mines` only when the safe zone
   * (Manhattan distance <= {@link SAFE_DISTANCE} around the first click)
   * does not leave enough cells.
   */
  mineCount: number;
  start: CellCoord;
  /** Cells opened by clicking `start`, including the click itself. */
  opening: number;
  solvable: boolean;
  /** Placements tried, including the one that was kept. */
  attempts: number;
  /** Present when `seed` was passed. Low 32 bits, same as Campo Minado. */
  seed?: number;
}

export interface GenerateOptions {
  /** Columns. */
  width: number;
  /** Rows. */
  height: number;
  /** Requested mine count. */
  mines: number;
  /** First click. This cell, and the safe zone around it, stay clear of mines. */
  start: CellCoord;
  /**
   * 32-bit seed. Any integer is accepted and reduced with `>>> 0`, matching
   * Campo Minado. The same seed and options reproduce the same board, as
   * long as `timeBudgetMs` is not set.
   */
  seed?: number;
  /**
   * Random source returning values in `[0, 1)`. Mutually exclusive with `seed`.
   * Defaults to `Math.random`.
   */
  rng?: () => number;
  /**
   * How many full placements to try before giving up. Defaults to
   * {@link ALGORITHM.maxAttempts}. Ignored when `timeBudgetMs` is set.
   */
  maxAttempts?: number;
  /** Deduction sweeps in the solver. Defaults to {@link ALGORITHM.solverPasses}. */
  maxPasses?: number;
  /**
   * Use the live game's wall-clock search instead of a fixed attempt count.
   * The returned board can be unsolved if the clock runs out, and a seed is
   * not reproducible in this mode because the number of repair swaps depends
   * on time. Pass `{}` for Campo Minado's defaults: 150ms per attempt, or
   * 600ms when the board has more than 500 cells, and a total budget of at
   * least 5 seconds.
   */
  timeBudgetMs?: {
    attempt?: number;
    total?: number;
  };
}

export interface SolveResult {
  /** Every safe cell was opened by the elementary rules, with no guessing. */
  solvable: boolean;
  /** True when `start` is a mine. No deductions are made in that case. */
  hitMine: boolean;
  /** Row-major conclusion for each cell. */
  cells: Array<"unknown" | "safe" | "mine">;
  opened: number;
  flagged: number;
}

export interface RevealResult {
  hitMine: boolean;
  /** Opened indexes, start cell first, in the same flood order as Campo Minado. */
  cells: number[];
}

export interface SolverOptions {
  maxPasses?: number;
}

/** Tuning constants copied from Campo Minado's generator. */
export const ALGORITHM = {
  /** Mines cannot be placed at Manhattan distance <= this from the first click. */
  safeDistance: 2,
  /** Single-cell deduction sweeps before the solver stops. */
  solverPasses: 60,
  /** Mine/safe swaps tried when a placement is not yet solvable. */
  repairSwaps: 100,
  /** Placements tried by the deterministic search. */
  maxAttempts: 300,
} as const;

export const SAFE_DISTANCE = ALGORITHM.safeDistance;

/**
 * Largest board `generateBoard` will build (`width * height`).
 * Campo Minado's biggest level is 50×30.
 */
export const MAX_CELLS = 40_000;

export class MinesweeperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MinesweeperError";
  }
}
