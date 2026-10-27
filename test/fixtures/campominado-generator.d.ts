export interface OracleCell {
  mine: boolean;
  adj: number;
  open?: boolean;
  flag?: boolean;
  gdone?: boolean;
}

export interface OracleBoard {
  rows: number;
  cols: number;
  mines: number;
  cells: OracleCell[];
  nb: number[][];
}

export function ne(rows: number, cols: number): number[][];
export function x(rows: number, cols: number, mines: number): OracleBoard;
export function w(board: OracleBoard, start: number, rng?: () => number): void;
export function T(board: OracleBoard): boolean;
export function E(board: OracleBoard, start: number): Int8Array;
export function D(board: OracleBoard, start: number): boolean;
export function O(board: OracleBoard): void;
export function k(
  board: OracleBoard,
  start: number,
  rng: () => number,
  budgetMs: number,
  maxSwaps?: number,
): boolean;
export function re(
  board: OracleBoard,
  start: number,
  rng?: () => number,
  attemptMs?: number,
  totalMs?: number,
): number;
export function A(
  board: OracleBoard,
  start: number,
  rng: () => number,
  maxAttempts?: number,
): number | null;
export function M(seed: number): () => number;
export function g(namespace: string, key: string): number;
export function ae(date: string): OracleBoard;

export const N: {
  rows: number;
  cols: number;
  mines: number;
  start: number;
  namespace: string;
};
