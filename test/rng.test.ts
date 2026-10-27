import { describe, expect, it } from "vitest";
import { createRng, hashSeed } from "../src/rng.js";
import { g, M } from "./fixtures/campominado-generator.js";

describe("createRng", () => {
  it("matches Campo Minado mulberry32", () => {
    const ours = createRng(1);
    const theirs = M(1);
    const got = [ours(), ours(), ours(), ours(), ours()];
    const expected = [theirs(), theirs(), theirs(), theirs(), theirs()];
    expect(got).toEqual([
      0.6270739405881613,
      0.002735721180215478,
      0.5274470399599522,
      0.9810509674716741,
      0.9683778982143849,
    ]);
    expect(got).toEqual(expected);
  });

  it("treats the seed as a uint32", () => {
    const fromNegative = createRng(-1);
    const fromUint = createRng(4294967295);
    expect([fromNegative(), fromNegative()]).toEqual([fromUint(), fromUint()]);
  });
});

describe("hashSeed", () => {
  it("matches the daily FNV-1a mix", () => {
    const text = "campominado:daily-v1:2026-10-27";
    expect(hashSeed(text)).toBe(2919792200);
    expect(hashSeed(text)).toBe(g("campominado:daily-v1", "2026-10-27"));
    expect((hashSeed(text) ^ 2654435769) >>> 0).toBe(809437169);
  });
});
