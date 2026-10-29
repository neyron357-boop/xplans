import type { Id, Line } from '../store/model';

export type Kind = 'main' | 'backup' | 'closed';

export interface P {
  x: number;
  y: number;
}

type Seg = [P, P, P, P];

export interface Thread {
  id: Id;
  d: string;
  kind: Kind;
  /** End ring of a closed line. */
  ring?: P;
}

export interface Spot extends P {
  id: Id;
}

export interface Fiber {
  id: Id;
  d: string;
  kind: Kind;
  /** -1 grows upwards from its line, 1 downwards. */
  dir: number;
}

export interface RootsLayout {
  origin: P;
  goal: P;
  bg: string[];
  fibers: Fiber[];
  threads: Thread[];
  chips: Spot[];
  nodes: (Spot & { kind: Kind })[];
  here: P | null;
}

/** Faint threads behind the plan, drawn on the 342×360 design grid and scaled. */
const BG = [
  [0, 20, 120, 40, 230, 120, 306, 174],
  [0, 340, 120, 326, 230, 250, 306, 186],
  [0, 110, 100, 124, 220, 160, 306, 178],
  [0, 250, 100, 238, 220, 204, 306, 182],
  [40, 0, 100, 60, 210, 130, 306, 176],
  [40, 360, 100, 300, 210, 230, 306, 184],
];

