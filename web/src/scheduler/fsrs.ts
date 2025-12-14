/**
 * FSRS 调度算法实现
 *
 * 使用 ts-fsrs 库实现 FSRS v4/v5 算法
 */

import { createEmptyCard, fsrs, generatorParameters, Rating as FSRSRating, State } from 'ts-fsrs'
import type { FSRS, RecordLogItem, Card as FSRSCard, Grade } from 'ts-fsrs'
import type { Card, Rating } from '@/types'

export interface FSRSResult {
  interval: number // 新间隔（天）
  stability: number // 新稳定性
  difficulty: number // 新难度
  due: number // 下次复习时间戳
  state: Card['state'] // 新状态
  queue: Card['queue'] // 新队列
  easeFactor: number // 保持兼容 SM-2 的字段
}

// FSRS 实例缓存
let fsrsInstance: FSRS | null = null
let currentVersion: 'fsrs_v4' | 'fsrs_v5' = 'fsrs_v4'

/**
 * 获取或创建 FSRS 实例
 */
function getFSRS(version: 'fsrs_v4' | 'fsrs_v5'): FSRS {
  if (!fsrsInstance || currentVersion !== version) {
    const params = generatorParameters({
      enable_fuzz: true,
      enable_short_term: true,
    })
    fsrsInstance = fsrs(params)
    currentVersion = version
  }
  return fsrsInstance
}

/**
 * 将应用的 Rating 转换为 FSRS Grade（不包含 Manual）
 */
function mapRating(rating: Rating): Grade {
  switch (rating) {
    case 1:
      return FSRSRating.Again
    case 2:
      return FSRSRating.Hard
    case 3:
      return FSRSRating.Good
    case 4:
      return FSRSRating.Easy
  }
}

/**
 * 将 FSRS State 转换为应用的 Card state
 */
function mapState(state: State): Card['state'] {
  switch (state) {
    case State.New:
      return 'new'
    case State.Learning:
      return 'learning'
    case State.Relearning:
      return 'relearning'
    case State.Review:
      return 'review'
    default:
      return 'new'
  }
}

/**
 * 从本地卡片创建 FSRS 卡片
 */
function toFSRSCard(card: Card): FSRSCard {
  // 如果是新卡片，创建空卡片
  if (card.state === 'new') {
    return createEmptyCard()
  }

  // 从现有数据构建 FSRS 卡片
  return {
    due: new Date(card.due),
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: 0,
    scheduled_days: card.interval,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state:
      card.state === 'learning'
        ? State.Learning
        : card.state === 'relearning'
          ? State.Relearning
          : card.state === 'review'
            ? State.Review
            : State.New,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  }
}

/**
 * FSRS 调度计算
 *
 * @param card 当前卡片
 * @param rating 用户评分 (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @param version 算法版本
 * @returns 调度结果
 */
export function scheduleFSRS(
  card: Card,
  rating: Rating,
  version: 'fsrs_v4' | 'fsrs_v5' = 'fsrs_v4',
): FSRSResult {
  const f = getFSRS(version)
  const fsrsCard = toFSRSCard(card)
  const fsrsRating = mapRating(rating)
  const now = new Date()

  // 执行调度 - f.repeat 返回 IPreview，通过 grade 索引获取 RecordLogItem
  const preview = f.repeat(fsrsCard, now)
  const result: RecordLogItem = preview[fsrsRating]
  const newCard = result.card

  return {
    interval: newCard.scheduled_days,
    stability: newCard.stability,
    difficulty: newCard.difficulty,
    due: newCard.due.getTime(),
    state: mapState(newCard.state),
    queue:
      newCard.state === State.New ? 'new' : newCard.state === State.Review ? 'review' : 'learning',
    easeFactor: Math.round(2500 * (1 - newCard.difficulty / 10)), // 近似转换
  }
}

/**
 * 获取 FSRS 评分按钮的预计间隔显示
 */
export function getFSRSButtonIntervals(
  card: Card,
  version: 'fsrs_v4' | 'fsrs_v5' = 'fsrs_v4',
): {
  again: string
  hard: string
  good: string
  easy: string
} {
  const f = getFSRS(version)
  const fsrsCard = toFSRSCard(card)
  const now = new Date()

  const results = f.repeat(fsrsCard, now)

  return {
    again: formatFSRSInterval(results[FSRSRating.Again].card),
    hard: formatFSRSInterval(results[FSRSRating.Hard].card),
    good: formatFSRSInterval(results[FSRSRating.Good].card),
    easy: formatFSRSInterval(results[FSRSRating.Easy].card),
  }
}

function formatFSRSInterval(card: FSRSCard): string {
  const days = card.scheduled_days

  if (days < 1) {
    // 计算分钟
    const minutes = Math.round((card.due.getTime() - Date.now()) / 60000)
    if (minutes <= 0) return '现在'
    if (minutes < 60) return `${minutes}分钟`
    return `${Math.round(minutes / 60)}小时`
  }

  if (days === 1) return '1天'
  if (days < 30) return `${Math.round(days)}天`
  if (days < 365) return `${Math.round(days / 30)}月`
  return `${Math.round(days / 365)}年`
}

