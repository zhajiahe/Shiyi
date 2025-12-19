import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MoreHorizontal, Eye, Trash2, Share } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  getDecksApiV1DecksGet,
  createDeckApiV1DecksPost,
  deleteDeckApiV1DecksDeckIdDelete,
} from '@/api/generated/decks/decks'
import type { DeckResponse, PageResponseDeckResponse } from '@/api/generated/models'
import { toast } from 'sonner'

export function StudioDecks() {
  const [decks, setDecks] = useState<DeckResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDesc, setNewDeckDesc] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchDecks()
  }, [])

  async function fetchDecks() {
    setIsLoading(true)
    try {
      const data = (await getDecksApiV1DecksGet({ page_size: 100 })) as PageResponseDeckResponse
      setDecks(data.items ?? [])
    } catch (err) {
      console.error('Failed to fetch decks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function createDeck() {
    if (!newDeckName.trim()) return

    setIsCreating(true)
    try {
      await createDeckApiV1DecksPost({
        name: newDeckName.trim(),
        description: newDeckDesc.trim() || undefined,
      })
      toast.success('牌组创建成功')
      setIsCreateOpen(false)
      setNewDeckName('')
      setNewDeckDesc('')
      fetchDecks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  async function deleteDeck(id: string) {
    if (!confirm('确定要删除这个牌组吗？')) return

    try {
      await deleteDeckApiV1DecksDeckIdDelete(id)
      toast.success('牌组已删除')
      fetchDecks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的牌组</h1>
          <p className="text-muted-foreground">管理您的学习牌组</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建牌组
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新牌组</DialogTitle>
              <DialogDescription>创建一个新的学习牌组</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">牌组名称</label>
                <Input
                  placeholder="例如：日语 N5 词汇"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">描述（可选）</label>
                <Input
                  placeholder="牌组的简要描述"
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button onClick={createDeck} disabled={isCreating || !newDeckName.trim()}>
                {isCreating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {decks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">您还没有创建任何牌组</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              创建第一个牌组
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDelete={() => deleteDeck(deck.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeckCard({ deck, onDelete }: { deck: DeckResponse; onDelete: () => void }) {
  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Link to={`/studio/decks/${deck.id}`} className="flex-1">
            <CardTitle className="text-lg hover:underline">{deck.name}</CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/studio/decks/${deck.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  查看详情
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share className="mr-2 h-4 w-4" />
                发布到市场
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>{deck.description || '暂无描述'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          创建于 {deck.created_at ? new Date(deck.created_at).toLocaleDateString() : '未知'}
        </div>
      </CardContent>
    </Card>
  )
}
