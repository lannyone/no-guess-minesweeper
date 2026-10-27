import type { CellCoord } from "./types.js";

export interface Preset {
  width: number;
  height: number;
  mines: number;
}

/** Classic Windows sizes. Expert is 30 columns by 16 rows. */
export const PRESETS = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 30, height: 16, mines: 99 },
} as const satisfies Record<string, Preset>;

/**
 * Level sizes used on campominado.com. These are not the Windows presets:
 * `medio` is 18×14, `dificil` is 24×20.
 */
export const CAMPO_MINADO_LEVELS = {
  facil: { width: 10, height: 8, mines: 10 },
  medio: { width: 18, height: 14, mines: 40 },
  dificil: { width: 24, height: 20, mines: 99 },
  especialista: { width: 30, height: 20, mines: 120 },
  mestre: { width: 40, height: 24, mines: 192 },
  extremo: { width: 50, height: 30, mines: 300 },
} as const satisfies Record<string, Preset>;

/**
 * The daily puzzle on campominado.com: 12×12, 25 mines, first generated so
 * cell 77 (row 6, column 5) is a safe start. The published click may be a
 * different cell inside the opening; that choice is left to the game.
 */
export const DAILY_PUZZLE = {
  width: 12,
  height: 12,
  mines: 25,
  start: { row: 6, col: 5 },
  /** Seed text is `${namespace}:${date}`. */
  namespace: "campominado:daily-v1",
  /** Mixed into the seed when the first 300 attempts fail. */
  fallbackXor: 2654435769,
  attempts: 300,
  fallbackAttempts: 3000,
} as const;

/** Geometric center, biased toward the top-left on even sizes. */
export function centerOf(width: number, height: number): CellCoord {
  return {
    row: Math.floor((height - 1) / 2),
    col: Math.floor((width - 1) / 2),
  };
}
