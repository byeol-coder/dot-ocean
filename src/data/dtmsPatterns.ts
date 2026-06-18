// Pre-designed DTMS tactile patterns for Dot Pad 320A.
// Each hex string = 600 chars = 300 braille cells (10 rows × 30 cols).
// Created with Dot Creator; sent directly to displayGraphicData() — no encodeGrid needed.
//
// How to add a new species pattern:
//   1. Create a .dtms file in Dot Creator (device: dotpad320)
//   2. Open the JSON, copy items[0].graphic.data (the 600-char hex string)
//   3. Add an entry below with the matching species key from species.ts

// Generic fish outline — used as fallback for any species without its own pattern.
// Source: Fish_basic.dtms
const FISH_BASIC = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff3f3fbfffffffffffffffffffffffffffffffffffffffffffffffffffff7f0000000839ffffffffffffffffffffffffffffdf1b3f3fbfffffff7f3f07000000000000000809093b3fbfffffffffffffffe6400000180b0100000000000000000000000000000000083bffffffffffff070000000000000000000000000000000000000000000030ffffffffff030080e0fcfff6e6e4c00000000000000000000000c0e0f4fffffffffffff6fefffffffffffffffffff7020080e4f4f6f6f6fffffffffffffffffffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

if (import.meta.env.DEV && FISH_BASIC.length !== 600) {
  console.warn('[dtmsPatterns] FISH_BASIC length =', FISH_BASIC.length, '(expected 600)');
}

// Species-specific patterns. Keys must match the keys in species.ts.
// Add entries here as you create .dtms files for each species.
const SPECIES_PATTERNS: Record<string, string> = {
  // clownfish:  '<paste 600-char hex from clownfish.dtms here>',
  // bluefish:   '<paste 600-char hex from bluefish.dtms here>',
};

/**
 * Returns the DTMS hex string for the given species key.
 * Falls back to the generic fish outline if no species-specific pattern exists.
 */
export function getDtmsPattern(speciesKey: string): string {
  return SPECIES_PATTERNS[speciesKey] ?? FISH_BASIC;
}
