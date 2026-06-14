// 60x40 tactile dot-matrix engine. Pure rasterization, no DOM.
export const GW = 60;
export const GH = 40;
export type Grid = number[][];

export function blank(): Grid {
  return Array.from({ length: GH }, () => new Array<number>(GW).fill(0));
}
function put(g: Grid, x: number, y: number): void {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || xi >= GW || yi < 0 || yi >= GH) return;
  g[yi][xi] = 1;
}
function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const v = ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry);
      if (v <= 1) put(g, x, y);
    }
}
function ring(g: Grid, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const v = ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry);
      if (Math.abs(v - 1) < 0.22) put(g, x, y);
    }
}
function tri(g: Grid, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void {
  const mnX = Math.floor(Math.min(ax, bx, cx)), mxX = Math.ceil(Math.max(ax, bx, cx));
  const mnY = Math.floor(Math.min(ay, by, cy)), mxY = Math.ceil(Math.max(ay, by, cy));
  const s = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  for (let y = mnY; y <= mxY; y++)
    for (let x = mnX; x <= mxX; x++) {
      const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx, cy), d3 = s(x, y, cx, cy, ax, ay);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) put(g, x, y);
    }
}
function line(g: Grid, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2 + 1;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    for (let dx = -t; dx <= t; dx++) for (let dy = -t; dy <= t; dy++)
      if (dx * dx + dy * dy <= t * t) put(g, x + dx, y + dy);
  }
}

type Painter = (g: Grid) => void;

const PATTERNS: Record<string, Painter> = {
  dotfish: (g) => { // 푸른바다점박이 — rounded oval body, forked tail, sparkle dots
    ellipse(g, 27, 20, 16, 9);
    tri(g, 43, 20, 54, 12, 54, 28);
    tri(g, 24, 11, 32, 11, 28, 6);
    tri(g, 24, 29, 32, 29, 28, 34);
    line(g, 10, 20, 6, 20, 0);
  },
  sardine: (g) => { ellipse(g, 28, 20, 11, 4); tri(g, 39, 20, 46, 15, 46, 25); },
  mackerel: (g) => {
    ellipse(g, 27, 20, 15, 6);
    tri(g, 42, 20, 52, 13, 52, 20); tri(g, 42, 20, 52, 27, 52, 20);
    tri(g, 24, 14, 32, 14, 28, 8);
  },
  seahorse: (g) => {
    line(g, 30, 8, 30, 24, 1); ellipse(g, 31, 10, 4, 5);
    put(g, 33, 9); put(g, 34, 9);
    line(g, 30, 24, 26, 30, 1); line(g, 26, 30, 29, 33, 0);
  },
  jellyfish: (g) => { // dome bell + trailing tentacles
    for (let y = 8; y <= 20; y++) { const w = 13 * Math.sin((Math.PI * (y - 8)) / 24); for (let x = Math.round(30 - w); x <= Math.round(30 + w); x++) put(g, x, y); }
    for (let k = -3; k <= 3; k++) { const bx = 30 + k * 4; line(g, bx, 20, bx + (k % 2 ? 2 : -2), 33, 0); }
  },
  turtle: (g) => { // rounded shell + head + 4 flippers
    ellipse(g, 30, 20, 13, 10);
    ellipse(g, 45, 20, 4, 3); // head
    tri(g, 20, 11, 28, 13, 18, 6); tri(g, 20, 29, 28, 27, 18, 34); // front flippers
    tri(g, 40, 11, 34, 14, 42, 7); tri(g, 40, 29, 34, 26, 42, 33); // rear flippers
  },
  octopus: (g) => { ellipse(g, 30, 15, 10, 9); for (let k = 0; k < 6; k++) { const bx = 22 + k * 3.2; line(g, bx, 22, bx - 2 + (k % 2) * 4, 34, 0); } },
  puffer: (g) => {
    ellipse(g, 29, 20, 12, 12);
    const sp: [number, number][] = [[16, 20], [18, 11], [18, 29], [24, 8], [24, 32], [34, 8], [34, 32], [40, 11], [40, 29], [42, 20], [29, 7], [29, 33]];
    sp.forEach(([x, y]) => line(g, 29 + (x - 29) * 0.78, 20 + (y - 20) * 0.78, x, y, 0));
    tri(g, 41, 20, 47, 16, 47, 24);
  },
  ray: (g) => { for (let y = 8; y <= 32; y++) { const w = 18 * (1 - Math.abs(y - 20) / 13); for (let x = Math.round(28 - w); x <= Math.round(28 + w * 0.5); x++) put(g, x, y); } line(g, 30, 20, 52, 20, 0); },
  anglerfish: (g) => { // big round head, lure on stalk, teeth row
    ellipse(g, 26, 21, 15, 11);
    tri(g, 39, 21, 47, 15, 47, 27);
    line(g, 16, 12, 13, 6, 0); put(g, 12, 5); ring(g, 12, 5, 2, 2); // lure
    for (let x = 14; x <= 24; x += 2) { put(g, x, 28); put(g, x, 14); } // jaw dots
  },
  tuna: (g) => {
    ellipse(g, 27, 20, 17, 8);
    tri(g, 25, 12, 33, 12, 29, 5); tri(g, 26, 28, 34, 28, 30, 35);
    tri(g, 44, 20, 54, 12, 50, 20); tri(g, 44, 20, 54, 28, 50, 20);
  },
  shark: (g) => {
    ellipse(g, 27, 21, 18, 7);
    tri(g, 24, 14, 33, 14, 30, 5);
    tri(g, 44, 21, 55, 11, 55, 21); tri(g, 44, 21, 53, 29, 55, 21);
    tri(g, 18, 26, 26, 26, 21, 32);
    put(g, 11, 20);
  },
  plankton: (g) => { ring(g, 30, 20, 6, 6); for (let a = 0; a < 8; a++) { const an = (a / 8) * Math.PI * 2; line(g, 30 + Math.cos(an) * 6, 20 + Math.sin(an) * 6, 30 + Math.cos(an) * 9, 20 + Math.sin(an) * 9, 0); } ellipse(g, 30, 20, 2, 2); },
};

const cache: Record<string, Grid> = {};
export function pattern(key: string): Grid {
  if (cache[key]) return cache[key];
  const g = blank();
  (PATTERNS[key] ?? PATTERNS.dotfish)(g);
  cache[key] = g;
  return g;
}

// part-highlight cells for "부위 강조" layer
export const HIGHLIGHTS: Record<string, Record<string, [number, number][]>> = {
  dotfish: { mouth: [[8, 20]], tail: [[53, 13], [53, 27]], fin: [[28, 7], [28, 33]] },
  mackerel: { mouth: [[12, 20]], tail: [[51, 15], [51, 25]], fin: [[28, 9]] },
  puffer: { mouth: [[17, 20]], spike: [[18, 11], [24, 8], [40, 11]] },
  shark: { mouth: [[12, 22]], fin: [[30, 6]], tail: [[54, 12]] },
  anglerfish: { mouth: [[14, 28]], lure: [[12, 5]] },
  turtle: { head: [[46, 20]], flipper: [[20, 11], [20, 29]] },
  jellyfish: { bell: [[30, 9]], tentacle: [[26, 32], [34, 32]] },
};
