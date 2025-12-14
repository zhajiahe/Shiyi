/**
 * 调度器统一入口
 *
 * 根据用户设置选择 SM-2 或 FSRS 算法
 */

import type { Card, Rating, SchedulerType } from '@/types'
import { scheduleSM2, getButtonIntervals as getSM2Intervals, type SM2Result } from './sm2'
import { scheduleFSRS, getFSRSButtonIntervals, type FSRSResult } from './fsrs'

export interface ScheduleResult {
  interval: number
  easeFactor: number
  due: number
  state: Card['state']
  queue: Card['queue']
  stability?: number
  difficulty?: number
}

/**
 * 执行卡片调度
 *
 * @param card 当前卡片
 * @param rating 用户评分
 * @param scheduler 调度器类型
 */
export function schedule(
  card: Card,
  rating: Rating,
  scheduler: SchedulerType = 'sm2',
): ScheduleResult {
  if (scheduler === 'sm2') {
    const result = scheduleSM2(card, rating)
    return {
      ...result,
      stability: card.stability,
      difficulty: card.difficulty,
    }
  } else {
    const result = scheduleFSRS(card, rating, scheduler)
    return result
  }
}

/**
 * 获取评分按钮预计间隔
 */
export function getButtonIntervals(
  card: Card,
  scheduler: SchedulerType = 'sm2',
): {
  again: string
  hard: string
  good: string
  easy: string
} {
  if (scheduler === 'sm2') {
    return getSM2Intervals(card)
  } else {
    return getFSRSButtonIntervals(card, scheduler)
  }
}

export { scheduleSM2, scheduleFSRS }
export type { SM2Result, FSRSResult }

