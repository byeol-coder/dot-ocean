export type Lang = 'ko' | 'en';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface SpeciesText {
  name: string;
  classification: string;
  habitat: string;
  region: string;
  features: string[];
  tactile: string; // one-line tactile description
  prey: string;    // what it eats
  predator: string; // what eats it
}

export interface Species {
  key: string;
  tier: number;      // food-chain / size rank; higher eats lower
  sizeCm: number;
  danger: 0 | 1 | 2 | 3;
  rarity: Rarity;
  hue: number;       // base glow hue (HSL)
  bodyRx: number;    // canvas body proportions (relative)
  bodyRy: number;
  speed: number;     // wander speed multiplier
  ko: SpeciesText;
  en: SpeciesText;
}

const C = (
  key: string, tier: number, sizeCm: number, danger: 0 | 1 | 2 | 3, rarity: Rarity,
  hue: number, bodyRx: number, bodyRy: number, speed: number, ko: SpeciesText, en: SpeciesText,
): Species => ({ key, tier, sizeCm, danger, rarity, hue, bodyRx, bodyRy, speed, ko, en });

export const SPECIES: Species[] = [
  C('plankton', 0, 2, 0, 'common', 130, 0.5, 0.5, 0.5,
    { name: '플랑크폰', classification: '동물성 플랑크톤', habitat: '바다 전 수심', region: '열린 바다', features: ['아주 작고 둥근 몸', '스스로 약하게 빛나요', '바다 먹이사슬의 시작'], tactile: '작은 원에 가시처럼 뻗은 점들', prey: '미세 조류', predator: '작은 물고기' },
    { name: 'Plankton', classification: 'Zooplankton', habitat: 'All depths', region: 'Open sea', features: ['Tiny round body', 'Glows faintly on its own', 'Start of the food chain'], tactile: 'A small circle with spokes around it', prey: 'Microalgae', predator: 'Small fish' }),
  C('sardine', 1, 15, 0, 'common', 190, 1.5, 0.5, 1.4,
    { name: '정어리', classification: '청어목 청어과', habitat: '연안 표층', region: '연안 무리 구역', features: ['작고 길쭉한 은빛 몸', '큰 무리를 지어 헤엄쳐요', '살짝 갈라진 꼬리'], tactile: '길쭉한 타원에 작게 갈라진 꼬리', prey: '플랑크톤', predator: '고등어·참치' },
    { name: 'Sardine', classification: 'Clupeidae', habitat: 'Coastal surface', region: 'Coastal shoals', features: ['Small slender silver body', 'Swims in large schools', 'Slightly forked tail'], tactile: 'A long oval with a small forked tail', prey: 'Plankton', predator: 'Mackerel, tuna' }),
  C('mackerel', 2, 30, 0, 'common', 175, 1.7, 0.7, 1.3,
    { name: '고등어', classification: '고등어목 고등어과', habitat: '연안~외양 표층', region: '연안 무리 구역', features: ['길쭉한 유선형 몸통', '깊게 갈라진 꼬리', '빠른 무리 헤엄'], tactile: '길쭉한 타원 + 깊게 갈라진 꼬리', prey: '정어리·플랑크톤', predator: '참치·상어' },
    { name: 'Mackerel', classification: 'Scombridae', habitat: 'Coastal to open surface', region: 'Coastal shoals', features: ['Long streamlined body', 'Deeply forked tail', 'Fast schooling swimmer'], tactile: 'A long oval with a deeply forked tail', prey: 'Sardine, plankton', predator: 'Tuna, shark' }),
  C('seahorse', 1, 20, 0, 'uncommon', 280, 0.5, 1.6, 0.4,
    { name: '해마', classification: '실고기목 실고기과', habitat: '잘피밭·산호', region: '산호초 주변', features: ['세로로 선 S자 몸', '둥글게 말린 꼬리', '긴 대롱 모양 주둥이'], tactile: '세로로 선 몸과 둥글게 말린 꼬리', prey: '작은 플랑크톤', predator: '큰 물고기' },
    { name: 'Seahorse', classification: 'Syngnathidae', habitat: 'Seagrass & coral', region: 'Near coral reef', features: ['Upright S-shaped body', 'Curled grasping tail', 'Long tube-shaped snout'], tactile: 'An upright body with a curled tail', prey: 'Tiny plankton', predator: 'Larger fish' }),
  C('jellyfish', 2, 40, 2, 'uncommon', 300, 1.0, 1.0, 0.45,
    { name: '해파리', classification: '자포동물 해파리강', habitat: '표층~중층', region: '열린 바다', features: ['둥근 우산 모양 몸', '길게 늘어진 촉수', '쏘는 독이 있어요'], tactile: '둥근 우산 + 아래로 늘어진 촉수 점들', prey: '플랑크톤·작은 물고기', predator: '거북' },
    { name: 'Jellyfish', classification: 'Cnidaria', habitat: 'Surface to mid-water', region: 'Open sea', features: ['Round bell-shaped body', 'Long trailing tentacles', 'Has a stinging venom'], tactile: 'A round dome with hanging tentacle dots', prey: 'Plankton, small fish', predator: 'Sea turtle' }),
  C('turtle', 3, 100, 0, 'rare', 150, 1.4, 1.1, 0.7,
    { name: '바다거북', classification: '거북목 바다거북과', habitat: '연안~외양', region: '산호초·열린 바다', features: ['둥근 등딱지', '네 개의 노 같은 다리', '천천히 우아하게 헤엄쳐요'], tactile: '둥근 등딱지 + 네 개의 지느러미발', prey: '해파리·해초', predator: '큰 상어' },
    { name: 'Sea Turtle', classification: 'Cheloniidae', habitat: 'Coastal to open ocean', region: 'Reef & open sea', features: ['Round shell', 'Four paddle-like flippers', 'Swims slowly and gracefully'], tactile: 'A round shell with four flippers', prey: 'Jellyfish, seagrass', predator: 'Large shark' }),
  C('puffer', 2, 40, 2, 'uncommon', 45, 1.1, 1.1, 0.5,
    { name: '복어', classification: '복어목 참복과', habitat: '연안 모래·바위', region: '연안 바닥', features: ['둥근 풍선 같은 몸', '위협받으면 부풀어요', '강한 독을 가졌어요'], tactile: '큰 둥근 몸통 + 바깥으로 뻗은 가시 점', prey: '작은 게·조개', predator: '거의 없음' },
    { name: 'Pufferfish', classification: 'Tetraodontidae', habitat: 'Coastal sand & rock', region: 'Coastal floor', features: ['Round balloon-like body', 'Puffs up when threatened', 'Carries a strong toxin'], tactile: 'A big round body with outward spike dots', prey: 'Small crabs & shellfish', predator: 'Few predators' }),
  C('ray', 3, 150, 2, 'rare', 35, 1.8, 1.2, 0.7,
    { name: '가오리', classification: '홍어목 가오리과', habitat: '모래 바닥', region: '연안 바닥', features: ['납작한 마름모 날개', '길고 가는 채찍 꼬리', '바닥에 붙어 활공해요'], tactile: '납작한 마름모 날개 + 긴 꼬리 선', prey: '조개·작은 물고기', predator: '큰 상어' },
    { name: 'Stingray', classification: 'Rajiformes', habitat: 'Sandy bottom', region: 'Coastal floor', features: ['Flat diamond wings', 'Long thin whip tail', 'Glides along the seabed'], tactile: 'Flat diamond wings with a long tail line', prey: 'Shellfish, small fish', predator: 'Large shark' }),
  C('octopus', 3, 80, 1, 'rare', 320, 1.1, 1.0, 0.55,
    { name: '문어', classification: '문어목 문어과', habitat: '바위틈·해저', region: '바위 동굴', features: ['둥근 머리와 여덟 개 다리', '색을 바꿔 숨어요', '아주 똑똑한 연체동물'], tactile: '둥근 머리 + 아래로 뻗은 여덟 다리', prey: '게·조개', predator: '상어·큰 물고기' },
    { name: 'Octopus', classification: 'Octopodidae', habitat: 'Rock crevices & seabed', region: 'Rocky caves', features: ['Round head with eight arms', 'Hides by changing color', 'A very clever mollusk'], tactile: 'A round head with eight arms below', prey: 'Crabs & shellfish', predator: 'Sharks, big fish' }),
  C('anglerfish', 3, 60, 2, 'rare', 260, 1.4, 1.1, 0.5,
    { name: '아귀', classification: '아귀목 아귀과', habitat: '깊은 바다 바닥', region: '심해 동굴', features: ['머리 위 빛나는 낚싯대', '큰 입과 날카로운 이빨', '깊은 바다에 살아요'], tactile: '큰 둥근 머리 + 위로 솟은 빛 낚싯대', prey: '작은 물고기', predator: '큰 심해 어류' },
    { name: 'Anglerfish', classification: 'Lophiiformes', habitat: 'Deep-sea floor', region: 'Deep-sea caves', features: ['Glowing lure above its head', 'Large mouth with sharp teeth', 'Lives in the deep sea'], tactile: 'A big round head with a lure above it', prey: 'Small fish', predator: 'Large deep-sea fish' }),
  C('tuna', 4, 200, 1, 'rare', 200, 1.9, 0.9, 1.8,
    { name: '참치', classification: '고등어목 다랑어속', habitat: '외양 표층', region: '열린 바다', features: ['크고 단단한 유선형 몸', '초승달 모양 꼬리', '매우 빠르게 헤엄쳐요'], tactile: '큰 유선형 몸 + 초승달 꼬리', prey: '고등어·정어리', predator: '상어' },
    { name: 'Tuna', classification: 'Thunnus', habitat: 'Open ocean surface', region: 'Open sea', features: ['Large firm streamlined body', 'Crescent-shaped tail', 'Swims very fast'], tactile: 'A large streamlined body with a crescent tail', prey: 'Mackerel, sardine', predator: 'Shark' }),
  C('shark', 5, 400, 3, 'legendary', 205, 2.0, 0.8, 1.0,
    { name: '상어', classification: '연골어강 상어목', habitat: '외양·연안', region: '깊은 바다', features: ['크고 긴 몸통', '높은 삼각 등지느러미', '바다의 최상위 포식자'], tactile: '긴 몸 + 높은 삼각 등지느러미 + 큰 꼬리', prey: '참치·거북·큰 물고기', predator: '없음' },
    { name: 'Shark', classification: 'Selachii', habitat: 'Open & coastal water', region: 'Deep sea', features: ['Large long body', 'Tall triangular dorsal fin', "The ocean's top predator"], tactile: 'A long body, tall dorsal fin and big tail', prey: 'Tuna, turtle, big fish', predator: 'None' }),
];

