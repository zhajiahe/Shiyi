import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Home, Plus, Folder, BookOpen, Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deckRepository } from '@/db/repositories'
import type { Deck } from '@/types'

export function DecksPage() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckStats, setDeckStats] = useState<Record<string, { new: number; learning: number; review: number; total: number }>>({})
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadDecks()
  }, [])

  const loadDecks = async () => {
    try {
      setLoading(true)
      const allDecks = await deckRepository.getAll()
      setDecks(allDecks)

      // 获取每个牌组的统计
      const stats: Record<string, { new: number; learning: number; review: number; total: number }> = {}
      for (const deck of allDecks) {
        stats[deck.id] = await deckRepository.getStats(deck.id)
      }
      setDeckStats(stats)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return

    try {
      setCreating(true)
      await deckRepository.create({ name: newDeckName.trim() })
      setNewDeckName('')
      setCreateDialogOpen(false)
      await loadDecks()
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个牌组吗？')) return
    
    await deckRepository.delete(deckId)
    await loadDecks()
  }

  const handleStudyDeck = (deckId: string) => {
    navigate(`/review?deck=${deckId}`)
  }

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
          <span className="text-foreground">我的牌组</span>
        </nav>

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              我的牌组
            </h1>
            <p className="text-muted-foreground">
              管理您的学习内容
            </p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建牌组
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建牌组</DialogTitle>
                <DialogDescription>
                  创建一个新的牌组来组织您的学习内容
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="输入牌组名称"
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateDeck()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateDeck} disabled={creating || !newDeckName.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : decks.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">还没有牌组</h3>
              <p className="text-muted-foreground mb-4">
                创建一个新牌组或从市场导入共享牌组开始学习
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setCreateDialogOpen(true)}>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {decks.map(deck => {
              const stats = deckStats[deck.id] || { new: 0, learning: 0, review: 0, total: 0 }
              const hasDue = stats.new > 0 || stats.learning > 0 || stats.review > 0
              
              return (
                <Card 
                  key={deck.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleStudyDeck(deck.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5 text-muted-foreground" />
                        {deck.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteDeck(deck.id, e)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {deck.description && (
                      <CardDescription className="line-clamp-2">
                        {deck.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Stats */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant={stats.new > 0 ? 'default' : 'secondary'}>
                        新 {stats.new}
                      </Badge>
                      <Badge variant={stats.learning > 0 ? 'default' : 'secondary'}>
                        学习 {stats.learning}
                      </Badge>
                      <Badge variant={stats.review > 0 ? 'default' : 'secondary'}>
                        复习 {stats.review}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      共 {stats.total} 张卡片
                    </div>
                    
                    {hasDue && (
                      <Button className="w-full mt-4" size="sm">
                        <BookOpen className="h-4 w-4 mr-2" />
                        开始学习
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
