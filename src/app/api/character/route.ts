// ============================================================
// 캐릭터 데이터 API
// GET /api/character?token=xxx
// 위젯이 60초마다 폴링해서 최신 상태 가져옴
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import { calcLevel, calcXpToNext, calcProgress, getEvolutionStage, calcStatLevel } from '@/lib/game/xp'
import type { NotionDatabaseIds } from '@/types'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  try {
    // 1. 위젯 토큰으로 유저 찾기
    const user = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)
    const dbIds = user.db_ids as NotionDatabaseIds

    // 2. 캐릭터 DB에서 데이터 가져오기
    const charResponse = await notion.databases.query({
      database_id: dbIds.character,
      page_size: 1,
    })

    if (!charResponse.results.length) {
      return NextResponse.json({ error: 'character not found' }, { status: 404 })
    }

    const charPage = charResponse.results[0] as any
    const props = charPage.properties

    const totalXp        = props['총 XP']?.number ?? 0
    const gold           = props['보유 골드']?.number ?? 0
    const strengthXp     = props['💪 체력 XP']?.number ?? 0
    const intelligenceXp = props['🧠 지력 XP']?.number ?? 0
    const mindXp         = props['🧘 정신력 XP']?.number ?? 0
    const productivityXp = props['⚡ 생산성 XP']?.number ?? 0

    const level     = calcLevel(totalXp)
    const xpToNext  = calcXpToNext(totalXp)
    const progress  = calcProgress(totalXp)
    const evolution = getEvolutionStage(level)

    // 3. 응답
    return NextResponse.json({
      name:      props['캐릭터 이름']?.title?.[0]?.text?.content ?? '모험가',
      totalXp,
      level,
      xpToNext,
      progress,
      gold,
      evolution,
      equippedTitle: props['장착 칭호']?.rich_text?.[0]?.text?.content ?? null,
      equippedItems: {
        hat:        props['장착 모자']?.rich_text?.[0]?.text?.content ?? null,
        top:        props['장착 상의']?.rich_text?.[0]?.text?.content ?? null,
        bottom:     props['장착 하의']?.rich_text?.[0]?.text?.content ?? null,
        accessory:  props['장착 액세서리']?.rich_text?.[0]?.text?.content ?? null,
        background: props['장착 배경']?.rich_text?.[0]?.text?.content ?? null,
      },
      customization: user.customization,
      stats: {
        strength:     { xp: strengthXp,     level: calcStatLevel(strengthXp)     },
        intelligence: { xp: intelligenceXp, level: calcStatLevel(intelligenceXp) },
        mind:         { xp: mindXp,         level: calcStatLevel(mindXp)         },
        productivity: { xp: productivityXp, level: calcStatLevel(productivityXp) },
      },
    })

  } catch (err) {
    console.error('캐릭터 API 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
