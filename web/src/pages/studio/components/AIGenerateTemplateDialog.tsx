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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAIConfigStore } from '@/stores/useAIConfigStore'
import { createNoteModelApiV1NoteModelsPost } from '@/api/generated/note-models/note-models'
import { toast } from 'sonner'
import {
  Sparkles,
  Loader2,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  Code,
  Eye,
  FileText,
  Globe,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

type ReferenceMode = 'none' | 'file' | 'url'
const SUPPORTED_FILE_TYPES = ['.txt', '.md', '.html']
const JINA_READER_PREFIX = 'https://r.jina.ai/'

interface AIGenerateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// 生成的模板结构
interface GeneratedTemplate {
  name: string
  fields: Array<{
    name: string
    description?: string
  }>
  templates: Array<{
    name: string
    questionTemplate: string
    answerTemplate: string
  }>
  css: string
}

// Zod Schema 用于结构化输出
const noteModelSchema = z.object({
  name: z.string().describe('模板名称，简洁明了'),
  fields: z
    .array(
      z.object({
        name: z.string().describe('字段名称，使用英文或简短中文'),
        description: z.string().optional().describe('字段说明'),
      }),
    )
    .describe('字段列表，通常 3-6 个字段'),
  templates: z
    .array(
      z.object({
        name: z.string().describe('卡片名称，如"正向卡片"、"反向卡片"'),
        questionTemplate: z.string().describe('问题面 HTML 模板，使用 {{字段名}} 引用字段'),
        answerTemplate: z.string().describe('答案面 HTML 模板，使用 {{字段名}} 引用字段'),
      }),
    )
    .describe('卡片模板列表，通常 1-2 个卡片'),
  css: z.string().describe('CSS 样式，使用 daisyUI 类名'),
})

// 预设场景
const PRESET_SCENARIOS = [
  { label: '英语单词', prompt: '英语单词记忆卡片，包含单词、音标、词性、释义、例句' },
  { label: '医学术语', prompt: '医学术语卡片，包含术语名称、英文、定义、临床意义' },
  { label: '编程概念', prompt: '编程概念卡片，包含概念名、定义、代码示例、应用场景' },
  { label: '历史事件', prompt: '历史事件卡片，包含事件名称、时间、地点、主要人物、意义' },
  { label: '数学公式', prompt: '数学公式卡片，包含公式名称、公式内容、变量说明、应用例题' },
]

export function AIGenerateTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
}: AIGenerateTemplateDialogProps) {
  const { config, isConfigured } = useAIConfigStore()

  // 输入状态
  const [description, setDescription] = useState('')

  // 参考资料状态
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>('none')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [url, setUrl] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null)
  const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input')

  // 编辑预览状态
  const [editingName, setEditingName] = useState('')
  const [editingFields, setEditingFields] = useState<GeneratedTemplate['fields']>([])
  const [editingTemplates, setEditingTemplates] = useState<GeneratedTemplate['templates']>([])
  const [editingCss, setEditingCss] = useState('')
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0)
  const [editMode, setEditMode] = useState<'front' | 'back' | 'css'>('front')

  // 当生成完成后，初始化编辑状态
  const initEditingState = useCallback((template: GeneratedTemplate) => {
    setEditingName(template.name)
    setEditingFields([...template.fields])
    setEditingTemplates([...template.templates])
    setEditingCss(template.css)
    setActiveTemplateIndex(0)
    setEditMode('front')
  }, [])

  // 获取当前参考资料内容
  const referenceContent = useMemo(() => {
    switch (referenceMode) {
      case 'file':
        return fileContent
      case 'url':
        return urlContent
      default:
        return ''
    }
  }, [referenceMode, fileContent, urlContent])

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

  // 构建 Prompt
  const buildPrompt = useCallback(() => {
    let prompt = `你是一个专业的闪卡模板设计师。根据用户描述，设计一个结构化的笔记类型。

## 输出格式要求
请严格按以下 JSON 格式输出，不要输出其他内容：
{
  "name": "模板名称",
  "fields": [
    {"name": "字段1", "description": "可选的字段说明"},
    {"name": "字段2"}
  ],
  "templates": [
    {
      "name": "正向卡片",
      "questionTemplate": "<div class='...'>{{字段1}}</div>",
      "answerTemplate": "<div class='...'>{{字段1}}<hr>{{字段2}}</div>"
    }
  ],
  "css": ".card { ... }"
}

## 设计规范
1. 字段名称：使用简洁的英文或中文，3-6 个字段为宜
2. HTML 模板：使用 daisyUI 组件类名，风格现代简洁
3. 字段引用：使用 Mustache 语法 {{字段名}}
4. 条件渲染：使用 {{#字段名}}内容{{/字段名}}
5. CSS：使用 daisyUI 的 oklch 变量配色
6. 学习优化：问题面简洁聚焦，答案面详细完整

## 用户需求
${description}`

    // 添加参考资料
    if (referenceContent.trim()) {
      prompt += `

## 参考资料（分析结构设计字段）
${referenceContent.slice(0, 3000)}${referenceContent.length > 3000 ? '\n...(已截断)' : ''}`
    }

    return prompt
  }, [description, referenceContent])

  // 使用 AI 生成模板
  const generateTemplate = async () => {
    if (!isConfigured()) {
      toast.error('请先配置 AI 设置')
      return
    }

    if (!description.trim()) {
      toast.error('请描述您需要的模板类型')
      return
    }

    setIsGenerating(true)
    setGeneratedTemplate(null)
    setStep('generating')

    try {
      const openai = createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      })

      // 使用 json 模式，兼容更多模型
      const result = await generateObject({
        model: openai(config.model),
        schema: noteModelSchema,
        mode: 'json', // 使用 JSON 模式，更多模型支持
        prompt: buildPrompt(),
      })

      const template = result.object as GeneratedTemplate

      // 验证生成结果
      if (!template.name || !template.fields?.length || !template.templates?.length) {
        throw new Error('生成结果不完整，请重试')
      }

      setGeneratedTemplate(template)
      initEditingState(template)
      setStep('preview')
      toast.success('模板生成成功！')
    } catch (err) {
      console.error('AI 生成失败:', err)

      // 提供更有帮助的错误信息
      let errorMessage = 'AI 生成失败'
      if (err instanceof Error) {
        if (err.message.includes('did not match schema')) {
          errorMessage =
            '模型返回格式不符合要求，请尝试使用 GPT-4o 或 DeepSeek 等支持 JSON 输出的模型'
        } else if (err.message.includes('API key')) {
          errorMessage = 'API Key 无效，请检查设置'
        } else if (err.message.includes('model')) {
          errorMessage = '模型不可用，请检查模型名称是否正确'
        } else {
          errorMessage = err.message
        }
      }

      toast.error(errorMessage)
      setStep('input')
    } finally {
      setIsGenerating(false)
    }
  }

  // 保存模板
  const handleSave = async () => {
    if (!editingName.trim()) {
      toast.error('请输入模板名称')
      return
    }

    if (editingFields.length < 1) {
      toast.error('至少需要一个字段')
      return
    }

    if (editingTemplates.length < 1) {
      toast.error('至少需要一个卡片模板')
      return
    }

    setIsSaving(true)
    try {
      await createNoteModelApiV1NoteModelsPost({
        name: editingName.trim(),
        fields_schema: editingFields.map((f) => ({
          name: f.name,
          description: f.description,
        })),
        css: editingCss,
        templates: editingTemplates.map((t, idx) => ({
          name: t.name,
          ord: idx,
          question_template: t.questionTemplate,
          answer_template: t.answerTemplate,
        })),
      })

      toast.success('模板创建成功！')
      handleClose()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 重置并关闭
  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('input')
      setDescription('')
      setReferenceMode('none')
      setFileContent('')
      setFileName('')
      setUrl('')
      setUrlContent('')
      setGeneratedTemplate(null)
      setEditingName('')
      setEditingFields([])
      setEditingTemplates([])
      setEditingCss('')
    }, 200)
  }

  // 添加字段
  const addField = () => {
    setEditingFields([...editingFields, { name: `Field${editingFields.length + 1}` }])
  }

  // 删除字段
  const removeField = (index: number) => {
    if (editingFields.length <= 1) {
      toast.error('至少保留一个字段')
      return
    }
    setEditingFields(editingFields.filter((_, i) => i !== index))
  }

  // 更新字段
  const updateField = (index: number, name: string) => {
    const updated = [...editingFields]
    updated[index] = { ...updated[index], name }
    setEditingFields(updated)
  }

  // 获取当前模板的编辑内容
  const currentTemplate = editingTemplates[activeTemplateIndex]

  // 预览 HTML
  const previewHtml = useMemo(() => {
    if (!currentTemplate) return ''
    const template =
      editMode === 'front' ? currentTemplate.questionTemplate : currentTemplate.answerTemplate
    // 简单替换字段为示例值
    let html = template
    editingFields.forEach((f) => {
      html = html.replace(new RegExp(`{{${f.name}}}`, 'g'), `[${f.name}]`)
      html = html.replace(new RegExp(`{{#${f.name}}}`, 'g'), '')
      html = html.replace(new RegExp(`{{/${f.name}}}`, 'g'), '')
    })
    return html
  }, [currentTemplate, editMode, editingFields])

  // 未配置 AI
  if (!isConfigured()) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI 生成模板
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {step === 'input' && 'AI 生成模板'}
            {step === 'generating' && '正在生成...'}
            {step === 'preview' && '预览和编辑模板'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && '描述您需要的卡片类型，AI 将自动设计模板'}
            {step === 'generating' && '请稍候，AI 正在设计您的模板'}
            {step === 'preview' && '检查生成结果，可以直接编辑调整'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* 输入步骤 */}
          {step === 'input' && (
            <div className="space-y-4">
              {/* 预设场景 */}
              <div className="flex flex-wrap gap-2">
                {PRESET_SCENARIOS.map((scenario) => (
                  <Button
                    key={scenario.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setDescription(scenario.prompt)}
                  >
                    {scenario.label}
                  </Button>
                ))}
              </div>

              {/* 描述输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  描述您需要的模板 <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="例如：我需要一个日语单词学习卡片，包含假名、汉字、词性、中文释义、例句..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* 参考资料 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">参考资料（可选）</label>
                  <div className="flex gap-1">
                    <Button
                      variant={referenceMode === 'none' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setReferenceMode('none')}
                    >
                      无
                    </Button>
                    <Button
                      variant={referenceMode === 'file' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setReferenceMode('file')}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      文件
                    </Button>
                    <Button
                      variant={referenceMode === 'url' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setReferenceMode('url')}
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      网页
                    </Button>
                  </div>
                </div>

                {/* 文件上传 */}
                {referenceMode === 'file' && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={SUPPORTED_FILE_TYPES.join(',')}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      {fileName ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-medium">{fileName}</span>
                          <span className="text-muted-foreground">({fileContent.length} 字符)</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Upload className="h-5 w-5" />
                          <span>点击上传 {SUPPORTED_FILE_TYPES.join('/')} 文件</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 网页 URL */}
                {referenceMode === 'url' && (
                  <div className="space-y-2">
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
                    {urlContent && (
                      <div className="text-sm text-muted-foreground">
                        ✓ 已加载 {urlContent.length} 字符
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p>💡 提示：描述越详细，生成的模板越符合您的需求</p>
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
              <p className="mt-4 text-muted-foreground">AI 正在设计模板...</p>
            </div>
          )}

          {/* 预览编辑步骤 */}
          {step === 'preview' && generatedTemplate && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* 左侧：基本信息和字段 */}
              <div className="space-y-4">
                {/* 模板名称 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    模板名称 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="输入模板名称"
                  />
                </div>

                {/* 字段管理 */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">字段列表</CardTitle>
                      <Button variant="ghost" size="sm" onClick={addField}>
                        <Plus className="h-4 w-4 mr-1" />
                        添加
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {editingFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 justify-center">
                          {index + 1}
                        </Badge>
                        <Input
                          value={field.name}
                          onChange={(e) => updateField(index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeField(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 可用字段提示 */}
                <div className="text-xs text-muted-foreground">
                  可用字段：{editingFields.map((f) => `{{${f.name}}}`).join('、')}
                </div>
              </div>

              {/* 右侧：模板编辑 */}
              <div className="space-y-4">
                {/* 卡片模板选择 */}
                <div className="flex gap-2">
                  {editingTemplates.map((t, idx) => (
                    <Button
                      key={idx}
                      variant={activeTemplateIndex === idx ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveTemplateIndex(idx)}
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>

                {/* 编辑模式切换 */}
                <Tabs value={editMode} onValueChange={(v) => setEditMode(v as typeof editMode)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="front" className="flex-1">
                      <Code className="h-4 w-4 mr-1" />
                      问题面
                    </TabsTrigger>
                    <TabsTrigger value="back" className="flex-1">
                      <Code className="h-4 w-4 mr-1" />
                      答案面
                    </TabsTrigger>
                    <TabsTrigger value="css" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      CSS
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="front" className="mt-2">
                    <Textarea
                      value={currentTemplate?.questionTemplate || ''}
                      onChange={(e) => {
                        const updated = [...editingTemplates]
                        updated[activeTemplateIndex] = {
                          ...updated[activeTemplateIndex],
                          questionTemplate: e.target.value,
                        }
                        setEditingTemplates(updated)
                      }}
                      rows={8}
                      className="font-mono text-sm"
                      placeholder="问题面 HTML 模板"
                    />
                  </TabsContent>

                  <TabsContent value="back" className="mt-2">
                    <Textarea
                      value={currentTemplate?.answerTemplate || ''}
                      onChange={(e) => {
                        const updated = [...editingTemplates]
                        updated[activeTemplateIndex] = {
                          ...updated[activeTemplateIndex],
                          answerTemplate: e.target.value,
                        }
                        setEditingTemplates(updated)
                      }}
                      rows={8}
                      className="font-mono text-sm"
                      placeholder="答案面 HTML 模板"
                    />
                  </TabsContent>

                  <TabsContent value="css" className="mt-2">
                    <Textarea
                      value={editingCss}
                      onChange={(e) => setEditingCss(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                      placeholder="CSS 样式"
                    />
                  </TabsContent>
                </Tabs>

                {/* 预览 */}
                {editMode !== 'css' && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">预览</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="min-h-24 p-4 border rounded-lg bg-card"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={generateTemplate} disabled={!description.trim() || isGenerating}>
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
              <Button
                variant="outline"
                onClick={() => {
                  setStep('input')
                  setGeneratedTemplate(null)
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                重新生成
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存模板'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
