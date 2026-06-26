'use client'

// ============================================================
// 할일 위젯
// 노션에 embed: /widget/todos?token=xxx
// ============================================================

import { useEffect, useState, useCallback } from 'react'

interface Todo {
  id: string
  title: string
  completed: boolean
  xp: number
  gold: number
  date: string | null
}

export default function TodosWidget() {
  const [todos, setTodos]     = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [toast, setToast]     = useState<string | null>(null)

  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token') ?? ''
    : ''

  const fetchTodos = useCallback(async () => {
    if (!token) return
    try {
      const res  = await fetch(`/api/todos/list?token=${token}`)
      const json = await res.json()
      setTodos(json.todos ?? [])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchTodos()
    const interval = setInterval(fetchTodos, 60_000)
    return () => clearInterval(interval)
  }, [fetchTodos])

  const handleToggle = async (todo: Todo) => {
    if (pending.has(todo.id)) return
    setPending(prev => new Set(prev).add(todo.id))

    const next = !todo.completed
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: next } : t))

    try {
      await fetch('/api/todos/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, todoId: todo.id, completed: next }),
      })
      if (next && todo.xp > 0) {
        setToast(`+${todo.xp} XP  +${todo.gold} 🪙`)
        setTimeout(() => setToast(null), 2500)
      }
    } catch {
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: todo.completed } : t))
    } finally {
      setPending(prev => { const s = new Set(prev); s.delete(todo.id); return s })
    }
  }

  const done  = todos.filter(t => t.completed).length
  const total = todos.length

  if (loading) {
    return (
      <div className="widget-bg flex items-center justify-center p-6">
        <div className="text-2xl animate-pulse">📝</div>
      </div>
    )
  }

  return (
    <div className="widget-bg p-3 space-y-2">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#5C4033] uppercase tracking-wide">
          📝 오늘의 할 일
        </h3>
        {total > 0 && (
          <span className="text-xs text-[#A0845C]">{done}/{total}</span>
        )}
      </div>

      {/* 할일 목록 */}
      <div className="space-y-1.5">
        {todos.length === 0 ? (
          <div className="text-center py-4 text-[#A0845C] text-xs">
            <div className="text-xl mb-1">✨</div>
            할 일이 없어요
          </div>
        ) : (
          todos.map(todo => (
            <button
              key={todo.id}
              onClick={() => handleToggle(todo)}
              disabled={pending.has(todo.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left
                transition-all duration-200 border
                ${todo.completed
                  ? 'bg-[#FFF9C4]/60 border-[#F9E79F] opacity-60'
                  : 'bg-white/80 border-[#E8D5A3] hover:border-[#C4A35A] hover:bg-[#FFFBF0]'
                }
              `}
            >
              {/* 체크박스 */}
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                ${todo.completed
                  ? 'bg-[#C4A35A] border-[#C4A35A]'
                  : 'border-[#E8D5A3] bg-white'
                }
              `}>
                {todo.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* 제목 */}
              <span className={`flex-1 text-sm font-medium ${todo.completed ? 'line-through text-[#A0A0A0]' : 'text-[#5C4033]'}`}>
                {todo.title}
              </span>

              {/* XP */}
              {todo.xp > 0 && (
                <span className="text-[10px] font-bold text-[#C4A35A] shrink-0">
                  +{todo.xp}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#C4A35A] text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}

    </div>
  )
}
