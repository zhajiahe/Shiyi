/**
 * Dexie.js 离线数据库
 *
 * 本地优先架构的核心存储层
 */

import Dexie, { type Table } from 'dexie'
import type { NoteModel, CardTemplate, Deck, Note, Card, ReviewLog } from '@/types'

export class AnkiDatabase extends Dexie {
  noteModels!: Table<NoteModel>
  cardTemplates!: Table<CardTemplate>
  decks!: Table<Deck>
  notes!: Table<Note>
  cards!: Table<Card>
  reviewLogs!: Table<ReviewLog>

  constructor() {
    super('AnkiWeb')

    this.version(1).stores({
      // 主键 + 索引
      noteModels: 'id, userId, name, updatedAt, deletedAt',
      cardTemplates: 'id, noteModelId, ord, updatedAt, deletedAt',
      decks: 'id, userId, parentId, noteModelId, name, updatedAt, deletedAt',
      notes: 'id, userId, deckId, noteModelId, guid, updatedAt, deletedAt, dirty',
      cards:
        'id, userId, noteId, deckId, cardTemplateId, state, queue, due, updatedAt, deletedAt, dirty',
      reviewLogs: 'id, userId, cardId, reviewTime',
    })
  }
}

export const db = new AnkiDatabase()

/**
 * 请求持久化存储
 * 防止浏览器清理 IndexedDB 数据
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist()
  }
  return false
}

/**
 * 获取存储使用情况
 */
export async function getStorageEstimate(): Promise<{
  usage: number
  quota: number
  usagePercent: number
} | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    return {
      usage,
      quota,
      usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
    }
  }
  return null
}
