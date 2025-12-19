import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Download,
  Star,
  BookOpen,
  Loader2,
  ArrowLeft,
  Eye,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FlipCard } from '@/components/FlipCard'
import {
  getSharedDeckDetail,
  importSharedDeck,
  checkDeckNameExists,
  getUniqueDeckName,
  type SharedDeckDetailResponse,
} from '@/api/sharedDecks'

const API_BASE = 'http://localhost:8000/api/v1'
const PAGE_SIZE = 10

interface NotePreview {
  id: string
  guid: string
  note_model_id: string
  fields: Record<string, string>
  tags: string[]
}

interface CardTemplateData {
  id: string
  name: string
  ord: number
  question_template: string
  answer_template: string
}

interface NoteModelData {
  id: string
  name: string
  fields_schema: Array<{ name: string; description?: string }>
  css?: string
  templates: CardTemplateData[]
}

interface ExportData {
  note_models: NoteModelData[]
  deck: {
    id: string
    name: string
    description?: string
  }
  notes: NotePreview[]
  cards: Array<{
    id: string
    note_id: string
    card_template_id: string
    ord: number
  }>
}

/**
 * 渲染卡片模板
 * 将 {{FieldName}} 占位符替换为实际字段值
 */
function renderTemplate(template: string, fields: Record<string, string>): string {
  let rendered = template

  // 替换所有 {{FieldName}} 占位符
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    const regex = new RegExp(`\\{\\{${fieldName}\\}\\}`, 'g')
    rendered = rendered.replace(regex, fieldValue || '')
  }

  // 处理 Cloze 删除（简单处理：将未替换的 {{c1::xxx}} 格式转换）
  // {{c1::answer::hint}} -> [...]
  rendered = rendered.replace(/\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g, (_, answer) => {
    return `<span class="cloze">${answer}</span>`
  })

  // 清理未匹配的占位符
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '')

  return rendered
}

