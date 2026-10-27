/**
 * Behavioural oracle transcribed from the campominado.com production bundle
 * (the StatsPanel chunk that also feeds the board worker), October 2026.
 *
 * Minified identifiers are kept so this stays a direct transcription of the
 * mine placer, single-cell solver, repair swaps, timed search, and daily
 * entry point. Not part of the public API.
 */
function g(e, t) {
  let n = 2166136261;
  for (let r of `${e}:${t}`)
    ((n ^= r.codePointAt(0)), (n = Math.imul(n, 16777619)));
  return n >>> 0;
}
function ne(e, t) {
  let n = [];
  for (let r = 0; r < e * t; r++) {
    let i = Math.floor(r / t),
      a = r % t,
      o = [];
    for (let n = -1; n <= 1; n++)
      for (let r = -1; r <= 1; r++) {
        if (!n && !r) continue;
        let s = i + n,
          c = a + r;
        s >= 0 && s < e && c >= 0 && c < t && o.push(s * t + c);
      }
    n.push(o);
  }
  return n;
}
function x(e, t, n) {
  return {
    rows: e,
    cols: t,
    mines: n,
    cells: Array.from({ length: e * t }, () => ({
      mine: !1,
      adj: 0,
      open: !1,
      flag: !1,
      gdone: !1,
    })),
    nb: ne(e, t),
  };
}
var S = (e, t) => e.cells[t],
  C = (e, t) => e.nb[t];
