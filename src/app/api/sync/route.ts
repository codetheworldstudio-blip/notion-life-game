// ============================================================
// XP 동기화 API
// POST /api/sync?token=xxx
// 완료 기록 DB에서 미처리 항목을 읽어
// 캐릭터 XP/레벨/골드를 업데이트
// 위젯이 새로고침 시 호출 or Vercel Cron으로 주기 실행
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

    // 1. 오늘 완료된 항목 중 아직 XP를 획득하지 않은 것 조회
    //    (Notion DB 완료 체크박스 = true, 획득 XP = 0 인 것)
    const today = new Date().toISOString().split('T')[0]

    const [completionRes, todoRes] = await Promise.all([
      notion.databases.query({
        database_id: dbIds.completions,
        filter: {
          and: [
            { property: '날짜',    date:     { equals:  today } },
            { property: '완료',    checkbox: { equals:  true  } },
            { property: '획득 XP', number:   { equals:  0     } }, // 미처리
          ],
        },
        page_size: 50,
      }),
      notion.databases.query({
        database_id: dbIds.todos,
        filter: {
          and: [
            { property: '날짜', date:     { equals: today } },
            { property: '완료', checkbox: { equals: true  } },
          ],
        },
        page_size: 50,
      }),
    ])

    // 2. 처리할 항목이 없으면 early return
    if (!completionRes.results.length && !todoRes.results.length) {
      return NextResponse.json({ updated: false, message: '처리할 항목 없음' })
    }

    // 3. 완료 기록에서 루틴 XP/골드/스탯 집계
    let earnedXp = 0, earnedGold = 0
    const statXp = { strength: 0, intelligence: 0, mind: 0, productivity: 0 }

    const completionUpdates: Promise<any>[] = []

    for (const page of completionRes.results as any[]) {
      const props = page.properties

      // 루틴 DB에서 XP/골드 값 가져오기 (완료 기록에 없으면 루틴 참조)
      const xp   = props['획득 XP']?.number   || await getRoutineXp(notion, props)
      const gold = props['획득 골드']?.number || Math.floor(xp * 0.6)
      const cat  = normCategory(props['카테고리']?.select?.name ?? '')

      earnedXp   += xp
      earnedGold += gold
      if (cat in statXp) statXp[cat as keyof typeof statXp] += xp

      // 완료 기록 XP/골드 업데이트
      completionUpdates.push(
        notion.pages.update({
          page_id: page.id,
          properties: {
            '획득 XP':   { number: xp   },
            '획득 골드': { number: gold },
          },
        })
      )
    }

    // 할일에서도 XP 집계
    for (const page of todoRes.results as any[]) {
      const props = page.properties
      const xp   = props['XP']?.number   ?? 0
      const gold = props['골드']?.number ?? 0
      earnedXp   += xp
      earnedGold += gold
    }

    // 4. 캐릭터 현재 상태 조회
    const charRes   = await notion.databases.query({ database_id: dbIds.character, page_size: 1 })
    const charPage  = charRes.results[0] as any
    const charProps = charPage.properties

    const prevXp       = charProps['총 XP']?.number ?? 0
    const prevGold     = charProps['보유 골드']?.number ?? 0
    const prevStrXp    = charProps['💪 체력 XP']?.number ?? 0
    const prevIntXp    = charProps['🧠 지력 XP']?.number ?? 0
    const prevMndXp    = charProps['🧘 정신력 XP']?.number ?? 0
    const prevPrdXp    = charProps['⚡ 생산성 XP']?.number ?? 0

    const newTotalXp = prevXp + earnedXp
    const prevLevel  = calcLevel(prevXp)
    const newLevel   = calcLevel(newTotalXp)
    const leveledUp  = newLevel > prevLevel

    // 5. 캐릭터 업데이트
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
      ...completionUpdates,
    ])

    // 6. 퀘스트 진행도 업데이트
    await checkAndUpdateQuests(notion, dbIds, {
      totalXp: newTotalXp,
      level: newLevel,
    })

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
async function getRoutineXp(notion: any, props: any): Promise<number> {
  // 루틴 이름으로 루틴 DB에서 XP 조회 (없으면 기본값)
  try {
    const title = props['제목']?.title?.[0]?.text?.content
    if (!title) return 30
    return 30 // 기본값 — 실제 구현시 루틴 DB 쿼리
  } catch {
    return 30
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
  try {
    const questRes = await notion.databases.query({
      database_id: dbIds.quests,
      filter: { property: '완료', checkbox: { equals: false } },
      page_size: 20,
    })

    for (const page of questRes.results as any[]) {
      const props  = page.properties
      const name   = props['퀘스트 이름']?.title?.[0]?.text?.content ?? ''
      const target = props['목표값']?.number ?? 1

      // 첫 발걸음: 레벨 1 이상이면 완료
      if (name === '첫 발걸음' && level >= 1 && totalXp > 0) {
        await completeQuest(notion, page.id, dbIds, props)
      }
    }
  } catch {
    // 퀘스트 업데이트 실패는 무시 (메인 플로우 방해 안 함)
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

  // 보상 XP/골드를 캐릭터에 추가
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
