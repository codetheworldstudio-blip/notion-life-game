// ============================================================
// 아이템 장착/해제 API
// POST /api/shop/equip  { token, itemId, category }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import type { NotionDatabaseIds } from '@/types'

const CATEGORY_PROP: Record<string, string> = {
  hat:        '장착 모자',
  top:        '장착 상의',
  bottom:     '장착 하의',
  accessory:  '장착 액세서리',
  background: '장착 배경',
}

export async function POST(req: NextRequest) {
  const { token, itemId, category } = await req.json()
  if (!token || !itemId || !category) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)
    const dbIds  = user.db_ids as NotionDatabaseIds

    const prop = CATEGORY_PROP[category]
    if (!prop) return NextResponse.json({ error: 'unknown category' }, { status: 400 })

    // 캐릭터 페이지 가져오기
    const charRes  = await notion.databases.query({ database_id: dbIds.character, page_size: 1 })
    const charPage = charRes.results[0] as any

    const currentEquipped = charPage.properties[prop]?.rich_text?.[0]?.text?.content ?? null

    // 이미 장착 중이면 해제, 아니면 장착
    const newValue = currentEquipped === itemId ? '' : itemId

    await notion.pages.update({
      page_id: charPage.id,
      properties: {
        [prop]: { rich_text: newValue ? [{ text: { content: newValue } }] : [] },
      },
    })

    return NextResponse.json({ success: true, equipped: !!newValue })

  } catch (err) {
    console.error('장착 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
