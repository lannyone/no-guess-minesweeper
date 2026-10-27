const presetEl = document.querySelector("#preset");
const seedEl = document.querySelector("#seed");
const flagButton = document.querySelector("#flag-mode");
const form = document.querySelector("#controls");
const statusEl = document.querySelector("#status");
const boardEl = document.querySelector("#board");

let api = null;
/** @type {import("../dist/index.js").Board | null} */
let board = null;
/** @type {Set<number>} */
let open = new Set();
/** @type {Set<number>} */
let flags = new Set();
let alive = true;
let flagMode = false;

flagButton.addEventListener("click", () => {
  flagMode = !flagMode;
  flagButton.setAttribute("aria-pressed", String(flagMode));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  reset();
});
presetEl.addEventListener("change", reset);

function seedValue() {
  const raw = Number(seedEl.value);
  return Number.isInteger(raw) ? raw : 1;
}

function reset() {
  board = null;
  open = new Set();
  flags = new Set();
  alive = true;
  const spec = api.PRESETS[presetEl.value];
  paintBlank(spec.width, spec.height);
  statusEl.textContent = "Click a cell to start. The first click is always safe.";
  statusEl.classList.remove("error");
}

function paintBlank(width, height) {
  boardEl.style.gridTemplateColumns = `repeat(${width}, 28px)`;
  boardEl.replaceChildren();
  for (let index = 0; index < width * height; index++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.dataset.index = String(index);
    cell.setAttribute("aria-label", "Hidden cell");
    cell.addEventListener("click", onClick);
    cell.addEventListener("contextmenu", onContext);
    boardEl.append(cell);
  }
}

function onContext(event) {
  event.preventDefault();
  toggleFlag(Number(event.currentTarget.dataset.index));
}

function onClick(event) {
  const index = Number(event.currentTarget.dataset.index);
  if (flagMode) {
    toggleFlag(index);
    return;
  }
  dig(index);
}

function toggleFlag(index) {
  if (!alive || !board || open.has(index)) return;
  if (flags.has(index)) flags.delete(index);
  else flags.add(index);
  render(false);
}

function dig(index) {
  const spec = api.PRESETS[presetEl.value];
  if (!board) {
    try {
      board = api.generateBoard({
        ...spec,
        start: { row: Math.floor(index / spec.width), col: index % spec.width },
        seed: seedValue(),
      });
    } catch (error) {
      statusEl.textContent = error instanceof Error ? error.message : String(error);
      statusEl.classList.add("error");
      return;
    }
  }
  if (!alive || flags.has(index) || open.has(index)) return;

  const opened = api.reveal(board, {
    row: Math.floor(index / board.width),
    col: index % board.width,
  });
  if (opened.hitMine) {
    alive = false;
    open.add(index);
    render(true);
    statusEl.textContent = "That cell was a mine.";
    return;
  }
  for (const cell of opened.cells) open.add(cell);
  const safe = board.clue.filter((value) => value !== -1).length;
  if (open.size >= safe) {
    alive = false;
    render(true);
    statusEl.textContent = `Cleared. The first click opened ${board.opening} cells. Seed ${board.seed}.`;
    return;
  }
  render(false);
  statusEl.textContent = `Solvable without guessing. Seed ${board.seed}, ${board.mineCount} mines. The first click opened ${board.opening} cells.`;
}

function render(showMines) {
  const buttons = boardEl.children;
  const opening = new Set(api.reveal(board, board.start).cells);
  for (let index = 0; index < board.clue.length; index++) {
    const button = buttons[index];
    const clue = board.clue[index];
    const isOpen = open.has(index) || (showMines && clue === -1);
    button.className = "cell";
    button.textContent = "";
    if (flags.has(index) && !isOpen) {
      button.classList.add("flag");
      button.textContent = "⚑";
      button.setAttribute("aria-label", "Flagged");
      continue;
    }
    if (!isOpen) {
      button.setAttribute("aria-label", "Hidden cell");
      continue;
    }
    button.classList.add("open");
    if (opening.has(index) && clue !== -1) button.classList.add("opening");
    if (clue === -1) {
      button.classList.add("mine");
      button.textContent = "●";
      button.setAttribute("aria-label", "Mine");
    } else if (clue > 0) {
      button.classList.add("n" + clue);
      button.textContent = String(clue);
      button.setAttribute("aria-label", clue + " nearby");
    } else {
      button.setAttribute("aria-label", "Empty");
    }
  }
}

try {
  api = await import("../dist/index.js");
  reset();
} catch {
  statusEl.textContent = "Build the library first: npm run build. This page imports dist/index.js and has no build of its own.";
  statusEl.classList.add("error");
}
