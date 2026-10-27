import { centerOf, generateBoard, PRESETS } from "../dist/index.js";

const runs = 50;
const specs = [
  ["beginner 9×9/10", PRESETS.beginner, centerOf(PRESETS.beginner.width, PRESETS.beginner.height)],
  [
    "intermediate 16×16/40",
    PRESETS.intermediate,
    centerOf(PRESETS.intermediate.width, PRESETS.intermediate.height),
  ],
  ["expert 30×16/99", PRESETS.expert, { row: 8, col: 15 }],
];

function percentile(sorted, p) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

const lines = [];
for (const [label, spec, start] of specs) {
  // One warmup so the first sample is not the only one paying for lazy init.
  generateBoard({ ...spec, start, seed: 0 });
  const samples = [];
  for (let seed = 1; seed <= runs; seed++) {
    const started = performance.now();
    const board = generateBoard({ ...spec, start, seed });
    const elapsed = performance.now() - started;
    if (!board.solvable) throw new Error(`${label} seed ${seed} was not solvable`);
    samples.push(elapsed);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const row = {
    label,
    min: samples[0],
    p50: percentile(samples, 50),
    mean,
    max: samples[samples.length - 1],
  };
  lines.push(row);
  console.log(
    `${label}: min ${row.min.toFixed(2)} ms, p50 ${row.p50.toFixed(2)} ms, mean ${row.mean.toFixed(2)} ms, max ${row.max.toFixed(2)} ms (n=${runs})`,
  );
}

console.log("\n| Preset | min | p50 | mean | max |");
console.log("| --- | ---: | ---: | ---: | ---: |");
for (const row of lines) {
  console.log(
    `| ${row.label} | ${row.min.toFixed(2)} ms | ${row.p50.toFixed(2)} ms | ${row.mean.toFixed(2)} ms | ${row.max.toFixed(2)} ms |`,
  );
}
