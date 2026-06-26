// ============================================================
// Supabase 클라이언트 — 지연 초기화
// 빌드 타임에는 인스턴스를 만들지 않고, 실제 호출 시점에 생성
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _admin: SupabaseClient | null = null

function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

// ── DB 스키마 (Supabase SQL Editor에서 실행) ─────────────────
/*
create table users (
  id             uuid primary key default gen_random_uuid(),
  notion_user_id text unique not null,
  access_token   text not null,
  workspace_id   text not null,
  widget_token   text unique not null default gen_random_uuid()::text,
  db_ids         jsonb,
  customization  jsonb,
  language       text default 'ko',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index on users (widget_token);
*/

// ── 유저 조회/저장 ────────────────────────────────────────────
export async function getUserByWidgetToken(widgetToken: string) {
  const { data, error } = await admin()
    .from('users')
    .select('*')
    .eq('widget_token', widgetToken)
    .single()
  if (error) throw error
  return data
}

export async function getUserByNotionId(notionUserId: string) {
  const { data } = await admin()
    .from('users')
    .select('*')
    .eq('notion_user_id', notionUserId)
    .maybeSingle()
  return data
}

export async function upsertUser(user: {
  notion_user_id: string
  access_token:   string
  workspace_id:   string
  db_ids?:        object
  customization?: object
  language?:      string
}) {
  const { data, error } = await admin()
    .from('users')
    .upsert(
      { ...user, updated_at: new Date().toISOString() },
      { onConflict: 'notion_user_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// cron 등 직접 admin 클라이언트가 필요한 곳에서 사용
export { admin as getSupabaseAdmin }
