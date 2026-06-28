// ============================================================
// XP 동기화 API
// POST /api/sync?token=xxx
// 루틴 DB에서 "오늘 완료" 체크된 항목을 읽어
// 캐릭터 XP/레벨/골드를 업데이트
// 완료 처리 후 체크박스 초기화 (내일 다시 사용)
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

    // 1. 루틴 DB 전체 조회 후 코드에서 체크박스 확인
    //    (필터 방식은 속성명 불일치 오류 가능성 있음)
    const allRoutinesRes = await notion.databases.query({
      database_id: dbIds.routines,
      page_size: 100,
    }).catch(() => ({ results: [] }))

    // "오늘 완료" 또는 유사한 이름의 체크박스가 true인 것만 필터
    const routineRes = {
      results: (allRoutinesRes.results as any[]).filter(page => {
        const props = page.properties
        // 체크박스 타입인 속성 중 true인 것 찾기
        return Object.values(props).some(
          (prop: any) => prop.type === 'checkbox' && prop.checkbox === true
        )
      })
    }

    // 2. 오늘 이미 처리된 완료 기록 조회 (중복 방지)
    const completionRes = await notion.databases.query({
      database_id: dbIds.completions,
      filter: {
        property: '날짜',
        date: { equals: today },
      },
      page_size: 100,
    })

    const processedTitles = new Set(
      completionRes.results.map((p: any) =>
        p.properties['제목']?.title?.[0]?.text?.content ?? ''
      )
    )

    // 3. 할일 DB에서 오늘 완료된 항목 조회
    const todoRes = await notion.databases.query({
      database_id: dbIds.todos,
      filter: {
        and: [
          { property: '날짜',  date:     { equals: today } },
          { property: '완료',  checkbox: { equals: true  } },
        ],
      },
      page_size: 50,
    }).catch(() => ({ results: [] }))

    // 4. XP/골드 집계
    let earnedXp = 0, earnedGold = 0
    const statXp = { strength: 0, intelligence: 0, mind: 0, productivity: 0 }

    const completionCreates: Promise<any>[] = []
    const routineResets: Promise<any>[] = []

    for (const page of routineRes.results as any[]) {
      const props    = page.properties
      const name     = props['루틴 이름']?.title?.[0]?.text?.content ?? '루틴'
      const xp       = props['XP']?.number ?? 30
      const gold     = props['골드']?.number ?? Math.floor(xp * 0.5)
      const category = props['카테고리']?.select?.name ?? ''
      const cat      = normCategory(category)

      // 오늘 이미 처리했으면 스킵
      if (processedTitles.has(name)) continue

      earnedXp   += xp
      earnedGold += gold
      if (cat in statXp) statXp[cat as keyof typeof statXp] += xp

      // 완료 기록 생성
      completionCreates.push(
        notion.pages.create({
          parent: { database_id: dbIds.completions },
          properties: {
            '제목':      { title: [{ text: { content: name } }] },
            '날짜':      { date:  { start: today } },
            '완료':      { checkbox: true },
            '카테고리':  { select: { name: category || '⚡ 생산성' } },
            '획득 XP':   { number: xp },
            '획득 골드': { number: gold },
          },
        })
      )

      // 루틴 체크박스 초기화 (내일 다시 사용) — 체크박스 타입 속성 모두 false로
      const checkboxProps: Record<string, any> = {}
      Object.entries(page.properties).forEach(([key, val]: [string, any]) => {
        if (val.type === 'checkbox' && val.checkbox === true) {
          checkboxProps[key] = { checkbox: false }
        }
      })
      if (Object.keys(checkboxProps).length > 0) {
        routineResets.push(
          notion.pages.update({ page_id: page.id, properties: checkboxProps })
        )
      }
    }

    // 할일 XP 집계 (오늘 날짜 완료된 것 중 completions에 없는 것)
    for (const page of todoRes.results as any[]) {
      const props = page.properties
      const name  = props['할 일']?.title?.[0]?.text?.content ?? '할 일'
      if (processedTitles.has(name)) continue

      const xp   = props['XP']?.number   ?? 0
      const gold = props['골드']?.number ?? 0
      earnedXp   += xp
      earnedGold += gold

      if (xp > 0) {
        completionCreates.push(
          notion.pages.create({
            parent: { database_id: dbIds.completions },
            properties: {
              '제목':      { title: [{ text: { content: name } }] },
              '날짜':      { date:  { start: today } },
              '완료':      { checkbox: true },
              '카테고리':  { select: { name: '⚡ 생산성' } },
              '획득 XP':   { number: xp },
              '획득 골드': { number: gold },
            },
          })
        )
      }
    }

    // 처리할 항목 없음
    if (earnedXp === 0 && earnedGold === 0) {
      return NextResponse.json({ updated: false, message: '새로 완료된 항목 없음' })
    }

    // 5. 캐릭터 현재 상태 조회
    const charRes   = await notion.databases.query({ database_id: dbIds.character, page_size: 1 })
    const charPage  = charRes.results[0] as any
    const charProps = charPage.properties

    const prevXp    = charProps['총 XP']?.number     ?? 0
    const prevGold  = charProps['보유 골드']?.number ?? 0
    const prevStrXp = charProps['💪 체력 XP']?.number  ?? 0
    const prevIntXp = charProps['🧠 지력 XP']?.number  ?? 0
    const prevMndXp = charProps['🧘 정신력 XP']?.number ?? 0
    const prevPrdXp = charProps['⚡ 생산성 XP']?.number ?? 0

    const newTotalXp = prevXp + earnedXp
    const prevLevel  = calcLevel(prevXp)
    const newLevel   = calcLevel(newTotalXp)
    const leveledUp  = newLevel > prevLevel

    // 6. 캐릭터 업데이트 + 완료 기록 생성 + 루틴 초기화 병렬 처리
    await Promise.all([
      notion.pages.update({
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
      }),
      ...completionCreates,
      ...routineResets,
    ])

    // 7. 퀘스트 진행도 업데이트
    await checkAndUpdateQuests(notion, dbIds, { totalXp: newTotalXp, level: newLevel })

    return NextResponse.json({
      updated:   true,
      earnedXp,
      earnedGold,
      newLevel,
      leveledUp,
      newTotalXp,
      evolution: getEvolutionStage(newLevel),
    })

  } catch (err) {
    console.error('Sync 에러:', err)
    return NextResponse.json({ error: 'sync failed' }, { status: 500 })
  }
}

