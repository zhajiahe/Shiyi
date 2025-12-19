import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Share2, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getDecksApiV1DecksGet } from '@/api/generated/decks/decks'
import { getNoteModelsApiV1NoteModelsGet } from '@/api/generated/note-models/note-models'
import type { PageResponseDeckResponse, PageResponseNoteModelResponse } from '@/api/generated/models'

interface Stats {
  deckCount: number
  templateCount: number
  sharedCount: number
  totalDownloads: number
}

export function StudioOverview() {
  const [stats, setStats] = useState<Stats>({
    deckCount: 0,
    templateCount: 0,
    sharedCount: 0,
    totalDownloads: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // 并行获取数据
        const [decksRes, templatesRes] = await Promise.all([
          getDecksApiV1DecksGet({ page_size: 1 }),
          getNoteModelsApiV1NoteModelsGet({ page_size: 1 }),
        ])

        const decks = decksRes as PageResponseDeckResponse
        const templates = templatesRes as PageResponseNoteModelResponse

        setStats({
          deckCount: decks.total ?? 0,
          templateCount: templates.total ?? 0,
          sharedCount: 0, // TODO: 获取已发布数量
          totalDownloads: 0, // TODO: 获取总下载量
        })
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">牌组开发工作台</h1>
        <p className="text-muted-foreground">创建和管理您的学习内容</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">我的牌组</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deckCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">笔记类型</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.templateCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已发布</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sharedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总下载</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads}</div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷入口 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>创建牌组</CardTitle>
            <CardDescription>创建新的学习牌组并添加笔记</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/studio/decks">
                <Plus className="mr-2 h-4 w-4" />
                管理牌组
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>浏览模板</CardTitle>
            <CardDescription>查看内置模板或创建自定义笔记类型</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/studio/templates">浏览模板市场</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
