import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Library, ShoppingBag, Loader2, Settings, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cardRepository } from '@/db/repositories'

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    dueReview: 0,
    newCards: 0,
    learning: 0,
    total: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const globalStats = await cardRepository.getGlobalStats()
      setStats({
        dueReview: globalStats.review,
        newCards: globalStats.new,
        learning: globalStats.learning,
        total: globalStats.total,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">首页</h1>
        <p className="text-muted-foreground">现代化间隔重复记忆系统</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日待复习</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.dueReview}
              </div>
              <p className="text-xs text-muted-foreground">张卡片</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">新卡片</CardTitle>
              <Library className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.newCards}
              </div>
              <p className="text-xs text-muted-foreground">待学习</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学习中</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.learning}
              </div>
              <p className="text-xs text-muted-foreground">进行中</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总卡片数</CardTitle>
              <Library className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
              </div>
              <p className="text-xs text-muted-foreground">张卡片</p>
            </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-colors hover:bg-muted/50">
            <Link to="/decks">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Library className="h-5 w-5" />
                  我的牌组
                </CardTitle>
                <CardDescription>
                  管理您的牌组和卡片
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  查看牌组
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="transition-colors hover:bg-muted/50">
            <Link to="/review">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5" />
                  开始复习
                </CardTitle>
                <CardDescription>
                  复习今日到期的卡片
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  开始学习
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="transition-colors hover:bg-muted/50">
            <Link to="/market">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="h-5 w-5" />
                  牌组市场
                </CardTitle>
                <CardDescription>
                  浏览和下载共享牌组
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  浏览市场
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="transition-colors hover:bg-muted/50">
            <Link to="/stats">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  学习统计
                </CardTitle>
                <CardDescription>
                  查看学习进度和数据分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  查看统计
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="transition-colors hover:bg-muted/50">
            <Link to="/settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  设置
                </CardTitle>
                <CardDescription>
                  调整学习参数和偏好
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  打开设置
                </Button>
              </CardContent>
            </Link>
          </Card>
      </div>
    </div>
  )
}
