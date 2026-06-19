export type DailyChallengeType = 'discover_new' | 'eat_count' | 'danger_count' | 'scan_count' | 'levelup_count';

export interface DailyChallenge {
  id: string;
  icon: string;
  target: number;
  type: DailyChallengeType;
  ko: { title: string; desc: string };
  en: { title: string; desc: string };
}

const POOL: DailyChallenge[] = [
  { id: 'd1', icon: '🔬', target: 1, type: 'discover_new',
    ko: { title: '새 생물 발견', desc: '오늘 새로운 생물 1종을 발견하세요.' },
    en: { title: 'New Discovery', desc: 'Discover 1 new creature today.' } },
  { id: 'd2', icon: '🍽️', target: 5, type: 'eat_count',
    ko: { title: '바다의 식사', desc: '먹이 5마리를 드세요.' },
    en: { title: 'Ocean Feast', desc: 'Eat 5 creatures today.' } },
  { id: 'd3', icon: '⚡', target: 3, type: 'danger_count',
    ko: { title: '용감한 탐험', desc: '위험 생물 3마리와 마주치세요.' },
    en: { title: 'Brave Explorer', desc: 'Encounter 3 dangerous creatures.' } },
  { id: 'd4', icon: '📡', target: 8, type: 'scan_count',
    ko: { title: '레이더 탐색', desc: '스캔을 8회 사용하세요.' },
    en: { title: 'Radar Scout', desc: 'Use the scan 8 times.' } },
  { id: 'd5', icon: '🌊', target: 3, type: 'discover_new',
    ko: { title: '심해 탐험', desc: '새로운 생물 3종을 발견하세요.' },
    en: { title: 'Deep Dive', desc: 'Discover 3 new creatures today.' } },
  { id: 'd6', icon: '🌱', target: 1, type: 'levelup_count',
    ko: { title: '성장의 날', desc: '오늘 레벨업을 1회 달성하세요.' },
    en: { title: 'Growth Day', desc: 'Level up once today.' } },
  { id: 'd7', icon: '🐠', target: 10, type: 'eat_count',
    ko: { title: '대식가', desc: '먹이 10마리를 드세요.' },
    en: { title: 'Big Appetite', desc: 'Eat 10 creatures today.' } },
];

export function getDailyChallenge(dateStr: string): DailyChallenge {
  const seed = dateStr.replace(/-/g, '').split('').reduce((a, c) => a + parseInt(c, 10), 0);
  return POOL[seed % POOL.length];
}
