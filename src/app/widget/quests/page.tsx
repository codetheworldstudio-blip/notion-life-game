'use client'

// ============================================================
// 퀘스트 위젯
// 노션에 embed: /widget/quests?token=xxx
// ============================================================

import { useEffect, useState, useCallback } from 'react'

interface Quest {
  id: string
  name: string
  type: string
  description: string
  rewardXp: number
  rewardGold: number
  progress: number
  target: number
  isHidden: boolean
}

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  '일일':   { bg: 'bg-[#C8E6C9]', text: 'text-[#2E7D32]', label: '일일' },
  '주간':   { bg: 'bg-[#BBDEFB]', text: 'text-[#1565C0]', label: '주간' },
  '달성형': { bg: 'bg-[#FFF9C4]', text: 'text-[#F57F17]', label: '달성' },
  '히든':   { bg: 'bg-[#E8EAF6]', text: 'text-[#283593]', label: '???' },
}

export default function QuestsWidget() {
  const [quests, setQuests]   = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<string>('전체')

  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token') ?? ''
    : ''

  const fetchQuests = useCallback(async () => {
    if (!token) return
    try {
      const res  = await fetch(`/api/quests?token=${token}`)
      const json = await res.json()
      setQuests(json.quests ?? [])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchQuests()
    const interval = setInterval(fetchQuests, 60_000)
    return () => clearInterval(interval)
  }, [fetchQuests])

  const tabs = ['전체', '일일', '주간', '달성형', '히든']
  const filtered = filter === '전체' ? quests : quests.filter(q => q.type === filter)

  if (loading) {
    return (
      <div className="widget-bg flex items-center justify-center p-6">
        <div className="text-2xl animate-pulse">🗺️</div>
      </div>
    )
  }

  return (
    <div className="widget-bg p-3 space-y-2">

      {/* 헤더 */}
      <h3 className="text-xs font-bold text-[#5C4033] uppercase tracking-wide">🗺️ 퀘스트</h3>

      {/* 탭 필터 */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
              filter === tab
                ? 'bg-[#5C4033] text-white'
                : 'bg-white/60 text-[#8B6914] hover:bg-[#E8D5A3]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 퀘스트 목록 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-4 text-[#A0845C] text-xs">
            <div className="text-xl mb-1">🌿</div>
            퀘스트가 없어요
          </div>
        ) : (
          filtered.map(quest => {
            const pct      = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0
            const typeStyle = TYPE_STYLE[quest.type] ?? TYPE_STYLE['달성형']

            return (
              <div
                key={quest.id}
                className={`
                  p-3 rounded-xl border space-y-2 transition-all
                  ${quest.isHidden
                    ? 'bg-[#F5F0E8] border-dashed border-[#C8C0A8]'
                    : 'bg-white/80 border-[#E8D5A3]'
                  }
                `}
              >
                {/* 상단: 유형 뱃지 + 이름 */}
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                    {typeStyle.label}
                  </span>
                  <span className={`text-xs font-semibold flex-1 ${quest.isHidden ? 'text-[#A0A0A0] tracking-widest' : 'text-[#5C4033]'}`}>
                    {quest.name}
                  </span>
                </div>

                {/* 설명 */}
                <p className="text-[10px] text-[#A0845C] leading-snug">{quest.description}</p>

                {/* 진행 바 (target이 1 초과일 때만) */}
                {quest.target > 1 && !quest.isHidden && (
                  <div className="space-y-0.5">
                    <div className="h-2 bg-[#E8D5A3] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #7BAE7F, #A8D8A8)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#A0845C]">
                      <span>{quest.progress} / {quest.target}</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                  </div>
                )}

                {/* 보상 */}
                {!quest.isHidden && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#7BAE7F] font-semibold">+{quest.rewardXp} XP</span>
                    <span className="text-[#C4A35A] font-semibold">+{quest.rewardGold} 🪙</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
