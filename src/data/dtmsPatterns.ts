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
  // Source: clownfish.dtms
  clownfish: '000000000000000000000000c0c040000000000000000000000000000000000000000000000000e0761b090919b740000000000000000000000000000000000000000000fccfe4e4e4e4e4fcc3e07436b6c400000000000000000000000000e0761fef09f700000008bf59bb76e4c4ff0080e0c400000000000000e07eab76e6b947b9e77e3bb6fc47b8470009b77e0b01b946000000000000ff40081b0bb847b877e6e07cbf47b8470000b8470000b847000000000000083be64000fe03fe01080900f847b8c7e074ff1b37e4fe03000000000000000008193fe7fce7c0c0e4e4ff36ffcbc1c07f00000000000000000000000000000000000019bfcdc1fe030000090909000000000000000000000000000000000000000000080900000000000000000000000000000000',
  // Source: Shark_basic.dtms
  shark: '000000000000000000000000e0f4f600000000000000000000000000000000000000000000000000a07e0b00bb040000000000000000000000c0e0c00000000000c0e0e4e4f41f000000b8e6c0c000000000000080f41e8bff0b0080e4361b0b8900000000000000000009091b3336e4c4c05e01807e0300becf0100000019010000000000000000000000000000091b0100fe0100000019b7c4e0e4e4e604000000000000000000000080e47e1bb7c479e70000000000093bb6e4c00000000000000000c0c04000bf41000000091b3b03000000000000000819bb44000000f61b1b09091b1b3f0300000000000000000000000000000000083bc64000b94600000000000000000000000000000000000000000000000000081b36f6ff040000000000000000000000000000',
};

/**
 * Returns the DTMS hex string for the given species key.
 * Falls back to the generic fish outline if no species-specific pattern exists.
 */
export function getDtmsPattern(speciesKey: string): string {
  return SPECIES_PATTERNS[speciesKey] ?? FISH_BASIC;
}
