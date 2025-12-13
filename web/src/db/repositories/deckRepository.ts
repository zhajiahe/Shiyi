/**
 * 牌组数据仓库
 */

import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { Deck, DeckConfig } from '@/types'

const DEFAULT_CONFIG: DeckConfig = {
  newPerDay: 20,
  maxReviewsPerDay: 200,
  learningSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
}

export const deckRepository = {
  /**
   * 获取所有牌组
   */
  async getAll(): Promise<Deck[]> {
    return db.decks.filter((deck) => !deck.deletedAt).toArray()
  },

  /**
   * 根据 ID 获取牌组
   */
  async getById(id: string): Promise<Deck | undefined> {
    return db.decks.get(id)
  },

  /**
   * 创建牌组
   */
  async create(data: Partial<Deck>): Promise<Deck> {
    const now = Date.now()
    const deck: Deck = {
      id: nanoid(),
      userId: 'local',
      name: data.name || '新牌组',
      parentId: data.parentId,
      noteModelId: data.noteModelId,
      config: data.config || DEFAULT_CONFIG,
      scheduler: data.scheduler || 'sm2',
      description: data.description,
      createdAt: now,
      updatedAt: now,
    }
    await db.decks.add(deck)
    return deck
  },

  /**
   * 更新牌组
   */
  async update(id: string, data: Partial<Deck>): Promise<void> {
    await db.decks.update(id, {
      ...data,
      updatedAt: Date.now(),
    })
  },

  /**
   * 软删除牌组
   */
  async delete(id: string): Promise<void> {
    await db.decks.update(id, {
      deletedAt: Date.now(),
    })
  },

  /**
   * 获取牌组的卡片统计
   */
  async getStats(deckId: string): Promise<{
    new: number
    learning: number
    review: number
    total: number
  }> {
    const cards = await db.cards
      .where('deckId')
      .equals(deckId)
      .filter((c) => !c.deletedAt)
      .toArray()

    const now = Date.now()
    return {
      new: cards.filter((c) => c.state === 'new').length,
      learning: cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length,
      review: cards.filter((c) => c.state === 'review' && c.due <= now).length,
      total: cards.length,
    }
  },

  /**
   * 获取今日待复习的卡片数
   */
  async getDueCount(deckId?: string): Promise<{
    newCards: number
    reviewCards: number
    learningCards: number
  }> {
    const now = Date.now()

    if (deckId) {
      const cards = await db.cards
        .where('deckId')
        .equals(deckId)
        .filter((c) => !c.deletedAt)
        .toArray()

      return {
        newCards: cards.filter((c) => c.state === 'new').length,
        reviewCards: cards.filter((c) => c.state === 'review' && c.due <= now).length,
        learningCards: cards.filter(
          (c) => (c.state === 'learning' || c.state === 'relearning') && c.due <= now,
        ).length,
      }
    }

    const allCards = await db.cards.filter((c) => !c.deletedAt).toArray()
    return {
      newCards: allCards.filter((c) => c.state === 'new').length,
      reviewCards: allCards.filter((c) => c.state === 'review' && c.due <= now).length,
      learningCards: allCards.filter(
        (c) => (c.state === 'learning' || c.state === 'relearning') && c.due <= now,
      ).length,
    }
  },
}
