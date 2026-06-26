// ============================================================
// 활동 피드 API
// GET /api/feed?token=xxx
// 오늘 완료한 루틴/할일 + 최근 5개 이벤트 반환
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import type { NotionDatabaseIds, FeedItem } from '@/types'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)
    const dbIds  = user.db_ids as NotionDatabaseIds

    const today      = new Date().toISOString().split('T')[0]
    const feed: FeedItem[] = []

    // ── 오늘 완료한 루틴 ──────────────────────────────────────
    const completions = await notion.databases.query({
      database_id: dbIds.completions,
      filter: {
        and: [
          { property: '날짜',  date:     { equals: today } },
          { property: '완료',  checkbox: { equals: true  } },
        ],
      },
      sorts: [{ property: '날짜', direction: 'descending' }],
      page_size: 10,
    })

    for (const page of completions.results as any[]) {
      const props   = page.properties
      const name    = props['제목']?.title?.[0]?.text?.content ?? '루틴'
      const xp      = props['획득 XP']?.number ?? 0
      const gold    = props['획득 골드']?.number ?? 0
      const category = props['카테고리']?.select?.name ?? ''

      feed.push({
        id:         page.id,
        type:       'routine',
        message:    `${categoryEmoji(category)} ${name} 완료!`,
        earnedXp:   xp,
        earnedGold: gold,
        timestamp:  page.created_time,
      })
    }

    // ── 오늘 완료한 할 일 ────────────────────────────────────
    const todos = await notion.databases.query({
      database_id: dbIds.todos,
      filter: {
        and: [
          { property: '날짜', date:     { equals: today } },
          { property: '완료', checkbox: { equals: true  } },
        ],
      },
      page_size: 5,
    })

    for (const page of todos.results as any[]) {
      const props = page.properties
      const title = props['할 일']?.title?.[0]?.text?.content ?? '할 일'
      const xp    = props['XP']?.number ?? 0
      const gold  = props['골드']?.number ?? 0

      feed.push({
        id:         page.id,
        type:       'todo',
        message:    `📝 ${title} 완료!`,
        earnedXp:   xp,
        earnedGold: gold,
        timestamp:  page.created_time,
      })
    }

    // 최신순 정렬 후 최대 5개
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const recentFeed = feed.slice(0, 5)

    // 오늘 합계
    const totalXp   = feed.reduce((s, f) => s + (f.earnedXp ?? 0), 0)
    const totalGold = feed.reduce((s, f) => s + (f.earnedGold ?? 0), 0)

    return NextResponse.json({ feed: recentFeed, todayXp: totalXp, todayGold: totalGold })

  } catch (err) {
    console.error('피드 API 에러:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

function categoryEmoji(category: string): string {
  if (category.includes('체력'))  return '💪'
  if (category.includes('지력'))  return '🧠'
  if (category.includes('정신'))  return '🧘'
  if (category.includes('생산'))  return '⚡'
  return '✅'
}
