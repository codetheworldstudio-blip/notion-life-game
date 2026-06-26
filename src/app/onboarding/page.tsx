'use client'

// ============================================================
// 온보딩 페이지
// OAuth 완료 후 → 캐릭터 이름 입력 → 노션 DB 자동 생성
// URL: /onboarding?token=xxx
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'name' | 'creating' | 'done'

export default function OnboardingPage() {
  const router = useRouter()
  const token  = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token') ?? ''
    : ''

  const [step, setStep]       = useState<Step>('name')
  const [charName, setCharName] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [widgetUrl, setWidgetUrl] = useState<{
    character: string; routines: string; todos: string
    quests: string; feed: string; shop: string
  } | null>(null)

  const handleStart = async () => {
    if (!charName.trim()) {
      setError('캐릭터 이름을 입력해주세요')
      return
    }
    setError(null)
    setStep('creating')

    try {
      // DB 생성 + 캐릭터 초기화 API 호출
      const res = await fetch('/api/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, characterName: charName.trim() }),
      })

      if (!res.ok) throw new Error('설정 실패')

      // 진행 애니메이션 (DB 9개 생성하는 동안)
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise(r => setTimeout(r, 300))
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      setWidgetUrl({
        character: `${appUrl}/widget/character?token=${token}`,
        routines:  `${appUrl}/widget/routines?token=${token}`,
        todos:     `${appUrl}/widget/todos?token=${token}`,
        quests:    `${appUrl}/widget/quests?token=${token}`,
        feed:      `${appUrl}/widget/feed?token=${token}`,
        shop:      `${appUrl}/shop?token=${token}`,
      })
      setStep('done')

    } catch {
      setError('설정 중 오류가 발생했어요. 다시 시도해주세요.')
      setStep('name')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-6">
      <div className="max-w-md w-full">

        {/* STEP 1 — 이름 입력 */}
        {step === 'name' && (
          <div className="space-y-6 text-center">
            <div className="text-6xl">🌱</div>
            <div>
              <h1 className="text-2xl font-bold text-[#5C4033]">어서오세요, 모험가님!</h1>
              <p className="text-[#A0845C] mt-2 text-sm">
                노션 워크스페이스에 게임 데이터베이스를<br />자동으로 만들어 드릴게요
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-sm font-semibold text-[#5C4033]">캐릭터 이름</label>
              <input
                type="text"
                value={charName}
                onChange={e => setCharName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="나만의 캐릭터 이름을 지어주세요"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#E8D5A3] bg-white/80 text-[#5C4033] placeholder-[#C4B090] focus:outline-none focus:border-[#7BAE7F] transition-colors"
              />
              {error && <p className="text-[#C4785A] text-xs">{error}</p>}
            </div>

            <button
              onClick={handleStart}
              disabled={!charName.trim()}
              className="w-full py-3 bg-[#7BAE7F] text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-[#5a8f5e] transition-colors"
            >
              모험 시작하기 🌿
            </button>

            {/* 생성될 것들 미리보기 */}
            <div className="bg-white/60 rounded-xl p-4 text-left space-y-1.5 border border-[#E8D5A3]">
              <p className="text-xs font-semibold text-[#8B6914] mb-2">노션에 자동으로 만들어지는 것들</p>
              {[
                '🎮 캐릭터 DB',
                '📋 루틴 목록',
                '✅ 완료 기록',
                '📝 할 일',
                '🗺️ 퀘스트',
                '🏷️ 칭호 도감',
                '🎒 칭호 보관함',
                '🏪 상점 아이템',
                '👜 인벤토리',
              ].map(item => (
                <p key={item} className="text-xs text-[#A0845C]">• {item}</p>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — 생성 중 */}
        {step === 'creating' && (
          <div className="space-y-6 text-center">
            <div className="text-6xl animate-spin" style={{ animationDuration: '3s' }}>🌿</div>
            <div>
              <h2 className="text-xl font-bold text-[#5C4033]">노션 설정 중...</h2>
              <p className="text-[#A0845C] text-sm mt-1">데이터베이스를 만들고 있어요</p>
            </div>

            {/* 진행 바 */}
            <div className="h-3 bg-[#E8D5A3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7BAE7F] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-[#8B6914] font-semibold">{progress}%</p>
          </div>
        )}

        {/* STEP 3 — 완료 */}
        {step === 'done' && widgetUrl && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-[#5C4033]">준비 완료!</h2>
              <p className="text-[#A0845C] text-sm">
                노션에 데이터베이스가 생성됐어요.<br />
                아래 URL을 노션 페이지에 임베드하세요.
              </p>
            </div>

            {/* 위젯 URL 카드들 */}
            <p className="text-xs font-semibold text-[#8B6914]">📌 왼쪽 열</p>
            <UrlCard title="🎮 캐릭터 + 스탯" url={widgetUrl.character} description="캐릭터, 레벨, 스탯 표시" />
            <UrlCard title="🌿 활동 피드"     url={widgetUrl.feed}      description="오늘 완료한 활동 자동 표시" />

            <p className="text-xs font-semibold text-[#8B6914]">📌 가운데 열</p>
            <UrlCard title="📋 루틴 위젯"     url={widgetUrl.routines}  description="체크박스로 완료 처리" />
            <UrlCard title="📝 할일 위젯"     url={widgetUrl.todos}     description="오늘의 할 일 + 완료 처리" />
            <UrlCard title="🗺️ 퀘스트 위젯"  url={widgetUrl.quests}    description="퀘스트 진행도 표시" />

            <p className="text-xs font-semibold text-[#8B6914]">📌 별도 페이지</p>
            <UrlCard
              title="🏪 상점 페이지"
              url={widgetUrl.shop}
              description="별도 페이지로 링크 연결"
            />

            {/* 임베드 방법 안내 */}
            <div className="bg-[#FFF8E1] rounded-xl p-4 border border-[#E8D5A3] text-xs text-[#8B6914] space-y-1.5">
              <p className="font-semibold">📌 노션 임베드 방법</p>
              <p>1. 노션 페이지에서 <code className="bg-[#E8D5A3] px-1 rounded">/embed</code> 입력</p>
              <p>2. 위 URL 붙여넣기</p>
              <p>3. 블록 크기 조절 완료!</p>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 bg-[#E8D5A3] text-[#5C4033] rounded-xl font-semibold hover:bg-[#d4c090] transition-colors text-sm"
            >
              홈으로
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function UrlCard({ title, url, description }: { title: string; url: string; description: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white/70 rounded-xl p-3 border border-[#E8D5A3] space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#5C4033]">{title}</p>
        <button
          onClick={copy}
          className="text-xs px-2.5 py-1 bg-[#7BAE7F] text-white rounded-lg hover:bg-[#5a8f5e] transition-colors"
        >
          {copied ? '복사됨 ✓' : '복사'}
        </button>
      </div>
      <p className="text-[11px] text-[#A0845C] truncate font-mono bg-[#F5F0E8] px-2 py-1 rounded">{url}</p>
      <p className="text-[11px] text-[#A0845C]">{description}</p>
    </div>
  )
}
