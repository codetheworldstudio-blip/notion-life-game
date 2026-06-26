'use client'

// ============================================================
// XP 진행 바 컴포넌트
// ============================================================

interface Props {
  level: number
  progress: number      // 0~1
  xpToNext: number
  evolutionName: string
  evolutionEmoji: string
}

export function XpBar({ level, progress, xpToNext, evolutionName, evolutionEmoji }: Props) {
  const pct = Math.round(progress * 100)

  return (
    <div className="space-y-1.5">
      {/* 레벨 + 진화 이름 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-[#5C4033]">Lv.{level}</span>
          <span className="text-xs text-[#A0845C]">{evolutionEmoji} {evolutionName}</span>
        </div>
        <span className="text-xs text-[#A0845C]">다음 레벨까지 {xpToNext} XP</span>
      </div>

      {/* XP 바 */}
      <div className="h-3 bg-[#E8D5A3] rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #7BAE7F, #A8D8A8)',
          }}
        />
      </div>

      {/* 퍼센트 */}
      <p className="text-right text-xs text-[#A0845C]">{pct}%</p>
    </div>
  )
}
