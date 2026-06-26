// ============================================================
// 상점 데이터 API
// GET /api/shop?token=xxx
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import type { NotionDatabaseIds } from '@/types'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)
    const dbIds  = user.db_ids as NotionDatabaseIds

    // 캐릭터 DB에서 골드 + 장착 아이템 가져오기
    const charRes = await notion.databases.query({ database_id: dbIds.character, page_size: 1 })
    const charProps = (charRes.results[0] as any)?.properties ?? {}
    const gold = charProps['보유 골드']?.number ?? 0
    const equippedItems = {
      hat:        charProps['장착 모자']?.rich_text?.[0]?.text?.content ?? null,
      top:        charProps['장착 상의']?.rich_text?.[0]?.text?.content ?? null,
      bottom:     charProps['장착 하의']?.rich_text?.[0]?.text?.content ?? null,
      accessory:  charProps['장착 액세서리']?.rich_text?.[0]?.text?.content ?? null,
      background: charProps['장착 배경']?.rich_text?.[0]?.text?.content ?? null,
    }

    // 상점 아이템 목록
    const shopRes = await notion.databases.query({ database_id: dbIds.shopItems, page_size: 50 })
    const items = (shopRes.results as any[]).map(page => {
      const p = page.properties
      return {
        id:          page.id,
        name:        p['아이템 이름']?.title?.[0]?.text?.content ?? '',
        category:    normCategory(p['카테고리']?.select?.name ?? ''),
        price:       p['가격 (골드)']?.number ?? 0,
        description: p['설명']?.rich_text?.[0]?.text?.content ?? '',
        imageUrl:    p['이미지 URL']?.url ?? null,
      }
    })

    // 인벤토리
    const invRes = await notion.databases.query({ database_id: dbIds.inventory, page_size: 100 })
    const inventory = (invRes.results as any[]).map(page => {
      const p = page.properties
      return {
        id:          page.id,
        itemId:      page.id,
        item:        null,
        purchasedAt: page.created_time,
        isEquipped:  p['장착 중']?.checkbox ?? false,
      }
    })

    return NextResponse.json({ items, inventory, gold, equippedItems })

  } catch (err) {
    console.error('상점 API 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

function normCategory(label: string): string {
  if (label.includes('모자')) return 'hat'
  if (label.includes('상의')) return 'top'
  if (label.includes('하의')) return 'bottom'
  if (label.includes('액세서리')) return 'accessory'
  if (label.includes('배경')) return 'background'
  return 'hat'
}
