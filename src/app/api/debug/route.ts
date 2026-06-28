// 디버그용 — 배포 후 삭제 예정
// GET /api/debug?token=xxx

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import type { NotionDatabaseIds } from '@/types'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' })

  const result: Record<string, any> = {}

  try {
    // 1. Supabase 유저 조회
    const user = await getUserByWidgetToken(token)
    result.user = {
      notion_user_id: user.notion_user_id,
      workspace_id:   user.workspace_id,
      has_access_token: !!user.access_token,
      db_ids: user.db_ids,
    }

    const notion = createNotionClient(user.access_token)
    const dbIds  = user.db_ids as NotionDatabaseIds

    // 2. 루틴 DB 조회 테스트
    try {
      const routines = await notion.databases.query({
        database_id: dbIds.routines,
        page_size: 10,
      })
      result.routines = {
        count: routines.results.length,
        properties: routines.results.length > 0
          ? Object.entries((routines.results[0] as any).properties).map(([k, v]: [string, any]) => ({
              name: k, type: v.type, value: v.type === 'checkbox' ? v.checkbox : '...'
            }))
          : [],
      }
    } catch (e: any) {
      result.routines_error = e.message
    }

    // 3. 캐릭터 DB 조회 테스트
    try {
      const char = await notion.databases.query({
        database_id: dbIds.character,
        page_size: 1,
      })
      const props = (char.results[0] as any)?.properties
      result.character = {
        level: props?.['레벨']?.number,
        xp:    props?.['총 XP']?.number,
        gold:  props?.['보유 골드']?.number,
      }
    } catch (e: any) {
      result.character_error = e.message
    }

  } catch (e: any) {
    result.error = e.message
  }

  return NextResponse.json(result, { status: 200 })
}