export function MarketDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const shouldOpenImport = searchParams.get('import') === 'true'

  const [deck, setDeck] = useState<SharedDeckDetailResponse | null>(null)
  const [exportData, setExportData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  // 卡片预览弹窗状态
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null)
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  // 导入对话框状态
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importDeckName, setImportDeckName] = useState('')
  const [nameConflict, setNameConflict] = useState(false)
  const [checkingName, setCheckingName] = useState(false)
  const [importSuccess, setImportSuccess] = useState<{
    deckName: string
    noteCount: number
    cardCount: number
  } | null>(null)

  useEffect(() => {
    if (slug) {
      loadDeck(slug)
    }
  }, [slug])

  // 如果 URL 参数包含 import=true，自动打开导入对话框
  useEffect(() => {
    if (shouldOpenImport && deck && !loading) {
      openImportDialog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenImport, deck, loading])

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

  // 打开导入对话框
  const openImportDialog = async () => {
    if (!deck) return

    // 获取不冲突的默认名称
    const suggestedName = await getUniqueDeckName(deck.title)
    setImportDeckName(suggestedName)
    setNameConflict(false)
    setImportSuccess(null)
    setShowImportDialog(true)
  }

  // 检查名称是否冲突
  const handleNameChange = async (name: string) => {
    setImportDeckName(name)

    if (!name.trim()) {
      setNameConflict(false)
      return
    }

    setCheckingName(true)
    try {
      const exists = await checkDeckNameExists(name.trim())
      setNameConflict(exists)
    } finally {
      setCheckingName(false)
    }
  }

  // 执行导入
  const handleImport = async () => {
    if (!slug || !importDeckName.trim()) return

    try {
      setImporting(true)
      const result = await importSharedDeck(slug, importDeckName.trim())
      setImportSuccess({
        deckName: result.deckName,
        noteCount: result.noteCount,
        cardCount: result.cardCount,
      })
    } catch (err) {
      toast.error('导入失败', {
        description: err instanceof Error ? err.message : '请重试',
      })
    } finally {
      setImporting(false)
    }
  }

  // 导入成功后跳转
  const handleGoToDecks = () => {
    setShowImportDialog(false)
    navigate('/decks')
  }

  // 点击笔记行时打开预览弹窗
  const handleNoteClick = (globalIndex: number) => {
    setSelectedNoteIndex(globalIndex)
    setSelectedTemplateIndex(0)
    setShowAnswer(false)
    setPreviewDialogOpen(true)
  }

  const noteModel = exportData?.note_models[0]
  const fieldNames = useMemo(() => noteModel?.fields_schema.map((f) => f.name) || [], [noteModel])

  // 动态生成列定义
  const columns: ColumnDef<NotePreview>[] = useMemo(() => {
    const cols: ColumnDef<NotePreview>[] = fieldNames.slice(0, 3).map((fieldName) => ({
      id: fieldName,
      header: fieldName,
      cell: ({ row }) => {
        const value = row.original.fields[fieldName] || '-'
        return (
          <div className="truncate max-w-[200px]" title={value}>
            {value}
          </div>
        )
      },
    }))

    // 添加预览按钮列
    cols.push({
      id: 'preview',
      header: () => <div className="text-center">预览</div>,
      cell: () => (
        <div className="flex justify-center">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </div>
      ),
    })

    return cols
  }, [fieldNames])

  const table = useReactTable({
    data: exportData?.notes || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE,
      },
    },
  })

  // 获取选中笔记的预览数据
  const selectedNote = selectedNoteIndex !== null ? exportData?.notes[selectedNoteIndex] : null
  const selectedNoteModel =
    selectedNote && exportData
      ? exportData.note_models.find((nm) => nm.id === selectedNote.note_model_id)
      : null
  const selectedTemplates = selectedNoteModel?.templates || []
  const currentTemplate = selectedTemplates[selectedTemplateIndex]

  // 渲染当前卡片
  const renderedQuestion =
    currentTemplate && selectedNote
      ? renderTemplate(currentTemplate.question_template, selectedNote.fields)
      : ''
  const renderedAnswer =
    currentTemplate && selectedNote
      ? renderTemplate(currentTemplate.answer_template, selectedNote.fields)
      : ''
  const cardCss = selectedNoteModel?.css || ''

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !deck) {
    return (
      <Card className="text-center py-16">
        <CardContent>
          <p className="text-destructive mb-4">{error || '牌组不存在'}</p>
          <Button asChild>
            <Link to="/market">返回市场</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
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
                {deck.is_official && <Badge variant="secondary">官方</Badge>}
                {deck.is_featured && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                {deck.description || '暂无描述'}
              </CardDescription>
            </div>
            <Button onClick={openImportDialog} size="lg">
              <Download className="h-4 w-4 mr-2" />
              导入到本地
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tags */}
          {deck.tags && deck.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {deck.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {/* Stats - 兼容 snake_case 和 camelCase */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {deck.note_count ?? 0} 笔记
            </span>
            <span>{deck.card_count ?? 0} 卡片</span>
            <span>{deck.download_count ?? 0} 次下载</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">笔记内容预览</CardTitle>
          <CardDescription>
            共 {exportData?.notes.length || 0} 条笔记，点击查看卡片实际效果
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Data Table */}
          {fieldNames.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const globalIndex =
                          exportData?.notes.findIndex((n) => n.id === row.original.id) ?? -1
                        return (
                          <TableRow
                            key={row.id}
                            onClick={() => handleNoteClick(globalIndex)}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          暂无笔记
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {table.getPageCount() > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    第 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 卡片预览弹窗 */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              卡片预览
            </DialogTitle>
            {selectedTemplates.length > 1 && (
              <DialogDescription>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">模板:</span>
                  <div className="flex gap-1">
                    {selectedTemplates.map((tpl, idx) => (
                      <Button
                        key={tpl.id}
                        variant={idx === selectedTemplateIndex ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedTemplateIndex(idx)
                          setShowAnswer(false)
                        }}
                      >
                        {tpl.name || `卡片 ${idx + 1}`}
                      </Button>
                    ))}
                  </div>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedNote && currentTemplate && (
            <div className="space-y-4">
              {/* 翻转卡片区域 */}
              <FlipCard
                questionHtml={renderedQuestion}
                answerHtml={renderedAnswer}
                css={cardCss}
                theme="cupcake"
                isFlipped={showAnswer}
                minHeight={150}
              />

              {/* 翻转按钮 */}
              <div className="text-center">
                <Button
                  onClick={() => setShowAnswer(!showAnswer)}
                  variant={showAnswer ? 'outline' : 'default'}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {showAnswer ? '显示问题' : '显示答案'}
                </Button>
              </div>

              {/* 底部信息 */}
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>笔记类型: {selectedNoteModel?.name || '未知'}</span>
                <span>此笔记共 {selectedTemplates.length} 张卡片</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          {!importSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  导入到本地
                </DialogTitle>
                <DialogDescription>将"{deck?.title}"导入到您的本地牌组库</DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">牌组名称</label>
                <Input
                  value={importDeckName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="输入牌组名称"
                  className={nameConflict ? 'border-orange-500 focus-visible:ring-orange-500' : ''}
                />
                {nameConflict && (
                  <p className="text-sm text-orange-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    已存在同名牌组，建议修改名称
                  </p>
                )}
                {checkingName && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    检查中...
                  </p>
                )}

                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">笔记数量</span>
                    <span>{deck?.note_count ?? 0} 条</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">卡片数量</span>
                    <span>{deck?.card_count ?? 0} 张</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleImport} disabled={importing || !importDeckName.trim()}>
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      确认导入
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  导入成功！
                </DialogTitle>
              </DialogHeader>

              <div className="py-4">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">{importSuccess.deckName}</h3>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">导入笔记</span>
                    <span className="text-green-600">{importSuccess.noteCount} 条</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">导入卡片</span>
                    <span className="text-green-600">{importSuccess.cardCount} 张</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  继续浏览
                </Button>
                <Button onClick={handleGoToDecks}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  开始学习
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
