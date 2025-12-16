import { useEffect, useState, useCallback } from 'react'
import { Plus, Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'
import { NoteModelDialog } from './components/NoteModelDialog'
import type { NoteModel } from '@/types'

interface NoteModelResponse extends NoteModel {
  isBuiltin: boolean
}

export function StudioTemplates() {
  const [templates, setTemplates] = useState<NoteModelResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<NoteModel | undefined>(undefined)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
      const data = await api.get<NoteModelResponse[]>(`/note-models/available${params}`)
      setTemplates(data)
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [keyword])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  function handleCreate() {
    setEditingModel(undefined)
    setIsDialogOpen(true)
  }

  function handleEdit(model: NoteModel) {
    setEditingModel(model)
    setIsDialogOpen(true)
  }

  const builtinTemplates = templates.filter((t) => t.isBuiltin)
  const userTemplates = templates.filter((t) => !t.isBuiltin)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模板市场</h1>
          <p className="text-muted-foreground">浏览内置模板或创建自定义笔记类型</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          创建模板
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="搜索模板..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 内置模板 */}
          {builtinTemplates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                内置模板
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {builtinTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => handleEdit(template)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 我的模板 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">我的模板</h2>
            {userTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">您还没有创建自定义模板</p>
                  <Button variant="outline" onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一个模板
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => handleEdit(template)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <NoteModelDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        noteModel={editingModel}
        onSuccess={fetchTemplates}
      />
    </div>
  )
}

function TemplateCard({
  template,
  onClick,
}: {
  template: NoteModelResponse
  onClick?: () => void
}) {
  return (
    <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          {template.isBuiltin && (
            <Badge variant="secondary" className="ml-2">
              内置
            </Badge>
          )}
        </div>
        <CardDescription>
          {template.fieldsSchema.length} 个字段 · {template.templates.length} 个卡片模板
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {template.fieldsSchema.map((field) => (
            <Badge key={field.name} variant="outline" className="text-xs">
              {field.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
