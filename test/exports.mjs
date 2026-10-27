import { createRequire } from "node:module";
import { createRng, generateBoard, PRESETS } from "../dist/index.js";

const require = createRequire(import.meta.url);
const cjs = require("../dist/index.cjs");

const start = { row: 4, col: 4 };
const esmBoard = generateBoard({ ...PRESETS.beginner, start, seed: 1 });
const cjsBoard = cjs.generateBoard({ ...PRESETS.beginner, start, seed: 1 });

if (!esmBoard.solvable || !cjsBoard.solvable) {
  throw new Error("built package returned an unsolved board");
}
if (esmBoard.clue.join(",") !== cjsBoard.clue.join(",")) {
  throw new Error("ESM and CJS builds disagree");
}
const rng = createRng(1);
if (rng() === rng()) throw new Error("rng did not advance");
if (typeof cjs.createRng !== "function" || typeof cjs.solve !== "function") {
  throw new Error("CJS build is missing named exports");
}
console.log("esm+cjs ok", esmBoard.mineCount, "mines", esmBoard.opening, "opening");
