import { ALL_SPECIES, ALL_GRIDS } from '../src/data/species';
let bad = 0;
for (const s of ALL_SPECIES) {
  const rows = ALL_GRIDS[s.key];
  const on = rows.reduce((a, r) => a + (r.match(/1/g)?.length ?? 0), 0);
  const w = rows[0]?.length, h = rows.length;
  if (!rows || h !== 40 || w !== 60 || on < 30) { console.log('BAD', s.key, { h, w, on }); bad++; }
}
console.log(`checked ${ALL_SPECIES.length} species, dims 60x40, ${bad} problems`);
