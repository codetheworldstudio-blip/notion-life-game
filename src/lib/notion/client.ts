// ============================================================
// Notion API 클라이언트
// 모든 Notion 연결은 이 파일을 통해서만
// ============================================================

import { Client } from '@notionhq/client'

// 서버사이드: 특정 유저의 access token으로 클라이언트 생성
export function createNotionClient(accessToken: string): Client {
  return new Client({ auth: accessToken })
}

// OAuth 인증 URL 생성
export function getNotionOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     process.env.NOTION_CLIENT_ID!,
    response_type: 'code',
    owner:         'user',
    redirect_uri:  process.env.NOTION_REDIRECT_URI!,
  })
  return `https://api.notion.com/v1/oauth/authorize?${params}`
}

// Authorization code → access token 교환
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  workspace_id: string
  workspace_name: string
  bot_id: string
  owner: { user: { id: string; name: string; avatar_url?: string } }
}> {
  const credentials = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      grant_type:   'authorization_code',
      code,
      redirect_uri: process.env.NOTION_REDIRECT_URI!,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion OAuth 실패: ${err}`)
  }

  return res.json()
}
