// ============================================================
// 퀘스트 목록 API
// GET /api/quests?token=xxx
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

    const res = await notion.databases.query({
      database_id: dbIds.quests,
      filter: { property: '완료', checkbox: { equals: false } },
      sorts: [{ property: '유형', direction: 'ascending' }],
      page_size: 20,
    })

    const quests = (res.results as any[]).map(page => {
      const p      = page.properties
      const isHidden = p['히든']?.checkbox ?? false
      return {
        id:          page.id,
        name:        isHidden ? '???' : (p['퀘스트 이름']?.title?.[0]?.text?.content ?? ''),
        type:        p['유형']?.select?.name ?? '달성형',
        description: isHidden ? '조건을 달성하면 공개됩니다' : (p['조건']?.rich_text?.[0]?.text?.content ?? ''),
        rewardXp:    p['보상 XP']?.number ?? 0,
        rewardGold:  p['보상 골드']?.number ?? 0,
        progress:    p['현재 진행도']?.number ?? 0,
        target:      p['목표값']?.number ?? 1,
        isHidden,
      }
    })

    return NextResponse.json({ quests })

  } catch (err) {
    console.error('퀘스트 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
