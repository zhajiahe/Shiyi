/**
 * 笔记数据仓库
 */

import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { Note, Card } from '@/types'
import { cardRepository } from './cardRepository'

export const noteRepository = {
  /**
   * 获取牌组的所有笔记
   */
  async getByDeckId(deckId: string): Promise<Note[]> {
    return db.notes
      .where('deckId')
      .equals(deckId)
      .filter(n => !n.deletedAt)
      .toArray()
  },

  /**
   * 根据 ID 获取笔记
   */
  async getById(id: string): Promise<Note | undefined> {
    return db.notes.get(id)
  },

  /**
   * 创建笔记（同时创建对应的卡片）
   */
  async create(data: {
    deckId: string
    noteModelId: string
    fields: Record<string, string>
    tags?: string[]
    sourceType?: Note['sourceType']
  }): Promise<Note> {
    const now = Date.now()
    
    // 获取笔记类型
    const noteModel = await db.noteModels.get(data.noteModelId)
    if (!noteModel) throw new Error('NoteModel not found')

    // 生成 GUID（基于字段内容的 hash）
    const firstField = Object.values(data.fields)[0] || ''
    const guid = generateGUID(firstField)

    // 创建笔记
    const note: Note = {
      id: nanoid(),
      userId: 'local',
      deckId: data.deckId,
      noteModelId: data.noteModelId,
      guid,
      fields: data.fields,
      tags: data.tags || [],
      sourceType: data.sourceType || 'manual',
      dirty: 1,
      createdAt: now,
      updatedAt: now,
    }
    await db.notes.add(note)

    // 获取模板并创建卡片
    const templates = await db.cardTemplates
      .where('noteModelId')
      .equals(data.noteModelId)
      .filter(t => !t.deletedAt)
      .toArray()

    const cards: Card[] = templates.map(tpl => ({
      id: nanoid(),
      userId: 'local',
      noteId: note.id,
      deckId: data.deckId,
      cardTemplateId: tpl.id,
      ord: tpl.ord,
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

    if (cards.length > 0) {
      await cardRepository.bulkCreate(cards)
    }

    return note
  },

  /**
   * 更新笔记
   */
  async update(id: string, data: Partial<Note>): Promise<void> {
    await db.notes.update(id, {
      ...data,
      updatedAt: Date.now(),
      dirty: 1,
    })
  },

  /**
   * 软删除笔记（同时软删除卡片）
   */
  async delete(id: string): Promise<void> {
    const now = Date.now()
    await db.notes.update(id, { deletedAt: now })
    
    // 删除关联的卡片
    await db.cards
      .where('noteId')
      .equals(id)
      .modify({ deletedAt: now })
  },

  /**
   * 批量创建笔记（用于导入）
   */
  async bulkCreate(notes: Note[], cards: Card[]): Promise<void> {
    await db.notes.bulkAdd(notes)
    await db.cards.bulkAdd(cards)
  },
}

/**
 * 生成笔记 GUID
 */
function generateGUID(content: string): string {
  // 简单的 hash 实现
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

