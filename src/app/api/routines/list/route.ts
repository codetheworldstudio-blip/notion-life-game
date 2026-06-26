// ============================================================
// 루틴 목록 + 오늘 완료 여부 API
// GET /api/routines/list?token=xxx
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
    const today  = new Date().toISOString().split('T')[0]

    // 루틴 목록
    const routineRes = await notion.databases.query({
      database_id: dbIds.routines,
      page_size: 20,
    })

    // 오늘 완료된 루틴 이름 목록
    const completionRes = await notion.databases.query({
      database_id: dbIds.completions,
      filter: {
        and: [
          { property: '날짜', date:     { equals: today } },
          { property: '완료', checkbox: { equals: true  } },
        ],
      },
      page_size: 50,
    })

    const completedNames = new Set(
      (completionRes.results as any[]).map(p =>
        p.properties['제목']?.title?.[0]?.text?.content ?? ''
      )
    )

    const routines = (routineRes.results as any[]).map(page => {
      const p    = page.properties
      const name = p['루틴 이름']?.title?.[0]?.text?.content ?? ''
      return {
        id:         page.id,
        name,
        category:   p['카테고리']?.select?.name ?? '',
        xp:         p['XP']?.number ?? 0,
        gold:       p['골드']?.number ?? 0,
        difficulty: p['난이도']?.select?.name ?? '보통',
        completed:  completedNames.has(name),
      }
    })

    return NextResponse.json({ routines })

  } catch (err) {
    console.error('루틴 목록 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
