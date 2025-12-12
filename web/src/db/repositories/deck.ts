/**
 * Deck 本地存储操作
 */

import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { Deck, DeckConfig, SchedulerType } from '@/types'

const DEFAULT_CONFIG: DeckConfig = {
  newPerDay: 20,
  maxReviewsPerDay: 200,
  learningSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
}

export const deckRepo = {
  /**
   * 获取所有牌组
   */
  async getAll(userId: string): Promise<Deck[]> {
    return db.decks
      .where('userId')
      .equals(userId)
      .and((d) => !d.deletedAt)
      .toArray()
  },

  /**
   * 获取根牌组（无父级）
   */
  async getRootDecks(userId: string): Promise<Deck[]> {
    return db.decks
      .where('userId')
      .equals(userId)
      .and((d) => !d.deletedAt && !d.parentId)
      .toArray()
  },

  /**
   * 获取子牌组
   */
  async getChildren(parentId: string): Promise<Deck[]> {
    return db.decks
      .where('parentId')
      .equals(parentId)
      .and((d) => !d.deletedAt)
      .toArray()
  },

  /**
   * 根据 ID 获取牌组
   */
  async getById(id: string): Promise<Deck | undefined> {
    const deck = await db.decks.get(id)
    return deck && !deck.deletedAt ? deck : undefined
  },

  /**
   * 创建牌组
   */
  async create(
    userId: string,
    name: string,
    options?: {
      parentId?: string
      noteModelId?: string
      config?: Partial<DeckConfig>
      scheduler?: SchedulerType
      description?: string
    }
  ): Promise<Deck> {
    const now = Date.now()
    const deck: Deck = {
      id: nanoid(),
      userId,
      name,
      parentId: options?.parentId,
      noteModelId: options?.noteModelId,
      config: { ...DEFAULT_CONFIG, ...options?.config },
      scheduler: options?.scheduler || 'sm2',
      description: options?.description,
      createdAt: now,
      updatedAt: now,
    }

    await db.decks.add(deck)
    return deck
  },

  /**
   * 更新牌组
   */
  async update(
    id: string,
    data: Partial<Pick<Deck, 'name' | 'parentId' | 'noteModelId' | 'config' | 'scheduler' | 'description'>>
  ): Promise<void> {
    await db.decks.update(id, {
      ...data,
      updatedAt: Date.now(),
    })
  },

  /**
   * 删除牌组（软删除）
   */
  async delete(id: string): Promise<void> {
    const now = Date.now()
    await db.decks.update(id, { deletedAt: now, updatedAt: now })
  },

  /**
   * 构建牌组树
   */
  async buildTree(userId: string): Promise<(Deck & { children: Deck[] })[]> {
    const allDecks = await this.getAll(userId)
    const deckMap = new Map<string, Deck & { children: Deck[] }>()
    
    // 初始化所有牌组
    allDecks.forEach((deck) => {
      deckMap.set(deck.id, { ...deck, children: [] })
    })

    // 构建树
    const rootDecks: (Deck & { children: Deck[] })[] = []
    deckMap.forEach((deck) => {
      if (deck.parentId) {
        const parent = deckMap.get(deck.parentId)
        if (parent) {
          parent.children.push(deck)
        }
      } else {
        rootDecks.push(deck)
      }
    })

    return rootDecks
  },
}



