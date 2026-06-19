export interface SaveData {
  version: number;
  discovered: string[];
  level: number;
  xp: number;
  sizeFactor: number;
  unlockedAchievements: string[];
  streakDays: number;
  lastVisitDate: string; // YYYY-MM-DD
  totalSessions: number;
  dailyChallengeDate: string;
  dailyChallengeProgress: number;
  dailyChallengeCompleted: boolean;
}

const KEY = 'dot-ocean-v1';
const DEFAULTS: SaveData = {
  version: 1,
  discovered: [],
  level: 1, xp: 0, sizeFactor: 1,
  unlockedAchievements: [],
  streakDays: 0, lastVisitDate: '',
  totalSessions: 0,
  dailyChallengeDate: '', dailyChallengeProgress: 0, dailyChallengeCompleted: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch { return { ...DEFAULTS }; }
}

export function writeSave(data: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota/unavailable */ }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface StreakResult {
  streakDays: number;
  isFirstToday: boolean;
  bonusXp: number;
}

export function checkAndUpdateStreak(save: SaveData): StreakResult {
  const today = todayISO();
  if (save.lastVisitDate === today) {
    return { streakDays: save.streakDays, isFirstToday: false, bonusXp: 0 };
  }
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  const newStreak = save.lastVisitDate === yesterday ? save.streakDays + 1 : 1;
  return { streakDays: newStreak, isFirstToday: true, bonusXp: Math.min(newStreak * 25, 250) };
}
