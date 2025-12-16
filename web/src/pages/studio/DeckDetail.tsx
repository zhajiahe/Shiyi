import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, FileText, Share, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'
import { NoteDialog } from './components/NoteDialog'
import { PublishDialog } from './components/PublishDialog'
import { ImportDialog } from './components/ImportDialog'

interface DeckResponse {
  id: string
  name: string
  description?: string
  noteModelId?: string
  createdAt: string
  updatedAt: string
}

interface NoteResponse {
  id: string
  guid: string
  fields: Record<string, string>
  tags: string[]
  createdAt: string
}

interface PageResponse<T> {
  items: T[]
  total: number
  pageNum: number
  pageSize: number
}

export function StudioDeckDetail() {
  const { id } = useParams<{ id: string }>()
  const [deck, setDeck] = useState<DeckResponse | null>(null)
  const [notes, setNotes] = useState<NoteResponse[]>([])
  const [noteCount, setNoteCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const fetchDeck = useCallback(async () => {
    try {
      const data = await api.get<DeckResponse>(`/decks/${id}`)
      setDeck(data)
    } catch (err) {
      console.error('Failed to fetch deck:', err)
    }
  }, [id])

  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<PageResponse<NoteResponse>>(`/notes?deck_id=${id}&page_size=20`)
      setNotes(data.items)
      setNoteCount(data.total)
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchDeck()
      fetchNotes()
    }
  }, [id, fetchDeck, fetchNotes])

  if (!deck) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/studio/decks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && <p className="text-muted-foreground">{deck.description}</p>}
        </div>
        <Button variant="outline" onClick={() => setIsPublishDialogOpen(true)}>
          <Share className="mr-2 h-4 w-4" />
          发布到市场
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">笔记数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{noteCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">创建时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{new Date(deck.createdAt).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">更新时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{new Date(deck.updatedAt).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 笔记列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>笔记列表</CardTitle>
              <CardDescription>牌组中的所有笔记</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                批量导入
              </Button>
              <Button onClick={() => setIsNoteDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加笔记
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">暂无笔记</p>
              <Button className="mt-4" onClick={() => setIsNoteDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加第一条笔记
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <NoteItem key={note.id} note={note} />
              ))}
              {noteCount > notes.length && (
                <div className="text-center py-4">
                  <Button variant="outline">加载更多</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加笔记弹窗 */}
      {id && (
        <NoteDialog
          open={isNoteDialogOpen}
          onOpenChange={setIsNoteDialogOpen}
          deckId={id}
          noteModelId={deck?.noteModelId}
          onSuccess={fetchNotes}
        />
      )}

      {/* 发布弹窗 */}
      {id && deck && (
        <PublishDialog
          open={isPublishDialogOpen}
          onOpenChange={setIsPublishDialogOpen}
          deckId={id}
          deckName={deck.name}
          noteCount={noteCount}
        />
      )}

      {/* 批量导入弹窗 */}
      {id && (
        <ImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          deckId={id}
          noteModelId={deck?.noteModelId}
          onSuccess={fetchNotes}
        />
      )}
    </div>
  )
}

function NoteItem({ note }: { note: NoteResponse }) {
  // 获取前两个字段作为预览
  const fieldEntries = Object.entries(note.fields).slice(0, 2)

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {fieldEntries.map(([key, value]) => (
            <span key={key} className="text-sm truncate">
              <span className="text-muted-foreground">{key}:</span> {value}
            </span>
          ))}
        </div>
        {note.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {new Date(note.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
