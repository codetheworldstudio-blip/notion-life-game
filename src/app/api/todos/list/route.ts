// ============================================================
// 할일 목록 API
// GET /api/todos/list?token=xxx
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

    const res = await notion.databases.query({
      database_id: dbIds.todos,
      filter: {
        or: [
          { property: '날짜', date: { equals: today } },
          { property: '날짜', date: { is_empty: true } },
        ],
      },
      sorts: [{ property: '완료', direction: 'ascending' }],
      page_size: 20,
    })

    const todos = (res.results as any[]).map(page => {
      const p = page.properties
      return {
        id:        page.id,
        title:     p['할 일']?.title?.[0]?.text?.content ?? '',
        completed: p['완료']?.checkbox ?? false,
        xp:        p['XP']?.number ?? 0,
        gold:      p['골드']?.number ?? 0,
        date:      p['날짜']?.date?.start ?? null,
      }
    })

    return NextResponse.json({ todos })

  } catch (err) {
    console.error('할일 목록 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
