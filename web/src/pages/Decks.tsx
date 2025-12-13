import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Folder, BookOpen, Loader2, Trash2,
  MoreVertical, Edit, Download
} from 'lucide-react'
import { toast } from 'sonner'
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
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

export function DecksPage() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckStats, setDeckStats] = useState<Record<string, { new: number; learning: number; review: number; total: number }>>({})
  const [loading, setLoading] = useState(true)
  
  // 重命名对话框状态
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameDeckId, setRenameDeckId] = useState<string | null>(null)
  const [renameDeckName, setRenameDeckName] = useState('')
  const [renaming, setRenaming] = useState(false)
  
  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null)
  const [deleteDeckName, setDeleteDeckName] = useState('')

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

  // 打开删除确认对话框
  const openDeleteDialog = (deck: Deck) => {
    setDeleteDeckId(deck.id)
    setDeleteDeckName(deck.name)
    setDeleteDialogOpen(true)
  }

  // 执行删除
  const handleDeleteDeck = async () => {
    if (!deleteDeckId) return
    
    await deckRepository.delete(deleteDeckId)
    setDeleteDialogOpen(false)
    setDeleteDeckId(null)
    setDeleteDeckName('')
    toast.success('牌组已删除')
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的牌组</h1>
          <p className="text-muted-foreground">管理您的学习内容</p>
        </div>
        <Button asChild>
          <Link to="/market">
            <Download className="h-4 w-4 mr-2" />
            导入共享牌组
          </Link>
        </Button>
      </div>

      {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : decks.length === 0 ? (
          <Empty className="border rounded-lg py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Folder className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>还没有牌组</EmptyTitle>
              <EmptyDescription>
                从牌组市场导入共享牌组开始学习
              </EmptyDescription>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => openDeleteDialog(deck)}
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

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除牌组吗？</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除牌组 "<strong>{deleteDeckName}</strong>"。
              <br /><br />
              所有关联的笔记和卡片也会被删除。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeck}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
