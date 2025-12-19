import { useState, useCallback } from 'react'
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
import { useAIConfigStore } from '@/stores/useAIConfigStore'
import { createNotesBatchApiV1NotesBatchPost } from '@/api/generated/notes/notes'
import type { NoteModelResponse, NoteBatchResult } from '@/api/generated/models'
import { toast } from 'sonner'
import { Sparkles, Loader2, Settings, X, Check, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AIGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  noteModel: NoteModelResponse
  onSuccess: () => void
}

interface GeneratedNote {
  id: string
  fields: Record<string, string>
  selected: boolean
}

export function AIGenerateDialog({
  open,
  onOpenChange,
  deckId,
  noteModel,
  onSuccess,
}: AIGenerateDialogProps) {
  const { config, isConfigured } = useAIConfigStore()

  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)
  const [, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [generatedNotes, setGeneratedNotes] = useState<GeneratedNote[]>([])
  const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input')

  // 构造 Prompt
  const buildPrompt = useCallback(() => {
    const fieldNames = noteModel.fields_schema?.map((f) => f.name) || []

    return `你是一个专业的闪卡生成助手。根据用户提供的主题，生成 ${count} 条适合间隔重复记忆的闪卡。

笔记模型字段：${fieldNames.join('、')}

用户主题/内容：
${topic}

请严格按照以下 JSON 格式输出，不要包含任何其他文字：
[
  { ${fieldNames.map((f) => `"${f}": "内容"`).join(', ')} },
  ...
]

要求：
1. 内容准确、简洁、易于记忆
2. 每条笔记独立完整
3. 适合间隔重复学习
4. 只输出 JSON 数组，不要有其他文字`
  }, [topic, count, noteModel])

  // 调用 OpenAI 兼容 API
  const generateNotes = async () => {
    if (!isConfigured()) {
      toast.error('请先配置 AI 设置')
      return
    }

    if (!topic.trim()) {
      toast.error('请输入主题或内容')
      return
    }

    setIsGenerating(true)
    setStreamContent('')
    setGeneratedNotes([])
    setStep('generating')

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: buildPrompt() }],
          stream: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim().startsWith('data:'))

        for (const line of lines) {
          const data = line.replace('data:', '').trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            fullContent += content
            setStreamContent(fullContent)
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 解析生成的 JSON
      parseGeneratedContent(fullContent)
    } catch (err) {
      console.error('AI 生成失败:', err)
      toast.error(err instanceof Error ? err.message : 'AI 生成失败')
      setStep('input')
    } finally {
      setIsGenerating(false)
    }
  }

  // 解析生成的内容
  const parseGeneratedContent = (content: string) => {
    try {
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('未找到有效的 JSON 数组')
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>[]

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('解析结果为空')
      }

      const notes: GeneratedNote[] = parsed.map((item, index) => ({
        id: `gen-${index}`,
        fields: item,
        selected: true,
      }))

      setGeneratedNotes(notes)
      setStep('preview')
      toast.success(`成功生成 ${notes.length} 条笔记`)
    } catch (err) {
      console.error('解析失败:', err)
      toast.error('解析生成内容失败，请重试')
      setStep('input')
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
      setTopic('')
      setCount(5)
      setStreamContent('')
      setGeneratedNotes([])
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
            {step === 'generating' && '请稍候，AI 正在为您生成内容'}
            {step === 'preview' && '确认无误后点击导入'}
          </DialogDescription>
        </DialogHeader>

        {/* 输入步骤 */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                输入主题或内容 <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="例如：JavaScript 数组方法、英语四级高频词汇、Python 装饰器..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">生成数量</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">条（最多 20 条）</span>
            </div>

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
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在生成内容...</span>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 max-h-64 overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {streamContent || '等待响应...'}
              </pre>
            </div>
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
              <Button onClick={generateNotes} disabled={!topic.trim()}>
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
