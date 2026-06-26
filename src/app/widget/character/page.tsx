'use client'

// ============================================================
// 캐릭터 + 스탯 위젯 페이지
// 노션에 embed: /widget/character?token=xxx
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import { CharacterDisplay } from '@/components/character/CharacterDisplay'
import { StatsPanel } from '@/components/stats/StatsPanel'
import { XpBar } from '@/components/character/XpBar'

interface CharacterData {
  name: string
  totalXp: number
  level: number
  xpToNext: number
  progress: number
  gold: number
  evolution: { stage: number; name: string; emoji: string }
  equippedTitle: string | null
  equippedItems: {
    hat: string | null
    top: string | null
    bottom: string | null
    accessory: string | null
    background: string | null
  }
  customization: {
    skinColor: string
    hairColor: string
    hairStyle: number
  } | null
  stats: {
    strength:     { xp: number; level: number }
    intelligence: { xp: number; level: number }
    mind:         { xp: number; level: number }
    productivity: { xp: number; level: number }
  }
}

export default function CharacterWidget() {
  const [data, setData] = useState<CharacterData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // URL에서 token 추출
  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token')
    : null

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('token이 없습니다')
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/character?token=${token}`)
      if (!res.ok) throw new Error('캐릭터 데이터를 불러올 수 없어요')
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }, [token])

  // 초기 로딩 + 60초마다 자동 갱신
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ── 로딩 ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="widget-bg flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🌿</div>
          <p className="text-[#8B6914] text-sm">불러오는 중...</p>
        </div>
      </div>
    )
  }

  // ── 에러 ──────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="widget-bg flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="text-4xl">🍂</div>
          <p className="text-[#C4785A] text-sm">{error ?? '데이터 없음'}</p>
          <button onClick={fetchData} className="btn-primary text-xs px-3 py-1">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // ── 메인 위젯 ─────────────────────────────────────────────
  return (
    <div className="widget-bg min-h-screen p-4 space-y-4">

      {/* 헤더: 이름 + 칭호 + 골드 */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#5C4033]">{data.name}</h2>
          {data.equippedTitle && (
            <span className="text-xs text-[#8B6914] bg-[#E8D5A3] px-2 py-0.5 rounded-full">
              {data.equippedTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-[#C4A35A]">
          <span>🪙</span>
          <span>{data.gold.toLocaleString()}</span>
        </div>
      </div>

      {/* 캐릭터 일러스트 */}
      <CharacterDisplay
        stage={data.evolution.stage}
        level={data.level}
        equippedItems={data.equippedItems}
        customization={data.customization}
      />

      {/* 레벨 + XP 바 */}
      <XpBar
        level={data.level}
        progress={data.progress}
        xpToNext={data.xpToNext}
        evolutionName={data.evolution.name}
        evolutionEmoji={data.evolution.emoji}
      />

      {/* 스탯 패널 */}
      <StatsPanel stats={data.stats} />

      {/* 갱신 버튼 + 마지막 업데이트 */}
      <div className="flex items-center justify-between text-xs text-[#A0845C]">
        <span>
          {lastUpdated ? `${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트` : ''}
        </span>
        <button
          onClick={fetchData}
          className="flex items-center gap-1 hover:text-[#5C4033] transition-colors"
        >
          <span>↻</span> 새로고침
        </button>
      </div>

    </div>
  )
}
