'use client'

// ============================================================
// 스탯 패널 컴포넌트
// 4가지 스탯을 미니 바로 표시
// ============================================================

import { GAME_CONFIG } from '@/config/game'

interface StatData {
  xp: number
  level: number
}

interface Props {
  stats: {
    strength:     StatData
    intelligence: StatData
    mind:         StatData
    productivity: StatData
  }
}

export function StatsPanel({ stats }: Props) {
  const statList = GAME_CONFIG.stats.list

  return (
    <div className="bg-white/60 backdrop-blur rounded-xl p-3 space-y-2 border border-[#E8D5A3]">
      <h3 className="text-xs font-semibold text-[#8B6914] uppercase tracking-wide">능력치</h3>
      <div className="grid grid-cols-2 gap-2">
        {statList.map((stat) => {
          const data  = stats[stat.id as keyof typeof stats]
          const level = data?.level ?? 1
          const pct   = ((level - 1) / (GAME_CONFIG.stats.maxLevel - 1)) * 100
          const title = GAME_CONFIG.stats.titles[stat.id as keyof typeof GAME_CONFIG.stats.titles]
          const titleName = title[Math.min(Math.floor((level - 1) / 2), title.length - 1)]

          return (
            <div key={stat.id} className="space-y-1">
              {/* 아이콘 + 이름 + 레벨 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5C4033] flex items-center gap-1">
                  <span>{stat.symbol}</span>
                  <span>{stat.label}</span>
                </span>
                <span className="text-xs font-bold text-[#8B6914]">Lv.{level}</span>
              </div>

              {/* 미니 바 */}
              <div className="h-1.5 bg-[#E8D5A3] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: stat.color,
                  }}
                />
              </div>

              {/* 스탯 칭호 */}
              <p className="text-[10px] text-[#A0845C] truncate">{titleName}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
