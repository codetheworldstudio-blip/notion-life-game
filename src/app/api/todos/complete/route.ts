// ============================================================
// 할일 완료 처리 API
// POST /api/todos/complete  { token, todoId, completed }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'

export async function POST(req: NextRequest) {
  const { token, todoId, completed } = await req.json()
  if (!token || !todoId) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)

    await notion.pages.update({
      page_id: todoId,
      properties: { '완료': { checkbox: completed ?? true } },
    })

    // XP 반영
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await fetch(`${appUrl}/api/sync?token=${token}`, { method: 'POST' })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('할일 완료 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
