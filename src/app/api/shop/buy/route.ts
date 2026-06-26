// ============================================================
// 아이템 구매 API
// POST /api/shop/buy  { token, itemId }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import type { NotionDatabaseIds } from '@/types'

export async function POST(req: NextRequest) {
  const { token, itemId } = await req.json()
  if (!token || !itemId) return NextResponse.json({ error: 'invalid params' }, { status: 400 })

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)
    const dbIds  = user.db_ids as NotionDatabaseIds

    // 아이템 가격 조회
    const itemPage = await notion.pages.retrieve({ page_id: itemId }) as any
    const price    = itemPage.properties['가격 (골드)']?.number ?? 0
    const itemName = itemPage.properties['아이템 이름']?.title?.[0]?.text?.content ?? '아이템'
    const category = itemPage.properties['카테고리']?.select?.name ?? ''

    // 캐릭터 골드 확인
    const charRes = await notion.databases.query({ database_id: dbIds.character, page_size: 1 })
    const charPage = charRes.results[0] as any
    const charProps = charPage.properties
    const currentGold = charProps['보유 골드']?.number ?? 0

    if (currentGold < price) {
      return NextResponse.json({ error: '골드 부족' }, { status: 400 })
    }

    // 골드 차감
    await notion.pages.update({
      page_id: charPage.id,
      properties: { '보유 골드': { number: currentGold - price } },
    })

    // 인벤토리에 추가
    await notion.pages.create({
      parent: { database_id: dbIds.inventory },
      properties: {
        '아이템 이름': { title: [{ text: { content: itemName } }] },
        '카테고리':    { select: { name: category } },
        '구매일':      { date: { start: new Date().toISOString().split('T')[0] } },
        '장착 중':     { checkbox: false },
      },
    })

    return NextResponse.json({ success: true, remainingGold: currentGold - price })

  } catch (err) {
    console.error('구매 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
