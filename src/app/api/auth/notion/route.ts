// ============================================================
// Notion OAuth 콜백
// GET /api/auth/notion?code=xxx
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/notion/client'
import { getUserByNotionId, upsertUser } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url))
  }

  try {
    // 1. code → access token 교환
    const tokenData = await exchangeCodeForToken(code)
    const notionUserId = tokenData.owner.user.id

    // 2. 기존 유저 확인
    const existingUser = await getUserByNotionId(notionUserId)

    if (existingUser) {
      // 기존 유저 → 토큰 갱신 후 위젯으로 바로 이동
      await upsertUser({
        notion_user_id: notionUserId,
        access_token:   tokenData.access_token,
        workspace_id:   tokenData.workspace_id,
      })

      return NextResponse.redirect(
        new URL(`/onboarding/complete?token=${existingUser.widget_token}`, req.url)
      )
    }

    // 3. 신규 유저 → 저장 후 온보딩으로 이동
    const newUser = await upsertUser({
      notion_user_id: notionUserId,
      access_token:   tokenData.access_token,
      workspace_id:   tokenData.workspace_id,
    })

    return NextResponse.redirect(
      new URL(`/onboarding?token=${newUser.widget_token}`, req.url)
    )

  } catch (err) {
    console.error('Notion OAuth 에러:', err)
    return NextResponse.redirect(new URL('/?error=oauth_failed', req.url))
  }
}
