export interface P {
  x: number;
  y: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${r1(p.x)} ${r1(p.y)}`;

/** A smooth path through the points: Catmull-Rom, drawn as cubic Béziers. */
export function smoothPath(pts: P[]): string {
  if (!pts.length) return '';
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${pt(c1)}, ${pt(c2)}, ${pt(p2)}`;
  }
  return d;
}

/** A random sequence that is the same every time for the same id, so shapes stay familiar. */
export function seeded(id: string): () => number {
  let a = 2166136261;
  for (let i = 0; i < id.length; i++) a = Math.imul(a ^ id.charCodeAt(i), 16777619);
  a >>>= 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A curve that can be walked by length. */
export interface Curve {
  d: string;
  /** The point a share `f` (0..1) of the way along. */
  at: (f: number) => P;
  /** The stretch between two shares of the way, as a path. */
  part: (f0: number, f1: number) => string;
}

/** Builds a walkable curve from dense samples; the drawn path runs smoothly through every fourth one. */
export function walkable(samples: P[]): Curve {
  const acc = [0];
  for (let i = 1; i < samples.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  }
  const total = acc[acc.length - 1] || 1;
  const index = (f: number) => {
    const target = Math.max(0, Math.min(1, f)) * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < target) i++;
    const span = acc[i] - acc[i - 1] || 1;
    return { i, k: (target - acc[i - 1]) / span };
  };
  const at = (f: number): P => {
    const { i, k } = index(f);
    const a = samples[i - 1];
    const b = samples[i];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  const part = (f0: number, f1: number) => {
    if (f1 <= f0) return '';
    const from = index(f0);
    const to = index(f1);
    let d = `M${pt(at(f0))}`;
    for (let i = from.i; i < to.i; i++) d += ` L${pt(samples[i])}`;
    return `${d} L${pt(at(f1))}`;
  };
  const knots = samples.filter((_, i) => i % 4 === 0 || i === samples.length - 1);
  return { d: smoothPath(knots), at, part };
}
