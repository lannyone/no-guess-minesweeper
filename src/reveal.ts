import { neighbors } from "./field.js";
import { MinesweeperError, type CellCoord, type Minefield, type RevealResult } from "./types.js";

/**
 * Cells opened by clicking `start`, using Campo Minado's flood:
 * a zero opens every in-bounds neighbor that is not a mine, and only zeros
 * expand further. Flags are not part of this library.
 */
export function reveal(field: Minefield, start: CellCoord): RevealResult {
  const { width, height, clue } = field;
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
  const index = start.row * width + start.col;
  if (clue[index] === -1) return { hitMine: true, cells: [index] };

  const nb = neighbors(height, width);
  const open = new Uint8Array(width * height);
  const cells = [index];
  open[index] = 1;
  for (let cursor = 0; cursor < cells.length; cursor++) {
    const current = cells[cursor]!;
    if (clue[current] !== 0) continue;
    for (const next of nb[current]!) {
      if (open[next] || clue[next] === -1) continue;
      open[next] = 1;
      cells.push(next);
    }
  }
  return { hitMine: false, cells };
}
