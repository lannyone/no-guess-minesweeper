import { cluesFromField, createField, hasEnclosed, indexOf, placeMines, recomputeAdj, type Field } from "./field.js";
import { hashSeed, createRng } from "./rng.js";
import { DAILY_PUZZLE } from "./presets.js";
import { isSolved, solveStates } from "./solver.js";
import { reveal } from "./reveal.js";
import {
  ALGORITHM,
  MAX_CELLS,
  MinesweeperError,
  SAFE_DISTANCE,
  type Board,
  type CellCoord,
  type GenerateOptions,
} from "./types.js";

const UNKNOWN = 0;
const SAFE = 1;

function now(): number {
  return globalThis.performance.now();
}

/**
 * Move mines off the solved frontier until the board is clear or the swap
 * limit (and, in the live game, the time limit) runs out.
 * Direct transcription of Campo Minado's repair step.
 */
function repair(
  field: Field,
  start: number,
  rng: () => number,
  budgetMs: number,
  maxSwaps: number,
  maxPasses: number,
): boolean {
  const started = now();
  let swaps = 0;
  const total = field.rows * field.cols;
  const startRow = Math.floor(start / field.cols);
  const startCol = start % field.cols;
  const inSafeZone = (index: number) => {
    const row = Math.floor(index / field.cols);
    const col = index % field.cols;
    return Math.abs(row - startRow) + Math.abs(col - startCol) <= SAFE_DISTANCE;
  };

  do {
    const state = solveStates(field, start, maxPasses);
    const unknown: number[] = [];
    for (let index = 0; index < total; index++) {
      if (state[index] === UNKNOWN) unknown.push(index);
    }
    if (unknown.length === 0) return !hasEnclosed(field);

    const frontierMines = unknown.filter(
      (index) => field.cells[index]!.mine && field.nb[index]!.some((nb) => state[nb] === SAFE),
    );
    const hiddenSafe = unknown.filter((index) => !field.cells[index]!.mine && !inSafeZone(index));
    const deep = hiddenSafe.filter((index) => !field.nb[index]!.some((nb) => state[nb] === SAFE));
    const pool = deep.length > 0 ? deep : hiddenSafe;
    if (frontierMines.length === 0 || pool.length === 0) return false;

    const from = frontierMines[Math.floor(rng() * frontierMines.length)]!;
    const to = pool[Math.floor(rng() * pool.length)]!;
    field.cells[from]!.mine = false;
    field.cells[to]!.mine = true;
    recomputeAdj(field);
  } while (++swaps < maxSwaps && now() - started < budgetMs);

  return false;
}

/** Daily-puzzle search: a fixed number of placements, no wall clock. */
function searchFixed(
  field: Field,
  start: number,
  rng: () => number,
  maxAttempts: number,
  maxPasses: number,
): { solved: boolean; attempts: number } {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    placeMines(field, start, rng);
    if (
      !hasEnclosed(field) &&
      (isSolved(field, start, maxPasses) ||
        repair(field, start, rng, Number.POSITIVE_INFINITY, ALGORITHM.repairSwaps, maxPasses))
    ) {
      return { solved: true, attempts: attempt };
    }
  }
  return { solved: false, attempts: maxAttempts };
}

/** Live-game search. Stops on a clock, then may re-roll an enclosed layout. */
function searchTimed(
  field: Field,
  start: number,
  rng: () => number,
  attemptMs: number,
  totalMs: number,
  maxPasses: number,
): { attempts: number } {
  const started = now();
  let attempts = 0;
  do {
    placeMines(field, start, rng);
    attempts++;
    if (hasEnclosed(field)) continue;
    if (isSolved(field, start, maxPasses)) break;
    const remaining = Math.max(attemptMs, totalMs - (now() - started));
    if (
      repair(field, start, rng, Math.min(remaining, attemptMs), ALGORITHM.repairSwaps, maxPasses)
    ) {
      break;
    }
  } while (now() - started < totalMs);
  for (let extra = 0; extra < 50 && hasEnclosed(field); extra++) placeMines(field, start, rng);
  return { attempts };
}

