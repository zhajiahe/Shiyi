import { useEffect, useState, useCallback } from 'react'
import { Plus, Star, Sparkles, Trash2, MoreHorizontal, Pencil } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getAvailableNoteModelsApiV1NoteModelsAvailableGet,
  deleteNoteModelApiV1NoteModelsNoteModelIdDelete,
} from '@/api/generated/note-models/note-models'
import { NoteModelDialog } from './components/NoteModelDialog'
import { AIGenerateTemplateDialog } from './components/AIGenerateTemplateDialog'
import { toast } from 'sonner'
import type { NoteModelResponse } from '@/api/generated/models'

export function StudioTemplates() {
  const [templates, setTemplates] = useState<NoteModelResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<NoteModelResponse | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<NoteModelResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAvailableNoteModelsApiV1NoteModelsAvailableGet(
        keyword ? { keyword } : undefined,
      )
      setTemplates(data as unknown as NoteModelResponse[])
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

  function handleEdit(model: NoteModelResponse) {
    // 内置模板不允许编辑
    if (model.is_builtin) {
      return
    }
    setEditingModel(model)
    setIsDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteNoteModelApiV1NoteModelsNoteModelIdDelete(deleteTarget.id)
      toast.success('模板已删除')
      setDeleteTarget(null)
      fetchTemplates()
    } catch (err) {
      // 检查是否是外键约束错误
      const errorMsg = err instanceof Error ? err.message : '删除失败'
      if (
        errorMsg.includes('foreign key') ||
        errorMsg.includes('constraint') ||
        errorMsg.includes('FOREIGN KEY')
      ) {
        toast.error('无法删除模板', {
          description: '该模板正在被某些牌组使用，请先删除或修改相关牌组',
        })
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const builtinTemplates = templates.filter((t) => t.is_builtin)
  const userTemplates = templates.filter((t) => !t.is_builtin)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模板市场</h1>
          <p className="text-muted-foreground">浏览内置模板或创建自定义笔记类型</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI 生成
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            创建模板
          </Button>
        </div>
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
                  <TemplateCard key={template.id} template={template} />
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
                    onEdit={() => handleEdit(template)}
                    onDelete={() => setDeleteTarget(template)}
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

      <AIGenerateTemplateDialog
        open={isAIDialogOpen}
        onOpenChange={setIsAIDialogOpen}
        onSuccess={fetchTemplates}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模板</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>确定要删除模板 "{deleteTarget?.name}" 吗？此操作无法撤销。</p>
                <p className="text-destructive font-medium">
                  ⚠️ 如果有牌组正在使用此模板，需要先删除或修改相关牌组才能删除模板。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: NoteModelResponse
  onEdit?: () => void
  onDelete?: () => void
}) {
  const isBuiltin = template.is_builtin

  return (
    <Card className={`transition-colors ${isBuiltin ? 'opacity-80' : 'hover:bg-accent/50'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <div className="flex items-center gap-1">
            {isBuiltin ? (
              <Badge variant="secondary">内置</Badge>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <CardDescription>
          {template.fields_schema?.length ?? 0} 个字段 · {template.templates?.length ?? 0}{' '}
          个卡片模板
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {template.fields_schema?.map((field) => (
            <Badge key={field.name} variant="outline" className="text-xs">
              {field.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
