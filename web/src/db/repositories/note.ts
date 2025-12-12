/**
 * Note 和 Card 本地存储操作
 */

import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { Note, Card, SourceType } from '@/types'

/**
 * 根据字段内容生成 GUID
 */
function generateGuid(fields: Record<string, string>): string {
  const content = Object.values(fields).find((v) => v) || ''
  // 简单哈希
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export const noteRepo = {
  /**
   * 获取牌组的所有笔记
   */
  async getByDeckId(deckId: string): Promise<Note[]> {
    return db.notes
      .where('deckId')
      .equals(deckId)
      .and((n) => !n.deletedAt)
      .toArray()
  },

  /**
   * 根据 ID 获取笔记（包含卡片）
   */
  async getById(id: string): Promise<(Note & { cards: Card[] }) | undefined> {
    const note = await db.notes.get(id)
    if (note && !note.deletedAt) {
      const cards = await db.cards
        .where('noteId')
        .equals(id)
        .and((c) => !c.deletedAt)
        .toArray()
      return { ...note, cards }
    }
    return undefined
  },

  /**
   * 创建笔记（同时创建卡片）
   */
  async create(
    userId: string,
    deckId: string,
    noteModelId: string,
    fields: Record<string, string>,
    templateIds: string[],
    options?: {
      tags?: string[]
      sourceType?: SourceType
      sourceMeta?: Record<string, unknown>
    }
  ): Promise<Note> {
    const now = Date.now()
    const noteId = nanoid()

    const note: Note = {
      id: noteId,
      userId,
      deckId,
      noteModelId,
      guid: generateGuid(fields),
      fields,
      tags: options?.tags || [],
      sourceType: options?.sourceType || 'manual',
      sourceMeta: options?.sourceMeta,
      dirty: 1,
      createdAt: now,
      updatedAt: now,
    }

    // 为每个模板创建卡片
    const cards: Card[] = templateIds.map((templateId, index) => ({
      id: nanoid(),
      userId,
      noteId,
      deckId,
      cardTemplateId: templateId,
      ord: index,
      state: 'new' as const,
      queue: 'new' as const,
      due: 0,
      interval: 0,
      easeFactor: 2500,
      reps: 0,
      lapses: 0,
      stability: 0,
      difficulty: 0,
      dirty: 1,
      createdAt: now,
      updatedAt: now,
    }))

    await db.transaction('rw', [db.notes, db.cards], async () => {
      await db.notes.add(note)
      await db.cards.bulkAdd(cards)
    })

    return note
  },

  /**
   * 更新笔记
   */
  async update(
    id: string,
    data: Partial<Pick<Note, 'fields' | 'tags' | 'deckId'>>
  ): Promise<void> {
    const updates: Partial<Note> = {
      ...data,
      dirty: 1,
      updatedAt: Date.now(),
    }
    if (data.fields) {
      updates.guid = generateGuid(data.fields)
    }
    await db.notes.update(id, updates)
  },

  /**
   * 删除笔记（软删除，同时删除关联卡片）
   */
  async delete(id: string): Promise<void> {
    const now = Date.now()
    await db.transaction('rw', [db.notes, db.cards], async () => {
      await db.notes.update(id, { deletedAt: now, updatedAt: now })
      await db.cards
        .where('noteId')
        .equals(id)
        .modify({ deletedAt: now, updatedAt: now })
    })
  },

  /**
   * 搜索笔记
   */
  async search(userId: string, keyword: string): Promise<Note[]> {
    const notes = await db.notes
      .where('userId')
      .equals(userId)
      .and((n) => !n.deletedAt)
      .toArray()

    const lowerKeyword = keyword.toLowerCase()
    return notes.filter((note) =>
      Object.values(note.fields).some((value) =>
        value.toLowerCase().includes(lowerKeyword)
      )
    )
  },
}

export const cardRepo = {
  /**
   * 获取牌组的所有卡片
   */
  async getByDeckId(deckId: string): Promise<Card[]> {
    return db.cards
      .where('deckId')
      .equals(deckId)
      .and((c) => !c.deletedAt)
      .toArray()
  },

  /**
   * 根据 ID 获取卡片
   */
  async getById(id: string): Promise<Card | undefined> {
    const card = await db.cards.get(id)
    return card && !card.deletedAt ? card : undefined
  },

  /**
   * 获取待复习的卡片
   */
  async getDueCards(
    userId: string,
    options?: {
      deckId?: string
      dueBefore?: number
      limit?: number
    }
  ): Promise<Card[]> {
    const now = options?.dueBefore ?? Date.now()
    let query = db.cards
      .where('userId')
      .equals(userId)
      .and((c) => !c.deletedAt && c.queue !== 'suspended' && c.due <= now)

    if (options?.deckId) {
      const cards = await query.toArray()
      const filtered = cards.filter((c) => c.deckId === options.deckId)
      return options?.limit ? filtered.slice(0, options.limit) : filtered
    }

    const cards = await query.toArray()
    return options?.limit ? cards.slice(0, options.limit) : cards
  },

  /**
   * 更新卡片（调度状态）
   */
  async update(id: string, data: Partial<Card>): Promise<void> {
    await db.cards.update(id, {
      ...data,
      dirty: 1,
      updatedAt: Date.now(),
    })
  },

  /**
   * 统计卡片状态
   */
  async countByState(userId: string, deckId?: string): Promise<Record<string, number>> {
    const cards = await db.cards
      .where('userId')
      .equals(userId)
      .and((c) => !c.deletedAt && (!deckId || c.deckId === deckId))
      .toArray()

    return cards.reduce(
      (acc, card) => {
        acc[card.state] = (acc[card.state] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  },
}



