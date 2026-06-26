// ============================================================
// 루틴 완료 처리 API
// POST /api/routines/complete  { token, routineId, date }
// 완료 기록 DB에 row 생성 → sync API 호출 → XP 반영
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import type { NotionDatabaseIds } from '@/types'

export async function POST(req: NextRequest) {
  const { token, routineId, undo } = await req.json()
  if (!token || !routineId) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)
    const dbIds  = user.db_ids as NotionDatabaseIds
    const today  = new Date().toISOString().split('T')[0]

    // 루틴 정보 가져오기
    const routinePage = await notion.pages.retrieve({ page_id: routineId }) as any
    const props       = routinePage.properties
    const name        = props['루틴 이름']?.title?.[0]?.text?.content ?? '루틴'
    const xp          = props['XP']?.number ?? 30
    const gold        = props['골드']?.number ?? Math.floor(xp * 0.6)
    const category    = props['카테고리']?.select?.name ?? '⚡ 생산성'

    if (undo) {
      // 완료 취소 — 오늘 해당 루틴의 완료 기록 삭제
      const existing = await notion.databases.query({
        database_id: dbIds.completions,
        filter: {
          and: [
            { property: '날짜', date:      { equals: today    } },
            { property: '완료', checkbox:  { equals: true     } },
            { property: '제목', rich_text: { contains: name   } },
          ],
        },
        page_size: 1,
      })
      if (existing.results.length) {
        await notion.pages.update({
          page_id: existing.results[0].id,
          properties: { '완료': { checkbox: false } },
        })
      }
      return NextResponse.json({ success: true, action: 'undo' })
    }

    // 완료 기록 추가
    await notion.pages.create({
      parent: { database_id: dbIds.completions },
      properties: {
        '제목':      { title:     [{ text: { content: name } }] },
        '날짜':      { date:      { start: today } },
        '완료':      { checkbox:  true },
        '카테고리':  { select:    { name: category } },
        '획득 XP':   { number:    xp },
        '획득 골드': { number:    gold },
      },
    })

    // XP 즉시 반영 (sync 호출)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await fetch(`${appUrl}/api/sync?token=${token}`, { method: 'POST' })

    return NextResponse.json({ success: true, earnedXp: xp, earnedGold: gold })

  } catch (err) {
    console.error('루틴 완료 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
