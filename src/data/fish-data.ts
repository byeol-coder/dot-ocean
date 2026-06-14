export type FishSizeCategory = "small" | "medium" | "large" | "special";
export type FishDangerLevel = "safe" | "neutral" | "danger";
export type FishMovementType =
  | "dart"
  | "swim"
  | "school"
  | "drift"
  | "patrol"
  | "chase";

export interface FishDefinition {
  id: string;
  nameKo: string;
  nameEn: string;
  assetPath: string;
  level: number;
  expReward: number;
  sizeCategory: FishSizeCategory;
  dangerLevel: FishDangerLevel;
  movementType: FishMovementType;
  encyclopediaText: string;
  tactileHint: string;
  dotPadShapeType: string;
}

export const fishDefinitions: FishDefinition[] = [
  {
    id: "basic_fish",
    nameKo: "기본 먹이 물고기",
    nameEn: "Basic Fish",
    assetPath: "/assets/fish/dot_ocean_small_01_basic_fish.png",
    level: 1,
    expReward: 10,
    sizeCategory: "small",
    dangerLevel: "safe",
    movementType: "swim",
    encyclopediaText:
      "가장 기본적인 작은 물고기입니다. 초반 성장에 필요한 먹이 역할을 합니다.",
    tactileHint: "작은 타원형 몸통과 짧은 꼬리로 표현합니다.",
    dotPadShapeType: "small_oval_tail"
  },
  {
    id: "fast_fish",
    nameKo: "빠른 물고기",
    nameEn: "Fast Fish",
    assetPath: "/assets/fish/dot_ocean_small_02_fast_fish.png",
    level: 1,
    expReward: 15,
    sizeCategory: "small",
    dangerLevel: "safe",
    movementType: "dart",
    encyclopediaText:
      "빠르게 움직이는 작은 물고기입니다. 방향과 속도 감각을 익히기에 좋습니다.",
    tactileHint: "길쭉한 몸통과 뾰족한 꼬리로 표현합니다.",
    dotPadShapeType: "thin_fast_tail"
  },
  {
    id: "school_fish",
    nameKo: "무리 물고기",
    nameEn: "School Fish",
    assetPath: "/assets/fish/dot_ocean_small_03_school_fish.png",
    level: 2,
    expReward: 20,
    sizeCategory: "small",
    dangerLevel: "safe",
    movementType: "school",
    encyclopediaText:
      "무리 지어 이동하는 물고기입니다. 여러 마리가 같은 방향으로 움직입니다.",
    tactileHint: "작은 물고기 여러 개가 같은 방향으로 배열된 패턴입니다.",
    dotPadShapeType: "school_group"
  },
  {
    id: "growth_fish",
    nameKo: "성장 목표 물고기",
    nameEn: "Growth Fish",
    assetPath: "/assets/fish/dot_ocean_medium_01_growth_fish.png",
    level: 3,
    expReward: 35,
    sizeCategory: "medium",
    dangerLevel: "neutral",
    movementType: "swim",
    encyclopediaText:
      "플레이어가 성장한 뒤 잡을 수 있는 중간 크기 물고기입니다.",
    tactileHint: "중간 크기의 둥근 몸통과 넓은 꼬리로 표현합니다.",
    dotPadShapeType: "medium_round_tail"
  },
  {
    id: "tropical_fish",
    nameKo: "열대어",
    nameEn: "Tropical Fish",
    assetPath: "/assets/fish/dot_ocean_medium_02_tropical_fish.png",
    level: 4,
    expReward: 45,
    sizeCategory: "medium",
    dangerLevel: "neutral",
    movementType: "patrol",
    encyclopediaText:
      "줄무늬가 뚜렷한 관찰용 열대어입니다. 백과사전 학습에 적합합니다.",
    tactileHint: "둥근 몸통과 긴 등지느러미, 줄무늬 패턴으로 표현합니다.",
    dotPadShapeType: "striped_tropical"
  },
  {
    id: "shark",
    nameKo: "상어",
    nameEn: "Shark",
    assetPath: "/assets/fish/dot_ocean_large_01_shark.png",
    level: 8,
    expReward: 120,
    sizeCategory: "large",
    dangerLevel: "danger",
    movementType: "chase",
    encyclopediaText:
      "큰 포식자입니다. 플레이어보다 작아지기 전까지는 피해야 합니다.",
    tactileHint:
      "긴 몸통, 삼각 등지느러미, 날카로운 머리 형태로 표현합니다.",
    dotPadShapeType: "long_body_dorsal_fin"
  },
  {
    id: "whale",
    nameKo: "고래",
    nameEn: "Whale",
    assetPath: "/assets/fish/dot_ocean_large_02_whale.png",
    level: 12,
    expReward: 200,
    sizeCategory: "large",
    dangerLevel: "danger",
    movementType: "drift",
    encyclopediaText:
      "매우 큰 바다 생물입니다. 느리지만 압도적인 크기를 가집니다.",
    tactileHint: "큰 둥근 몸통과 넓은 꼬리로 표현합니다.",
    dotPadShapeType: "giant_whale"
  },
  {
    id: "manta_ray",
    nameKo: "만타가오리",
    nameEn: "Manta Ray",
    assetPath: "/assets/fish/dot_ocean_large_03_manta_ray.png",
    level: 7,
    expReward: 100,
    sizeCategory: "large",
    dangerLevel: "neutral",
    movementType: "drift",
    encyclopediaText:
      "넓은 날개처럼 펼쳐진 몸을 가진 바다 생물입니다.",
    tactileHint: "좌우로 넓은 마름모형 몸통과 긴 꼬리로 표현합니다.",
    dotPadShapeType: "wide_ray"
  },
  {
    id: "pufferfish",
    nameKo: "복어",
    nameEn: "Pufferfish",
    assetPath: "/assets/fish/dot_ocean_special_01_pufferfish.png",
    level: 5,
    expReward: 70,
    sizeCategory: "special",
    dangerLevel: "danger",
    movementType: "drift",
    encyclopediaText:
      "둥근 몸과 돌기가 특징인 물고기입니다. 가까이 접근하면 위험할 수 있습니다.",
    tactileHint: "둥근 몸통과 바깥쪽 돌기 패턴으로 표현합니다.",
    dotPadShapeType: "round_spike"
  },
  {
    id: "jellyfish",
    nameKo: "해파리",
    nameEn: "Jellyfish",
    assetPath: "/assets/fish/dot_ocean_special_02_jellyfish.png",
    level: 4,
    expReward: 50,
    sizeCategory: "special",
    dangerLevel: "danger",
    movementType: "drift",
    encyclopediaText:
      "촉수가 있는 특수 생물입니다. 닿으면 데미지를 받을 수 있습니다.",
    tactileHint: "둥근 머리 아래로 여러 개의 촉수가 내려오는 형태로 표현합니다.",
    dotPadShapeType: "jelly_tentacles"
  }
];
