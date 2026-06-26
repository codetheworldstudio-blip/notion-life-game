// ============================================================
// 온보딩 셋업 API
// POST /api/onboarding/setup  { token, characterName }
// 1. 노션에 게임 페이지 생성
// 2. DB 9개 자동 생성
// 3. 초기 캐릭터 row 생성
// 4. 기본 루틴 샘플 추가
// 5. Supabase에 DB IDs 저장
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserByWidgetToken, getSupabaseAdmin } from '@/lib/supabase/client'
import { createNotionClient } from '@/lib/notion/client'
import { createAllDatabases } from '@/lib/notion/databases'

export async function POST(req: NextRequest) {
  const { token, characterName } = await req.json()
  if (!token || !characterName) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  try {
    const user   = await getUserByWidgetToken(token)
    const notion = createNotionClient(user.access_token)

    // 1. 노션에 "🌿 인생게임" 루트 페이지 생성
    const rootPage = await notion.pages.create({
      parent:     { type: 'workspace', workspace: true } as any,
      icon:       { type: 'emoji', emoji: '🌿' },
      properties: { title: { title: [{ text: { content: '🌿 인생게임' } }] } },
    })
    const parentPageId = rootPage.id

    // 2. DB 9개 자동 생성
    const dbIds = await createAllDatabases(notion, parentPageId)

    // 3. 초기 캐릭터 row 생성
    await notion.pages.create({
      parent: { database_id: dbIds.character },
      properties: {
        '캐릭터 이름': { title: [{ text: { content: characterName } }] },
        '총 XP':       { number: 0 },
        '레벨':        { number: 1 },
        '보유 골드':   { number: 0 },
        '💪 체력 XP':  { number: 0 },
        '🧠 지력 XP':  { number: 0 },
        '🧘 정신력 XP': { number: 0 },
        '⚡ 생산성 XP': { number: 0 },
      },
    })

    // 4. 샘플 루틴 추가
    await addSampleRoutines(notion, dbIds.routines)

    // 5. 기본 퀘스트 추가
    await addDefaultQuests(notion, dbIds.quests)

    // 6. 기본 상점 아이템 추가
    await addDefaultShopItems(notion, dbIds.shopItems)

    // 7. 메인 페이지에 바로가기 섹션 추가
    await addNavigationSection(notion, parentPageId, dbIds as unknown as Record<string, string>)

    // 8. Supabase에 DB IDs + 루트 페이지 ID 저장
    await getSupabaseAdmin()
      .from('users')
      .update({
        db_ids:     { ...dbIds, rootPageId: parentPageId },
        updated_at: new Date().toISOString(),
      })
      .eq('widget_token', token)

    return NextResponse.json({ success: true, dbIds, rootPageId: parentPageId })

  } catch (err) {
    console.error('온보딩 셋업 에러:', err)
    return NextResponse.json({ error: 'setup failed' }, { status: 500 })
  }
}

// ── 샘플 루틴 ─────────────────────────────────────────────────
async function addSampleRoutines(notion: any, dbId: string) {
  const samples = [
    { name: '아침 스트레칭 10분', category: '💪 체력',  xp: 30, gold: 15, difficulty: '쉬움' },
    { name: '독서 30분',          category: '🧠 지력',  xp: 50, gold: 25, difficulty: '보통' },
    { name: '명상 5분',           category: '🧘 정신력', xp: 25, gold: 12, difficulty: '쉬움' },
    { name: '오늘 할 일 정리',    category: '⚡ 생산성', xp: 20, gold: 10, difficulty: '쉬움' },
  ]

  await Promise.all(samples.map(s =>
    notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        '루틴 이름': { title: [{ text: { content: s.name } }] },
        '카테고리':  { select: { name: s.category } },
        'XP':        { number: s.xp },
        '골드':      { number: s.gold },
        '난이도':    { select: { name: s.difficulty } },
        '설명':      { rich_text: [{ text: { content: '' } }] },
      },
    })
  ))
}

// ── 기본 퀘스트 ──────────────────────────────────────────────
async function addDefaultQuests(notion: any, dbId: string) {
  const quests = [
    { name: '첫 발걸음',      type: '달성형', desc: '처음으로 루틴을 완료하세요',   xp: 100, gold: 50,  hidden: false },
    { name: '7일 연속 달성',  type: '달성형', desc: '7일 연속으로 루틴을 완료하세요', xp: 300, gold: 150, hidden: false },
    { name: '30일의 기적',   type: '달성형', desc: '30일 연속으로 루틴을 완료하세요', xp: 1000, gold: 500, hidden: false },
    { name: '???',            type: '히든',   desc: '???',                          xp: 500, gold: 300, hidden: true  },
  ]

  await Promise.all(quests.map(q =>
    notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        '퀘스트 이름': { title: [{ text: { content: q.name } }] },
        '유형':        { select: { name: q.type } },
        '조건':        { rich_text: [{ text: { content: q.desc } }] },
        '보상 XP':     { number: q.xp },
        '보상 골드':   { number: q.gold },
        '완료':        { checkbox: false },
        '히든':        { checkbox: q.hidden },
        '현재 진행도': { number: 0 },
        '목표값':      { number: q.name === '7일 연속 달성' ? 7 : q.name === '30일의 기적' ? 30 : 1 },
      },
    })
  ))
}

