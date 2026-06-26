'use client'

// ============================================================
// 캐릭터 일러스트 컴포넌트
// 진화 단계별로 다른 SVG 캐릭터를 보여줌
// ============================================================

interface Props {
  stage: number
  level: number
  equippedItems: {
    hat: string | null
    background: string | null
  }
  customization: {
    skinColor: string
    hairColor: string
    hairStyle: number
  } | null
}

// 기본 색상
const DEFAULT_SKIN  = '#F5D5B0'
const DEFAULT_HAIR  = '#5C4033'
const DEFAULT_GRASS = '#7BAE7F'

export function CharacterDisplay({ stage, level, equippedItems, customization }: Props) {
  const skin     = customization?.skinColor ?? DEFAULT_SKIN
  const hair     = customization?.hairColor ?? DEFAULT_HAIR
  const bgColor  = getBgColor(equippedItems?.background)
  const stageEmoji = getStageEmoji(stage)

  return (
    <div className="relative flex justify-center">
      {/* 배경 원 */}
      <div
        className="w-44 h-44 rounded-full flex items-center justify-center relative overflow-hidden shadow-inner"
        style={{ background: bgColor }}
      >
        {/* 풀밭 */}
        <svg viewBox="0 0 176 176" className="absolute inset-0 w-full h-full">
          <ellipse cx="88" cy="155" rx="70" ry="18" fill={DEFAULT_GRASS} opacity="0.4" />
          {/* 풀잎 장식 */}
          <path d="M30 150 Q28 130 35 125 Q38 135 30 150" fill={DEFAULT_GRASS} opacity="0.6" />
          <path d="M140 148 Q145 128 138 122 Q135 132 140 148" fill={DEFAULT_GRASS} opacity="0.6" />
          <path d="M60 152 Q58 138 63 133 Q66 141 60 152" fill={DEFAULT_GRASS} opacity="0.5" />
          <path d="M115 150 Q118 136 113 131 Q110 139 115 150" fill={DEFAULT_GRASS} opacity="0.5" />
        </svg>

        {/* 캐릭터 SVG */}
        <CharacterSVG stage={stage} skin={skin} hair={hair} level={level} />

        {/* 장착 모자 (단순 이모지 오버레이 — 추후 이미지로 교체) */}
        {equippedItems?.hat && (
          <div className="absolute top-2 text-2xl" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))' }}>
            {getHatEmoji(equippedItems.hat)}
          </div>
        )}
      </div>

      {/* 진화 단계 뱃지 */}
      <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md text-base border-2 border-[#E8D5A3]">
        {stageEmoji}
      </div>
    </div>
  )
}

