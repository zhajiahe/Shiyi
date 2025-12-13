import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Folder, Loader2, Download, Sparkles, Clock, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { deckRepository } from '@/db/repositories'
import type { Deck } from '@/types'

export function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckStats, setDeckStats] = useState<
    Record<string, { new: number; learning: number; review: number; total: number }>
  >({})
  const [globalStats, setGlobalStats] = useState({
    new: 0,
    learning: 0,
    review: 0,
    total: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const allDecks = await deckRepository.getAll()
      setDecks(allDecks)

      // 获取每个牌组的统计
      const stats: Record<
        string,
        { new: number; learning: number; review: number; total: number }
      > = {}
      let totalNew = 0,
        totalLearning = 0,
        totalReview = 0,
        totalCards = 0

      for (const deck of allDecks) {
        const deckStat = await deckRepository.getStats(deck.id)
        stats[deck.id] = deckStat
        totalNew += deckStat.new
        totalLearning += deckStat.learning
        totalReview += deckStat.review
        totalCards += deckStat.total
      }

      setDeckStats(stats)
      setGlobalStats({
        new: totalNew,
        learning: totalLearning,
        review: totalReview,
        total: totalCards,
      })
    } finally {
      setLoading(false)
    }
  }

  const todayTotal = globalStats.new + globalStats.learning + globalStats.review
  const hasStudyContent = todayTotal > 0

  const handleStartStudy = (deckId?: string) => {
    if (deckId) {
      navigate(`/review?deck=${deckId}`)
    } else {
      navigate('/review')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 如果没有牌组，显示引导
  if (decks.length === 0) {
    return (
      <Empty className="border rounded-lg py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>还没有学习内容</EmptyTitle>
            <EmptyDescription>从牌组市场导入共享牌组开始您的学习之旅</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/market">
                <Download className="h-4 w-4 mr-2" />
                浏览牌组市场
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
    )
  }

  return (
    <div className="space-y-6">
      {/* 今日学习概览 */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            今日任务
          </CardTitle>
          <CardDescription>共有 {todayTotal} 张卡片待学习</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">{globalStats.new}</div>
              <div className="text-xs text-muted-foreground">新卡片</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                <Clock className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">{globalStats.learning}</div>
              <div className="text-xs text-muted-foreground">学习中</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">{globalStats.review}</div>
              <div className="text-xs text-muted-foreground">待复习</div>
            </div>
          </div>

          {hasStudyContent ? (
            <Button className="w-full" size="lg" onClick={() => handleStartStudy()}>
              <BookOpen className="h-5 w-5 mr-2" />
              开始学习
            </Button>
          ) : (
            <div className="text-center py-2 text-muted-foreground">🎉 今日学习任务已完成！</div>
          )}
        </CardContent>
      </Card>

      {/* 各牌组学习状态 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">牌组学习进度</h2>
        <div className="grid gap-3">
          {decks.map((deck) => {
            const stats = deckStats[deck.id] || { new: 0, learning: 0, review: 0, total: 0 }
            const deckTotal = stats.new + stats.learning + stats.review
            const masteredPercent =
              stats.total > 0 ? Math.round(((stats.total - deckTotal) / stats.total) * 100) : 0

            return (
              <Card
                key={deck.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => handleStartStudy(deck.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{deck.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stats.new > 0 && (
                        <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                          新 {stats.new}
                        </Badge>
                      )}
                      {stats.learning > 0 && (
                        <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                          学习 {stats.learning}
                        </Badge>
                      )}
                      {stats.review > 0 && (
                        <Badge variant="outline" className="text-green-500 border-green-500/30">
                          复习 {stats.review}
                        </Badge>
                      )}
                      {deckTotal === 0 && <Badge variant="secondary">已完成</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={masteredPercent} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {masteredPercent}% 掌握
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="text-center text-sm text-muted-foreground">
        总计 {globalStats.total} 张卡片 · {decks.length} 个牌组
      </div>
    </div>
  )
}