function assertGenerate(options: GenerateOptions): {
  width: number;
  height: number;
  mines: number;
  start: CellCoord;
  startIndex: number;
  rng: () => number;
  seed?: number;
  maxAttempts: number;
  maxPasses: number;
  timed: { attempt: number; total: number } | null;
} {
  const { width, height, mines, start } = options;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new MinesweeperError("width and height must be integers >= 1.");
  }
  if (width * height > MAX_CELLS) {
    throw new MinesweeperError(`width * height must be <= ${MAX_CELLS}.`);
  }
  if (!Number.isInteger(mines) || mines < 0) {
    throw new MinesweeperError("mines must be an integer >= 0.");
  }
  if (!start || typeof start !== "object") {
    throw new MinesweeperError("start must be { row, col }.");
  }
  if (
    !Number.isInteger(start.row) ||
    !Number.isInteger(start.col) ||
    start.row < 0 ||
    start.col < 0 ||
    start.row >= height ||
    start.col >= width
  ) {
    throw new MinesweeperError(
      `start { row: ${start.row}, col: ${start.col} } is outside the ${width}×${height} board.`,
    );
  }
  if (options.seed !== undefined && options.rng !== undefined) {
    throw new MinesweeperError("Pass either seed or rng, not both.");
  }
  if (options.rng !== undefined && typeof options.rng !== "function") {
    throw new MinesweeperError("rng must be a function.");
  }

  let seed: number | undefined;
  let rng: () => number;
  if (options.seed !== undefined) {
    if (typeof options.seed !== "number" || !Number.isInteger(options.seed)) {
      throw new MinesweeperError("seed must be an integer.");
    }
    seed = options.seed >>> 0;
    rng = createRng(seed);
  } else if (options.rng) {
    rng = options.rng;
  } else {
    rng = Math.random;
  }

  const maxPasses = options.maxPasses ?? ALGORITHM.solverPasses;
  if (!Number.isInteger(maxPasses) || maxPasses < 0) {
    throw new MinesweeperError("maxPasses must be an integer >= 0.");
  }
  const maxAttempts = options.maxAttempts ?? ALGORITHM.maxAttempts;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new MinesweeperError("maxAttempts must be an integer >= 1.");
  }

  let timed: { attempt: number; total: number } | null = null;
  if (options.timeBudgetMs !== undefined) {
    const cells = width * height;
    const attemptDefault = cells > 500 ? 600 : 150;
    const attempt = options.timeBudgetMs.attempt ?? attemptDefault;
    const total = options.timeBudgetMs.total ?? Math.max(5000, attempt * 5);
    if (!Number.isFinite(attempt) || attempt < 0 || !Number.isFinite(total) || total < 0) {
      throw new MinesweeperError("timeBudgetMs values must be finite numbers >= 0.");
    }
    timed = { attempt, total };
  }

  return {
    width,
    height,
    mines,
    start,
    startIndex: indexOf(width, start),
    rng,
    seed,
    maxAttempts,
    maxPasses,
    timed,
  };
}

function toBoard(
  field: Field,
  start: CellCoord,
  requestedMines: number,
  attempts: number,
  maxPasses: number,
  seed: number | undefined,
): Board {
  const clue = cluesFromField(field);
  const board: Board = {
    width: field.cols,
    height: field.rows,
    clue,
    mines: requestedMines,
    mineCount: clue.reduce((count, value) => count + (value === -1 ? 1 : 0), 0),
    start,
    opening: 0,
    solvable: isSolved(field, indexOf(field.cols, start), maxPasses),
    attempts,
  };
  board.opening = reveal(board, start).cells.length;
  if (seed !== undefined) board.seed = seed;
  return board;
}

/**
 * Build a first-click-safe board and search for a mine layout the solver can
 * finish without guessing.
 *
 * The first click and every cell within Manhattan distance
 * {@link SAFE_DISTANCE} are kept clear, so that click is a 0 and opens an
 * area. The default search is the one Campo Minado uses for its daily puzzle:
 * a fixed number of attempts and no wall clock, so a seed replays exactly.
 *
 * @throws {MinesweeperError} on invalid arguments, or when the deterministic
 * search cannot find a solvable layout. A `timeBudgetMs` search does not
 * throw for that; it returns the best layout it reached, with `solvable` set.
 */
export function generateBoard(options: GenerateOptions): Board {
  const config = assertGenerate(options);
  const field = createField(config.height, config.width, config.mines);
  if (config.timed) {
    const { attempts } = searchTimed(
      field,
      config.startIndex,
      config.rng,
      config.timed.attempt,
      config.timed.total,
      config.maxPasses,
    );
    return toBoard(field, config.start, config.mines, attempts, config.maxPasses, config.seed);
  }

  const found = searchFixed(field, config.startIndex, config.rng, config.maxAttempts, config.maxPasses);
  if (!found.solved) {
    throw new MinesweeperError(
      `No no-guess layout found in ${config.maxAttempts} attempts for ${config.width}×${config.height} with ${config.mines} mines.`,
    );
  }
  return toBoard(field, config.start, config.mines, found.attempts, config.maxPasses, config.seed);
}

/**
 * The daily board from campominado.com for a `YYYY-MM-DD` date.
 * Tries 300 attempts with the FNV-1a seed, then 3000 with that seed XOR
 * `0x9E3779B9`, which is what the site does. The board is generated to be
 * solvable from {@link DAILY_PUZZLE.start} (cell 77).
 */
export function generateDailyBoard(date: string): Board {
  if (typeof date !== "string" || date.length === 0) {
    throw new MinesweeperError("date must be a non-empty string, usually YYYY-MM-DD.");
  }
  const spec = {
    width: DAILY_PUZZLE.width,
    height: DAILY_PUZZLE.height,
    mines: DAILY_PUZZLE.mines,
    start: DAILY_PUZZLE.start,
  };
  const seed = hashSeed(`${DAILY_PUZZLE.namespace}:${date}`);
  const first = searchOrLast(spec, seed, DAILY_PUZZLE.attempts);
  if (first.solved) return first.board;
  const alt = (seed ^ DAILY_PUZZLE.fallbackXor) >>> 0;
  return searchOrLast(spec, alt, DAILY_PUZZLE.fallbackAttempts).board;
}

function searchOrLast(
  spec: { width: number; height: number; mines: number; start: CellCoord },
  seed: number,
  maxAttempts: number,
): { solved: boolean; board: Board } {
  const field = createField(spec.height, spec.width, spec.mines);
  const found = searchFixed(
    field,
    indexOf(spec.width, spec.start),
    createRng(seed),
    maxAttempts,
    ALGORITHM.solverPasses,
  );
  return {
    solved: found.solved,
    board: toBoard(field, spec.start, spec.mines, found.attempts, ALGORITHM.solverPasses, seed),
  };
}
