import { getNotionOAuthUrl } from '@/lib/notion/client'

export default function Home() {
  const oauthUrl = getNotionOAuthUrl()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#F5F0E8] p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🌿</div>
        <h1 className="text-3xl font-bold text-[#5C4033]">
          노션 인생게임
        </h1>
        <p className="text-[#8B6914] text-lg">
          루틴을 완료하며 나만의 캐릭터를 키우는<br />자기관리 RPG
        </p>
        <a
          href={oauthUrl}
          className="block w-full py-3 px-6 bg-[#7BAE7F] text-white rounded-xl font-semibold hover:bg-[#5a8f5e] transition-colors"
        >
          노션으로 시작하기
        </a>
        <p className="text-sm text-[#A0845C]">
          노션 계정이 필요합니다
        </p>
      </div>
    </main>
  )
}