export const PLAYER_KEY = 'dotfish';
export const PLAYER_SPECIES: Species = C('dotfish', 2, 28, 0, 'common', 210, 1.7, 0.9, 1.0,
  { name: '푸른바다점박이', classification: '농어목 점박이과', habitat: '산호초 주변, 깊은 바다', region: '산호초 동굴 지역', features: ['몸 전체에 빛나는 점이 있어요', '깊은 바다에서 스스로 빛을 내요', '천적이 나타나면 빠르게 빛을 깜빡여요'], tactile: '둥근 타원 몸 + 갈라진 꼬리, 표면에 빛 점', prey: '플랑크폰·작은 물고기', predator: '상어' },
  { name: 'Glowing Dotfish', classification: 'Perciformes', habitat: 'Reefs and deep water', region: 'Reef cave zone', features: ['Glowing dots cover its body', 'Produces its own light in the deep', 'Flashes quickly when predators appear'], tactile: 'A round oval body with a forked tail and light dots', prey: 'Plankton, small fish', predator: 'Shark' });

export const ALL_SPECIES: Species[] = [...SPECIES, PLAYER_SPECIES];
export const byKey: Record<string, Species> = Object.fromEntries(ALL_SPECIES.map((s) => [s.key, s]));
export const DISCOVERABLE = SPECIES; // player species is known from the start

export function text(s: Species, lang: Lang): SpeciesText {
  return s[lang];
}
