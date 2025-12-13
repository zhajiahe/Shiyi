/**
 * 学习状态管理
 *
 * 使用 Zustand 管理全局学习状态
 */

import { create } from 'zustand'
import type { Card, Deck, Note, NoteModel } from '@/types'
import { db } from '@/db'
import { cardRepo } from '@/db/repositories/note'
import { reviewLogRepo } from '@/db/repositories/reviewLog'
import { scheduleSM2 } from '@/scheduler/sm2'
import type { Rating } from '@/types'

// 撤销历史记录项
interface UndoHistoryItem {
  card: Card
  reviewLogId: string
  previousIndex: number
}

interface StudyState {
  // 当前学习数据
  currentDeck: Deck | null
  currentCards: Card[]
  currentIndex: number
  currentNote: Note | null
  currentNoteModel: NoteModel | null

  // 学习进度
  newCount: number
  reviewCount: number
  learningCount: number

  // 状态
  isLoading: boolean
  showAnswer: boolean

  // 撤销功能
  undoStack: UndoHistoryItem[]
  canUndo: boolean

  // Actions
  loadDeck: (deckId: string, userId: string) => Promise<void>
  nextCard: () => void
  answerCard: (rating: Rating) => Promise<void>
  undoLastAnswer: () => Promise<void>
  toggleAnswer: () => void
  reset: () => void
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentDeck: null,
  currentCards: [],
  currentIndex: 0,
  currentNote: null,
  currentNoteModel: null,
  newCount: 0,
  reviewCount: 0,
  learningCount: 0,
  isLoading: false,
  showAnswer: false,
  undoStack: [],
  canUndo: false,

  loadDeck: async (deckId: string, userId: string) => {
    set({ isLoading: true })

    try {
      // 获取牌组
      const deck = await db.decks.get(deckId)
      if (!deck) {
        set({ isLoading: false })
        return
      }

      // 获取待复习卡片
      const now = Date.now()
      const cards = await cardRepo.getDueCards(userId, { deckId, dueBefore: now })

      // 统计
      const stats = await cardRepo.countByState(userId, deckId)

      // 加载第一张卡片的笔记
      let note: Note | null = null
      let noteModel: NoteModel | null = null
      if (cards.length > 0) {
        const noteResult = await db.notes.get(cards[0].noteId)
        if (noteResult) {
          note = noteResult
          noteModel = (await db.noteModels.get(note.noteModelId)) || null
        }
      }

      set({
        currentDeck: deck,
        currentCards: cards,
        currentIndex: 0,
        currentNote: note,
        currentNoteModel: noteModel,
        newCount: stats['new'] || 0,
        reviewCount: stats['review'] || 0,
        learningCount: (stats['learning'] || 0) + (stats['relearning'] || 0),
        isLoading: false,
        showAnswer: false,
      })
    } catch (error) {
      console.error('Failed to load deck:', error)
      set({ isLoading: false })
    }
  },

  nextCard: async () => {
    const { currentCards, currentIndex } = get()
    const nextIndex = currentIndex + 1

    if (nextIndex >= currentCards.length) {
      set({ currentNote: null, currentNoteModel: null, showAnswer: false })
      return
    }

    const nextCard = currentCards[nextIndex]
    const note = await db.notes.get(nextCard.noteId)
    let noteModel: NoteModel | null = null
    if (note) {
      noteModel = (await db.noteModels.get(note.noteModelId)) || null
    }

    set({
      currentIndex: nextIndex,
      currentNote: note || null,
      currentNoteModel: noteModel,
      showAnswer: false,
    })
  },

  answerCard: async (rating: Rating) => {
    const { currentCards, currentIndex, undoStack } = get()
    const card = currentCards[currentIndex]
    if (!card) return

    const userId = card.userId

    // 保存撤销历史（深拷贝卡片状态）
    const cardSnapshot: Card = { ...card }

    // 计算新的调度
    const result = scheduleSM2(card, rating)

    // 记录复习日志
    const reviewLogId = await reviewLogRepo.create(userId, card.id, rating, {
      reviewTime: Date.now(),
      prevState: card.state,
      newState: result.state,
      prevInterval: card.interval,
      newInterval: result.interval,
      prevEaseFactor: card.easeFactor,
      newEaseFactor: result.easeFactor,
      prevDue: card.due,
      newDue: result.due,
    })

    // 更新卡片
    await cardRepo.update(card.id, {
      state: result.state,
      queue: result.queue,
      interval: result.interval,
      easeFactor: result.easeFactor,
      due: result.due,
      reps: card.reps + 1,
      lapses: rating === 1 ? card.lapses + 1 : card.lapses,
      lastReview: Date.now(),
    })

    // 保存到撤销栈（最多保留10条）
    const newUndoStack = [
      ...undoStack.slice(-9),
      { card: cardSnapshot, reviewLogId, previousIndex: currentIndex },
    ]
    set({ undoStack: newUndoStack, canUndo: true })

    // 下一张
    get().nextCard()
  },

  undoLastAnswer: async () => {
    const { undoStack, currentCards } = get()
    if (undoStack.length === 0) return

    // 取出最后一条撤销记录
    const lastUndo = undoStack[undoStack.length - 1]
    const { card: previousCard, reviewLogId, previousIndex } = lastUndo

    try {
      // 删除复习日志
      await reviewLogRepo.delete(reviewLogId)

      // 恢复卡片状态
      await cardRepo.update(previousCard.id, {
        state: previousCard.state,
        queue: previousCard.queue,
        interval: previousCard.interval,
        easeFactor: previousCard.easeFactor,
        due: previousCard.due,
        reps: previousCard.reps,
        lapses: previousCard.lapses,
        lastReview: previousCard.lastReview,
      })

      // 加载笔记
      const note = await db.notes.get(previousCard.noteId)
      let noteModel: NoteModel | null = null
      if (note) {
        noteModel = (await db.noteModels.get(note.noteModelId)) || null
      }

      // 更新状态
      const newUndoStack = undoStack.slice(0, -1)

      // 更新当前卡片列表中的卡片状态
      const updatedCards = [...currentCards]
      // 将恢复的卡片插回原位置
      if (previousIndex < updatedCards.length) {
        updatedCards[previousIndex] = previousCard
      }

      set({
        currentIndex: previousIndex,
        currentNote: note || null,
        currentNoteModel: noteModel,
        currentCards: updatedCards,
        undoStack: newUndoStack,
        canUndo: newUndoStack.length > 0,
        showAnswer: false,
      })
    } catch (error) {
      console.error('Failed to undo:', error)
    }
  },

  toggleAnswer: () => {
    set((state) => ({ showAnswer: !state.showAnswer }))
  },

  reset: () => {
    set({
      currentDeck: null,
      currentCards: [],
      currentIndex: 0,
      currentNote: null,
      currentNoteModel: null,
      newCount: 0,
      reviewCount: 0,
      learningCount: 0,
      isLoading: false,
      showAnswer: false,
      undoStack: [],
      canUndo: false,
    })
  },
}))
