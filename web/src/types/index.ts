/**
 * 核心类型定义
 * 与后端模型对应
 */

// ==================== 笔记类型 ====================

export interface FieldDefinition {
  name: string
  description?: string
}

export interface CardTemplate {
  id: string
  noteModelId: string
  name: string
  ord: number
  questionTemplate: string
  answerTemplate: string
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

export interface NoteModel {
  id: string
  userId: string
  name: string
  fieldsSchema: FieldDefinition[]
  css?: string
  templates: CardTemplate[]
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

// ==================== 牌组 ====================

export type SchedulerType = 'sm2' | 'fsrs_v4' | 'fsrs_v5'

export interface Deck {
  id: string
  userId: string
  name: string
  noteModelId?: string
  description?: string
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

// ==================== 笔记 ====================

export type SourceType = 'manual' | 'ai' | 'import'

export interface Note {
  id: string
  userId: string
  deckId: string
  noteModelId: string
  guid: string
  fields: Record<string, string>
  tags: string[]
  sourceType: SourceType
  sourceMeta?: Record<string, unknown>
  dirty: number
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

// ==================== 卡片 ====================

export type CardState = 'new' | 'learning' | 'review' | 'relearning'
export type CardQueue = 'new' | 'learning' | 'review' | 'suspended'

export interface Card {
  id: string
  userId: string
  noteId: string
  deckId: string
  cardTemplateId: string
  ord: number
  // 调度状态
  state: CardState
  queue: CardQueue
  due: number
  interval: number
  easeFactor: number
  reps: number
  lapses: number
  lastReview?: number
  // FSRS
  stability: number
  difficulty: number
  dirty: number
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

// ==================== 复习日志 ====================

export type Rating = 1 | 2 | 3 | 4 // 1=Again, 2=Hard, 3=Good, 4=Easy

export interface ReviewLog {
  id: string
  userId: string
  cardId: string
  reviewTime: number
  rating: Rating
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
  createdAt?: number
}

// ==================== 共享牌组 ====================

export interface SharedDeck {
  id: string
  authorId: string
  slug: string
  title: string
  description?: string
  language: string
  tags: string[]
  coverImageUrl?: string
  cardCount: number
  noteCount: number
  downloadCount: number
  version: number
  contentHash?: string
  isFeatured: boolean
  isOfficial: boolean
  isActive: boolean
  createdAt?: number
  updatedAt?: number
}