// ── 기본 상점 아이템 ─────────────────────────────────────────
async function addDefaultShopItems(notion: any, dbId: string) {
  const items = [
    { name: '꽃 왕관',      category: '🎩 모자',    price: 100, desc: '봄의 기운이 담긴 꽃 왕관' },
    { name: '버섯 모자',    category: '🎩 모자',    price: 80,  desc: '숲속 요정의 버섯 모자' },
    { name: '잎사귀 조끼',  category: '👕 상의',    price: 150, desc: '자연의 기운이 담긴 조끼' },
    { name: '꽃잎 반지',    category: '💎 액세서리', price: 60,  desc: '작은 꽃잎으로 만든 반지' },
    { name: '벚꽃 배경',    category: '🌅 배경',    price: 200, desc: '봄날의 벚꽃 풍경' },
    { name: '밤하늘 배경',  category: '🌅 배경',    price: 200, desc: '별이 가득한 밤하늘' },
    { name: '오션 배경',    category: '🌅 배경',    price: 180, desc: '청량한 바다 풍경' },
  ]

  await Promise.all(items.map(i =>
    notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        '아이템 이름': { title: [{ text: { content: i.name } }] },
        '카테고리':    { select: { name: i.category } },
        '가격 (골드)': { number: i.price },
        '설명':        { rich_text: [{ text: { content: i.desc } }] },
      },
    })
  ))
}

// ── 메인 페이지에 바로가기 섹션 자동 추가 ──────────────────────
async function addNavigationSection(
  notion: any,
  pageId: string,
  dbIds: Record<string, string>
) {
  // 구분선 + 헤더
  const dividerAndHeader = [
    { type: 'divider', divider: {} },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '📂 바로가기' } }],
        color: 'default',
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: '루틴 추가/수정, 상점, 퀘스트 등 각 데이터에 바로 접근할 수 있어요.' }, annotations: { color: 'gray' } }],
      },
    },
  ]

  // 바로가기 링크 목록 (callout 블록으로)
  const links = [
    { emoji: '📋', label: '루틴 목록',   id: dbIds.routines,     desc: '루틴 추가·수정·XP 설정' },
    { emoji: '📝', label: '할 일 DB',    id: dbIds.todos,        desc: '할 일 추가 및 XP 설정'  },
    { emoji: '🗺️', label: '퀘스트',     id: dbIds.quests,       desc: '퀘스트 진행 현황'        },
    { emoji: '🏷️', label: '칭호 도감',  id: dbIds.titleCatalog, desc: '전체 칭호 목록'           },
    { emoji: '🎒', label: '칭호 보관함', id: dbIds.titleOwned,   desc: '보유 중인 칭호 & 장착'   },
    { emoji: '🏪', label: '상점 아이템', id: dbIds.shopItems,    desc: '판매 아이템 추가·관리'    },
    { emoji: '👜', label: '인벤토리',    id: dbIds.inventory,    desc: '구매한 아이템 목록'       },
    { emoji: '🎮', label: '캐릭터 DB',   id: dbIds.character,    desc: '캐릭터 스탯 직접 확인'   },
  ]

  const linkBlocks = links.map(link => ({
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { type: 'text', text: { content: `${link.emoji} ` } },
        {
          type: 'text',
          text: { content: link.label, link: { url: `https://notion.so/${link.id.replace(/-/g, '')}` } },
          annotations: { bold: true, color: 'brown' },
        },
        {
          type: 'text',
          text: { content: `  —  ${link.desc}` },
          annotations: { color: 'gray' },
        },
      ],
    },
  }))

  // 상점 위젯 안내 callout
  const shopCallout = {
    type: 'callout',
    callout: {
      rich_text: [
        {
          type: 'text',
          text: { content: '상점 페이지는 온보딩 완료 화면의 URL을 노션 페이지에 /embed로 붙여넣으세요.' },
        },
      ],
      icon:  { type: 'emoji', emoji: '🏪' },
      color: 'yellow_background',
    },
  }

  await notion.blocks.children.append({
    block_id: pageId,
    children: [...dividerAndHeader, ...linkBlocks, shopCallout],
  })
}
