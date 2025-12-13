import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronRight, Home, Plus, Folder, BookOpen, Loader2, Trash2,
  MoreVertical, Edit, Download
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deckRepository } from '@/db/repositories'
import { db } from '@/db'
import type { Deck } from '@/types'

export function DecksPage() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckStats, setDeckStats] = useState<Record<string, { new: number; learning: number; review: number; total: number }>>({})
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [creating, setCreating] = useState(false)
  
  // 重命名对话框状态
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameDeckId, setRenameDeckId] = useState<string | null>(null)
  const [renameDeckName, setRenameDeckName] = useState('')
  const [renaming, setRenaming] = useState(false)

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

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('确定要删除这个牌组吗？所有关联的笔记和卡片也会被删除。')) return
    
    await deckRepository.delete(deckId)
    await loadDecks()
  }

  const handleStudyDeck = (deckId: string) => {
    navigate(`/review?deck=${deckId}`)
  }
  
  // 打开重命名对话框
  const openRenameDialog = (deck: Deck) => {
    setRenameDeckId(deck.id)
    setRenameDeckName(deck.name)
    setRenameDialogOpen(true)
  }
  
  // 执行重命名
  const handleRenameDeck = async () => {
    if (!renameDeckId || !renameDeckName.trim()) return
    
    try {
      setRenaming(true)
      await deckRepository.update(renameDeckId, { name: renameDeckName.trim() })
      setRenameDialogOpen(false)
      setRenameDeckId(null)
      setRenameDeckName('')
      await loadDecks()
    } finally {
      setRenaming(false)
    }
  }
  
  // 导出牌组为 JSON 文件
  const handleExportDeck = async (deck: Deck) => {
    try {
      // 收集牌组相关的所有数据
      const notes = await db.notes.where('deckId').equals(deck.id).filter(n => !n.deletedAt).toArray()
      const cards = await db.cards.where('deckId').equals(deck.id).filter(c => !c.deletedAt).toArray()
      
      // 收集笔记类型
      const noteModelIds = new Set(notes.map(n => n.noteModelId))
      const noteModels = []
      const cardTemplates = []
      
      for (const nmId of noteModelIds) {
        const nm = await db.noteModels.get(nmId)
        if (nm) {
          noteModels.push(nm)
          const templates = await db.cardTemplates.where('noteModelId').equals(nmId).toArray()
          cardTemplates.push(...templates)
        }
      }
      
      // 构建导出数据
      const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        deck: {
          id: deck.id,
          name: deck.name,
          description: deck.description,
          config: deck.config,
          scheduler: deck.scheduler,
        },
        noteModels,
        cardTemplates,
        notes: notes.map(n => ({
          id: n.id,
          noteModelId: n.noteModelId,
          guid: n.guid,
          fields: n.fields,
          tags: n.tags,
        })),
        cards: cards.map(c => ({
          id: c.id,
          noteId: c.noteId,
          cardTemplateId: c.cardTemplateId,
          ord: c.ord,
          state: c.state,
          queue: c.queue,
          due: c.due,
          interval: c.interval,
          easeFactor: c.easeFactor,
          reps: c.reps,
          lapses: c.lapses,
        })),
      }
      
      // 创建并下载文件
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${deck.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_backup.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('导出失败，请重试')
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
          <span className="text-foreground">我的牌组</span>
        </nav>

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
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
              <div className="py-4 space-y-4">
                <Input
                  placeholder="输入牌组名称"
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateDeck()}
                />
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  💡 提示：创建空牌组后，您可以从「牌组市场」导入共享牌组内容，或等待后续版本支持手动添加笔记。
                </p>
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
                  className="transition-colors hover:bg-muted/50 group"
                  onClick={() => handleStudyDeck(deck.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5 text-muted-foreground" />
                        {deck.name}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => openRenameDialog(deck)}>
                            <Edit className="h-4 w-4 mr-2" />
                            重命名
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportDeck(deck)}>
                            <Download className="h-4 w-4 mr-2" />
                            导出备份
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteDeck(deck.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除牌组
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* 重命名对话框 */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名牌组</DialogTitle>
            <DialogDescription>
              为您的牌组设置一个新名称
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="输入新名称"
              value={renameDeckName}
              onChange={e => setRenameDeckName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameDeck()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRenameDeck} disabled={renaming || !renameDeckName.trim()}>
              {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
