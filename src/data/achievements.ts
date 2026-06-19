export interface Achievement {
  id: string;
  icon: string;
  ko: { name: string; desc: string };
  en: { name: string; desc: string };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_discovery', icon: '🔍',
    ko: { name: '첫 만남', desc: '처음으로 바다 생물을 발견했어요.' },
    en: { name: 'First Contact', desc: 'Discovered your first sea creature.' } },
  { id: 'pioneer', icon: '🧭',
    ko: { name: '탐험가', desc: '5종 이상의 생물을 발견했어요.' },
    en: { name: 'Pioneer', desc: 'Discovered 5 or more species.' } },
  { id: 'navigator', icon: '🗺️',
    ko: { name: '항해사', desc: '10종 이상의 생물을 발견했어요.' },
    en: { name: 'Navigator', desc: 'Discovered 10 or more species.' } },
  { id: 'naturalist', icon: '🌿',
    ko: { name: '자연학자', desc: '20종 이상의 생물을 발견했어요.' },
    en: { name: 'Naturalist', desc: 'Discovered 20 or more species.' } },
  { id: 'legend', icon: '🏆',
    ko: { name: '심해 전설', desc: '모든 바다 생물을 발견했어요!' },
    en: { name: 'Ocean Legend', desc: 'Discovered all sea creatures!' } },
  { id: 'apex', icon: '🦈',
    ko: { name: '포식자의 세계', desc: '상어류를 처음 발견했어요.' },
    en: { name: 'Apex World', desc: 'Discovered a shark species.' } },
  { id: 'gentle_giant', icon: '🐋',
    ko: { name: '거인과의 만남', desc: '혹등고래를 발견했어요.' },
    en: { name: 'Gentle Giant', desc: 'Discovered the humpback whale.' } },
  { id: 'deep_dweller', icon: '🦑',
    ko: { name: '심해 거주자', desc: '문어 또는 오징어를 발견했어요.' },
    en: { name: 'Deep Dweller', desc: 'Discovered an octopus or squid.' } },
  { id: 'danger_close', icon: '⚡',
    ko: { name: '아슬아슬', desc: '위험 생물과 처음으로 마주쳤어요.' },
    en: { name: 'Close Call', desc: 'First encounter with a dangerous creature.' } },
  { id: 'tier2', icon: '⭐',
    ko: { name: '2단계 달성', desc: '커리큘럼 2단계에 도달했어요.' },
    en: { name: 'Level 2 Reached', desc: 'Reached curriculum level 2.' } },
  { id: 'tier4', icon: '🌟',
    ko: { name: '4단계 달성', desc: '커리큘럼 4단계에 도달했어요.' },
    en: { name: 'Level 4 Reached', desc: 'Reached curriculum level 4.' } },
  { id: 'lvl5', icon: '📈',
    ko: { name: '성장 중', desc: '게임 레벨 5에 도달했어요.' },
    en: { name: 'Growing Up', desc: 'Reached game level 5.' } },
  { id: 'lvl10', icon: '🚀',
    ko: { name: '강한 탐험가', desc: '게임 레벨 10에 도달했어요.' },
    en: { name: 'Strong Explorer', desc: 'Reached game level 10.' } },
  { id: 'streak3', icon: '🔥',
    ko: { name: '3일 연속', desc: '3일 연속으로 바다를 탐험했어요.' },
    en: { name: '3-Day Streak', desc: 'Explored the ocean 3 days in a row.' } },
  { id: 'streak7', icon: '💎',
    ko: { name: '일주일 탐험', desc: '7일 연속으로 바다를 탐험했어요!' },
    en: { name: 'Week Journey', desc: 'Explored the ocean 7 days in a row!' } },
  { id: 'daily_complete', icon: '✅',
    ko: { name: '오늘의 탐험가', desc: '데일리 챌린지를 완료했어요.' },
    en: { name: 'Daily Hero', desc: "Completed today's challenge." } },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a]),
) as Record<string, Achievement>;

export interface AchievementCheckInput {
  discoveredCount: number;
  discovered: Set<string>;
  level: number;
  curriculumLevel: number;
  streakDays: number;
  unlocked: Set<string>;
  eventType?: 'danger' | 'daily_complete';
}

export function checkNewAchievements(inp: AchievementCheckInput): Achievement[] {
  const results: Achievement[] = [];
  const push = (id: string) => {
    if (!inp.unlocked.has(id) && ACHIEVEMENT_MAP[id]) results.push(ACHIEVEMENT_MAP[id]);
  };

  if (inp.discoveredCount >= 1) push('first_discovery');
  if (inp.discoveredCount >= 5) push('pioneer');
  if (inp.discoveredCount >= 10) push('navigator');
  if (inp.discoveredCount >= 20) push('naturalist');
  if (inp.discoveredCount >= 34) push('legend');

  if (inp.discovered.has('shark') || inp.discovered.has('hammerhead') || inp.discovered.has('whaleshark')) push('apex');
  if (inp.discovered.has('whale')) push('gentle_giant');
  if (inp.discovered.has('octopus') || inp.discovered.has('squid')) push('deep_dweller');

  if (inp.eventType === 'danger') push('danger_close');
  if (inp.eventType === 'daily_complete') push('daily_complete');

  if (inp.level >= 5) push('lvl5');
  if (inp.level >= 10) push('lvl10');
  if (inp.curriculumLevel >= 2) push('tier2');
  if (inp.curriculumLevel >= 4) push('tier4');
  if (inp.streakDays >= 3) push('streak3');
  if (inp.streakDays >= 7) push('streak7');

  return results;
}
