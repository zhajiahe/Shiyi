import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Home, CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cardRepository } from '@/db/repositories'
import { db } from '@/db'
import type { Card as CardType, Note, NoteModel, CardTemplate, Rating } from '@/types'
import { getButtonIntervals } from '@/scheduler/sm2'

interface ReviewCard extends CardType {
  note: Note
  noteModel: NoteModel
  template: CardTemplate
}

export function ReviewPage() {
  const [searchParams] = useSearchParams()
  const deckId = searchParams.get('deck') || undefined
  
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)

  const loadCards = useCallback(async () => {
    try {
      setLoading(true)
      const dueCards = await cardRepository.getDueCards(deckId, 100)
      
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
  }, [deckId])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const currentCard = cards[currentIndex]

  const handleAnswer = async (rating: Rating) => {
    if (!currentCard) return
    
    // 提交复习结果
    await cardRepository.submitReview(currentCard.id, rating)
    
    // 更新进度
    setCompleted(prev => prev + 1)
    setShowAnswer(false)
    
    // 移动到下一张
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      // 重新加载卡片（可能有新的到期卡片）
      await loadCards()
    }
  }

  // 渲染卡片内容
  const renderContent = (template: string, fields: Record<string, string>) => {
    let content = template
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (cards.length === 0 || !currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
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

          <Card className="max-w-2xl mx-auto text-center py-16">
            <CardContent>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">恭喜！</h2>
              <p className="text-muted-foreground mb-6">
                今日复习已完成，或暂无待复习的卡片
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/decks">查看牌组</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/market">浏览市场</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const intervals = getButtonIntervals(currentCard)
  const { note, noteModel, template } = currentCard

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
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
            <span>进度</span>
            <span>{completed} / {total}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <Card className="max-w-2xl mx-auto overflow-hidden">
          {/* 注入 CSS */}
          {noteModel.css && (
            <style dangerouslySetInnerHTML={{ __html: noteModel.css }} />
          )}
          
          <CardContent className="p-0">
            {/* 问题面 */}
            <div 
              className="min-h-[200px] p-8"
              dangerouslySetInnerHTML={{ 
                __html: renderContent(template.questionTemplate, note.fields) 
              }}
            />

            {showAnswer && (
              <>
                <hr />
                {/* 答案面 */}
                <div 
                  className="min-h-[200px] p-8"
                  dangerouslySetInnerHTML={{ 
                    __html: renderContent(template.answerTemplate, note.fields) 
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="max-w-2xl mx-auto mt-6">
          {!showAnswer ? (
            <Button className="w-full" size="lg" onClick={() => setShowAnswer(true)}>
              显示答案
            </Button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <Button 
                variant="destructive" 
                size="lg"
                onClick={() => handleAnswer(1)}
              >
                <div className="flex flex-col items-center">
                  <span>重来</span>
                  <span className="text-xs opacity-80">{intervals.again}</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => handleAnswer(2)}
              >
                <div className="flex flex-col items-center">
                  <span>困难</span>
                  <span className="text-xs opacity-80">{intervals.hard}</span>
                </div>
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => handleAnswer(3)}
              >
                <div className="flex flex-col items-center">
                  <span>良好</span>
                  <span className="text-xs opacity-80">{intervals.good}</span>
                </div>
              </Button>
              <Button 
                size="lg"
                onClick={() => handleAnswer(4)}
              >
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
