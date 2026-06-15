// Game rules helpers (level/xp calculations, rewards)
export function xpForLevel(level: number): number {
  return Math.floor(50 * Math.pow(1.2, level - 1));
}

export function addXp(currentXp: number, gained: number, level: number) {
  const next = currentXp + gained;
  const need = xpForLevel(level);
  if (next >= need) return { level: level + 1, xp: next - need, leveled: true };
  return { level, xp: next, leveled: false };
}
