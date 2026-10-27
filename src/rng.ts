/**
 * mulberry32, in the exact form Campo Minado uses for the daily puzzle.
 * The state is kept as a uint32 (`>>> 0`), which matches that implementation.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 1831565813) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a 32-bit, matching Campo Minado's daily seed.
 * The site hashes `` `${namespace}:${date}` ``.
 */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
