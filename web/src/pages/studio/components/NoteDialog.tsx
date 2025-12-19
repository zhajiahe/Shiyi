import { useState, useEffect } from 'react'
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
import {
  getAvailableNoteModelsApiV1NoteModelsAvailableGet,
  getNoteModelApiV1NoteModelsNoteModelIdGet,
} from '@/api/generated/note-models/note-models'
import { createNoteApiV1NotesPost } from '@/api/generated/notes/notes'
import type { NoteModelResponse } from '@/api/generated/models'
import { toast } from 'sonner'

interface NoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  noteModelId?: string
  onSuccess: () => void
}

export function NoteDialog({
  open,
  onOpenChange,
  deckId,
  noteModelId,
  onSuccess,
}: NoteDialogProps) {
  const [noteModels, setNoteModels] = useState<NoteModelResponse[]>([])
  const [selectedModel, setSelectedModel] = useState<NoteModelResponse | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [tags, setTags] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 获取可用笔记类型
  useEffect(() => {
    if (open && !noteModelId) {
      fetchNoteModels()
    }
  }, [open, noteModelId])

  // 如果指定了 noteModelId，获取该模型
  useEffect(() => {
    if (open && noteModelId) {
      fetchNoteModel(noteModelId)
    }
  }, [open, noteModelId])

  async function fetchNoteModels() {
    setIsLoading(true)
    try {
      const data =
        (await getAvailableNoteModelsApiV1NoteModelsAvailableGet()) as unknown as NoteModelResponse[]
      setNoteModels(data)
      if (data.length > 0) {
        setSelectedModel(data[0])
        initializeFields(data[0])
      }
    } catch (err) {
      console.error('Failed to fetch note models:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchNoteModel(id: string) {
    setIsLoading(true)
    try {
      const data = (await getNoteModelApiV1NoteModelsNoteModelIdGet(
        id,
      )) as unknown as NoteModelResponse
      setSelectedModel(data)
      initializeFields(data)
    } catch (err) {
      console.error('Failed to fetch note model:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function initializeFields(model: NoteModelResponse) {
    const newFields: Record<string, string> = {}
    model.fields_schema?.forEach((field) => {
      newFields[field.name] = ''
    })
    setFields(newFields)
  }

  function handleModelChange(modelId: string) {
    const model = noteModels.find((m) => m.id === modelId)
    if (model) {
      setSelectedModel(model)
      initializeFields(model)
    }
  }

  async function handleSubmit() {
    if (!selectedModel) return

    // 验证必填字段（默认所有字段必填）
    const emptyRequired = selectedModel.fields_schema?.find((f) => !fields[f.name]?.trim())

    if (emptyRequired) {
      toast.error(`请填写 ${emptyRequired.name}`)
      return
    }

    setIsSaving(true)
    try {
      await createNoteApiV1NotesPost({
        deck_id: deckId,
        note_model_id: selectedModel.id,
        fields,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      toast.success('笔记创建成功')
      onOpenChange(false)
      onSuccess()
      // 重置表单
      initializeFields(selectedModel)
      setTags('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加笔记</DialogTitle>
          <DialogDescription>填写笔记内容</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">加载中...</div>
        ) : (
          <div className="space-y-4">
            {/* 选择笔记类型（如果未指定） */}
            {!noteModelId && noteModels.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">笔记类型</label>
                <select
                  className="w-full h-10 px-3 py-2 border rounded-md bg-background"
                  value={selectedModel?.id || ''}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  {noteModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 字段表单 */}
            {selectedModel?.fields_schema?.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="text-sm font-medium">
                  {field.name}
                  <span className="text-destructive ml-1">*</span>
                </label>
                <Input
                  placeholder={`输入 ${field.name}`}
                  value={fields[field.name] || ''}
                  onChange={(e) => setFields({ ...fields, [field.name]: e.target.value })}
                />
              </div>
            ))}

            {/* 标签 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              <Input
                placeholder="多个标签用逗号分隔"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !selectedModel}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
