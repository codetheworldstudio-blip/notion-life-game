// ============================================================
// XP 동기화 API — POST /api/sync?token=xxx
// 루틴 체크박스 확인 → 캐릭터 업데이트 → 완료 기록 → 체크박스 초기화
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import { calcLevel, getEvolutionStage } from '@/lib/game/xp'
import type { NotionDatabaseIds } from '@/types'

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
    ?? (await req.json().catch(() => ({}))).token

  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)
    const dbIds  = user.db_ids as NotionDatabaseIds
    const today  = new Date().toISOString().split('T')[0]

    // 1. 루틴 DB 전체 조회 → 체크박스가 true인 것만 필터
    const allRoutines = await notion.databases.query({
      database_id: dbIds.routines,
      page_size: 100,
    }).catch(() => ({ results: [] as any[] }))

    const checkedRoutines = (allRoutines.results as any[]).filter(page =>
      Object.values(page.properties).some(
        (prop: any) => prop.type === 'checkbox' && prop.checkbox === true
      )
    )

    // 2. XP/골드 집계
    let earnedXp = 0, earnedGold = 0
    const statXp = { strength: 0, intelligence: 0, mind: 0, productivity: 0 }
    const processed: { id: string; name: string; xp: number; gold: number; category: string }[] = []

    for (const page of checkedRoutines) {
      const props    = page.properties
      const name     = props['루틴 이름']?.title?.[0]?.text?.content ?? '루틴'
      const xp       = props['XP']?.number ?? 30
      const gold     = props['골드']?.number ?? Math.floor(xp * 0.5)
      const category = props['카테고리']?.select?.name ?? '⚡ 생산성'
      const cat      = normCategory(category)

      earnedXp   += xp
      earnedGold += gold
      if (cat in statXp) statXp[cat as keyof typeof statXp] += xp
      processed.push({ id: page.id, name, xp, gold, category })
    }

    if (earnedXp === 0 && earnedGold === 0) {
      return NextResponse.json({ updated: false, message: '체크된 루틴 없음' })
    }

    // 3. 캐릭터 현재 상태 조회
    const charRes   = await notion.databases.query({ database_id: dbIds.character, page_size: 1 })
    const charPage  = charRes.results[0] as any
    const p         = charPage.properties

    const prevXp    = p['총 XP']?.number      ?? 0
    const prevGold  = p['보유 골드']?.number  ?? 0
    const prevStrXp = p['💪 체력 XP']?.number  ?? 0
    const prevIntXp = p['🧠 지력 XP']?.number  ?? 0
    const prevMndXp = p['🧘 정신력 XP']?.number ?? 0
    const prevPrdXp = p['⚡ 생산성 XP']?.number ?? 0

    const newTotalXp = prevXp + earnedXp
    const newLevel   = calcLevel(newTotalXp)
    const leveledUp  = newLevel > calcLevel(prevXp)

    // 4. 캐릭터 업데이트 (최우선 — 이게 성공해야 나머지 진행)
    await notion.pages.update({
      page_id: charPage.id,
      properties: {
        '총 XP':        { number: newTotalXp },
        '레벨':         { number: newLevel   },
        '보유 골드':    { number: prevGold + earnedGold },
        '💪 체력 XP':   { number: prevStrXp + statXp.strength     },
        '🧠 지력 XP':   { number: prevIntXp + statXp.intelligence },
        '🧘 정신력 XP': { number: prevMndXp + statXp.mind         },
        '⚡ 생산성 XP': { number: prevPrdXp + statXp.productivity },
      },
    })

    // 5. 완료 기록 생성 + 체크박스 초기화 (실패해도 XP는 이미 반영됨)
    await Promise.allSettled([
      // 완료 기록들 생성
      ...processed.map(r =>
        notion.pages.create({
          parent: { database_id: dbIds.completions },
          properties: {
            '제목':      { title: [{ text: { content: r.name } }] },
            '날짜':      { date:  { start: today } },
            '완료':      { checkbox: true },
            '카테고리':  { select: { name: r.category } },
            '획득 XP':   { number: r.xp },
            '획득 골드': { number: r.gold },
          },
        })
      ),
      // 체크박스 초기화
      ...processed.map(r => {
        const checkboxProps: Record<string, any> = {}
        const page = checkedRoutines.find((p: any) => p.id === r.id)
        if (page) {
          Object.entries(page.properties).forEach(([key, val]: [string, any]) => {
            if (val.type === 'checkbox' && val.checkbox === true) {
              checkboxProps[key] = { checkbox: false }
            }
          })
        }
        return Object.keys(checkboxProps).length > 0
          ? notion.pages.update({ page_id: r.id, properties: checkboxProps })
          : Promise.resolve()
      }),
    ])

    // 6. 퀘스트 업데이트 (실패해도 무시)
    checkAndUpdateQuests(notion, dbIds, { totalXp: newTotalXp, level: newLevel }).catch(() => {})

    return NextResponse.json({
      updated:   true,
      earnedXp,
      earnedGold,
      newLevel,
      leveledUp,
      newTotalXp,
      evolution: getEvolutionStage(newLevel),
    })

  } catch (err: any) {
    console.error('Sync 에러:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'sync failed' }, { status: 500 })
  }
}

function normCategory(label: string): string {
  if (label.includes('체력'))  return 'strength'
  if (label.includes('지력'))  return 'intelligence'
  if (label.includes('정신'))  return 'mind'
  if (label.includes('생산'))  return 'productivity'
  return 'productivity'
}

async function checkAndUpdateQuests(notion: any, dbIds: NotionDatabaseIds, {
  totalXp, level,
}: { totalXp: number; level: number }) {
  const questRes = await notion.databases.query({
    database_id: dbIds.quests,
    filter: { property: '완료', checkbox: { equals: false } },
    page_size: 20,
  })

  for (const page of questRes.results as any[]) {
    const props = page.properties
    const name  = props['퀘스트 이름']?.title?.[0]?.text?.content ?? ''
    if (name === '첫 발걸음' && totalXp > 0) {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          '완료':  { checkbox: true },
          '완료일': { date: { start: new Date().toISOString().split('T')[0] } },
        },
      })
    }
  }
}
