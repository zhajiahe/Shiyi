import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAvailableNoteModelsApiV1NoteModelsAvailableGet,
  getNoteModelApiV1NoteModelsNoteModelIdGet,
} from '@/api/generated/note-models/note-models'
import { createNotesBatchApiV1NotesBatchPost } from '@/api/generated/notes/notes'
import type { NoteModelResponse, NoteBatchResult } from '@/api/generated/models'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, AlertCircle, Check, X } from 'lucide-react'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  noteModelId?: string
  onSuccess: () => void
}

interface ParsedRow {
  data: Record<string, string>
  errors: string[]
}

interface ImportPreview {
  headers: string[]
  rows: ParsedRow[]
  fieldMapping: Record<string, string>
}

export function ImportDialog({
  open,
  onOpenChange,
  deckId,
  noteModelId,
  onSuccess,
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [noteModel, setNoteModel] = useState<NoteModelResponse | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [importResult, setImportResult] = useState<{
    created: number
    skipped: number
    errors: number
  } | null>(null)

  // 获取笔记类型
  const fetchNoteModel = useCallback(async () => {
    if (!noteModelId) {
      // 获取可用模板列表，选择第一个
      const models =
        (await getAvailableNoteModelsApiV1NoteModelsAvailableGet()) as unknown as NoteModelResponse[]
      if (models.length > 0) {
        setNoteModel(models[0])
      }
    } else {
      const model = (await getNoteModelApiV1NoteModelsNoteModelIdGet(
        noteModelId,
      )) as unknown as NoteModelResponse
      setNoteModel(model)
    }
  }, [noteModelId])

  // 当对话框打开时获取笔记类型
  useState(() => {
    if (open) {
      fetchNoteModel()
    }
  })

  // 解析文件
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
      parseCSV(file)
    } else if (extension === 'xlsx' || extension === 'xls') {
      parseExcel(file)
    } else {
      toast.error('不支持的文件格式，请使用 CSV 或 Excel 文件')
      setIsLoading(false)
    }
  }

  // 解析 CSV
  function parseCSV(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processData(results.meta.fields || [], results.data as Record<string, string>[])
        setIsLoading(false)
      },
      error: (error) => {
        toast.error(`解析失败: ${error.message}`)
        setIsLoading(false)
      },
    })
  }

  // 解析 Excel
  function parseExcel(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet)
        const headers = Object.keys(jsonData[0] || {})
        processData(headers, jsonData)
      } catch {
        toast.error('Excel 文件解析失败')
      }
      setIsLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  // 处理解析后的数据
  function processData(headers: string[], data: Record<string, string>[]) {
    if (!noteModel) {
      toast.error('请先选择笔记类型')
      return
    }

    // 自动匹配字段
    const fieldMapping: Record<string, string> = {}
    noteModel.fields_schema?.forEach((field) => {
      // 尝试找到匹配的列（忽略大小写）
      const matchedHeader = headers.find(
        (h) => h.toLowerCase() === field.name.toLowerCase() || h === field.name,
      )
      if (matchedHeader) {
        fieldMapping[field.name] = matchedHeader
      }
    })

    // 验证每行数据
    const rows: ParsedRow[] = data.map((row) => {
      const errors: string[] = []
      const mappedData: Record<string, string> = {}

      noteModel.fields_schema?.forEach((field) => {
        const headerName = fieldMapping[field.name]
        const value = headerName ? (row[headerName] || '').toString().trim() : ''
        mappedData[field.name] = value

        if (!value) {
          errors.push(`缺少必填字段: ${field.name}`)
        }
      })

      return { data: mappedData, errors }
    })

    setPreview({ headers, rows, fieldMapping })
    setStep('preview')
  }

  // 更新字段映射
  function updateFieldMapping(fieldName: string, headerName: string) {
    if (!preview) return

    const newMapping = { ...preview.fieldMapping, [fieldName]: headerName }

    // 重新验证数据
    const rows = preview.rows.map((row) => {
      const errors: string[] = []
      const mappedData: Record<string, string> = {}

      noteModel?.fields_schema?.forEach((field) => {
        const header = newMapping[field.name]
        const originalRow = preview.rows.find((r) => r === row)
        // 从原始数据获取值
        const value = header
          ? (
              originalRow?.data[
                Object.keys(originalRow.data).find(
                  (k) => preview.fieldMapping[k] === header || k === field.name,
                ) || field.name
              ] || ''
            )
              .toString()
              .trim()
          : ''
        mappedData[field.name] = value

        if (!value) {
          errors.push(`缺少必填字段: ${field.name}`)
        }
      })

      return { data: mappedData, errors }
    })

    setPreview({ ...preview, fieldMapping: newMapping, rows })
  }

  // 执行导入
  async function handleImport() {
    if (!preview || !noteModel) return

    // 过滤有效数据
    const validRows = preview.rows.filter((row) => row.errors.length === 0)

    if (validRows.length === 0) {
      toast.error('没有有效的数据可以导入')
      return
    }

    setIsImporting(true)
    try {
      const notes = validRows.map((row) => ({
        fields: row.data,
        tags: [],
      }))

      const result = (await createNotesBatchApiV1NotesBatchPost({
        deck_id: deckId,
        note_model_id: noteModel.id,
        notes,
      })) as unknown as NoteBatchResult

      setImportResult({
        created: result.created_count,
        skipped: result.skipped_count,
        errors: result.error_count,
      })
      setStep('result')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败')
    } finally {
      setIsImporting(false)
    }
  }

  // 重置状态
  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setStep('upload')
      setPreview(null)
      setImportResult(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }, 200)
  }

  const validCount = preview?.rows.filter((r) => r.errors.length === 0).length || 0
  const errorCount = preview?.rows.filter((r) => r.errors.length > 0).length || 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && '批量导入笔记'}
            {step === 'preview' && '预览导入数据'}
            {step === 'result' && '导入完成'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && '支持 Excel (.xlsx, .xls) 和 CSV 文件'}
            {step === 'preview' && '请确认字段映射并检查数据'}
            {step === 'result' && '查看导入结果'}
          </DialogDescription>
        </DialogHeader>

        {/* 上传步骤 */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              {isLoading ? (
                <div className="text-muted-foreground">解析中...</div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">点击或拖拽文件到此处</p>
                  <p className="text-sm text-muted-foreground mt-1">支持 .xlsx, .xls, .csv 格式</p>
                </>
              )}
            </div>

            {noteModel && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-2">
                  <FileSpreadsheet className="inline h-4 w-4 mr-1" />
                  笔记类型: {noteModel.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  必填字段: {noteModel.fields_schema?.map((f) => f.name).join(', ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 预览步骤 */}
        {step === 'preview' && preview && noteModel && (
          <div className="space-y-4">
            {/* 字段映射 */}
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium mb-3">字段映射</div>
              <div className="grid gap-2">
                {noteModel.fields_schema?.map((field) => (
                  <div key={field.name} className="flex items-center gap-2">
                    <span className="w-24 text-sm">
                      {field.name}
                      <span className="text-destructive">*</span>
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      className="flex-1 h-8 px-2 border rounded text-sm bg-background"
                      value={preview.fieldMapping[field.name] || ''}
                      onChange={(e) => updateFieldMapping(field.name, e.target.value)}
                    >
                      <option value="">-- 选择列 --</option>
                      {preview.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* 数据统计 */}
            <div className="flex gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                有效: {validCount}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <X className="h-3 w-3 text-destructive" />
                错误: {errorCount}
              </Badge>
            </div>

            {/* 数据预览 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">状态</th>
                      {noteModel.fields_schema?.map((field) => (
                        <th key={field.name} className="px-3 py-2 text-left">
                          {field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row, index) => (
                      <tr key={index} className={row.errors.length > 0 ? 'bg-destructive/10' : ''}>
                        <td className="px-3 py-2">
                          {row.errors.length > 0 ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </td>
                        {noteModel.fields_schema?.map((field) => (
                          <td key={field.name} className="px-3 py-2 truncate max-w-32">
                            {row.data[field.name] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 10 && (
                <div className="px-3 py-2 text-center text-sm text-muted-foreground bg-muted">
                  共 {preview.rows.length} 行，仅显示前 10 行
                </div>
              )}
            </div>
          </div>
        )}

        {/* 结果步骤 */}
        {step === 'result' && importResult && (
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium mb-4">导入完成</p>
            <div className="flex justify-center gap-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                <div className="text-muted-foreground">成功导入</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                <div className="text-muted-foreground">跳过重复</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{importResult.errors}</div>
                <div className="text-muted-foreground">导入失败</div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                重新选择文件
              </Button>
              <Button onClick={handleImport} disabled={isImporting || validCount === 0}>
                {isImporting ? '导入中...' : `导入 ${validCount} 条`}
              </Button>
            </>
          )}
          {step === 'result' && <Button onClick={handleClose}>完成</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