const round = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${round(p.x)} ${round(p.y)}`;
const toPath = (segs: Seg[]) => `M${pt(segs[0][0])}` + segs.map((s) => ` C${pt(s[1])}, ${pt(s[2])}, ${pt(s[3])}`).join('');

export function bezier(s: Seg, t: number): P {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y };
}

export const kindOf = (l: Line, activeId: Id | null | undefined): Kind =>
  l.closed ? 'closed' : l.id === activeId ? 'main' : 'backup';

/**
 * Lays the plan out as roots. Every line starts at the seed on the left, swings out to its
 * own lane and converges on the goal at the right. A backup of a backup branches off its
 * parent; a closed line stops short with a ring. Lanes keep their place when the active
 * line changes, so the picture stays familiar.
 */
export function layoutRoots(lines: Line[], activeId: Id | null | undefined, w: number, h: number): RootsLayout {
  const cy = h / 2;
  const origin: P = { x: 10, y: cy };
  const goal: P = { x: w - 20, y: cy };
  const endX = w - 32;

  const ids = new Set(lines.map((l) => l.id));
  const kids = new Map<Id | null, Line[]>();
  for (const l of lines) {
    const key = l.parentId && ids.has(l.parentId) ? l.parentId : null;
    kids.set(key, [...(kids.get(key) ?? []), l]);
  }
  const roots = kids.get(null) ?? [];
  const center = roots[0];
  const up: Line[] = [];
  const down: Line[] = [];
  const place = (l: Line, side: Line[]) => {
    side.push(l);
    for (const c of kids.get(l.id) ?? []) place(c, side);
  };
  const shorter = () => (up.length <= down.length ? up : down);
  if (center) for (const c of kids.get(center.id) ?? []) place(c, shorter());
  for (const r of roots.slice(1)) place(r, shorter());

  const lanes = Math.max(up.length, down.length);
  const step = lanes ? Math.min(96, (cy - 26) / lanes) : 0;
  const lane = new Map<Id, number>();
  if (center) lane.set(center.id, cy);
  up.forEach((l, i) => lane.set(l.id, cy - step * (i + 1)));
  down.forEach((l, i) => lane.set(l.id, cy + step * (i + 1)));

  const trunk = (): Seg[] => {
    const mid: P = { x: 0.614 * w, y: cy };
    return [
      [origin, { x: 0.234 * w, y: cy - 12 }, { x: 0.409 * w, y: cy + 12 }, mid],
      [mid, { x: 2 * mid.x - 0.409 * w, y: cy - 12 }, { x: 0.819 * w, y: cy - 8 }, { x: w - 34, y: cy }],
    ];
  };
  const trunkStub = (): Seg[] => [[origin, { x: 0.175 * w, y: cy - 10 }, { x: 0.32 * w, y: cy + 2 }, { x: 0.44 * w, y: cy - 2 }]];
  const branch = (S: P, L: number): Seg[] => {
    const px = Math.min(S.x + 0.41 * w, 0.62 * w);
    const dx = px - S.x;
    const above = L < cy ? 1 : -1;
    const E: P = { x: endX, y: cy - above * 4 };
    const span = E.x - px;
    const peak: P = { x: px, y: L };
    const c2: P = { x: px - dx * 0.43, y: L };
    const Q: P = { x: px + span * 0.81, y: L + (cy - L) * 0.52 };
    const c4: P = { x: Q.x - span * 0.19, y: Q.y - (cy - L) * 0.35 };
    return [
      [S, { x: S.x + dx * 0.29, y: S.y + (L - S.y) * 0.625 }, c2, peak],
      [peak, { x: 2 * px - c2.x, y: L }, c4, Q],
      [Q, { x: 2 * Q.x - c4.x, y: 2 * Q.y - c4.y }, { x: E.x - 6, y: E.y - above * 6 }, E],
    ];
  };
  const stub = (S: P, L: number): Seg[] => {
    const dy = L - S.y;
    return [[S, { x: S.x + 0.06 * w, y: S.y + dy * 0.51 }, { x: S.x + 0.146 * w, y: L - dy * 0.12 }, { x: S.x + 0.32 * w, y: L }]];
  };

  const geo = new Map<Id, Seg[]>();
  const threads: Thread[] = [];
  const chips: Spot[] = [];
  const nodes: (Spot & { kind: Kind })[] = [];
  const fibers: Fiber[] = [];
  let here: P | null = null;

  /** A thin hair off a line, pointing away from the trunk; shrinks near the edge. */
  const fiber = (id: Id, from: P, dir: number, dx: number[], dy: number[], kind: Kind) => {
    const room = dir < 0 ? from.y - 4 : h - 4 - from.y;
    const scale = Math.min(1, room / Math.max(...dy));
    if (scale < 0.25) return;
    const p = (i: number): P => ({ x: from.x + dx[i], y: from.y + dir * dy[i] * scale });
    fibers.push({ id, d: `M${pt(from)} C${pt(p(0))}, ${pt(p(1))}, ${pt(p(2))}`, kind, dir });
  };

  for (const l of [center, ...up, ...down]) {
    if (!l) continue;
    const L = lane.get(l.id) ?? cy;
    const kind = kindOf(l, activeId);
    const parent = l.parentId && l.parentId !== center?.id ? geo.get(l.parentId) : undefined;
    const S = parent ? bezier(parent[0], 0.4) : origin;
    const segs = l === center ? (l.closed ? trunkStub() : trunk()) : l.closed ? stub(S, L) : branch(S, L);
    geo.set(l.id, segs);
    const end = segs[segs.length - 1][3];
    threads.push({ id: l.id, d: toPath(segs), kind, ring: l.closed ? { x: end.x + 6, y: end.y + (l === center ? 0 : 2) } : undefined });

    if (l === center || l.closed) {
      chips.push({ id: l.id, ...bezier(segs[0], 0.5) });
      if (kind === 'main') here = segs[0][3];
      continue;
    }
    const peak = segs[0][3];
    chips.push({ id: l.id, ...bezier(segs[1], 0.5) });
    if (kind === 'main') here = peak;
    else nodes.push({ id: l.id, ...peak, kind });
    const dir = L < cy ? -1 : 1;
    fiber(l.id, peak, dir, [22, 50, 86], [22, 34, 38], kind);
    fiber(l.id, bezier(segs[0], 0.75), dir, [8, 18, 34], [22, 36, 48], kind);
  }

  const rank: Record<Kind, number> = { closed: 0, backup: 1, main: 2 };
  threads.sort((a, b) => rank[a.kind] - rank[b.kind]);

  const sx = w / 342;
  const sy = h / 360;
  const bg = BG.map(([x0, y0, x1, y1, x2, y2, x3, y3]) => {
    const p = (x: number, y: number) => pt({ x: x * sx, y: cy + (y - 180) * sy });
    return `M${p(x0, y0)} C${p(x1, y1)}, ${p(x2, y2)}, ${p(x3, y3)}`;
  });

  return { origin, goal, bg, fibers, threads, chips, nodes, here };
}
