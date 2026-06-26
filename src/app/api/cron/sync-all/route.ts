// ============================================================
// Vercel Cron Job — 10분마다 모든 유저 XP 동기화
// GET /api/cron/sync-all
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 활성 유저 목록 조회 (최근 7일 내 업데이트된 유저만)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: users, error } = await getSupabaseAdmin()
      .from('users')
      .select('widget_token')
      .gte('updated_at', since)
      .limit(50)

    if (error) throw error
    if (!users?.length) return NextResponse.json({ synced: 0 })

    // 각 유저 동기화 (순차 처리 — Notion API rate limit 고려)
    let synced = 0
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    for (const user of users) {
      try {
        await fetch(`${appUrl}/api/sync?token=${user.widget_token}`, { method: 'POST' })
        synced++
        // 100ms 간격으로 rate limit 방지
        await new Promise(r => setTimeout(r, 100))
      } catch {
        // 개별 실패는 무시
      }
    }

    return NextResponse.json({ synced, total: users.length })

  } catch (err) {
    console.error('Cron sync 에러:', err)
    return NextResponse.json({ error: 'cron failed' }, { status: 500 })
  }
}
