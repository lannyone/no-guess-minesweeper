# no-guess-minesweeper

Generate Minesweeper boards that can be solved without guessing.

> **Live demo: [https://campominado.com](https://campominado.com)**
>
> Used in production by Campo Minado (campominado.com).

The first click is always safe, and it always opens an area. Every board returned by the default generator can be finished with the two elementary Minesweeper rules: a satisfied number opens its remaining neighbors, and a number that still needs as many mines as it has hidden neighbors flags all of them. No probability, no 50/50.

This is the same search [Campo Minado](https://campominado.com) uses, pulled out so other games and tools can share it. Zero runtime dependencies. It runs in browsers and in Node.

## Install

```bash
npm install no-guess-minesweeper
```

The package name `no-guess-minesweeper` is unused on npm as of this release. This repository does not publish the package; publish it yourself when you are ready.

## Usage

```ts
import { centerOf, generateBoard, isSolvable, PRESETS } from "no-guess-minesweeper";

const spec = PRESETS.beginner; // 9×9, 10 mines
const board = generateBoard({
  ...spec,
  start: centerOf(spec.width, spec.height),
  seed: 1, // omit for Math.random
});

board.solvable; // true
board.opening; // cells the first click reveals
board.mineCount; // 10
board.clue; // row-major, -1 mine, 0–8 clue

isSolvable(board, board.start); // true
```

CommonJS:

```js
const { generateBoard, PRESETS, centerOf } = require("no-guess-minesweeper");

const spec = PRESETS.expert; // 30×16, 99 mines
const board = generateBoard({
  ...spec,
  start: centerOf(spec.width, spec.height),
  seed: 20261027,
});
```

Index of a cell is `row * width + col`. `clue[i] === -1` means a mine. A `0` is a safe empty cell, not a mine.

The same `seed` with the same width, height, mine count, and start cell reproduces the same board. Seeds are 32-bit: the generator keeps `seed >>> 0`, so `-1` and `4294967295` are the same seed.

## What "no guess" means here

Campo Minado calls this *sem chute*. It means the built-in solver can open every safe cell. The solver only applies the two rules above, plus flood-fill of zeros. It does not search pairs of cells, and it does not know patterns such as 1-2-1. A position that a human would call "logic" because of an overlapping pattern is still treated as a guess, and the generator keeps moving mines until the elementary solver can finish.

That is deliberate. It is the rule the live game already uses, so a board from this library is a board Campo Minado would accept.

## Presets

| Name | Size | Mines |
| --- | --- | --- |
| `PRESETS.beginner` | 9×9 | 10 |
| `PRESETS.intermediate` | 16×16 | 40 |
| `PRESETS.expert` | 30×16 | 99 |

Campo Minado's own levels are a different set, exported as `CAMPO_MINADO_LEVELS`: fácil 10×8/10, médio 18×14/40, difícil 24×20/99, especialista 30×20/120, mestre 40×24/192, extremo 50×30/300.

The daily puzzle is 12×12 with 25 mines, seeded from the date:

```ts
import { generateDailyBoard } from "no-guess-minesweeper";

const board = generateDailyBoard("2026-10-27");
// Solvable from row 6, column 5 (cell 77), which is where the site starts its search.
```

## API

### `generateBoard(options)`

| Option | Meaning |
| --- | --- |
| `width`, `height` | Columns and rows. The product must be between 1 and 40,000. |
| `mines` | Requested mine count. |
| `start` | `{ row, col }` of the first click. |
| `seed` | Optional integer seed. |
| `rng` | Optional `() => number` in `[0, 1)`. Do not pass this together with `seed`. |
| `maxAttempts` | Placements to try. Default `300`. |
| `maxPasses` | Solver sweeps. Default `60`. |
| `timeBudgetMs` | Switch to the live game's wall-clock search. See below. |

Returns a `Board`:

| Field | Meaning |
| --- | --- |
| `clue` | Row-major numbers. `-1` is a mine, `0`–`8` is the neighbor count. |
| `mines` | The count you asked for. |
| `mineCount` | The count actually placed. |
| `start` | The first click you passed in. |
| `opening` | How many cells that click reveals. |
| `solvable` | Whether the solver can finish the board. |
| `attempts` | Placements tried, including the one kept. |
| `seed` | Set when you passed `seed` (the uint32 that was used). |

The default search throws `MinesweeperError` if it cannot find a solvable layout in `maxAttempts`. A returned board from that search has `solvable: true`.

`mineCount` is lower than `mines` only when the safe zone does not leave enough cells. On a 2×2 board the safe zone is the whole board, so the generator places no mines.

### `timeBudgetMs`

Campo Minado's click handler stops on a clock so a slow phone does not freeze. Pass `timeBudgetMs: {}` to use that policy: **150ms** per attempt, or **600ms** when the board has more than 500 cells, and a total budget of at least **5 seconds**. You can override `attempt` and `total` (milliseconds).

In this mode the result can be unsolved if the budget runs out, and a seed is **not** stable, because the number of repair swaps depends on how fast the machine is. Prefer the default search unless you are matching the live game's timing.

### `solve(field, start)` and `isSolvable(field, start)`

`field` is `{ width, height, clue }`. `solve` returns:

| Field | Meaning |
| --- | --- |
| `solvable` | Every safe cell was opened. |
| `hitMine` | `start` itself is a mine. No deductions are made. |
| `cells` | `"unknown"`, `"safe"`, or `"mine"` for each cell. |
| `opened`, `flagged` | How many cells the solver opened or flagged. |

An optional third argument `{ maxPasses }` defaults to 60, the same cap as generation. Use the same cap you generated with.

### `reveal(field, start)`

The cells a click opens, in Campo Minado's flood order (breadth-first, zeros only expand). Returns `{ hitMine, cells }`. This is not the solver; it is the ordinary click.

### `generateDailyBoard(date)`

Builds the campominado.com daily board for a `YYYY-MM-DD` string. The seed is FNV-1a of `campominado:daily-v1:${date}`. If 300 attempts fail, it retries 3000 attempts with that seed XOR `0x9E3779B9`, which is what the site does. The site may then move the visible first click to the middle of the largest opening. This function does not do that; `start` stays at row 6, column 5.

### `createRng(seed)` and `hashSeed(text)`

The mulberry32 and FNV-1a helpers the daily puzzle uses. `hashSeed` mixes Unicode code points, not UTF-8 bytes, because that is what the site does.

### `cellIndex(width, { row, col })` and `cellCoord(width, index)`

Convert between coordinates and the row-major index.

### Constants

`ALGORITHM` holds `safeDistance` (2), `solverPasses` (60), `repairSwaps` (100), and `maxAttempts` (300). `PRESETS`, `CAMPO_MINADO_LEVELS`, `DAILY_PUZZLE`, `SAFE_DISTANCE`, and `MAX_CELLS` are exported too.

## How it works

1. **Safe zone.** No mine is placed at Manhattan distance 2 or less from the first click. The click is therefore a 0, and flood-fill opens at least its neighborhood.
2. **Place.** The other cells are shuffled with a partial Fisher-Yates (mulberry32 when seeded) and the requested mines are written down. Counts are then filled in. A mine's stored count is 0 inside the search; the public `clue` array uses `-1` instead, so a 0 always means "empty".
3. **Reject holes.** A safe cell whose eight neighbors are all mines is discarded. You can never reach it.
4. **Solve.** Open the first click, flood zeros, then sweep. Each opened number either opens every remaining neighbor or flags all of them. Up to 60 sweeps.
5. **Repair.** If the solver gets stuck, swap a mine on the frontier with a hidden safe cell outside the safe zone (preferring cells that do not touch the opening) and solve again. Up to 100 swaps.
6. **Repeat** from step 2 until the solver can open every safe cell, or the attempt limit is hit.

The deterministic search is the one the daily puzzle uses. The wall-clock search is the one the live game runs on an ordinary new game, including a last resort that re-rolls up to 50 times if the layout it kept is an enclosed hole.

## Performance

Measured with `npm run bench` on the built package: Node.js 22.23.4, 4-core Intel Xeon, 50 seeds each, deterministic search. Beginner and intermediate start at the center. Expert starts at row 8, column 15.

| Preset | min | median | mean | max |
| --- | ---: | ---: | ---: | ---: |
| Beginner 9×9 / 10 | 0.05 ms | 0.07 ms | 0.36 ms | 9.74 ms |
| Intermediate 16×16 / 40 | 0.11 ms | 0.27 ms | 1.08 ms | 6.08 ms |
| Expert 30×16 / 99 | 0.88 ms | 2.31 ms | 5.56 ms | 39.56 ms |

Most seeds finish on the first placement, which is why the median sits far below the max. A hard seed pays for repair swaps and shows up in the max. Re-run `npm run bench` on your own machine; these are one sample, not a guarantee.

Expert boards usually finish on the first or second placement. The attempt cap is 300, which is what the daily puzzle tries before it changes seed.

## Demo

`demo/index.html` is plain HTML and JS. It has no build step. It imports the ESM build:

```bash
npm run build
python3 -m http.server
# open http://localhost:8000/demo/
```

The first click generates a seeded board from that cell. Play stays local in the page. The full game is at [campominado.com](https://campominado.com).

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run bench
```

`npm test` checks the generator against a transcription of the production functions (placement, solver, repair, and the daily entry point). Node 18 or newer.

## License

MIT. Copyright (c) 2026 lannyone.
