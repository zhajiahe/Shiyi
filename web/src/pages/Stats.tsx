import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  ChevronRight, Home, BarChart3, Calendar, TrendingUp, 
  Loader2, Target, Award, Clock, Brain
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import type { ReviewLog } from '@/types'

// 颜色强度等级
const HEAT_COLORS = [
  'bg-slate-100 dark:bg-slate-800',
  'bg-green-200 dark:bg-green-900/50',
  'bg-green-300 dark:bg-green-800/60',
  'bg-green-400 dark:bg-green-700/70',
  'bg-green-500 dark:bg-green-600',
]

// 获取过去N天的日期数组
function getPastDays(days: number): Date[] {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    result.push(date)
  }
  return result
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// 获取星期几
function getWeekDay(date: Date): number {
  return date.getDay()
}

export function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([])
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const logs = await db.reviewLogs.toArray()
      setReviewLogs(logs)
    } finally {
      setLoading(false)
    }
  }

  // 计算总体统计
  const overallStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000
    const monthStart = todayStart - 29 * 24 * 60 * 60 * 1000

    const todayLogs = reviewLogs.filter(l => l.reviewTime >= todayStart)
    const weekLogs = reviewLogs.filter(l => l.reviewTime >= weekStart)
    const monthLogs = reviewLogs.filter(l => l.reviewTime >= monthStart)

    const todayCorrect = todayLogs.filter(l => l.rating >= 3).length
    const weekCorrect = weekLogs.filter(l => l.rating >= 3).length
    const monthCorrect = monthLogs.filter(l => l.rating >= 3).length

    return {
      today: {
        reviews: todayLogs.length,
        retention: todayLogs.length > 0 ? Math.round((todayCorrect / todayLogs.length) * 100) : 0,
      },
      week: {
        reviews: weekLogs.length,
        retention: weekLogs.length > 0 ? Math.round((weekCorrect / weekLogs.length) * 100) : 0,
      },
      month: {
        reviews: monthLogs.length,
        retention: monthLogs.length > 0 ? Math.round((monthCorrect / monthLogs.length) * 100) : 0,
      },
      total: reviewLogs.length,
      streak: calculateStreak(reviewLogs),
    }
  }, [reviewLogs])

  // 计算学习热力图数据
  const heatmapData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365
    const dates = getPastDays(days)
    
    // 统计每天的复习次数
    const countByDate = new Map<string, number>()
    reviewLogs.forEach(log => {
      const date = new Date(log.reviewTime)
      const dateStr = formatDate(date)
      countByDate.set(dateStr, (countByDate.get(dateStr) || 0) + 1)
    })
    
    // 找到最大值用于归一化
    const maxCount = Math.max(1, ...countByDate.values())
    
    return dates.map(date => {
      const dateStr = formatDate(date)
      const count = countByDate.get(dateStr) || 0
      const intensity = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4))
      return { date, dateStr, count, intensity, weekDay: getWeekDay(date) }
    })
  }, [reviewLogs, timeRange])

  // 计算每日复习趋势
  const dailyTrend = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90
    const dates = getPastDays(days)
    
    return dates.map(date => {
      const dateStr = formatDate(date)
      const dayStart = date.getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000
      
      const dayLogs = reviewLogs.filter(l => l.reviewTime >= dayStart && l.reviewTime < dayEnd)
      const correct = dayLogs.filter(l => l.rating >= 3).length
      
      return {
        date: dateStr,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        reviews: dayLogs.length,
        retention: dayLogs.length > 0 ? Math.round((correct / dayLogs.length) * 100) : 0,
      }
    })
  }, [reviewLogs, timeRange])

  // 计算记忆保持率曲线
  const retentionCurve = useMemo(() => {
    // 按间隔天数分组
    const intervalGroups = new Map<number, { total: number; correct: number }>()
    
    reviewLogs.forEach(log => {
      if (log.prevInterval !== undefined && log.prevInterval > 0) {
        const intervalDays = Math.round(log.prevInterval)
        const group = intervalGroups.get(intervalDays) || { total: 0, correct: 0 }
        group.total++
        if (log.rating >= 3) group.correct++
        intervalGroups.set(intervalDays, group)
      }
    })
    
    // 转换为数组并排序
    return Array.from(intervalGroups.entries())
      .map(([interval, data]) => ({
        interval,
        retention: Math.round((data.correct / data.total) * 100),
        count: data.total,
      }))
      .sort((a, b) => a.interval - b.interval)
      .slice(0, 30) // 只显示前30个间隔
  }, [reviewLogs])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground flex items-center gap-1">
            <Home className="h-4 w-4" />
            首页
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">学习统计</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            学习统计
          </h1>
          <p className="mt-2 text-muted-foreground">
            追踪您的学习进度和记忆表现
          </p>
        </header>

        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">今日复习</p>
                  <p className="text-2xl font-bold">{overallStats.today.reviews}</p>
                </div>
                <Target className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">今日正确率</p>
                  <p className="text-2xl font-bold">{overallStats.today.retention}%</p>
                </div>
                <Award className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">本周复习</p>
                  <p className="text-2xl font-bold">{overallStats.week.reviews}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">连续学习</p>
                  <p className="text-2xl font-bold">{overallStats.streak} 天</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 时间范围选择 */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'week' as const, label: '最近7天' },
            { value: 'month' as const, label: '最近30天' },
            { value: 'year' as const, label: '最近一年' },
          ].map(opt => (
            <Button
              key={opt.value}
              variant={timeRange === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* 学习热力图 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              学习热力图
            </CardTitle>
            <CardDescription>
              每日学习活动可视化
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeRange === 'year' ? (
              // 年度热力图 - 类似 GitHub 贡献图
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {Array.from({ length: 53 }).map((_, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const dataIndex = weekIndex * 7 + dayIndex
                        const data = heatmapData[dataIndex]
                        if (!data) return <div key={dayIndex} className="w-3 h-3" />
                        return (
                          <div
                            key={dayIndex}
                            className={`w-3 h-3 rounded-sm ${HEAT_COLORS[data.intensity]} cursor-pointer`}
                            title={`${data.dateStr}: ${data.count} 次复习`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <span>少</span>
                  {HEAT_COLORS.map((color, i) => (
                    <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
                  ))}
                  <span>多</span>
                </div>
              </div>
            ) : (
              // 月度/周度热力图 - 网格形式
              <div className="space-y-1">
                {['日', '一', '二', '三', '四', '五', '六'].map((day, dayIndex) => (
                  <div key={dayIndex} className="flex items-center gap-1">
                    <span className="w-6 text-xs text-muted-foreground">{day}</span>
                    <div className="flex gap-1">
                      {heatmapData
                        .filter(d => d.weekDay === dayIndex)
                        .map(d => (
                          <div
                            key={d.dateStr}
                            className={`w-6 h-6 rounded ${HEAT_COLORS[d.intensity]} flex items-center justify-center text-xs cursor-pointer`}
                            title={`${d.dateStr}: ${d.count} 次复习`}
                          >
                            {d.count > 0 && d.count}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 每日复习趋势 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              复习趋势
            </CardTitle>
            <CardDescription>
              每日复习数量和正确率
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {dailyTrend.map((day, index) => {
                const maxReviews = Math.max(1, ...dailyTrend.map(d => d.reviews))
                const height = day.reviews > 0 ? Math.max(8, (day.reviews / maxReviews) * 100) : 0
                
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-primary/80 rounded-t cursor-pointer hover:bg-primary transition-colors"
                      style={{ height: `${height}%` }}
                      title={`${day.date}\n复习: ${day.reviews}\n正确率: ${day.retention}%`}
                    />
                    {index % (timeRange === 'week' ? 1 : timeRange === 'month' ? 5 : 10) === 0 && (
                      <span className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                        {day.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 记忆保持率曲线 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              记忆保持率曲线
            </CardTitle>
            <CardDescription>
              不同复习间隔下的记忆保持率
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retentionCurve.length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {retentionCurve.map((point) => (
                  <div key={point.interval} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-t cursor-pointer transition-colors ${
                        point.retention >= 90 ? 'bg-green-500' :
                        point.retention >= 80 ? 'bg-green-400' :
                        point.retention >= 70 ? 'bg-yellow-400' :
                        point.retention >= 60 ? 'bg-orange-400' : 'bg-red-400'
                      }`}
                      style={{ height: `${point.retention}%` }}
                      title={`间隔 ${point.interval} 天\n保持率: ${point.retention}%\n样本数: ${point.count}`}
                    />
                    {point.interval <= 30 && point.interval % (point.interval <= 7 ? 1 : 5) === 0 && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {point.interval}d
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                暂无足够的数据生成记忆曲线
              </div>
            )}
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>≥90%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-400" />
                <span>80-89%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-400" />
                <span>70-79%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-400" />
                <span>60-69%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-400" />
                <span>&lt;60%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 计算连续学习天数
function calculateStreak(logs: ReviewLog[]): number {
  if (logs.length === 0) return 0
  
  const dateSet = new Set<string>()
  logs.forEach(log => {
    const date = new Date(log.reviewTime)
    dateSet.add(formatDate(date))
  })
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = formatDate(checkDate)
    
    if (dateSet.has(dateStr)) {
      streak++
    } else if (i > 0) {
      // 如果不是今天且没有记录，停止计数
      break
    }
  }
  
  return streak
}

