// ============================================================
// Notion DB 생성 + CRUD
// DB 구조 바꾸고 싶으면 이 파일만 수정
// ============================================================

import { Client } from '@notionhq/client'
import type { NotionDatabaseIds } from '@/types'

// ── DB 자동 생성 (온보딩 시 1회) ────────────────────────────
export async function createAllDatabases(
  notion: Client,
  parentPageId: string
): Promise<NotionDatabaseIds> {

  const [
    character,
    routines,
    completions,
    todos,
    quests,
    titleCatalog,
    titleOwned,
    shopItems,
    inventory,
  ] = await Promise.all([
    createCharacterDB(notion, parentPageId),
    createRoutinesDB(notion, parentPageId),
    createCompletionsDB(notion, parentPageId),
    createTodosDB(notion, parentPageId),
    createQuestsDB(notion, parentPageId),
    createTitleCatalogDB(notion, parentPageId),
    createTitleOwnedDB(notion, parentPageId),
    createShopItemsDB(notion, parentPageId),
    createInventoryDB(notion, parentPageId),
  ])

  return { character, routines, completions, todos, quests, titleCatalog, titleOwned, shopItems, inventory }
}

// ── 각 DB 생성 함수 ─────────────────────────────────────────

async function createCharacterDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '🎮 캐릭터' } }],
    properties: {
      '캐릭터 이름':   { title: {} },
      '총 XP':         { number: { format: 'number' } },
      '레벨':          { number: { format: 'number' } },
      '보유 골드':     { number: { format: 'number' } },
      '장착 칭호':     { rich_text: {} },
      '장착 모자':     { rich_text: {} },
      '장착 상의':     { rich_text: {} },
      '장착 하의':     { rich_text: {} },
      '장착 액세서리': { rich_text: {} },
      '장착 배경':     { rich_text: {} },
      '피부색':        { rich_text: {} },
      '머리색':        { rich_text: {} },
      '헤어스타일':    { number: { format: 'number' } },
      '💪 체력 XP':    { number: { format: 'number' } },
      '🧠 지력 XP':    { number: { format: 'number' } },
      '🧘 정신력 XP':  { number: { format: 'number' } },
      '⚡ 생산성 XP':  { number: { format: 'number' } },
    },
  })
  return db.id
}

async function createRoutinesDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '📋 루틴 목록' } }],
    properties: {
      '루틴 이름': { title: {} },
      '카테고리':  { select: { options: [
        { name: '💪 체력', color: 'green' },
        { name: '🧠 지력', color: 'blue' },
        { name: '🧘 정신력', color: 'purple' },
        { name: '⚡ 생산성', color: 'yellow' },
      ]}},
      'XP':        { number: { format: 'number' } },
      '골드':      { number: { format: 'number' } },
      '난이도':    { select: { options: [
        { name: '쉬움', color: 'green' },
        { name: '보통', color: 'yellow' },
        { name: '어려움', color: 'red' },
      ]}},
      '설명':      { rich_text: {} },
    },
  })
  return db.id
}

async function createCompletionsDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '✅ 완료 기록' } }],
    properties: {
      '제목':      { title: {} },
      '날짜':      { date: {} },
      '완료':      { checkbox: {} },
      '카테고리':  { select: { options: [
        { name: '💪 체력', color: 'green' },
        { name: '🧠 지력', color: 'blue' },
        { name: '🧘 정신력', color: 'purple' },
        { name: '⚡ 생산성', color: 'yellow' },
      ]}},
      '획득 XP':   { number: { format: 'number' } },
      '획득 골드': { number: { format: 'number' } },
      '메모':      { rich_text: {} },
    },
  })
  return db.id
}

async function createTodosDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '📝 할 일' } }],
    properties: {
      '할 일':     { title: {} },
      '날짜':      { date: {} },
      '완료':      { checkbox: {} },
      'XP':        { number: { format: 'number' } },
      '골드':      { number: { format: 'number' } },
    },
  })
  return db.id
}

async function createQuestsDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '🗺️ 퀘스트' } }],
    properties: {
      '퀘스트 이름': { title: {} },
      '유형':         { select: { options: [
        { name: '일일', color: 'green' },
        { name: '주간', color: 'blue' },
        { name: '달성형', color: 'yellow' },
        { name: '히든', color: 'purple' },
      ]}},
      '조건':        { rich_text: {} },
      '보상 XP':     { number: { format: 'number' } },
      '보상 골드':   { number: { format: 'number' } },
      '완료':        { checkbox: {} },
      '완료일':      { date: {} },
      '히든':        { checkbox: {} },
      '현재 진행도': { number: { format: 'number' } },
      '목표값':      { number: { format: 'number' } },
    },
  })
  return db.id
}

async function createTitleCatalogDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '🏷️ 칭호 도감' } }],
    properties: {
      '칭호 이름': { title: {} },
      '설명':      { rich_text: {} },
      '획득 조건': { rich_text: {} },
      '등급':      { select: { options: [
        { name: '🟢 일반', color: 'green' },
        { name: '🔵 희귀', color: 'blue' },
        { name: '🟣 전설', color: 'purple' },
        { name: '⚫ 히든', color: 'gray' },
      ]}},
      '아이콘':    { rich_text: {} },
      '히든':      { checkbox: {} },
    },
  })
  return db.id
}

async function createTitleOwnedDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '🎒 칭호 보관함' } }],
    properties: {
      '칭호 이름': { title: {} },
      '획득일':    { date: {} },
      '현재 장착': { checkbox: {} },
      '메모':      { rich_text: {} },
    },
  })
  return db.id
}

async function createShopItemsDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '🏪 상점 아이템' } }],
    properties: {
      '아이템 이름': { title: {} },
      '카테고리':    { select: { options: [
        { name: '🎩 모자', color: 'yellow' },
        { name: '👕 상의', color: 'blue' },
        { name: '👖 하의', color: 'green' },
        { name: '💎 액세서리', color: 'purple' },
        { name: '🌅 배경', color: 'orange' },
      ]}},
      '가격 (골드)': { number: { format: 'number' } },
      '설명':        { rich_text: {} },
      '이미지 URL':  { url: {} },
    },
  })
  return db.id
}

async function createInventoryDB(notion: Client, parentPageId: string): Promise<string> {
  const db = await notion.databases.create({
    parent:      { type: 'page_id', page_id: parentPageId },
    title:       [{ type: 'text', text: { content: '👜 인벤토리' } }],
    properties: {
      '아이템 이름': { title: {} },
      '카테고리':    { select: { options: [
        { name: '🎩 모자', color: 'yellow' },
        { name: '👕 상의', color: 'blue' },
        { name: '👖 하의', color: 'green' },
        { name: '💎 액세서리', color: 'purple' },
        { name: '🌅 배경', color: 'orange' },
      ]}},
      '구매일':      { date: {} },
      '장착 중':     { checkbox: {} },
    },
  })
  return db.id
}
