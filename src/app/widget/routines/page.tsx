'use client'

// ============================================================
// 루틴 위젯 — 체크박스로 완료 처리
// 노션에 embed: /widget/routines?token=xxx
// ============================================================

import { useEffect, useState, useCallback } from 'react'

interface Routine {
  id: string
  name: string
  category: string
  xp: number
  gold: number
  difficulty: string
  completed: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  '💪 체력':   'bg-[#C8E6C9] text-[#2E7D32]',
  '🧠 지력':   'bg-[#BBDEFB] text-[#1565C0]',
  '🧘 정신력': 'bg-[#E1BEE7] text-[#6A1B9A]',
  '⚡ 생산성': 'bg-[#FFF9C4] text-[#F57F17]',
}

const DIFFICULTY_DOT: Record<string, string> = {
  '쉬움':   'bg-[#A5D6A7]',
  '보통':   'bg-[#FFD54F]',
  '어려움': 'bg-[#EF9A9A]',
}

export default function RoutinesWidget() {
  const [routines, setRoutines]   = useState<Routine[]>([])
  const [loading, setLoading]     = useState(true)
  const [pending, setPending]     = useState<Set<string>>(new Set())
  const [toast, setToast]         = useState<{ msg: string; type: 'xp' | 'undo' } | null>(null)

  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token') ?? ''
    : ''

  const fetchRoutines = useCallback(async () => {
    if (!token) return
    try {
      const res  = await fetch(`/api/routines/list?token=${token}`)
      const json = await res.json()
      setRoutines(json.routines ?? [])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchRoutines()
    const interval = setInterval(fetchRoutines, 60_000)
    return () => clearInterval(interval)
  }, [fetchRoutines])

  const showToast = (msg: string, type: 'xp' | 'undo' = 'xp') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleToggle = async (routine: Routine) => {
    if (pending.has(routine.id)) return
    setPending(prev => new Set(prev).add(routine.id))

    // 낙관적 UI 업데이트
    setRoutines(prev =>
      prev.map(r => r.id === routine.id ? { ...r, completed: !r.completed } : r)
    )

    try {
      await fetch('/api/routines/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, routineId: routine.id, undo: routine.completed }),
      })

      if (!routine.completed) {
        showToast(`+${routine.xp} XP  +${routine.gold} 🪙`, 'xp')
      } else {
        showToast('완료 취소됨', 'undo')
      }
    } catch {
      // 실패 시 롤백
      setRoutines(prev =>
        prev.map(r => r.id === routine.id ? { ...r, completed: routine.completed } : r)
      )
    } finally {
      setPending(prev => { const s = new Set(prev); s.delete(routine.id); return s })
    }
  }

  const completed = routines.filter(r => r.completed).length
  const total     = routines.length

  if (loading) {
    return (
      <div className="widget-bg flex items-center justify-center p-6">
        <div className="text-2xl animate-pulse">📋</div>
      </div>
    )
  }

  return (
    <div className="widget-bg p-3 space-y-2 min-h-0">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#5C4033] uppercase tracking-wide">
          📋 오늘의 루틴
        </h3>
        <span className="text-xs text-[#A0845C] font-semibold">
          {completed}/{total}
        </span>
      </div>

      {/* 진행 바 */}
      {total > 0 && (
        <div className="h-1.5 bg-[#E8D5A3] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7BAE7F] rounded-full transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}

      {/* 루틴 목록 */}
      <div className="space-y-1.5">
        {routines.length === 0 ? (
          <div className="text-center py-5 text-[#A0845C] text-xs">
            <div className="text-2xl mb-1">🌱</div>
            루틴을 추가해보세요
          </div>
        ) : (
          routines.map(routine => (
            <button
              key={routine.id}
              onClick={() => handleToggle(routine)}
              disabled={pending.has(routine.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left
                transition-all duration-200 border
                ${routine.completed
                  ? 'bg-[#C8E6C9]/60 border-[#A5D6A7] opacity-70'
                  : 'bg-white/80 border-[#E8D5A3] hover:border-[#7BAE7F] hover:bg-[#F0FAF0]'
                }
                ${pending.has(routine.id) ? 'opacity-50' : ''}
              `}
            >
              {/* 체크박스 */}
              <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                ${routine.completed
                  ? 'bg-[#7BAE7F] border-[#7BAE7F]'
                  : 'border-[#C8D8C8] bg-white'
                }
              `}>
                {routine.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* 루틴 이름 */}
              <span className={`flex-1 text-sm font-medium ${routine.completed ? 'line-through text-[#A0A0A0]' : 'text-[#5C4033]'}`}>
                {routine.name}
              </span>

              {/* 카테고리 + XP */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[routine.category] ?? 'bg-[#F5F0E8] text-[#8B6914]'}`}>
                  {routine.category.split(' ')[0]}
                </span>
                <span className="text-[10px] font-bold text-[#7BAE7F]">+{routine.xp}</span>
              </div>

              {/* 난이도 점 */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${DIFFICULTY_DOT[routine.difficulty] ?? 'bg-[#FFD54F]'}`} />
            </button>
          ))
        )}
      </div>

      {/* 모두 완료 메시지 */}
      {total > 0 && completed === total && (
        <div className="text-center py-2 text-[#2E7D32] text-xs font-semibold bg-[#C8E6C9] rounded-lg">
          🎉 오늘 루틴 완료!
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`
          fixed bottom-4 left-1/2 -translate-x-1/2 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50
          ${toast.type === 'xp' ? 'bg-[#7BAE7F]' : 'bg-[#A0845C]'}
        `}>
          {toast.msg}
        </div>
      )}

    </div>
  )
}
