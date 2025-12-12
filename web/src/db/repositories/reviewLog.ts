/**
 * ReviewLog 本地存储操作
 */

import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { ReviewLog, Rating } from '@/types'

export const reviewLogRepo = {
  /**
   * 获取卡片的复习日志
   */
  async getByCardId(cardId: string): Promise<ReviewLog[]> {
    return db.reviewLogs
      .where('cardId')
      .equals(cardId)
      .reverse()
      .toArray()
  },

  /**
   * 创建复习日志
   * @returns 日志的 ID
   */
  async create(
    userId: string,
    cardId: string,
    rating: Rating,
    data: {
      reviewTime: number
      prevState?: string
      newState?: string
      prevInterval?: number
      newInterval?: number
      prevEaseFactor?: number
      newEaseFactor?: number
      prevDue?: number
      newDue?: number
      prevStability?: number
      newStability?: number
      prevDifficulty?: number
      newDifficulty?: number
      durationMs?: number
    }
  ): Promise<string> {
    const log: ReviewLog = {
      id: nanoid(),
      userId,
      cardId,
      rating,
      ...data,
      createdAt: Date.now(),
    }

    await db.reviewLogs.add(log)
    return log.id
  },

  /**
   * 删除复习日志（用于撤销功能）
   */
  async delete(id: string): Promise<void> {
    await db.reviewLogs.delete(id)
  },

  /**
   * 获取统计信息
   */
  async getStats(userId: string): Promise<{
    totalReviews: number
    reviewsToday: number
    reviewsThisWeek: number
    averageRating: number
    retentionRate: number
  }> {
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000

    const allLogs = await db.reviewLogs
      .where('userId')
      .equals(userId)
      .toArray()

    const totalReviews = allLogs.length
    const reviewsToday = allLogs.filter((l) => l.reviewTime >= todayStart).length
    const reviewsThisWeek = allLogs.filter((l) => l.reviewTime >= weekStart).length

    const avgRating =
      totalReviews > 0
        ? allLogs.reduce((sum, l) => sum + l.rating, 0) / totalReviews
        : 0

    const goodEasyCount = allLogs.filter((l) => l.rating >= 3).length
    const retentionRate = totalReviews > 0 ? (goodEasyCount / totalReviews) * 100 : 0

    return {
      totalReviews,
      reviewsToday,
      reviewsThisWeek,
      averageRating: Math.round(avgRating * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
    }
  },
}

