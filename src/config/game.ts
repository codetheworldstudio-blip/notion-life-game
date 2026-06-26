// ============================================================
// 게임 설정 파일 — 모든 수치는 여기서만 관리
// 밸런스 조정이 필요하면 이 파일만 수정하면 됩니다
// ============================================================

export const GAME_CONFIG = {

  // ── XP 시스템 ──────────────────────────────────────────────
  xp: {
    // N레벨 → N+1레벨에 필요한 XP: 50 + (5 × N)
    perLevel: (level: number): number => 50 + 5 * level,

    // 누적 XP로 현재 레벨 계산
    levelFromTotal: (totalXp: number): number => {
      let level = 1
      let accumulated = 0
      while (true) {
        const needed = GAME_CONFIG.xp.perLevel(level)
        if (accumulated + needed > totalXp) break
        accumulated += needed
        level++
      }
      return level
    },

    // 현재 레벨에서 다음 레벨까지 남은 XP
    xpToNextLevel: (totalXp: number): number => {
      let level = 1
      let accumulated = 0
      while (true) {
        const needed = GAME_CONFIG.xp.perLevel(level)
        if (accumulated + needed > totalXp) {
          return accumulated + needed - totalXp
        }
        accumulated += needed
        level++
      }
    },

    // 현재 레벨 내 진행도 (0~1)
    progressInLevel: (totalXp: number): number => {
      const level = GAME_CONFIG.xp.levelFromTotal(totalXp)
      let accumulated = 0
      for (let i = 1; i < level; i++) {
        accumulated += GAME_CONFIG.xp.perLevel(i)
      }
      const needed = GAME_CONFIG.xp.perLevel(level)
      const progress = totalXp - accumulated
      return progress / needed
    },
  },

  // ── 스탯 시스템 ────────────────────────────────────────────
  stats: {
    // 스탯 XP로 스탯 레벨 계산
    levelFromXp: (statXp: number): number => Math.floor(statXp / 300) + 1,

    // 스탯 레벨 최대값
    maxLevel: 10,

    // 4가지 스탯 정의
    list: [
      { id: 'strength',     label: '체력',  symbol: '💪', color: '#7BAE7F', naturalSymbol: '뿌리' },
      { id: 'intelligence', label: '지력',  symbol: '🧠', color: '#6FA8DC', naturalSymbol: '잎'   },
      { id: 'mind',         label: '정신력', symbol: '🧘', color: '#9FC5E8', naturalSymbol: '이슬' },
      { id: 'productivity', label: '생산성', symbol: '⚡', color: '#C4A35A', naturalSymbol: '햇살' },
    ] as const,

    // 스탯별 레벨 칭호
    titles: {
      strength:     ['허약한 뿌리', '뻗어가는 뿌리', '단단한 뿌리', '깊은 뿌리', '대지의 뿌리'],
      intelligence: ['백지의 잎', '돋아나는 잎', '무성한 잎', '지혜의 잎', '고목의 잎'],
      mind:         ['흔들리는 이슬', '맺히는 이슬', '영롱한 이슬', '신성한 이슬', '새벽의 이슬'],
      productivity: ['잠든 씨앗', '싹트는 씨앗', '자라는 새싹', '꽃 피는 줄기', '태양의 씨앗'],
    },
  },

  // ── 캐릭터 진화 단계 ───────────────────────────────────────
  evolution: [
    { stage: 1, minLevel: 1,   maxLevel: 9,   name: '새싹 모험가', emoji: '🌱', description: '여행복, 꽃 왕관' },
    { stage: 2, minLevel: 10,  maxLevel: 24,  name: '숲의 수련자', emoji: '🍃', description: '가죽 조끼, 잎사귀 디테일' },
    { stage: 3, minLevel: 25,  maxLevel: 49,  name: '숲의 수호자', emoji: '🌿', description: '드루이드 로브, 발광 식물' },
    { stage: 4, minLevel: 50,  maxLevel: 99,  name: '숲의 정령',   emoji: '🌳', description: '자연 갑옷, 넝쿨 오라' },
    { stage: 5, minLevel: 100, maxLevel: Infinity, name: '대자연의 화신', emoji: '✨', description: '신성한 갑주, 빛의 오라' },
  ],

  // 레벨로 진화 단계 가져오기
  getEvolutionStage: (level: number) => {
    return GAME_CONFIG.evolution.findLast(e => level >= e.minLevel) ?? GAME_CONFIG.evolution[0]
  },

  // ── 골드 시스템 ────────────────────────────────────────────
  gold: {
    // 기본 루틴 골드 비율 (XP 대비)
    xpToGoldRatio: 0.6, // XP 50이면 골드 30
  },

  // ── 퀘스트 ─────────────────────────────────────────────────
  quests: {
    types: ['daily', 'weekly', 'achievement', 'hidden'] as const,
  },

  // ── 칭호 등급 ──────────────────────────────────────────────
  titleGrades: ['common', 'rare', 'legendary', 'hidden'] as const,

  // ── 상점 아이템 카테고리 ───────────────────────────────────
  shopCategories: [
    { id: 'hat',       label: '모자',    emoji: '🎩' },
    { id: 'top',       label: '상의',    emoji: '👕' },
    { id: 'bottom',    label: '하의',    emoji: '👖' },
    { id: 'accessory', label: '액세서리', emoji: '💎' },
    { id: 'background', label: '배경',   emoji: '🌅' },
  ] as const,

  // ── UI / 테마 ──────────────────────────────────────────────
  theme: {
    colors: {
      primary:    '#7BAE7F', // 이끼 그린
      secondary:  '#C4A35A', // 흙빛 골드
      background: '#F5F0E8', // 아이보리
      accent:     '#9FC5E8', // 안개 민트
    },
    // 시간대별 배경 (위젯에서 사용)
    timeOfDay: [
      { start: 5,  end: 8,  name: 'dawn',    label: '새벽' },
      { start: 8,  end: 17, name: 'day',     label: '낮'   },
      { start: 17, end: 20, name: 'evening', label: '저녁' },
      { start: 20, end: 24, name: 'night',   label: '밤'   },
      { start: 0,  end: 5,  name: 'night',   label: '밤'   },
    ],
  },

} as const
