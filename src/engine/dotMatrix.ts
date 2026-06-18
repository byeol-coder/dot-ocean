import { ALL_GRIDS } from '../data/species';

export const GW = 60;
export const GH = 40;
export type Grid = number[][];

function blank(): Grid {
  return Array.from({ length: GH }, () => new Array<number>(GW).fill(0));
}

const cache: Record<string, Grid> = {};

function base(key: string): Grid {
  if (cache[key]) return cache[key];
  const rows = ALL_GRIDS[key] ?? ALL_GRIDS.growthfish;
  const g = blank();
  for (let y = 0; y < GH && y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < GW && x < row.length; x++) g[y][x] = row[x] === '1' ? 1 : 0;
  }
  cache[key] = g;
  return g;
}

// Optional size-scaled silhouette (bigger creature -> bigger tactile footprint).
export function pattern(key: string, scale = 1): Grid {
  const b = base(key);
  if (Math.abs(scale - 1) < 0.02) return b;
  const ck = `${key}@${scale.toFixed(2)}`;
  if (cache[ck]) return cache[ck];
  const cx = (GW - 1) / 2, cy = (GH - 1) / 2;
  const out = blank();
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const sx = Math.round(cx + (x - cx) / scale);
      const sy = Math.round(cy + (y - cy) / scale);
      if (sx >= 0 && sx < GW && sy >= 0 && sy < GH && b[sy][sx] === 1) out[y][x] = 1;
    }
  cache[ck] = out;
  return out;
}

// No per-part highlight layer for art-derived silhouettes.
export const HIGHLIGHTS: Record<string, Record<string, [number, number][]>> = {};

// Braille 8-dot cell: bit index → (dx, dy) within a 2×4 cell block.
// dot1=bit0 (0,0), dot2=bit1 (0,1), dot3=bit2 (0,2), dot4=bit3 (1,0),
// dot5=bit4 (1,1), dot6=bit5 (1,2), dot7=bit6 (0,3), dot8=bit7 (1,3).
const PIN_MAP: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [0, 3], [1, 3],
];

// Convert a DTMS hex string (600 chars = 300 bytes, one per braille cell)
// into a 60×40 pin grid for on-screen rendering.
export function dtmsToGrid(hex: string): Grid {
  const g = blank();
  for (let i = 0; i < 300; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (!byte) continue;
    const cellX = i % 30;
    const cellY = Math.floor(i / 30);
    for (let b = 0; b < 8; b++) {
      if (byte & (1 << b)) {
        const [dx, dy] = PIN_MAP[b];
        g[cellY * 4 + dy][cellX * 2 + dx] = 1;
      }
    }
  }
  return g;
}
