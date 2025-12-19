import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Home, CheckCircle, Loader2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { FlipCard } from '@/components/FlipCard'
import { cardRepository } from '@/db/repositories'
import { reviewLogRepo } from '@/db/repositories/reviewLog'
import { db } from '@/db'
import type { Card as CardType, Note, NoteModel, CardTemplate, Rating } from '@/types'
import { getButtonIntervals } from '@/scheduler'
import type { SchedulerType } from '@/types'

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

interface ReviewCard extends CardType {
  note: Note
  noteModel: NoteModel
  template: CardTemplate
}

// 撤销历史记录
interface UndoRecord {
  cardSnapshot: CardType
  reviewLogId: string
  previousIndex: number
}

export function ReviewPage() {
  const [searchParams] = useSearchParams()
  // 支持单个牌组 (?deck=xxx) 或多个牌组 (?decks=xxx,yyy,zzz)
  const deckParam = searchParams.get('deck')
  const decksParam = searchParams.get('decks')
  const deckIds: string[] | undefined = decksParam
    ? decksParam.split(',').filter(Boolean)
    : deckParam
      ? [deckParam]
      : undefined

  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)

  // 撤销功能状态
  const [undoStack, setUndoStack] = useState<UndoRecord[]>([])
  const canUndo = undoStack.length > 0

  const loadCards = useCallback(async () => {
    try {
      setLoading(true)
      const dueCards = await cardRepository.getDueCards(deckIds, {
        limit: 100,
        applyNewCardLimit: true,
      })

      // 加载关联数据
      const reviewCards: ReviewCard[] = []
      for (const card of dueCards) {
        const note = await db.notes.get(card.noteId)
        if (!note) continue

        const noteModel = await db.noteModels.get(note.noteModelId)
        if (!noteModel) continue

        const template = await db.cardTemplates.get(card.cardTemplateId)
        if (!template) continue

        reviewCards.push({
          ...card,
          note,
          noteModel,
          template,
        })
      }

      setCards(reviewCards)
      setTotal(reviewCards.length)
      setCurrentIndex(0)
      setCompleted(0)
      setShowAnswer(false)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckParam, decksParam])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const currentCard = cards[currentIndex]

  const handleAnswer = async (rating: Rating) => {
    if (!currentCard) return

    // 保存当前卡片状态用于撤销
    const cardSnapshot: CardType = { ...currentCard }

    // 提交复习结果并获取日志ID
    const reviewLogId = await cardRepository.submitReview(currentCard.id, rating)

    // 保存到撤销栈（最多10条）
    setUndoStack((prev) => [
      ...prev.slice(-9),
      { cardSnapshot, reviewLogId, previousIndex: currentIndex },
    ])

    // 更新进度
    setCompleted((prev) => prev + 1)
    setShowAnswer(false)

    // 移动到下一张
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // 重新加载卡片（可能有新的到期卡片）
      await loadCards()
    }
  }

  // 撤销上一次评分
  const handleUndo = async () => {
    if (undoStack.length === 0) return

    const lastUndo = undoStack[undoStack.length - 1]
    const { cardSnapshot, reviewLogId, previousIndex } = lastUndo

    try {
      // 删除复习日志
      await reviewLogRepo.delete(reviewLogId)

      // 恢复卡片状态
      await db.cards.update(cardSnapshot.id, {
        state: cardSnapshot.state,
        queue: cardSnapshot.queue,
        interval: cardSnapshot.interval,
        easeFactor: cardSnapshot.easeFactor,
        due: cardSnapshot.due,
        reps: cardSnapshot.reps,
        lapses: cardSnapshot.lapses,
        lastReview: cardSnapshot.lastReview,
      })

      // 重新加载卡片数据（获取更新后的状态）
      const restoredCard = await db.cards.get(cardSnapshot.id)
      if (restoredCard) {
        const note = await db.notes.get(restoredCard.noteId)
        if (note) {
          const noteModel = await db.noteModels.get(note.noteModelId)
          const template = await db.cardTemplates.get(restoredCard.cardTemplateId)

          if (noteModel && template) {
            // 更新卡片列表
            const updatedCards = [...cards]
            updatedCards[previousIndex] = {
              ...restoredCard,
              note,
              noteModel,
              template,
            }
            setCards(updatedCards)
          }
        }
      }

      // 恢复状态
      setCurrentIndex(previousIndex)
      setCompleted((prev) => Math.max(0, prev - 1))
      setShowAnswer(false)

      // 从撤销栈移除
      setUndoStack((prev) => prev.slice(0, -1))
    } catch (error) {
      console.error('Failed to undo:', error)
    }
  }

  // 渲染卡片内容
  const renderContent = (template: string, fields: Record<string, string>, isQuestion: boolean) => {
    let content = template

    // 替换 {{cloze:FieldName}} - 处理填空模板
    content = content.replace(/\{\{cloze:(\w+)\}\}/g, (_, fieldName) => {
      const fieldValue = fields[fieldName] || ''
      if (isQuestion) {
        // 问题侧：将 {{c1::answer}} 替换为 [...] 或显示 hint
        return fieldValue.replace(
          /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g,
          (__, _answer, hint) => `<span class="cloze-blank">${hint || '...'}</span>`,
        )
      } else {
        // 答案侧：将 {{c1::answer}} 替换为高亮的答案
        return fieldValue.replace(
          /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g,
          (__, answer) => `<span class="cloze">${answer}</span>`,
        )
      }
    })

    // 替换字段占位符 {{FieldName}}
    for (const [key, value] of Object.entries(fields)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    // 替换条件渲染 {{#Field}}...{{/Field}}
    for (const [key, value] of Object.entries(fields)) {
      const pattern = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g')
      content = content.replace(pattern, value ? '$1' : '')
    }
    // 移除空的条件块
    content = content.replace(/\{\{#\w+\}\}[\s\S]*?\{\{\/\w+\}\}/g, '')
    return content
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (cards.length === 0 || !currentCard) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground flex items-center gap-1">
              <Home className="h-4 w-4" />
              首页
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">复习</span>
          </nav>

          <Empty className="border rounded-lg max-w-2xl mx-auto py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </EmptyMedia>
              <EmptyTitle>恭喜！</EmptyTitle>
              <EmptyDescription>今日复习已完成，或暂无待复习的卡片</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex gap-4">
                <Button asChild>
                  <Link to="/decks">查看牌组</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/market">浏览市场</Link>
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </div>
      </div>
    )
  }

  const scheduler = getSchedulerFromSettings()
  const intervals = getButtonIntervals(currentCard, scheduler)
  const { note, noteModel, template } = currentCard

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground flex items-center gap-1">
            <Home className="h-4 w-4" />
            首页
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">复习</span>
        </nav>

        {/* Progress */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span>进度</span>
              {canUndo && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleUndo}>
                  <Undo2 className="h-3 w-3 mr-1" />
                  撤销
                </Button>
              )}
            </div>
            <span>
              {completed} / {total}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Card - 翻转卡片 */}
        <div className="max-w-2xl mx-auto">
          <FlipCard
            questionHtml={renderContent(template.questionTemplate, note.fields, true)}
            answerHtml={renderContent(template.answerTemplate, note.fields, false)}
            css={noteModel.css || ''}
            theme="cupcake"
            isFlipped={showAnswer}
            minHeight={200}
          />
        </div>

        {/* Actions */}
        <div className="max-w-2xl mx-auto mt-6">
          {!showAnswer ? (
            <Button className="w-full" size="lg" onClick={() => setShowAnswer(true)}>
              显示答案
            </Button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <Button variant="destructive" size="lg" onClick={() => handleAnswer(1)}>
                <div className="flex flex-col items-center">
                  <span>重来</span>
                  <span className="text-xs opacity-80">{intervals.again}</span>
                </div>
              </Button>
              <Button variant="outline" size="lg" onClick={() => handleAnswer(2)}>
                <div className="flex flex-col items-center">
                  <span>困难</span>
                  <span className="text-xs opacity-80">{intervals.hard}</span>
                </div>
              </Button>
              <Button variant="secondary" size="lg" onClick={() => handleAnswer(3)}>
                <div className="flex flex-col items-center">
                  <span>良好</span>
                  <span className="text-xs opacity-80">{intervals.good}</span>
                </div>
              </Button>
              <Button size="lg" onClick={() => handleAnswer(4)}>
                <div className="flex flex-col items-center">
                  <span>简单</span>
                  <span className="text-xs opacity-80">{intervals.easy}</span>
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
