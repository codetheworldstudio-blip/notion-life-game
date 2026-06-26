'use client'

// ============================================================
// 상점 페이지
// 노션에 embed: /shop?token=xxx
// 골드로 아이템 구매 + 장착
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import { GAME_CONFIG } from '@/config/game'
import type { ShopItem, InventoryItem } from '@/types'

interface ShopData {
  items: ShopItem[]
  inventory: InventoryItem[]
  gold: number
  equippedItems: Record<string, string | null>
}

type Category = typeof GAME_CONFIG.shopCategories[number]['id'] | 'all'

export default function ShopPage() {
  const [data, setData]           = useState<ShopData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Category>('all')
  const [buying, setBuying]       = useState<string | null>(null)
  const [toast, setToast]         = useState<string | null>(null)

  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token')
    : null

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const res  = await fetch(`/api/shop?token=${token}`)
      const json = await res.json()
      setData(json)
    } catch {
      setError('상점을 불러올 수 없어요')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleBuy = async (item: ShopItem) => {
    if (!token || buying) return
    if ((data?.gold ?? 0) < item.price) {
      showToast('골드가 부족해요 🪙')
      return
    }
    setBuying(item.id)
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, itemId: item.id }),
      })
      if (!res.ok) throw new Error()
      showToast(`${item.name} 구매 완료! 🎉`)
      await fetchData()
    } catch {
      showToast('구매에 실패했어요')
    } finally {
      setBuying(null)
    }
  }

  const handleEquip = async (item: ShopItem) => {
    if (!token) return
    try {
      await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, itemId: item.id, category: item.category }),
      })
      showToast(`${item.name} 장착! ✨`)
      await fetchData()
    } catch {
      showToast('장착에 실패했어요')
    }
  }

  if (loading) {
    return (
      <div className="widget-bg min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-bounce">🏪</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="widget-bg min-h-screen flex items-center justify-center text-[#C4785A] text-sm">
        {error}
      </div>
    )
  }

  const ownedIds = new Set(data.inventory.map(i => i.itemId))
  const filteredItems = activeTab === 'all'
    ? data.items
    : data.items.filter(i => i.category === activeTab)

  return (
    <div className="widget-bg min-h-screen p-4 space-y-4">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#5C4033]">🏪 상점</h1>
        <div className="flex items-center gap-1 bg-[#FFF8E1] rounded-full px-3 py-1.5 text-sm font-semibold text-[#C4A35A] border border-[#E8D5A3]">
          <span>🪙</span>
          <span>{data.gold.toLocaleString()}</span>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>전체</TabButton>
        {GAME_CONFIG.shopCategories.map(cat => (
          <TabButton
            key={cat.id}
            active={activeTab === cat.id}
            onClick={() => setActiveTab(cat.id as Category)}
          >
            {cat.emoji} {cat.label}
          </TabButton>
        ))}
      </div>

      {/* 아이템 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const owned    = ownedIds.has(item.id)
          const equipped = data.equippedItems[item.category] === item.id
          const canAfford = data.gold >= item.price

          return (
            <div
              key={item.id}
              className={`
                bg-white/70 rounded-xl p-3 space-y-2 border transition-all
                ${equipped ? 'border-[#7BAE7F] ring-2 ring-[#7BAE7F]/30' : 'border-[#E8D5A3]'}
              `}
            >
              {/* 아이템 이미지 or 이모지 */}
              <div className="h-20 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-4xl">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} className="h-full object-contain" />
                  : getCategoryEmoji(item.category)
                }
              </div>

              {/* 이름 + 설명 */}
              <div>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-[#5C4033]">{item.name}</p>
                  {equipped && (
                    <span className="text-[10px] bg-[#C8E6C9] text-[#2E7D32] rounded-full px-1.5 py-0.5 shrink-0">
                      장착 중
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A0845C] leading-tight">{item.description}</p>
              </div>

              {/* 가격 + 버튼 */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C4A35A]">🪙 {item.price}</span>
                {owned ? (
                  <button
                    onClick={() => handleEquip(item)}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                      equipped
                        ? 'bg-[#E8D5A3] text-[#8B6914]'
                        : 'bg-[#7BAE7F] text-white hover:bg-[#5a8f5e]'
                    }`}
                  >
                    {equipped ? '해제' : '장착'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford || buying === item.id}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                      canAfford
                        ? 'bg-[#C4A35A] text-white hover:bg-[#a88748]'
                        : 'bg-[#E8D5A3] text-[#A0845C] cursor-not-allowed'
                    }`}
                  >
                    {buying === item.id ? '...' : '구매'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#5C4033] text-white text-sm px-4 py-2.5 rounded-full shadow-lg animate-fade-in z-50">
          {toast}
        </div>
      )}

    </div>
  )
}

function TabButton({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
        active
          ? 'bg-[#7BAE7F] text-white'
          : 'bg-white/60 text-[#8B6914] hover:bg-[#E8D5A3]'
      }`}
    >
      {children}
    </button>
  )
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    hat: '🎩', top: '👕', bottom: '👖', accessory: '💎', background: '🌅',
  }
  return map[category] ?? '📦'
}
