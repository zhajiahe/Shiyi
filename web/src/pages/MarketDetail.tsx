import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { 
  ChevronRight, ChevronLeft, Home, Download, Star, 
  BookOpen, Loader2, ArrowLeft 
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSharedDeckDetail, importSharedDeck } from '@/api/sharedDecks'
import type { SharedDeck } from '@/types'

const API_BASE = 'http://localhost:8000/api/v1'
const PAGE_SIZE = 10

interface NotePreview {
  id: string
  fields: Record<string, string>
  tags: string[]
}

interface ExportData {
  note_models: Array<{
    id: string
    name: string
    fields_schema: Array<{ name: string }>
  }>
  deck: {
    id: string
    name: string
    description?: string
  }
  notes: NotePreview[]
  cards: Array<{
    id: string
    note_id: string
    ord: number
  }>
}

export function MarketDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  
  const [deck, setDeck] = useState<SharedDeck | null>(null)
  const [exportData, setExportData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (slug) {
      loadDeck(slug)
    }
  }, [slug])

  const loadDeck = async (deckSlug: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取牌组详情
      const detail = await getSharedDeckDetail(deckSlug)
      setDeck(detail)
      
      // 获取导出数据（包含笔记内容）
      const response = await fetch(`${API_BASE}/shared-decks/${deckSlug}/export`)
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.msg || '获取牌组内容失败')
      }
      setExportData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!slug) return
    
    try {
      setImporting(true)
      const result = await importSharedDeck(slug)
      alert(`导入成功！${result.noteCount} 笔记，${result.cardCount} 卡片`)
      navigate('/decks')
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  // 分页笔记
  const paginatedNotes = useMemo(() => {
    if (!exportData) return []
    const start = (page - 1) * PAGE_SIZE
    return exportData.notes.slice(start, start + PAGE_SIZE)
  }, [exportData, page])

  const totalPages = exportData ? Math.ceil(exportData.notes.length / PAGE_SIZE) : 0
  const noteModel = exportData?.note_models[0]
  const fieldNames = noteModel?.fields_schema.map(f => f.name) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-destructive mb-4">{error || '牌组不存在'}</p>
              <Button asChild>
                <Link to="/market">返回市场</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
          <Link to="/market" className="hover:text-foreground">牌组市场</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{deck.title}</span>
        </nav>

        {/* Back button */}
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link to="/market">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回市场
          </Link>
        </Button>

        {/* Deck Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {deck.title}
                  {deck.isOfficial && (
                    <Badge variant="secondary">官方</Badge>
                  )}
                  {deck.isFeatured && (
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  {deck.description || '暂无描述'}
                </CardDescription>
              </div>
              <Button onClick={handleImport} disabled={importing} size="lg">
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    导入到本地
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tags */}
            {deck.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {deck.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {deck.noteCount} 笔记
              </span>
              <span>
                {deck.cardCount} 卡片
              </span>
              <span>
                {deck.downloadCount} 次下载
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Notes Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">笔记内容预览</CardTitle>
            <CardDescription>
              共 {exportData?.notes.length || 0} 条笔记
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Table Header */}
            {fieldNames.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid bg-muted/50 font-medium text-sm" 
                     style={{ gridTemplateColumns: `repeat(${Math.min(fieldNames.length, 3)}, 1fr)` }}>
                  {fieldNames.slice(0, 3).map(name => (
                    <div key={name} className="px-4 py-3 border-b">{name}</div>
                  ))}
                </div>
                
                {/* Table Body */}
                {paginatedNotes.map((note) => (
                  <div 
                    key={note.id}
                    className="grid text-sm hover:bg-muted/30 transition-colors"
                    style={{ gridTemplateColumns: `repeat(${Math.min(fieldNames.length, 3)}, 1fr)` }}
                  >
                    {fieldNames.slice(0, 3).map(name => (
                      <div 
                        key={name} 
                        className="px-4 py-3 border-b truncate"
                        title={note.fields[name] || ''}
                      >
                        {note.fields[name] || '-'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
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
                  第 {page} / {totalPages} 页
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

