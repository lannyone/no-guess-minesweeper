import { SAFE_DISTANCE, type CellCoord, type Minefield } from "./types.js";

export interface Cell {
  mine: boolean;
  /** Adjacent mines. Always 0 on a mine cell, matching Campo Minado. */
  adj: number;
}

/** Working board. Rows are `height`, columns are `width`. */
export interface Field {
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[];
  /** Neighbor indexes, same scan order as Campo Minado: dr -1..1, dc -1..1. */
  nb: number[][];
}

export function neighbors(rows: number, cols: number): number[][] {
  const table: number[][] = [];
  const total = rows * cols;
  for (let index = 0; index < total; index++) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const around: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) around.push(nr * cols + nc);
      }
    }
    table.push(around);
  }
  return table;
}

export function createField(rows: number, cols: number, mines: number): Field {
  return {
    rows,
    cols,
    mines,
    cells: Array.from({ length: rows * cols }, () => ({ mine: false, adj: 0 })),
    nb: neighbors(rows, cols),
  };
}

export function recomputeAdj(field: Field): void {
  const total = field.rows * field.cols;
  for (let index = 0; index < total; index++) {
    const cell = field.cells[index]!;
    cell.adj = 0;
    if (cell.mine) continue;
    let count = 0;
    for (const nb of field.nb[index]!) {
      if (field.cells[nb]!.mine) count++;
    }
    cell.adj = count;
  }
}

/**
 * Partial Fisher-Yates over cells outside the Manhattan safe zone.
 * Places `min(requested, available)` mines, then refreshes clue counts.
 */
export function placeMines(field: Field, start: number, rng: () => number): void {
  const { cols, rows } = field;
  const startRow = Math.floor(start / cols);
  const startCol = start % cols;
  const candidates: number[] = [];
  const total = rows * cols;
  for (let index = 0; index < total; index++) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    if (Math.abs(row - startRow) + Math.abs(col - startCol) > SAFE_DISTANCE) {
      candidates.push(index);
    }
  }
  const count = Math.min(field.mines, candidates.length);
  for (const cell of field.cells) cell.mine = false;
  for (let i = 0; i < count; i++) {
    const swap = i + Math.floor(rng() * (candidates.length - i));
    const held = candidates[i]!;
    candidates[i] = candidates[swap]!;
    candidates[swap] = held;
    field.cells[candidates[i]!]!.mine = true;
  }
  recomputeAdj(field);
}

/** A safe cell whose eight neighbors are all mines. Campo Minado rejects these. */
export function hasEnclosed(field: Field): boolean {
  const total = field.rows * field.cols;
  for (let index = 0; index < total; index++) {
    if (field.cells[index]!.mine) continue;
    const around = field.nb[index]!;
    if (around.length === 8 && around.every((nb) => field.cells[nb]!.mine)) return true;
  }
  return false;
}

export function fieldFromMinefield(minefield: Minefield): Field {
  const field = createField(minefield.height, minefield.width, 0);
  let mines = 0;
  for (let index = 0; index < field.cells.length; index++) {
    const clue = minefield.clue[index]!;
    const cell = field.cells[index]!;
    if (clue === -1) {
      cell.mine = true;
      cell.adj = 0;
      mines++;
    } else {
      cell.mine = false;
      cell.adj = clue;
    }
  }
  field.mines = mines;
  return field;
}

export function cluesFromField(field: Field): number[] {
  return field.cells.map((cell) => (cell.mine ? -1 : cell.adj));
}

export function indexOf(width: number, coord: CellCoord): number {
  return coord.row * width + coord.col;
}
