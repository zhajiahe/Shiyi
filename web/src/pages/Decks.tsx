import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, FolderOpen, Home } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DecksPage() {
  const [decks] = useState<any[]>([])

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
          <span className="text-foreground">牌组</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              我的牌组
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              管理您的学习牌组
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建牌组
          </Button>
        </div>

        {/* Deck List */}
        {decks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无牌组</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个牌组，或从市场下载共享牌组
              </p>
              <div className="flex gap-4 justify-center">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新建牌组
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/market">浏览市场</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {decks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{deck.name}</CardTitle>
                  <CardDescription>{deck.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>新卡: 0</span>
                      <span>复习: 0</span>
                    </div>
                    <Button variant="outline" size="sm">
                      开始学习
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