function w(e, t, n = Math.random) {
  let r = Math.floor(t / e.cols),
    i = t % e.cols,
    a = [];
  for (let t = 0; t < e.rows * e.cols; t++)
    Math.abs(Math.floor(t / e.cols) - r) + Math.abs((t % e.cols) - i) > 2 &&
      a.push(t);
  let o = Math.min(e.mines, a.length);
  for (let t of e.cells) t.mine = !1;
  for (let t = 0; t < o; t++) {
    let r = t + Math.floor(n() * (a.length - t)),
      i = a[t];
    ((a[t] = a[r]), (a[r] = i), (S(e, a[t]).mine = !0));
  }
  for (let t = 0; t < e.rows * e.cols; t++) {
    let n = S(e, t);
    if (((n.adj = 0), n.mine)) continue;
    let r = 0;
    for (let n of C(e, t)) S(e, n).mine && r++;
    n.adj = r;
  }
}
function T(e) {
  for (let t = 0; t < e.rows * e.cols; t++) {
    if (S(e, t).mine) continue;
    let n = C(e, t);
    if (n.length === 8 && n.every((t) => S(e, t).mine)) return !0;
  }
  return !1;
}
function E(e, t) {
  let n = e.rows * e.cols,
    r = new Int8Array(n),
    i = [t];
  r[t] = 1;
  let a = (e) => {
      r[e] === 0 && ((r[e] = 1), i.push(e));
    },
    o = () => {
      for (; i.length;) {
        let t = i.pop();
        if (S(e, t).adj === 0) for (let n of C(e, t)) a(n);
      }
    };
  o();
  let s = !0,
    c = 0;
  for (; s && c++ < 60;) {
    s = !1;
    for (let t = 0; t < n; t++) {
      if (r[t] !== 1 || S(e, t).adj === 0) continue;
      let n = [],
        i = 0;
      for (let a of C(e, t)) r[a] === 0 ? n.push(a) : r[a] === 2 && i++;
      if (!n.length) continue;
      let o = S(e, t).adj - i;
      if (o === 0) {
        for (let e of n) a(e);
        s = !0;
      } else if (o === n.length) {
        for (let e of n) r[e] = 2;
        s = !0;
      }
    }
    o();
  }
  return r;
}
function D(e, t) {
  let n = E(e, t);
  for (let t = 0; t < n.length; t++) if (!S(e, t).mine && n[t] !== 1) return !1;
  return !0;
}
function O(e) {
  for (let t = 0; t < e.rows * e.cols; t++) {
    let n = S(e, t);
    if (((n.adj = 0), n.mine)) continue;
    let r = 0;
    for (let n of C(e, t)) S(e, n).mine && r++;
    n.adj = r;
  }
}
function k(e, t, n, r, i = 400) {
  let a = performance.now(),
    o = 0,
    s = e.rows * e.cols,
    c = Math.floor(t / e.cols),
    l = t % e.cols,
    u = (t) =>
      Math.abs(Math.floor(t / e.cols) - c) + Math.abs((t % e.cols) - l) <= 2;
  do {
    let r = E(e, t),
      i = [];
    for (let e = 0; e < s; e++) r[e] === 0 && i.push(e);
    if (!i.length) return !T(e);
    let a = i.filter((t) => S(e, t).mine && C(e, t).some((e) => r[e] === 1)),
      o = i.filter((t) => !S(e, t).mine && !u(t)),
      c = o.filter((t) => !C(e, t).some((e) => r[e] === 1)),
      l = c.length ? c : o;
    if (!a.length || !l.length) return !1;
    let d = a[Math.floor(n() * a.length)],
      f = l[Math.floor(n() * l.length)];
    ((S(e, d).mine = !1), (S(e, f).mine = !0), O(e));
  } while (++o < i && performance.now() - a < r);
  return !1;
}
function re(
  e,
  t,
  n = Math.random,
  r = e.rows * e.cols > 500 ? 600 : 150,
  i = Math.max(5e3, r * 5),
) {
  let a = performance.now(),
    o = 0;
  do {
    if ((w(e, t, n), o++, T(e))) continue;
    if (D(e, t)) break;
    let s = Math.max(r, i - (performance.now() - a));
    if (k(e, t, n, Math.min(s, r), 100)) break;
  } while (performance.now() - a < i);
  for (let r = 0; r < 50 && T(e); r++) w(e, t, n);
  return o;
}
function ie(e, t) {
  for (let t of e.cells) t.mine = !1;
  for (let n of t) S(e, n).mine = !0;
  O(e);
}
function A(e, t, n, r = 300) {
  for (let i = 1; i <= r; i++)
    if ((w(e, t, n), !T(e) && (D(e, t) || k(e, t, n, 1 / 0, 100)))) return i;
  return null;
}
function j(e, t) {
  let n = Math.floor(t / e.cols),
    r = t % e.cols,
    i = (t, n) => {
      if (t < 0 || t >= e.rows || n < 0 || n >= e.cols) return !1;
      let r = S(e, t * e.cols + n);
      return r.mine && !r.flag && !r.gdone;
    };
  for (let t = 1; t < 15; t++) {
    let a = n - t;
    for (let n = r - t; n <= r + t; n++) if (i(a, n)) return a * e.cols + n;
    a = n + t;
    for (let n = r - t; n <= r + t; n++) if (i(a, n)) return a * e.cols + n;
    let o = r - t;
    for (a = n - t + 1; a < n + t; a++) if (i(a, o)) return a * e.cols + o;
    for (o = r + t, a = n - t + 1; a <= n + t; a++)
      if (i(a, o)) return a * e.cols + o;
  }
  for (let t = 0; t < e.rows * e.cols; t++) {
    let n = S(e, t);
    if (n.mine && !n.flag && !n.gdone) return t;
  }
  return null;
}
function M(e) {
  let t = e >>> 0;
  return () => {
    t = (t + 1831565813) >>> 0;
    let e = t;
    return (
      (e = Math.imul(e ^ (e >>> 15), e | 1)),
      (e ^= e + Math.imul(e ^ (e >>> 7), e | 61)),
      ((e ^ (e >>> 14)) >>> 0) / 4294967296
    );
  };
}
var N = {
    rows: 12,
    cols: 12,
    mines: 25,
    start: 77,
    namespace: `campominado:daily-v1`,
  },
  P = (e) => g(N.namespace, e);
function ae(e) {
  let t = x(N.rows, N.cols, N.mines),
    n = M(P(e));
  if (A(t, N.start, n) === null) {
    let n = M(P(e) ^ 2654435769);
    A(t, N.start, n, 3e3);
  }
  return t;
}
export { ne, x, w, T, E, D, O, k, re, A, M, g, N, ae };