// ── 단계별 캐릭터 SVG ─────────────────────────────────────────
function CharacterSVG({ stage, skin, hair, level }: { stage: number; skin: string; hair: string; level: number }) {
  // 진화 단계에 따라 장식 요소 추가
  const hasGlow    = stage >= 4
  const hasLeaves  = stage >= 2
  const hasCrown   = stage >= 3

  return (
    <svg viewBox="0 0 80 100" className="w-24 h-28 relative z-10">
      {/* 오라 (4단계+) */}
      {hasGlow && (
        <ellipse cx="40" cy="50" rx="35" ry="45" fill="#9FC5E8" opacity="0.15" />
      )}

      {/* 몸통 */}
      <rect x="27" y="52" width="26" height="30" rx="8" fill={skin} />

      {/* 옷 (단계별) */}
      {stage === 1 && <rect x="27" y="56" width="26" height="26" rx="8" fill="#A8D8A8" opacity="0.8" />}
      {stage === 2 && <rect x="27" y="56" width="26" height="26" rx="8" fill="#7BAE7F" opacity="0.85" />}
      {stage === 3 && <rect x="25" y="54" width="30" height="28" rx="10" fill="#5A8F5E" opacity="0.9" />}
      {stage === 4 && <rect x="24" y="53" width="32" height="29" rx="11" fill="#3D6B41" opacity="0.9" />}
      {stage === 5 && <rect x="23" y="52" width="34" height="30" rx="12" fill="#2C4F30" opacity="0.95" />}

      {/* 팔 */}
      <rect x="16" y="55" width="12" height="18" rx="6" fill={skin} />
      <rect x="52" y="55" width="12" height="18" rx="6" fill={skin} />

      {/* 다리 */}
      <rect x="29" y="78" width="9" height="16" rx="4" fill={skin} />
      <rect x="42" y="78" width="9" height="16" rx="4" fill={skin} />
      <rect x="29" y="88" width="9" height="8" rx="3" fill="#5C4033" />
      <rect x="42" y="88" width="9" height="8" rx="3" fill="#5C4033" />

      {/* 머리 */}
      <circle cx="40" cy="40" r="18" fill={skin} />

      {/* 머리카락 */}
      <path d={`M22 38 Q22 18 40 18 Q58 18 58 38`} fill={hair} />
      <path d="M22 38 Q20 30 24 26" fill={hair} />
      <path d="M58 38 Q60 30 56 26" fill={hair} />

      {/* 눈 */}
      <circle cx="34" cy="40" r="2.5" fill="#5C4033" />
      <circle cx="46" cy="40" r="2.5" fill="#5C4033" />
      <circle cx="34.8" cy="39.2" r="0.8" fill="white" />
      <circle cx="46.8" cy="39.2" r="0.8" fill="white" />

      {/* 볼 */}
      <circle cx="30" cy="44" r="3" fill="#F4A0A0" opacity="0.5" />
      <circle cx="50" cy="44" r="3" fill="#F4A0A0" opacity="0.5" />

      {/* 입 */}
      <path d="M36 47 Q40 50 44 47" stroke="#A07060" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* 왕관 (3단계+) */}
      {hasCrown && (
        <g>
          <path d="M28 25 L32 18 L36 24 L40 16 L44 24 L48 18 L52 25 Z" fill="#C4A35A" opacity="0.9" />
          <circle cx="40" cy="16" r="2" fill="#9FC5E8" />
        </g>
      )}

      {/* 잎사귀 장식 (2단계+) */}
      {hasLeaves && (
        <g>
          <path d="M18 52 Q12 45 16 40 Q20 45 18 52" fill="#7BAE7F" opacity="0.8" />
          <path d="M62 52 Q68 45 64 40 Q60 45 62 52" fill="#7BAE7F" opacity="0.8" />
        </g>
      )}

      {/* 5단계 빛 효과 */}
      {stage === 5 && (
        <>
          <circle cx="40" cy="38" r="20" fill="none" stroke="#C4A35A" strokeWidth="0.8" opacity="0.4" />
          <path d="M40 12 L42 8 L40 4 L38 8 Z" fill="#C4A35A" opacity="0.6" />
          <path d="M58 30 L63 28 L65 24 L61 27 Z" fill="#C4A35A" opacity="0.6" />
          <path d="M22 30 L17 28 L15 24 L19 27 Z" fill="#C4A35A" opacity="0.6" />
        </>
      )}

      {/* 레벨 숫자 (캐릭터 아래) */}
      <text x="40" y="99" textAnchor="middle" fontSize="8" fill="#8B6914" fontWeight="bold">
        Lv.{level}
      </text>
    </svg>
  )
}

// ── 유틸 ──────────────────────────────────────────────────────
function getBgColor(background: string | null | undefined): string {
  const map: Record<string, string> = {
    forest:  'linear-gradient(180deg, #C8E6C9 0%, #F5F0E8 100%)',
    night:   'linear-gradient(180deg, #1a1a3e 0%, #2d2d5e 100%)',
    sakura:  'linear-gradient(180deg, #FFD6D6 0%, #FFF0F0 100%)',
    ocean:   'linear-gradient(180deg, #B3E5FC 0%, #E8F5E9 100%)',
    sunset:  'linear-gradient(180deg, #FFCCBC 0%, #FFF8E1 100%)',
  }
  return map[background ?? ''] ?? 'linear-gradient(180deg, #C8E6C9 0%, #F5F0E8 100%)'
}

function getStageEmoji(stage: number): string {
  return ['🌱', '🍃', '🌿', '🌳', '✨'][stage - 1] ?? '🌱'
}

function getHatEmoji(hat: string): string {
  const map: Record<string, string> = {
    flower: '🌸',
    mushroom: '🍄',
    leaf: '🍃',
    wizard: '🎩',
    crown: '👑',
  }
  return map[hat] ?? '🎩'
}