// ── 헬퍼 ──────────────────────────────────────────────────────
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
  try {
    const questRes = await notion.databases.query({
      database_id: dbIds.quests,
      filter: { property: '완료', checkbox: { equals: false } },
      page_size: 20,
    })

    for (const page of questRes.results as any[]) {
      const props = page.properties
      const name  = props['퀘스트 이름']?.title?.[0]?.text?.content ?? ''

      if (name === '첫 발걸음' && level >= 1 && totalXp > 0) {
        await completeQuest(notion, page.id, dbIds, props)
      }
    }
  } catch {
    // 퀘스트 업데이트 실패는 무시
  }
}

async function completeQuest(notion: any, pageId: string, dbIds: NotionDatabaseIds, props: any) {
  const rewardXp   = props['보상 XP']?.number   ?? 0
  const rewardGold = props['보상 골드']?.number ?? 0

  await notion.pages.update({
    page_id: pageId,
    properties: {
      '완료':  { checkbox: true },
      '완료일': { date: { start: new Date().toISOString().split('T')[0] } },
    },
  })

  if (rewardXp > 0 || rewardGold > 0) {
    const charRes  = await notion.databases.query({ database_id: dbIds.character, page_size: 1 })
    const charPage = charRes.results[0] as any
    const p        = charPage.properties

    await notion.pages.update({
      page_id: charPage.id,
      properties: {
        '총 XP':     { number: (p['총 XP']?.number ?? 0) + rewardXp },
        '보유 골드': { number: (p['보유 골드']?.number ?? 0) + rewardGold },
      },
    })
  }
}
