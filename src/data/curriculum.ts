// 5-level tactile curriculum: one level = one tier of species complexity.
// Unlock condition: discover ≥ UNLOCK_COUNT species from the previous level.
import { DISCOVERABLE, type Species } from './species';

export const UNLOCK_COUNT = 3; // discoveries at tier N required to open tier N+1

export interface CurriculumLevel {
  level: number;        // 1–5
  tier: number;         // matches Species.tier
  titleKo: string; titleEn: string;
  objectiveKo: string; objectiveEn: string;
  focusKo: string; focusEn: string;     // short tactile skill focus
  unlockHintKo: string; unlockHintEn: string;
  species: Species[];
}

const META: Array<Pick<CurriculumLevel, 'titleKo'|'titleEn'|'objectiveKo'|'objectiveEn'|'focusKo'|'focusEn'|'unlockHintKo'|'unlockHintEn'>> = [
  {
    titleKo: '기초 형태', titleEn: 'Basic Shapes',
    objectiveKo: '원형, 방사형 같은 단순한 생물 형태를 손끝으로 익혀요.',
    objectiveEn: 'Learn simple creature forms — circular and radial shapes — through touch.',
    focusKo: '단순 윤곽 인식', focusEn: 'Simple outline recognition',
    unlockHintKo: '처음부터 열려 있어요.', unlockHintEn: 'Available from the start.',
  },
  {
    titleKo: '유선형과 면형', titleEn: 'Streamlined & Flat',
    objectiveKo: '헤엄치는 물고기와 납작한 생물의 형태 차이를 배워요.',
    objectiveEn: 'Discover the difference between streamlined swimmers and flat-bodied creatures.',
    focusKo: '형태 대조 인식', focusEn: 'Contour contrast',
    unlockHintKo: `1단계 생물 ${UNLOCK_COUNT}종 이상 발견하면 열려요.`,
    unlockHintEn: `Discover ${UNLOCK_COUNT}+ Level 1 creatures to unlock.`,
  },
  {
    titleKo: '갑각류와 두족류', titleEn: 'Crustaceans & Cephalopods',
    objectiveKo: '다리와 돌기가 많은 복잡한 생물의 촉각 패턴을 학습해요.',
    objectiveEn: 'Feel intricate patterns of multi-limbed and tentacled creatures.',
    focusKo: '복잡 돌기 탐색', focusEn: 'Complex protrusions',
    unlockHintKo: `2단계 생물 ${UNLOCK_COUNT}종 이상 발견하면 열려요.`,
    unlockHintEn: `Discover ${UNLOCK_COUNT}+ Level 2 creatures to unlock.`,
  },
  {
    titleKo: '대형 해양 생물', titleEn: 'Large Marine Animals',
    objectiveKo: '고래와 상어처럼 거대한 생물의 전신 촉각 패턴을 느껴요.',
    objectiveEn: 'Experience full-body tactile patterns of whales, sharks, and rays.',
    focusKo: '대형 체형 비율', focusEn: 'Large-body proportions',
    unlockHintKo: `3단계 생물 ${UNLOCK_COUNT}종 이상 발견하면 열려요.`,
    unlockHintEn: `Discover ${UNLOCK_COUNT}+ Level 3 creatures to unlock.`,
  },
  {
    titleKo: '전설의 생물', titleEn: 'Legendary Creatures',
    objectiveKo: '최상위 포식자와 희귀 생물의 강렬한 촉각 패턴을 완성해요.',
    objectiveEn: 'Complete your tactile mastery with apex predators and legendary species.',
    focusKo: '전체 패턴 종합 동정', focusEn: 'Full-pattern identification',
    unlockHintKo: `4단계 생물 ${UNLOCK_COUNT}종 이상 발견하면 열려요.`,
    unlockHintEn: `Discover ${UNLOCK_COUNT}+ Level 4 creatures to unlock.`,
  },
];

export const CURRICULUM: CurriculumLevel[] = META.map((m, i) => ({
  ...m,
  level: i + 1,
  tier: i + 1,
  species: DISCOVERABLE.filter((s) => s.tier === i + 1),
}));

/** Returns the highest curriculum level the player has unlocked (1–5). */
export function computeCurriculumLevel(discovered: Set<string>): number {
  let unlocked = 1;
  for (let tier = 1; tier <= 4; tier++) {
    const count = DISCOVERABLE.filter((s) => s.tier === tier && discovered.has(s.key)).length;
    if (count >= UNLOCK_COUNT) unlocked = tier + 1;
    else break;
  }
  return Math.min(unlocked, 5);
}
