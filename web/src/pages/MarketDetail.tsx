import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { 
  ChevronRight, ChevronLeft, Home, Download, Star, 
  BookOpen, Loader2, ArrowLeft, Eye, RotateCcw, AlertCircle, CheckCircle2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getSharedDeckDetail, importSharedDeck, checkDeckNameExists, getUniqueDeckName } from '@/api/sharedDecks'
import type { SharedDeck } from '@/types'

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
  const navigate = useNavigate()
  
  const [deck, setDeck] = useState<SharedDeck | null>(null)
  const [exportData, setExportData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [page, setPage] = useState(1)
  
  // 卡片预览状态
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
      alert(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }
  
  // 导入成功后跳转
  const handleGoToDecks = () => {
    setShowImportDialog(false)
    navigate('/decks')
  }

  // 点击笔记行时
  const handleNoteClick = (globalIndex: number) => {
    if (globalIndex === selectedNoteIndex) {
      setSelectedNoteIndex(null)
    } else {
      setSelectedNoteIndex(globalIndex)
      setSelectedTemplateIndex(0)
      setShowAnswer(false)
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

  // 获取选中笔记的预览数据
  const selectedNote = selectedNoteIndex !== null ? exportData?.notes[selectedNoteIndex] : null
  const selectedNoteModel = selectedNote && exportData
    ? exportData.note_models.find(nm => nm.id === selectedNote.note_model_id)
    : null
  const selectedTemplates = selectedNoteModel?.templates || []
  const currentTemplate = selectedTemplates[selectedTemplateIndex]

  // 渲染当前卡片
  const renderedQuestion = currentTemplate && selectedNote
    ? renderTemplate(currentTemplate.question_template, selectedNote.fields)
    : ''
  const renderedAnswer = currentTemplate && selectedNote
    ? renderTemplate(currentTemplate.answer_template, selectedNote.fields)
    : ''
  const cardCss = selectedNoteModel?.css || ''

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
              <Button onClick={openImportDialog} size="lg">
                <Download className="h-4 w-4 mr-2" />
                导入到本地
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
              共 {exportData?.notes.length || 0} 条笔记，点击查看卡片实际效果
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Table Header */}
            {fieldNames.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid bg-muted/50 font-medium text-sm" 
                     style={{ gridTemplateColumns: `repeat(${Math.min(fieldNames.length, 3)}, 1fr) 60px` }}>
                  {fieldNames.slice(0, 3).map(name => (
                    <div key={name} className="px-4 py-3 border-b">{name}</div>
                  ))}
                  <div className="px-4 py-3 border-b text-center">预览</div>
                </div>
                
                {/* Table Body */}
                {paginatedNotes.map((note, index) => {
                  const globalIndex = (page - 1) * PAGE_SIZE + index
                  const isSelected = globalIndex === selectedNoteIndex
                  return (
                    <div 
                      key={note.id}
                      onClick={() => handleNoteClick(globalIndex)}
                      className={`grid text-sm cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 hover:bg-primary/15' 
                          : 'hover:bg-muted/30'
                      }`}
                      style={{ gridTemplateColumns: `repeat(${Math.min(fieldNames.length, 3)}, 1fr) 60px` }}
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
                      <div className="px-4 py-3 border-b flex items-center justify-center">
                        <Eye className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  )
                })}
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

            {/* Card Preview - 实际卡片效果 */}
            {selectedNote && currentTemplate && (
              <div className="mt-6 border rounded-lg overflow-hidden">
                {/* 预览标题栏 */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
                  <div className="flex items-center gap-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      卡片预览
                    </h4>
                    {selectedTemplates.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">模板:</span>
                        <div className="flex gap-1">
                          {selectedTemplates.map((tpl, idx) => (
                            <Button
                              key={tpl.id}
                              variant={idx === selectedTemplateIndex ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTemplateIndex(idx)
                                setShowAnswer(false)
                              }}
                            >
                              {tpl.name || `卡片 ${idx + 1}`}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedNoteIndex(null)}
                  >
                    关闭
                  </Button>
                </div>

                {/* 卡片渲染区域 */}
                <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 min-h-[300px]">
                  {/* 注入 CSS */}
                  {cardCss && (
                    <style dangerouslySetInnerHTML={{ __html: cardCss }} />
                  )}
                  
                  {/* 卡片容器 */}
                  <div className="max-w-lg mx-auto">
                    {/* 正面 */}
                    <div 
                      className="card-preview"
                      dangerouslySetInnerHTML={{ __html: renderedQuestion }}
                    />
                    
                    {/* 答案区域 */}
                    {showAnswer ? (
                      <>
                        <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent" />
                        <div 
                          className="card-preview"
                          dangerouslySetInnerHTML={{ __html: renderedAnswer }}
                        />
                      </>
                    ) : (
                      <div className="mt-6 text-center">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowAnswer(true)
                          }}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          显示答案
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    笔记类型: {selectedNoteModel?.name || '未知'}
                  </span>
                  <span>
                    此笔记共 {selectedTemplates.length} 张卡片
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              💡 点击表格中的笔记可以预览实际学习时的卡片效果
            </p>
          </CardContent>
        </Card>
      </div>

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
                <DialogDescription>
                  将"{deck?.title}"导入到您的本地牌组库
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">
                  牌组名称
                </label>
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
                    <span>{deck?.noteCount || 0} 条</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">卡片数量</span>
                    <span>{deck?.cardCount || 0} 张</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  取消
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={importing || !importDeckName.trim()}
                >
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
