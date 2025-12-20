import { useState, useCallback, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAIConfigStore } from '@/stores/useAIConfigStore'
import { createNotesBatchApiV1NotesBatchPost } from '@/api/generated/notes/notes'
import type { NoteModelResponse, NoteBatchResult } from '@/api/generated/models'
import { toast } from 'sonner'
import {
  Sparkles,
  Loader2,
  Settings,
  X,
  Check,
  RefreshCw,
  FileText,
  Globe,
  Upload,
  Type,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

interface AIGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  noteModel: NoteModelResponse
  existingNotes?: Array<Record<string, string>>
  onSuccess: () => void
}

interface GeneratedNote {
  id: string
  fields: Record<string, string>
  selected: boolean
}

type InputMode = 'text' | 'file' | 'url'

const SUPPORTED_FILE_TYPES = ['.txt', '.md', '.html']
const JINA_READER_PREFIX = 'https://r.jina.ai/'

export function AIGenerateDialog({
  open,
  onOpenChange,
  deckId,
  noteModel,
  existingNotes = [],
  onSuccess,
}: AIGenerateDialogProps) {
  const { config, isConfigured } = useAIConfigStore()

  // 输入状态
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [topic, setTopic] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [url, setUrl] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('') // 自定义提示词

  // 生成选项
  const [count, setCount] = useState(5)
  const [enableDedup, setEnableDedup] = useState(false)

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [generatedNotes, setGeneratedNotes] = useState<GeneratedNote[]>([])
  const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input')
  const [generateProgress, setGenerateProgress] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取当前输入内容
  const currentContent = useMemo(() => {
    switch (inputMode) {
      case 'text':
        return topic
      case 'file':
        return fileContent
      case 'url':
        return urlContent
    }
  }, [inputMode, topic, fileContent, urlContent])

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SUPPORTED_FILE_TYPES.includes(ext)) {
      toast.error('不支持的文件类型', {
        description: `仅支持 ${SUPPORTED_FILE_TYPES.join(', ')} 格式`,
      })
      return
    }

    try {
      const text = await file.text()
      setFileContent(text)
      setFileName(file.name)
      toast.success(`已加载文件: ${file.name}`)
    } catch {
      toast.error('读取文件失败')
    }
  }

  // 加载网页内容
  const loadUrlContent = async () => {
    if (!url.trim()) {
      toast.error('请输入网页地址')
      return
    }

    setIsLoadingUrl(true)
    try {
      const jinaUrl = JINA_READER_PREFIX + encodeURIComponent(url.trim())
      const response = await fetch(jinaUrl)

      if (!response.ok) {
        throw new Error(`获取失败: ${response.status}`)
      }

      const text = await response.text()
      setUrlContent(text)
      toast.success('网页内容加载成功')
    } catch (err) {
      console.error('加载网页失败:', err)
      toast.error('加载网页失败', {
        description: err instanceof Error ? err.message : '请检查网址是否正确',
      })
    } finally {
      setIsLoadingUrl(false)
    }
  }

  // 动态生成 Zod Schema
  const noteSchema = useMemo(() => {
    const fieldNames = noteModel.fields_schema?.map((f) => f.name) || []
    const schemaObj: Record<string, z.ZodString> = {}

    fieldNames.forEach((name) => {
      schemaObj[name] = z.string().describe(`笔记字段: ${name}`)
    })

    return z.object({
      notes: z.array(z.object(schemaObj)).describe('生成的闪卡笔记数组'),
    })
  }, [noteModel])

  // 构造 Prompt
  const buildPrompt = useCallback(() => {
    const fieldNames = noteModel.fields_schema?.map((f) => f.name) || []
    let prompt = `你是一个专业的闪卡生成助手。根据用户提供的内容，生成 1-${count} 条适合间隔重复记忆的闪卡。

笔记模型字段：${fieldNames.join('、')}

参考内容：
${currentContent}
`

    // 添加自定义提示词
    if (customPrompt.trim()) {
      prompt += `
用户补充说明：
${customPrompt}
`
    }

    prompt += `
要求：
1. 内容准确、简洁、易于记忆
2. 每条笔记独立完整
3. 适合间隔重复学习`

    // 添加去重提示
    if (enableDedup && existingNotes.length > 0) {
      const existingSamples = existingNotes.slice(0, 10).map((n) => JSON.stringify(n))
      prompt += `
4. 不要生成与以下已有笔记重复或相似的内容：
${existingSamples.join('\n')}`
    }

    return prompt
  }, [currentContent, count, noteModel, customPrompt, enableDedup, existingNotes])

  // 使用 generateObject 生成笔记
  const generateNotes = async () => {
    if (!isConfigured()) {
      toast.error('请先配置 AI 设置')
      return
    }

    if (!currentContent.trim()) {
      toast.error('请输入或加载内容')
      return
    }

    setIsGenerating(true)
    setGeneratedNotes([])
    setStep('generating')
    setGenerateProgress('正在初始化...')

    try {
      // 创建 OpenAI 兼容 provider
      const openai = createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      })

      setGenerateProgress('正在调用 AI 生成...')

      const result = await generateObject({
        model: openai(config.model),
        schema: noteSchema,
        prompt: buildPrompt(),
      })

      const notes: GeneratedNote[] = result.object.notes.map((item, index) => ({
        id: `gen-${index}`,
        fields: item as Record<string, string>,
        selected: true,
      }))

      if (notes.length === 0) {
        throw new Error('AI 未生成任何笔记')
      }

      setGeneratedNotes(notes)
      setStep('preview')
      toast.success(`成功生成 ${notes.length} 条笔记`)
    } catch (err) {
      console.error('AI 生成失败:', err)
      const errorMessage = err instanceof Error ? err.message : 'AI 生成失败'

      // 处理常见错误
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        toast.error('API Key 无效或已过期', {
          description: '请检查设置中的 API Key',
        })
      } else if (errorMessage.includes('429')) {
        toast.error('请求过于频繁', {
          description: '请稍后重试',
        })
      } else if (errorMessage.includes('model')) {
        toast.error('模型不可用', {
          description: '请检查设置中的模型名称',
        })
      } else {
        toast.error(errorMessage)
      }
      setStep('input')
    } finally {
      setIsGenerating(false)
      setGenerateProgress('')
    }
  }

  // 切换笔记选中状态
  const toggleNoteSelection = (id: string) => {
    setGeneratedNotes((notes) =>
      notes.map((n) => (n.id === id ? { ...n, selected: !n.selected } : n)),
    )
  }

  // 删除笔记
  const removeNote = (id: string) => {
    setGeneratedNotes((notes) => notes.filter((n) => n.id !== id))
  }

  // 导入选中的笔记
  const handleImport = async () => {
    const selectedNotes = generatedNotes.filter((n) => n.selected)

    if (selectedNotes.length === 0) {
      toast.error('请至少选择一条笔记')
      return
    }

    setIsImporting(true)
    try {
      const result = (await createNotesBatchApiV1NotesBatchPost({
        deck_id: deckId,
        note_model_id: noteModel.id,
        notes: selectedNotes.map((n) => ({
          fields: n.fields,
          tags: ['ai-generated'],
        })),
      })) as unknown as NoteBatchResult

      toast.success(`成功导入 ${result.created_count} 条笔记`)
      handleClose()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败')
    } finally {
      setIsImporting(false)
    }
  }

  // 重置状态
  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('input')
      setInputMode('text')
      setTopic('')
      setFileContent('')
      setFileName('')
      setUrl('')
      setUrlContent('')
      setCustomPrompt('')
      setCount(5)
      setEnableDedup(false)
      setGeneratedNotes([])
      setGenerateProgress('')
    }, 200)
  }

  const selectedCount = generatedNotes.filter((n) => n.selected).length

  // 未配置 AI
  if (!isConfigured()) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI 生成笔记
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">请先配置 AI 设置</p>
            <Button asChild>
              <Link to="/settings" onClick={() => onOpenChange(false)}>
                前往设置
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {step === 'input' && 'AI 生成笔记'}
            {step === 'generating' && '正在生成...'}
            {step === 'preview' && '预览生成结果'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && `使用 ${config.model} 生成闪卡笔记`}
            {step === 'generating' && generateProgress}
            {step === 'preview' && '确认无误后点击导入'}
          </DialogDescription>
        </DialogHeader>

        {/* 输入步骤 */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* 输入模式选择 */}
            <div className="flex gap-2">
              <Button
                variant={inputMode === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('text')}
              >
                <Type className="h-4 w-4 mr-1" />
                文本
              </Button>
              <Button
                variant={inputMode === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('file')}
              >
                <FileText className="h-4 w-4 mr-1" />
                文件
              </Button>
              <Button
                variant={inputMode === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('url')}
              >
                <Globe className="h-4 w-4 mr-1" />
                网页
              </Button>
            </div>

            {/* 文本输入 */}
            {inputMode === 'text' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  输入主题或内容 <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="例如：JavaScript 数组方法、英语四级高频词汇、Python 装饰器..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>
            )}

            {/* 文件上传 */}
            {inputMode === 'file' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  上传文件{' '}
                  <span className="text-muted-foreground">({SUPPORTED_FILE_TYPES.join(', ')})</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_FILE_TYPES.join(',')}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {fileName ? (
                    <div className="space-y-2">
                      <FileText className="h-8 w-8 mx-auto text-primary" />
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">{fileContent.length} 字符</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">点击选择文件或拖放到此处</p>
                    </div>
                  )}
                </div>
                {fileContent && (
                  <div className="p-3 rounded-lg bg-muted/50 max-h-32 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {fileContent.slice(0, 500)}...
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 网页 URL */}
            {inputMode === 'url' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  网页地址 <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={loadUrlContent}
                    disabled={isLoadingUrl || !url.trim()}
                  >
                    {isLoadingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : '加载'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">使用 Jina Reader 提取网页内容</p>
                {urlContent && (
                  <div className="p-3 rounded-lg bg-muted/50 max-h-32 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">{urlContent.slice(0, 500)}...</pre>
                  </div>
                )}
              </div>
            )}

            {/* 自定义提示词（文件和网页模式下显示） */}
            {(inputMode === 'file' || inputMode === 'url') && (fileContent || urlContent) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">自定义提示词（可选）</label>
                <Textarea
                  placeholder="例如：提取关键概念、生成英语单词卡片、只关注第3章内容..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  添加额外的说明来指导 AI 如何处理上传的内容
                </p>
              </div>
            )}

            {/* 生成选项 */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">生成数量</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 5)))
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">条（最多 100 条）</span>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="dedup"
                  checked={enableDedup}
                  onCheckedChange={(checked) => setEnableDedup(checked === true)}
                />
                <label htmlFor="dedup" className="text-sm cursor-pointer">
                  避免生成重复笔记
                  {existingNotes.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      (当前有 {existingNotes.length} 条)
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* 笔记模型信息 */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="font-medium mb-1">笔记类型: {noteModel.name}</div>
              <div className="text-muted-foreground">
                字段: {noteModel.fields_schema?.map((f) => f.name).join('、')}
              </div>
            </div>
          </div>
        )}

        {/* 生成中 */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-purple-500 animate-pulse" />
              <Loader2 className="h-16 w-16 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary/30" />
            </div>
            <p className="mt-4 text-muted-foreground">{generateProgress}</p>
            <p className="text-sm text-muted-foreground mt-2">使用结构化输出，确保生成格式正确</p>
          </div>
        )}

        {/* 预览步骤 */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                已选择 {selectedCount} / {generatedNotes.length} 条
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('input')
                  setGeneratedNotes([])
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                重新生成
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-auto">
              {generatedNotes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    note.selected
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleNoteSelection(note.id)}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        note.selected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {note.selected && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      {Object.entries(note.fields).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-muted-foreground">{key}:</span>{' '}
                          <span className="truncate">{value}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => removeNote(note.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={generateNotes} disabled={!currentContent.trim() || isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                开始生成
              </Button>
            </>
          )}
          {step === 'generating' && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleImport} disabled={isImporting || selectedCount === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>导入 {selectedCount} 条</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
