import { fieldFromMinefield, indexOf, type Field } from "./field.js";
import { ALGORITHM, MinesweeperError } from "./types.js";
import type { CellCoord, Minefield, SolveResult, SolverOptions } from "./types.js";

const UNKNOWN = 0;
const SAFE = 1;
const MINE = 2;

/**
 * Elementary solver used by Campo Minado.
 *
 * Opens `start`, flood-fills zeros (depth-first, same stack order as the
 * site), then sweeps up to `maxPasses` times. For each opened number, if the
 * remaining mine count is 0, every unknown neighbor is safe; if it equals the
 * number of unknown neighbors, they are all mines. Zeros opened during a sweep
 * flood at the end of that sweep. There is no subset search and no guessing.
 */
export function solveStates(field: Field, start: number, maxPasses: number): Int8Array {
  const total = field.rows * field.cols;
  const state = new Int8Array(total);
  const stack: number[] = [start];
  state[start] = SAFE;

  const markSafe = (index: number) => {
    if (state[index] === UNKNOWN) {
      state[index] = SAFE;
      stack.push(index);
    }
  };
  const flood = () => {
    while (stack.length > 0) {
      const index = stack.pop()!;
      if (field.cells[index]!.adj !== 0) continue;
      for (const nb of field.nb[index]!) markSafe(nb);
    }
  };

  flood();
  let progress = true;
  let passes = 0;
  while (progress && passes++ < maxPasses) {
    progress = false;
    for (let index = 0; index < total; index++) {
      if (state[index] !== SAFE || field.cells[index]!.adj === 0) continue;
      const unknown: number[] = [];
      let flagged = 0;
      for (const nb of field.nb[index]!) {
        if (state[nb] === UNKNOWN) unknown.push(nb);
        else if (state[nb] === MINE) flagged++;
      }
      if (unknown.length === 0) continue;
      const remaining = field.cells[index]!.adj - flagged;
      if (remaining === 0) {
        for (const nb of unknown) markSafe(nb);
        progress = true;
      } else if (remaining === unknown.length) {
        for (const nb of unknown) state[nb] = MINE;
        progress = true;
      }
    }
    flood();
  }
  return state;
}

export function isSolved(field: Field, start: number, maxPasses: number): boolean {
  const state = solveStates(field, start, maxPasses);
  for (let index = 0; index < state.length; index++) {
    if (!field.cells[index]!.mine && state[index] !== SAFE) return false;
  }
  return true;
}

function passesOf(options?: SolverOptions): number {
  const passes = options?.maxPasses ?? ALGORITHM.solverPasses;
  if (!Number.isInteger(passes) || passes < 0) {
    throw new MinesweeperError("maxPasses must be an integer >= 0.");
  }
  return passes;
}

function assertMinefield(field: Minefield, start: CellCoord): number {
  const { width, height, clue } = field;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new MinesweeperError("width and height must be integers >= 1.");
  }
  if (clue.length !== width * height) {
    throw new MinesweeperError(`clue length ${clue.length} does not match ${width}×${height}.`);
  }
  for (let index = 0; index < clue.length; index++) {
    const value = clue[index];
    if (!Number.isInteger(value) || value! < -1 || value! > 8) {
      throw new MinesweeperError(`clue[${index}] must be an integer from -1 to 8.`);
    }
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
  return indexOf(width, start);
}

/** Run the no-guess solver from `start`. Clues are trusted as given. */
export function solve(field: Minefield, start: CellCoord, options?: SolverOptions): SolveResult {
  const startIndex = assertMinefield(field, start);
  const labels = new Array<"unknown" | "safe" | "mine">(field.clue.length).fill("unknown");
  if (field.clue[startIndex] === -1) {
    labels[startIndex] = "mine";
    return { solvable: false, hitMine: true, cells: labels, opened: 0, flagged: 0 };
  }

  const working = fieldFromMinefield(field);
  const state = solveStates(working, startIndex, passesOf(options));
  let opened = 0;
  let flagged = 0;
  let solvable = true;
  for (let index = 0; index < state.length; index++) {
    if (state[index] === SAFE) {
      labels[index] = "safe";
      opened++;
    } else if (state[index] === MINE) {
      labels[index] = "mine";
      flagged++;
    }
    if (!working.cells[index]!.mine && state[index] !== SAFE) solvable = false;
  }
  return { solvable, hitMine: false, cells: labels, opened, flagged };
}

/** True when {@link solve} can open every safe cell. */
export function isSolvable(field: Minefield, start: CellCoord, options?: SolverOptions): boolean {
  return solve(field, start, options).solvable;
}
