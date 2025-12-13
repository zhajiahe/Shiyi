import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Home, Download, Star, Users, BookOpen, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSharedDecks, importSharedDeck } from '@/api/sharedDecks'
import type { SharedDeck } from '@/types'

const PAGE_SIZE = 6

export function MarketPage() {
  const [decks, setDecks] = useState<SharedDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadDecks(page)
  }, [page])

  const loadDecks = async (pageNum: number) => {
    try {
      setLoading(true)
      setError(null)
      const result = await getSharedDecks({ page: pageNum, pageSize: PAGE_SIZE })
      setDecks(result.items)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleImport = async (deck: SharedDeck) => {
    try {
      setImporting(deck.id)
      const result = await importSharedDeck(deck.slug)
      toast.success('导入成功', {
        description: `已导入 ${result.noteCount} 条笔记，${result.cardCount} 张卡片`,
      })
    } catch (err) {
      toast.error('导入失败', {
        description: err instanceof Error ? err.message : '请重试',
      })
    } finally {
      setImporting(null)
    }
  }

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
          <span className="text-foreground">牌组市场</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            共享牌组市场
          </h1>
          <p className="text-muted-foreground">
            浏览和导入高质量的学习内容
          </p>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => loadDecks(page)}>重试</Button>
            </CardContent>
          </Card>
        ) : decks.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无共享牌组</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {decks.map(deck => (
              <Card key={deck.id} className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {deck.title}
                        {deck.isOfficial && (
                          <Badge variant="secondary" className="text-xs">
                            官方
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {deck.description || '暂无描述'}
                      </CardDescription>
                    </div>
                    {deck.isFeatured && (
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Tags */}
                  {deck.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {deck.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {deck.noteCount} 笔记
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {deck.downloadCount} 下载
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <Link to={`/market/${deck.slug}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看内容
                      </Link>
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleImport(deck)}
                      disabled={importing === deck.id}
                    >
                      {importing === deck.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          导入中...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          导入
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页 (共 {total} 个牌组)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              下一页
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
