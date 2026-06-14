import type { Lang } from './species';

export interface UIStrings {
  appName: string;
  tagline: string;
  level: string;
  discovered: string;
  // floating nav
  navSettings: string;
  navEncyclopedia: string;
  navMission: string;
  navDotpad: string;
  navTutorial: string;
  close: string;
  back: string;
  // settings
  settingsTitle: string;
  sound: string;
  tts: string;
  highContrast: string;
  reducedMotion: string;
  dotpadStatus: string;
  connect: string;
  connected: string;
  keyboardGuide: string;
  language: string;
  on: string;
  off: string;
  keyMove: string;
  keyScan: string;
  keyEncy: string;
  keyClose: string;
  // encyclopedia
  encyTitle: string;
  encyProgress: string;
  encyEmpty: string;
  undiscovered: string;
  classification: string;
  size: string;
  habitat: string;
  region: string;
  features: string;
  foodchain: string;
  eats: string;
  eatenBy: string;
  tactileDesc: string;
  touchWithDotpad: string;
  silhouette: string;
  partsLayer: string;
  // dotpad preview popup
  dotpadPreview: string;
  shape: string;
  direction: string;
  right: string;
  sentToPad: string;
  // mission
  missionTitle: string;
  missionIntro: string;
  missionProgress: (a: number, b: number) => string;
  missionDone: string;
  // tutorial
  tutTitle: string;
  tutSteps: { t: string; d: string }[];
  tutStart: string;
  tutNext: string;
  // events / tts
  evDiscover: (n: string) => string;
  evEat: (n: string) => string;
  evLevelUp: (lv: number) => string;
  evDanger: (n: string) => string;
  evConnected: string;
  // danger labels
  danger: string[];
  rarity: Record<string, string>;
  startPlay: string;
  startHint: string;
  cmCompare: (n: string) => string;
  cmCompareSmall: (n: string) => string;
  mySize: string;
  simLabel: string;
}

