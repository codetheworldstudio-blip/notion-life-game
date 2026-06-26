// ============================================================
// XP & 레벨 계산 로직
// GAME_CONFIG를 기반으로 동작 — 수치 변경은 config/game.ts에서
// ============================================================

import { GAME_CONFIG } from '@/config/game'
import type { CompletionLog, Todo, Quest } from '@/types'

// 총 XP에서 레벨 계산
export function calcLevel(totalXp: number): number {
  return GAME_CONFIG.xp.levelFromTotal(totalXp)
}

// 다음 레벨까지 남은 XP
export function calcXpToNext(totalXp: number): number {
  return GAME_CONFIG.xp.xpToNextLevel(totalXp)
}

// 현재 레벨 내 진행률 (0~1)
export function calcProgress(totalXp: number): number {
  return GAME_CONFIG.xp.progressInLevel(totalXp)
}

// 레벨에 따른 진화 단계
export function getEvolutionStage(level: number) {
  return GAME_CONFIG.getEvolutionStage(level)
}

// 스탯 레벨 계산
export function calcStatLevel(statXp: number): number {
  return Math.min(GAME_CONFIG.stats.levelFromXp(statXp), GAME_CONFIG.stats.maxLevel)
}

// 스탯 레벨 칭호
export function getStatTitle(statId: keyof typeof GAME_CONFIG.stats.titles, level: number): string {
  const titles = GAME_CONFIG.stats.titles[statId]
  const index = Math.min(level - 1, titles.length - 1)
  return titles[index]
}

// 오늘 완료 기록에서 총 획득 XP 계산
export function calcDailyXp(completions: CompletionLog[], todos: Todo[]): number {
  const routineXp = completions
    .filter(c => c.completed)
    .reduce((sum, c) => sum + c.earnedXp, 0)

  const todoXp = todos
    .filter(t => t.completed)
    .reduce((sum, t) => sum + t.xp, 0)

  return routineXp + todoXp
}

// 오늘 완료 기록에서 총 획득 골드 계산
export function calcDailyGold(completions: CompletionLog[], todos: Todo[]): number {
  const routineGold = completions
    .filter(c => c.completed)
    .reduce((sum, c) => sum + c.earnedGold, 0)

  const todoGold = todos
    .filter(t => t.completed)
    .reduce((sum, t) => sum + t.gold, 0)

  return routineGold + todoGold
}

// 스탯별 XP 집계
export function calcStatXp(completions: CompletionLog[]) {
  return completions
    .filter(c => c.completed)
    .reduce((acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + c.earnedXp
      return acc
    }, {} as Record<string, number>)
}

// 퀘스트 달성 체크 (달성형 예시)
export function checkQuestProgress(
  quest: Quest,
  totalXp: number,
  statXp: Record<string, number>,
  streak: number
): number {
  switch (quest.name) {
    case '7일 연속 달성':       return streak
    case '30일의 기적':         return streak
    case '💪 체력 XP 1,000':   return statXp['strength'] ?? 0
    case '🧠 지력 XP 1,000':   return statXp['intelligence'] ?? 0
    default:                    return 0
  }
}
