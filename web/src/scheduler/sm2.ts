/**
 * SM-2 调度算法实现
 * 
 * SuperMemo 2 算法 - 经典的间隔重复算法
 */

import type { Card, Rating } from '@/types'

export interface SM2Result {
  interval: number       // 新间隔（天）
  easeFactor: number     // 新难度系数（x1000）
  due: number           // 下次复习时间戳
  state: Card['state']  // 新状态
  queue: Card['queue']  // 新队列
}

const MIN_EASE_FACTOR = 1300
const INITIAL_EASE_FACTOR = 2500

/**
 * SM-2 调度计算
 * 
 * @param card 当前卡片
 * @param rating 用户评分 (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @returns 调度结果
 */
export function scheduleSM2(card: Card, rating: Rating): SM2Result {
  const now = Date.now()
  let { interval, easeFactor, state } = card

  // 初始化默认值
  if (!easeFactor) easeFactor = INITIAL_EASE_FACTOR

  if (rating === 1) {
    // Again - 重新学习
    return {
      interval: 0,
      easeFactor: Math.max(MIN_EASE_FACTOR, easeFactor - 200),
      due: now + 10 * 60 * 1000, // 10分钟后
      state: 'relearning',
      queue: 'learning',
    }
  }

  if (state === 'new' || state === 'relearning') {
    // 新卡片或重新学习中的卡片
    if (rating === 2) {
      // Hard - 延迟一点
      return {
        interval: 0,
        easeFactor,
        due: now + 5 * 60 * 1000, // 5分钟后
        state: 'learning',
        queue: 'learning',
      }
    } else if (rating === 3) {
      // Good - 毕业到复习队列
      return {
        interval: 1,
        easeFactor,
        due: now + 24 * 60 * 60 * 1000, // 明天
        state: 'review',
        queue: 'review',
      }
    } else {
      // Easy - 直接跳到较长间隔
      return {
        interval: 4,
        easeFactor: easeFactor + 150,
        due: now + 4 * 24 * 60 * 60 * 1000, // 4天后
        state: 'review',
        queue: 'review',
      }
    }
  }

  // 复习中的卡片
  // 计算新的难度系数
  let newEaseFactor = easeFactor
  if (rating === 2) {
    newEaseFactor = easeFactor - 150
  } else if (rating === 4) {
    newEaseFactor = easeFactor + 150
  }
  newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor)

  // 计算新间隔
  let newInterval: number
  if (rating === 2) {
    // Hard - 间隔增加较少
    newInterval = Math.max(1, Math.round(interval * 1.2))
  } else if (rating === 3) {
    // Good - 正常增加
    newInterval = Math.max(1, Math.round(interval * (newEaseFactor / 1000)))
  } else {
    // Easy - 间隔增加更多
    newInterval = Math.max(1, Math.round(interval * (newEaseFactor / 1000) * 1.3))
  }

  // 限制最大间隔为365天
  newInterval = Math.min(365, newInterval)

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    due: now + newInterval * 24 * 60 * 60 * 1000,
    state: 'review',
    queue: 'review',
  }
}

/**
 * 获取评分按钮的预计间隔显示
 */
export function getButtonIntervals(card: Card): {
  again: string
  hard: string
  good: string
  easy: string
} {
  const { interval, easeFactor, state } = card
  const ef = easeFactor || INITIAL_EASE_FACTOR

  if (state === 'new' || state === 'relearning') {
    return {
      again: '10分钟',
      hard: '5分钟',
      good: '1天',
      easy: '4天',
    }
  }

  const hardInterval = Math.max(1, Math.round(interval * 1.2))
  const goodInterval = Math.max(1, Math.round(interval * (ef / 1000)))
  const easyInterval = Math.max(1, Math.round(interval * (ef / 1000) * 1.3))

  return {
    again: '10分钟',
    hard: formatInterval(hardInterval),
    good: formatInterval(goodInterval),
    easy: formatInterval(easyInterval),
  }
}

function formatInterval(days: number): string {
  if (days === 1) return '1天'
  if (days < 30) return `${days}天`
  if (days < 365) return `${Math.round(days / 30)}月`
  return `${Math.round(days / 365)}年`
}