export const UI: Record<Lang, UIStrings> = {
  ko: {
    appName: 'Dot Ocean', tagline: '만지며 배우는 촉각 해양 탐험',
    level: 'Lv.', discovered: '발견한 생물',
    navSettings: '설정', navEncyclopedia: '백과사전', navMission: '미션', navDotpad: 'Dot Pad', navTutorial: '도움말',
    close: '닫기', back: '뒤로',
    settingsTitle: '설정', sound: '소리', tts: '음성 안내(TTS)', highContrast: '고대비 모드', reducedMotion: '모션 줄이기',
    dotpadStatus: 'Dot Pad 연결', connect: '연결하기', connected: '연결됨 (시뮬레이션)',
    keyboardGuide: '키보드 안내', language: '언어',
    on: '켜짐', off: '꺼짐',
    keyMove: '이동', keyScan: '가장 가까운 생물 스캔', keyEncy: '백과사전 열기', keyClose: '닫기 / 뒤로',
    encyTitle: '촉각 백과사전', encyProgress: '발견 진행', encyEmpty: '아직 발견한 생물이 없어요. 바다를 탐험해 생물을 만나 보세요.',
    undiscovered: '미발견',
    classification: '분류', size: '크기', habitat: '서식지', region: '발견 지역', features: '특징',
    foodchain: '먹이사슬 관계', eats: '먹이', eatenBy: '천적', tactileDesc: '촉각 설명', touchWithDotpad: 'Dot Pad로 만져보기',
    silhouette: '실루엣', partsLayer: '부위 강조',
    dotpadPreview: 'Dot Pad 미리보기', shape: '형태', direction: '방향', right: '오른쪽',
    sentToPad: '패턴을 Dot Pad로 전송했어요',
    missionTitle: '학습 미션', missionIntro: '간단한 미션을 완료하며 바다 생물을 배워요.',
    missionProgress: (a, b) => `${a} / ${b} 완료`, missionDone: '완료!',
    tutTitle: '처음 오셨네요!',
    tutSteps: [
      { t: '바다를 헤엄쳐요', d: '화살표 키나 W A S D, 또는 화면을 끌어 물고기를 움직여요.' },
      { t: '먹고 성장해요', d: '나보다 작은 생물에 닿으면 먹고 경험치를 얻어요. 레벨이 오르면 더 커지고 빛이 강해져요.' },
      { t: '조심해요', d: '나보다 크거나 독이 있는 생물은 위험해요. 가까이 가면 소리와 음성으로 알려줘요.' },
      { t: '만지며 배워요', d: '생물에 다가가면 Dot Pad 60×40 촉각 미리보기가 떠요. 백과사전에서 다시 만져볼 수 있어요.' },
    ],
    tutStart: '바다로 들어가기', tutNext: '다음',
    evDiscover: (n) => `새로운 생물 발견! ${n}을(를) 백과사전에 등록했어요.`,
    evEat: (n) => `${n}을(를) 먹었어요.`,
    evLevelUp: (lv) => `레벨 ${lv} 달성! 더 커지고 빛이 강해졌어요.`,
    evDanger: (n) => `위험! ${n}은(는) 나보다 큽니다. 물러나세요.`,
    evConnected: 'Dot Pad가 연결되었어요 (시뮬레이션).',
    danger: ['무해', '주의', '독성', '포식자'],
    rarity: { common: '일반', uncommon: '비범', rare: '희귀', legendary: '전설' },
    startPlay: '▶  소리 켜고 시작', startHint: '화살표 / WASD 이동 · 화면 끌기 · Space 스캔',
    cmCompare: (n) => `내 물고기보다 약 ${n}배 큼`, cmCompareSmall: (n) => `내 물고기의 약 ${n}배 (더 작음)`,
    mySize: '내 크기', simLabel: 'SIMULATION · 실제 핀 출력 미리보기',
  },
  en: {
    appName: 'Dot Ocean', tagline: 'Explore the ocean by touch',
    level: 'Lv.', discovered: 'Discovered',
    navSettings: 'Settings', navEncyclopedia: 'Encyclopedia', navMission: 'Missions', navDotpad: 'Dot Pad', navTutorial: 'Help',
    close: 'Close', back: 'Back',
    settingsTitle: 'Settings', sound: 'Sound', tts: 'Voice narration (TTS)', highContrast: 'High contrast', reducedMotion: 'Reduce motion',
    dotpadStatus: 'Dot Pad connection', connect: 'Connect', connected: 'Connected (simulated)',
    keyboardGuide: 'Keyboard guide', language: 'Language',
    on: 'On', off: 'Off',
    keyMove: 'Move', keyScan: 'Scan nearest creature', keyEncy: 'Open encyclopedia', keyClose: 'Close / back',
    encyTitle: 'Tactile Encyclopedia', encyProgress: 'Discovery progress', encyEmpty: 'No creatures discovered yet. Explore the ocean to meet them.',
    undiscovered: 'Undiscovered',
    classification: 'Class', size: 'Size', habitat: 'Habitat', region: 'Found in', features: 'Features',
    foodchain: 'Food chain', eats: 'Eats', eatenBy: 'Eaten by', tactileDesc: 'Tactile description', touchWithDotpad: 'Touch with Dot Pad',
    silhouette: 'Silhouette', partsLayer: 'Parts',
    dotpadPreview: 'Dot Pad Preview', shape: 'Shape', direction: 'Direction', right: 'Right',
    sentToPad: 'Pattern sent to Dot Pad',
    missionTitle: 'Learning Missions', missionIntro: 'Complete simple missions to learn about sea life.',
    missionProgress: (a, b) => `${a} / ${b} done`, missionDone: 'Done!',
    tutTitle: 'Welcome!',
    tutSteps: [
      { t: 'Swim the ocean', d: 'Move your fish with arrow keys, W A S D, or by dragging the screen.' },
      { t: 'Eat and grow', d: 'Touch a smaller creature to eat it and gain XP. Leveling up makes you bigger and brighter.' },
      { t: 'Be careful', d: 'Bigger or venomous creatures are dangerous. You will hear sound and voice when one is near.' },
      { t: 'Learn by touch', d: 'Approach a creature to see its 60×40 Dot Pad preview. You can feel it again in the encyclopedia.' },
    ],
    tutStart: 'Enter the ocean', tutNext: 'Next',
    evDiscover: (n) => `New creature found! ${n} added to the encyclopedia.`,
    evEat: (n) => `Ate the ${n}.`,
    evLevelUp: (lv) => `Reached level ${lv}! You grew bigger and brighter.`,
    evDanger: (n) => `Danger! The ${n} is bigger than you. Back away.`,
    evConnected: 'Dot Pad connected (simulated).',
    danger: ['Harmless', 'Caution', 'Toxic', 'Predator'],
    rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' },
    startPlay: '▶  Turn on sound & start', startHint: 'Arrows / WASD move · drag · Space scan',
    cmCompare: (n) => `about ${n}× larger than my fish`, cmCompareSmall: (n) => `about ${n}× my fish (smaller)`,
    mySize: 'My size', simLabel: 'SIMULATION · pin output preview',
  },
};
