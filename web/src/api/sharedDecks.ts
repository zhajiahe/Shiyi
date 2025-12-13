/**
 * 共享牌组 API 客户端
 */

import type { SharedDeck, NoteModel, CardTemplate, Deck, Note, Card } from '@/types'
import { db } from '@/db'
import { nanoid } from 'nanoid'

const API_BASE = 'http://localhost:8000/api/v1'

interface ApiResponse<T> {
  success: boolean
  code: number
  msg: string
  data: T
}

interface SharedDeckListResponse {
  items: SharedDeck[]
  total: number
  page: number
  page_size: number
}

interface SharedDeckDetailResponse extends SharedDeck {
  author?: {
    id: string
    username: string
    nickname: string
  }
}

/**
 * 获取共享牌组列表
 */
export async function getSharedDecks(params?: {
  page?: number
  pageSize?: number
  tag?: string
  language?: string
  isOfficial?: boolean
  isFeatured?: boolean
}): Promise<SharedDeckListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString())
  if (params?.tag) searchParams.set('tag', params.tag)
  if (params?.language) searchParams.set('language', params.language)
  if (params?.isOfficial !== undefined)
    searchParams.set('is_official', params.isOfficial.toString())
  if (params?.isFeatured !== undefined)
    searchParams.set('is_featured', params.isFeatured.toString())

  const response = await fetch(`${API_BASE}/shared-decks?${searchParams}`)
  const result: ApiResponse<SharedDeckListResponse> = await response.json()

  if (!result.success) {
    throw new Error(result.msg)
  }

  return result.data
}

/**
 * 获取共享牌组详情
 */
export async function getSharedDeckDetail(slug: string): Promise<SharedDeckDetailResponse> {
  const response = await fetch(`${API_BASE}/shared-decks/${slug}`)
  const result: ApiResponse<SharedDeckDetailResponse> = await response.json()

  if (!result.success) {
    throw new Error(result.msg)
  }

  return result.data
}

/**
 * 检查本地是否已有同名牌组
 */
export async function checkDeckNameExists(name: string): Promise<boolean> {
  const decks = await db.decks.filter((d) => !d.deletedAt && d.name === name).toArray()
  return decks.length > 0
}

/**
 * 获取不冲突的牌组名称（自动添加后缀）
 */
export async function getUniqueDeckName(baseName: string): Promise<string> {
  let name = baseName
  let counter = 1

  while (await checkDeckNameExists(name)) {
    name = `${baseName} (${counter})`
    counter++
  }

  return name
}

/**
 * 导入共享牌组到本地
 * @param slug 共享牌组的 URL 标识
 * @param customDeckName 自定义牌组名称（可选，默认使用共享牌组名称）
 */
export async function importSharedDeck(
  slug: string,
  customDeckName?: string,
): Promise<{
  deckId: string
  deckName: string
  noteCount: number
  cardCount: number
}> {
  // 获取后端的牌组数据（通过 API 获取笔记类型、笔记、卡片）
  const response = await fetch(`${API_BASE}/shared-decks/${slug}/export`)
  const result = await response.json()

  if (!result.success) {
    throw new Error(result.msg)
  }

  const exportData = result.data as {
    note_models: Array<{
      id: string
      name: string
      fields_schema: Array<{ name: string; description?: string }>
      css?: string
      templates: Array<{
        id: string
        name: string
        ord: number
        question_template: string
        answer_template: string
      }>
    }>
    deck: {
      id: string
      name: string
      description?: string
      config?: object
      scheduler?: string
    }
    notes: Array<{
      id: string
      guid: string
      note_model_id: string
      fields: Record<string, string>
      tags: string[]
    }>
    cards: Array<{
      id: string
      note_id: string
      card_template_id: string
      ord: number
    }>
  }

  const now = Date.now()
  const localDeckId = nanoid()

  // 3. 导入笔记类型
  for (const nm of exportData.note_models) {
    const existing = await db.noteModels.get(nm.id)
    if (!existing) {
      const noteModel: NoteModel = {
        id: nm.id,
        userId: 'local',
        name: nm.name,
        fieldsSchema: nm.fields_schema.map((f) => ({ name: f.name, description: f.description })),
        css: nm.css,
        templates: [],
        createdAt: now,
        updatedAt: now,
      }
      await db.noteModels.add(noteModel)

      // 导入模板
      for (const tpl of nm.templates) {
        const template: CardTemplate = {
          id: tpl.id,
          noteModelId: nm.id,
          name: tpl.name,
          ord: tpl.ord,
          questionTemplate: tpl.question_template,
          answerTemplate: tpl.answer_template,
          createdAt: now,
          updatedAt: now,
        }
        await db.cardTemplates.add(template)
      }
    }
  }

  // 4. 创建本地牌组（使用自定义名称或默认名称）
  const deckName = customDeckName || exportData.deck.name
  const deck: Deck = {
    id: localDeckId,
    userId: 'local',
    name: deckName,
    description: exportData.deck.description,
    noteModelId: exportData.note_models[0]?.id,
    config: {
      newPerDay: 20,
      maxReviewsPerDay: 200,
      learningSteps: [1, 10],
      graduatingInterval: 1,
      easyInterval: 4,
    },
    scheduler: 'sm2',
    createdAt: now,
    updatedAt: now,
  }
  await db.decks.add(deck)

  // 5. 导入笔记
  const noteIdMap = new Map<string, string>()
  for (const n of exportData.notes) {
    const localNoteId = nanoid()
    noteIdMap.set(n.id, localNoteId)

    const note: Note = {
      id: localNoteId,
      userId: 'local',
      deckId: localDeckId,
      noteModelId: n.note_model_id,
      guid: n.guid,
      fields: n.fields,
      tags: n.tags,
      sourceType: 'import',
      dirty: 0,
      createdAt: now,
      updatedAt: now,
    }
    await db.notes.add(note)
  }

  // 6. 导入卡片
  for (const c of exportData.cards) {
    const localNoteId = noteIdMap.get(c.note_id)
    if (!localNoteId) continue

    const card: Card = {
      id: nanoid(),
      userId: 'local',
      noteId: localNoteId,
      deckId: localDeckId,
      cardTemplateId: c.card_template_id,
      ord: c.ord,
      state: 'new',
      queue: 'new',
      due: 0,
      interval: 0,
      easeFactor: 2500,
      reps: 0,
      lapses: 0,
      stability: 0,
      difficulty: 0,
      dirty: 0,
      createdAt: now,
      updatedAt: now,
    }
    await db.cards.add(card)
  }

  return {
    deckId: localDeckId,
    deckName: deckName,
    noteCount: exportData.notes.length,
    cardCount: exportData.cards.length,
  }
}
