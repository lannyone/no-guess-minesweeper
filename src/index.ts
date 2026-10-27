import type { CellCoord } from "./types.js";

export { generateBoard, generateDailyBoard } from "./generate.js";
export { reveal } from "./reveal.js";
export { createRng, hashSeed } from "./rng.js";
export { isSolvable, solve } from "./solver.js";
export {
  CAMPO_MINADO_LEVELS,
  DAILY_PUZZLE,
  PRESETS,
  centerOf,
  type Preset,
} from "./presets.js";
export {
  ALGORITHM,
  MAX_CELLS,
  MinesweeperError,
  SAFE_DISTANCE,
  type Board,
  type CellCoord,
  type GenerateOptions,
  type Minefield,
  type RevealResult,
  type SolveResult,
  type SolverOptions,
} from "./types.js";

/** Row-major index, `row * width + col`. */
export function cellIndex(width: number, coord: CellCoord): number {
  return coord.row * width + coord.col;
}

/** Inverse of {@link cellIndex}. */
export function cellCoord(width: number, index: number): CellCoord {
  return { row: Math.floor(index / width), col: index % width };
}
