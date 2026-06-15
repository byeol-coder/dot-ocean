import { pattern as basePattern, GW, GH } from '../engine/dotMatrix';

export { GW, GH };

// Simple wrapper to expose pattern generation for other modules.
export function pattern(key: string, scale = 1) {
  return basePattern(key, scale);
}
