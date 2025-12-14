/**
 * 卡片数据仓库
 */

import { db } from '@/db'
import type { Card, ReviewLog, Rating, SchedulerType } from '@/types'
import { schedule } from '@/scheduler'
import { nanoid } from 'nanoid'

// 获取用户设置的调度器
function getSchedulerFromSettings(): SchedulerType {
  try {
    const settings = localStorage.getItem('shiyi-settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      return parsed.scheduler || 'sm2'
    }
  } catch {
    // 忽略解析错误
  }
  return 'sm2'
}

// 获取用户设置
function getSettings(): { newCardsPerDay: number; maxReviewsPerDay: number } {
  try {
    const settings = localStorage.getItem('shiyi-settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      return {
        newCardsPerDay: parsed.newCardsPerDay ?? 20,
        maxReviewsPerDay: parsed.maxReviewsPerDay ?? 200,
      }
    }
  } catch {
    // 忽略解析错误
  }
  return { newCardsPerDay: 20, maxReviewsPerDay: 200 }
}

export const cardRepository = {
  /**
   * 获取待复习的卡片（按优先级排序）
   * @param deckIds - 单个牌组ID、多个牌组ID数组、或undefined（全部牌组）
   * @param options - 可选配置
   */
  async getDueCards(
    deckIds?: string | string[],
    options?: {
      limit?: number
      applyNewCardLimit?: boolean // 是否应用每日新卡限制
    },
  ): Promise<Card[]> {
    const now = Date.now()
    const limit = options?.limit ?? 100
    const applyNewCardLimit = options?.applyNewCardLimit ?? true
    const settings = getSettings()

    let cards: Card[]

    // 支持单个或多个牌组ID
    const deckIdArray = deckIds
      ? Array.isArray(deckIds)
        ? deckIds
        : [deckIds]
      : undefined

    if (deckIdArray && deckIdArray.length > 0) {
      // 查询多个牌组的卡片
      const results = await Promise.all(
        deckIdArray.map((id) =>
          db.cards
            .where('deckId')
            .equals(id)
            .filter((c) => !c.deletedAt)
            .toArray(),
        ),
      )
      cards = results.flat()
    } else {
      cards = await db.cards.filter((c) => !c.deletedAt).toArray()
    }

    // 分离不同状态的卡片
    const newCards: Card[] = []
    const learningCards: Card[] = []
    const reviewCards: Card[] = []

    for (const card of cards) {
      if (card.state === 'new') {
        newCards.push(card)
      } else if (card.state === 'learning' || card.state === 'relearning') {
        if (card.due <= now) {
          learningCards.push(card)
        }
      } else if (card.state === 'review') {
        if (card.due <= now) {
          reviewCards.push(card)
        }
      }
    }

    // 应用每日新卡限制
    const limitedNewCards = applyNewCardLimit
      ? newCards.slice(0, settings.newCardsPerDay)
      : newCards

    // 合并并排序：学习中 > 新卡片 > 复习
    const dueCards = [...learningCards, ...limitedNewCards, ...reviewCards]

    // 在每个类别内按 due 排序
    dueCards.sort((a, b) => {
      const order = { learning: 0, relearning: 0, new: 1, review: 2 }
      const orderA = order[a.state] ?? 3
      const orderB = order[b.state] ?? 3
      if (orderA !== orderB) return orderA - orderB
      return a.due - b.due
    })

    return dueCards.slice(0, limit)
  },

  /**
   * 根据 ID 获取卡片
   */
  async getById(id: string): Promise<Card | undefined> {
    return db.cards.get(id)
  },

  /**
   * 提交复习结果
   * @returns reviewLogId 用于撤销功能
   */
  async submitReview(cardId: string, rating: Rating): Promise<string> {
    const card = await db.cards.get(cardId)
    if (!card) throw new Error('Card not found')

    // 根据用户设置选择调度器
    const scheduler = getSchedulerFromSettings()

    // 计算新的调度参数
    const result = schedule(card, rating, scheduler)
    const now = Date.now()

    // 创建复习日志
    const reviewLogId = nanoid()
    const reviewLog: ReviewLog = {
      id: reviewLogId,
      userId: card.userId,
      cardId: card.id,
      reviewTime: now,
      rating,
      prevState: card.state,
      newState: result.state,
      prevInterval: card.interval,
      newInterval: result.interval,
      prevEaseFactor: card.easeFactor,
      newEaseFactor: result.easeFactor,
      prevDue: card.due,
      newDue: result.due,
      createdAt: now,
    }
    await db.reviewLogs.add(reviewLog)

    // 更新卡片
    const updatedCard: Card = {
      ...card,
      state: result.state,
      queue: result.queue,
      due: result.due,
      interval: result.interval,
      easeFactor: result.easeFactor,
      stability: result.stability ?? card.stability,
      difficulty: result.difficulty ?? card.difficulty,
      reps: card.reps + 1,
      lapses: rating === 1 ? card.lapses + 1 : card.lapses,
      lastReview: now,
      updatedAt: now,
      dirty: 1,
    }
    await db.cards.put(updatedCard)

    return reviewLogId
  },

  /**
   * 获取笔记的所有卡片
   */
  async getByNoteId(noteId: string): Promise<Card[]> {
    return db.cards
      .where('noteId')
      .equals(noteId)
      .filter((c) => !c.deletedAt)
      .toArray()
  },

  /**
   * 批量创建卡片
   */
  async bulkCreate(cards: Card[]): Promise<void> {
    await db.cards.bulkAdd(cards)
  },

  /**
   * 获取全局统计
   */
  async getGlobalStats(): Promise<{
    total: number
    new: number
    learning: number
    review: number
    suspended: number
  }> {
    const cards = await db.cards.filter((c) => !c.deletedAt).toArray()
    const now = Date.now()

    return {
      total: cards.length,
      new: cards.filter((c) => c.state === 'new').length,
      learning: cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length,
      review: cards.filter((c) => c.state === 'review' && c.due <= now).length,
      suspended: cards.filter((c) => c.queue === 'suspended').length,
    }
  },
}
