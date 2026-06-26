// ============================================================
// 전체 타입 정의
// ============================================================

// ── 캐릭터 ─────────────────────────────────────────────────
export interface Character {
  id: string
  name: string
  totalXp: number
  level: number
  gold: number
  equippedTitleId: string | null
  equippedItems: EquippedItems
  customization: CharacterCustomization
  stats: CharacterStats
  notionPageId: string
}

export interface CharacterStats {
  strength:     { xp: number; level: number }
  intelligence: { xp: number; level: number }
  mind:         { xp: number; level: number }
  productivity: { xp: number; level: number }
}

export interface CharacterCustomization {
  skinColor:   string
  hairColor:   string
  hairStyle:   number // 0~3
  startOutfit: number // 0~1
}

export interface EquippedItems {
  hat?:        string | null
  top?:        string | null
  bottom?:     string | null
  accessory?:  string | null
  background?: string | null
}

// ── 루틴 ───────────────────────────────────────────────────
export interface Routine {
  id: string
  name: string
  category: StatCategory
  xp: number
  gold: number
  difficulty: 'easy' | 'normal' | 'hard'
  notionPageId: string
}

// ── 완료 기록 ───────────────────────────────────────────────
export interface CompletionLog {
  id: string
  date: string // YYYY-MM-DD
  routineId: string
  routineName: string
  completed: boolean
  earnedXp: number
  earnedGold: number
  category: StatCategory
  notionPageId: string
}

// ── 할 일 ──────────────────────────────────────────────────
export interface Todo {
  id: string
  title: string
  date: string
  completed: boolean
  xp: number
  gold: number
  notionPageId: string
}

// ── 퀘스트 ─────────────────────────────────────────────────
export interface Quest {
  id: string
  name: string
  description: string
  type: 'daily' | 'weekly' | 'achievement' | 'hidden'
  rewardXp: number
  rewardGold: number
  rewardTitleId?: string
  completed: boolean
  completedAt?: string
  isHidden: boolean
  progress?: number   // 현재 진행도
  target?: number     // 목표값
  notionPageId: string
}

// ── 칭호 ───────────────────────────────────────────────────
export interface Title {
  id: string
  name: string
  description: string
  condition: string   // 히든이면 '???'
  grade: 'common' | 'rare' | 'legendary' | 'hidden'
  icon: string
  isHidden: boolean
  notionPageId: string
}

export interface OwnedTitle {
  id: string
  titleId: string
  title: Title
  acquiredAt: string
  isEquipped: boolean
  notionPageId: string
}

// ── 상점 아이템 ────────────────────────────────────────────
export interface ShopItem {
  id: string
  name: string
  category: 'hat' | 'top' | 'bottom' | 'accessory' | 'background'
  price: number
  imageUrl?: string
  description: string
  notionPageId: string
}

export interface InventoryItem {
  id: string
  itemId: string
  item: ShopItem
  purchasedAt: string
  isEquipped: boolean
  notionPageId: string
}

// ── 활동 피드 ──────────────────────────────────────────────
export interface FeedItem {
  id: string
  type: 'routine' | 'todo' | 'quest' | 'levelup' | 'title'
  message: string
  earnedXp?: number
  earnedGold?: number
  timestamp: string
}

// ── Notion DB IDs ──────────────────────────────────────────
export interface NotionDatabaseIds {
  character:     string
  routines:      string
  completions:   string
  todos:         string
  quests:        string
  titleCatalog:  string
  titleOwned:    string
  shopItems:     string
  inventory:     string
}

// ── 공통 타입 ──────────────────────────────────────────────
export type StatCategory = 'strength' | 'intelligence' | 'mind' | 'productivity'
export type Language = 'ko' | 'en'
