import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, Search, Download, Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function MarketPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sharedDecks] = useState<any[]>([])

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
          <span className="text-foreground">牌组市场</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            牌组市场
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            发现高质量的学习资源
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索牌组..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant="secondary" size="sm">全部</Button>
          <Button variant="outline" size="sm">精选</Button>
          <Button variant="outline" size="sm">官方</Button>
          <Button variant="outline" size="sm">语言学习</Button>
          <Button variant="outline" size="sm">考试备考</Button>
          <Button variant="outline" size="sm">编程技术</Button>
        </div>

        {/* Deck List */}
        {sharedDecks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              暂无共享牌组，请稍后再来
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sharedDecks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="line-clamp-1">{deck.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {deck.description}
                      </CardDescription>
                    </div>
                    {deck.isFeatured && (
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{deck.cardCount} 张卡片</span>
                    <span>{deck.downloadCount} 次下载</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      预览
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



