'use client'

// ============================================================
// 활동 피드 위젯
// 노션에 embed: /widget/feed?token=xxx
// 오늘 한 일 최근 5개 + 오늘 XP/골드 합계 표시
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import type { FeedItem } from '@/types'

interface FeedData {
  feed: FeedItem[]
  todayXp: number
  todayGold: number
}

export default function FeedWidget() {
  const [data, setData]       = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [newItems, setNewItems] = useState<Set<string>>(new Set())

  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token')
    : null

  const fetchData = useCallback(async () => {
    if (!token) { setError('token 없음'); setLoading(false); return }
    try {
      const res  = await fetch(`/api/feed?token=${token}`)
      const json = await res.json() as FeedData

      // 새로 추가된 아이템 감지
      if (data) {
        const prevIds = new Set(data.feed.map(f => f.id))
        const addedIds = json.feed.filter(f => !prevIds.has(f.id)).map(f => f.id)
        if (addedIds.length > 0) {
          setNewItems(new Set(addedIds))
          setTimeout(() => setNewItems(new Set()), 3000)
        }
      }

      setData(json)
      setError(null)
    } catch {
      setError('피드를 불러올 수 없어요')
    } finally {
      setLoading(false)
    }
  }, [token, data])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (loading) {
    return (
      <div className="widget-bg flex items-center justify-center p-6">
        <div className="text-2xl animate-pulse">🌿</div>
      </div>
    )
  }

  return (
    <div className="widget-bg p-3 space-y-3 min-h-0">

      {/* 오늘 합계 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#8B6914] uppercase tracking-wide">오늘의 활동</h3>
        <div className="flex gap-3 text-xs font-semibold">
          <span className="text-[#7BAE7F]">+{data?.todayXp ?? 0} XP</span>
          <span className="text-[#C4A35A]">+{data?.todayGold ?? 0} 🪙</span>
        </div>
      </div>

      {/* 피드 목록 */}
      <div className="space-y-1.5">
        {!data?.feed.length ? (
          <div className="text-center py-4 text-[#A0845C] text-sm">
            <div className="text-2xl mb-1">🌱</div>
            오늘 완료한 활동이 없어요
          </div>
        ) : (
          data.feed.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              isNew={newItems.has(item.id)}
            />
          ))
        )}
      </div>

      {/* 새로고침 */}
      <button
        onClick={fetchData}
        className="w-full text-center text-xs text-[#A0845C] hover:text-[#5C4033] transition-colors"
      >
        ↻ 새로고침
      </button>

    </div>
  )
}

function FeedCard({ item, isNew }: { item: FeedItem; isNew: boolean }) {
  const time = new Date(item.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit',
  })

  const typeColors: Record<FeedItem['type'], string> = {
    routine:  'bg-[#C8E6C9]',
    todo:     'bg-[#FFF8E1]',
    quest:    'bg-[#E1BEE7]',
    levelup:  'bg-[#FFECB3]',
    title:    'bg-[#F3E5F5]',
  }

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm
        ${typeColors[item.type]}
        ${isNew ? 'animate-pulse ring-2 ring-[#7BAE7F]' : ''}
        transition-all duration-300
      `}
    >
      {/* 메시지 */}
      <span className="flex-1 text-[#5C4033] text-xs leading-snug">{item.message}</span>

      {/* 보상 */}
      <div className="flex flex-col items-end shrink-0 text-[10px] font-semibold">
        {item.earnedXp   ? <span className="text-[#7BAE7F]">+{item.earnedXp} XP</span>   : null}
        {item.earnedGold ? <span className="text-[#C4A35A]">+{item.earnedGold} 🪙</span> : null}
      </div>

      {/* 시간 */}
      <span className="text-[10px] text-[#A0845C] shrink-0">{time}</span>
    </div>
  )
}
