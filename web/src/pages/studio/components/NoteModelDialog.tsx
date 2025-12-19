import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Code, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createNoteModelApiV1NoteModelsPost,
  updateNoteModelApiV1NoteModelsNoteModelIdPut,
} from '@/api/generated/note-models/note-models'
import type { NoteModelResponse, CardTemplateResponse, FieldDefinition } from '@/api/generated/models'
import { toast } from 'sonner'

interface NoteModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteModel?: NoteModelResponse // 如果传入则为编辑模式
  onSuccess: () => void
}

interface EditableTemplate {
  id?: string
  name: string
  frontTemplate: string
  backTemplate: string
  css: string
}

const DEFAULT_FRONT = `<div class="front">
  {{Front}}
</div>`

const DEFAULT_BACK = `<div class="back">
  {{FrontSide}}
  <hr>
  {{Back}}
</div>`

const DEFAULT_CSS = `.card {
  font-family: sans-serif;
  font-size: 20px;
  text-align: center;
  color: #333;
}

.front, .back {
  padding: 20px;
}

hr {
  margin: 15px 0;
  border: none;
  border-top: 1px solid #ccc;
}`

export function NoteModelDialog({
  open,
  onOpenChange,
  noteModel,
  onSuccess,
}: NoteModelDialogProps) {
  const [name, setName] = useState('')
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [templates, setTemplates] = useState<EditableTemplate[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0)
  const [editMode, setEditMode] = useState<'front' | 'back' | 'css'>('front')
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 初始化表单
  useEffect(() => {
    if (open) {
      if (noteModel) {
        // 编辑模式
        setName(noteModel.name)
        setFields(noteModel.fields_schema ?? [])
        setTemplates(
          (noteModel.templates ?? []).map((t: CardTemplateResponse) => ({
            id: t.id,
            name: t.name,
            frontTemplate: t.question_template,
            backTemplate: t.answer_template,
            css: DEFAULT_CSS, // CSS 在 NoteModel 级别
          })),
        )
      } else {
        // 创建模式 - 默认值
        setName('')
        setFields([{ name: 'Front' }, { name: 'Back' }])
        setTemplates([
          {
            name: 'Card 1',
            frontTemplate: DEFAULT_FRONT,
            backTemplate: DEFAULT_BACK,
            css: DEFAULT_CSS,
          },
        ])
      }
      setActiveTemplateIndex(0)
      setEditMode('front')
      setShowPreview(false)
    }
  }, [open, noteModel])

  // 添加字段
  function addField() {
    const trimmedName = newFieldName.trim()
    if (!trimmedName) return
    if (fields.some((f) => f.name === trimmedName)) {
      toast.error('字段名已存在')
      return
    }
    setFields([...fields, { name: trimmedName }])
    setNewFieldName('')
  }

  // 删除字段
  function removeField(index: number) {
    if (fields.length <= 1) {
      toast.error('至少需要一个字段')
      return
    }
    setFields(fields.filter((_, i) => i !== index))
  }

  // 添加卡片模板
  function addTemplate() {
    const newIndex = templates.length + 1
    setTemplates([
      ...templates,
      {
        name: `Card ${newIndex}`,
        frontTemplate: DEFAULT_FRONT,
        backTemplate: DEFAULT_BACK,
        css: DEFAULT_CSS,
      },
    ])
    setActiveTemplateIndex(templates.length)
  }

  // 删除卡片模板
  function removeTemplate(index: number) {
    if (templates.length <= 1) {
      toast.error('至少需要一个卡片模板')
      return
    }
    setTemplates(templates.filter((_, i) => i !== index))
    if (activeTemplateIndex >= templates.length - 1) {
      setActiveTemplateIndex(Math.max(0, templates.length - 2))
    }
  }

  // 更新当前模板内容
  function updateTemplate(content: string) {
    const updated = [...templates]
    if (editMode === 'front') {
      updated[activeTemplateIndex].frontTemplate = content
    } else if (editMode === 'back') {
      updated[activeTemplateIndex].backTemplate = content
    } else {
      updated[activeTemplateIndex].css = content
    }
    setTemplates(updated)
  }

  // 获取当前编辑内容
  function getCurrentContent() {
    const template = templates[activeTemplateIndex]
    if (!template) return ''
    if (editMode === 'front') return template.frontTemplate
    if (editMode === 'back') return template.backTemplate
    return template.css
  }

  // 渲染预览
  function renderPreview() {
    const template = templates[activeTemplateIndex]
    if (!template) return ''

    // 使用示例数据
    const sampleData: Record<string, string> = {}
    fields.forEach((f, i) => {
      sampleData[f.name] = `[${f.name} 示例 ${i + 1}]`
    })

    // 简单的 Mustache 替换
    let html = showPreview ? template.frontTemplate : template.backTemplate
    html = html.replace(/\{\{FrontSide\}\}/g, template.frontTemplate)
    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    })

    return `
      <style>${template.css}</style>
      <div class="card">${html}</div>
    `
  }

  // 保存
  async function handleSave() {
    if (!name.trim()) {
      toast.error('请输入模板名称')
      return
    }
    if (fields.length === 0) {
      toast.error('至少需要一个字段')
      return
    }
    if (templates.length === 0) {
      toast.error('至少需要一个卡片模板')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: name.trim(),
        fields_schema: fields.map((f) => ({ name: f.name, description: f.description })),
        templates: templates.map((t, index) => ({
          ...(t.id ? { id: t.id } : {}),
          name: t.name,
          question_template: t.frontTemplate,
          answer_template: t.backTemplate,
          ord: index,
        })),
      }

      if (noteModel) {
        await updateNoteModelApiV1NoteModelsNoteModelIdPut(noteModel.id, payload)
        toast.success('模板更新成功')
      } else {
        await createNoteModelApiV1NoteModelsPost(payload)
        toast.success('模板创建成功')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const activeTemplate = templates[activeTemplateIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{noteModel ? '编辑笔记类型' : '创建笔记类型'}</DialogTitle>
          <DialogDescription>定义字段和卡片模板</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 左侧：基本信息和字段 */}
            <div className="space-y-4">
              {/* 名称 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  模板名称 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="例如：基础问答"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* 字段管理 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">字段定义</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <Input value={field.name} disabled className="flex-1" />
                      <Badge variant="default">必填</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      placeholder="新字段名称"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addField()}
                    />
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 卡片模板列表 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">卡片模板</CardTitle>
                    <Button variant="outline" size="sm" onClick={addTemplate}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {templates.map((template, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        activeTemplateIndex === index ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setActiveTemplateIndex(index)}
                    >
                      <span className="flex-1">{template.name}</span>
                      {templates.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTemplate(index)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* 右侧：模板编辑器 */}
            <div className="space-y-4">
              {activeTemplate && (
                <>
                  {/* 编辑模式切换 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      <Button
                        variant={editMode === 'front' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEditMode('front')}
                      >
                        正面
                      </Button>
                      <Button
                        variant={editMode === 'back' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEditMode('back')}
                      >
                        背面
                      </Button>
                      <Button
                        variant={editMode === 'css' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEditMode('css')}
                      >
                        <Code className="h-4 w-4 mr-1" />
                        CSS
                      </Button>
                    </div>
                    <Button
                      variant={showPreview ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      预览
                    </Button>
                  </div>

                  {/* 可用字段提示 */}
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">可用字段:</span>
                    {fields.map((f) => (
                      <Badge
                        key={f.name}
                        variant="outline"
                        className="text-xs cursor-pointer"
                        onClick={() => {
                          if (editMode !== 'css') {
                            updateTemplate(getCurrentContent() + `{{${f.name}}}`)
                          }
                        }}
                      >
                        {`{{${f.name}}}`}
                      </Badge>
                    ))}
                  </div>

                  {/* 编辑器或预览 */}
                  {showPreview ? (
                    <div className="border rounded-lg h-64 overflow-auto bg-white">
                      <iframe
                        srcDoc={renderPreview()}
                        className="w-full h-full border-0"
                        title="预览"
                      />
                    </div>
                  ) : (
                    <textarea
                      className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      value={getCurrentContent()}
                      onChange={(e) => updateTemplate(e.target.value)}
                      placeholder={editMode === 'css' ? '/* CSS 样式 */' : '<!-- HTML 模板 -->'}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
