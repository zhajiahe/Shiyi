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
  
  // Actions
  loadDeck: (deckId: string, userId: string) => Promise<void>
  nextCard: () => void
  answerCard: (rating: Rating) => Promise<void>
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
          noteModel = await db.noteModels.get(note.noteModelId) || null
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
      noteModel = await db.noteModels.get(note.noteModelId) || null
    }

    set({
      currentIndex: nextIndex,
      currentNote: note || null,
      currentNoteModel: noteModel,
      showAnswer: false,
    })
  },

  answerCard: async (rating: Rating) => {
    const { currentCards, currentIndex } = get()
    const card = currentCards[currentIndex]
    if (!card) return

    const userId = card.userId
    
    // 计算新的调度
    const result = scheduleSM2(card, rating)
    
    // 记录复习日志
    await reviewLogRepo.create(userId, card.id, rating, {
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

    // 下一张
    get().nextCard()
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
    })
  },
}))



