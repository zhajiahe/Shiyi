import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Share,
  Loader2,
  ArrowUpDown,
  Search,
  X,
  Folder,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  getDecksApiV1DecksGet,
  createDeckApiV1DecksPost,
  deleteDeckApiV1DecksDeckIdDelete,
} from '@/api/generated/decks/decks'
import { getNotesApiV1NotesGet } from '@/api/generated/notes/notes'
import { getAvailableNoteModelsApiV1NoteModelsAvailableGet } from '@/api/generated/note-models/note-models'
import type {
  DeckResponse,
  PageResponseDeckResponse,
  NoteModelResponse,
} from '@/api/generated/models'
import { toast } from 'sonner'
import { PublishDialog } from './components/PublishDialog'

export function StudioDecks() {
  const [decks, setDecks] = useState<DeckResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDesc, setNewDeckDesc] = useState('')
  const [newDeckNoteModelId, setNewDeckNoteModelId] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)

  // 笔记模板列表
  const [noteModels, setNoteModels] = useState<NoteModelResponse[]>([])
  const [isLoadingNoteModels, setIsLoadingNoteModels] = useState(false)

  // DataTable 状态
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // 发布对话框状态
  const [publishDeck, setPublishDeck] = useState<DeckResponse | null>(null)
  const [publishNoteCount, setPublishNoteCount] = useState(0)

  // 删除确认对话框状态
  const [deleteDeck, setDeleteDeck] = useState<DeckResponse | null>(null)

  useEffect(() => {
    fetchDecks()
  }, [])

  // 加载笔记模板列表
  const fetchNoteModels = useCallback(async () => {
    if (noteModels.length > 0) return // 已加载过
    setIsLoadingNoteModels(true)
    try {
      const data = await getAvailableNoteModelsApiV1NoteModelsAvailableGet()
      setNoteModels(data as unknown as NoteModelResponse[])
    } catch (err) {
      console.error('Failed to fetch note models:', err)
    } finally {
      setIsLoadingNoteModels(false)
    }
  }, [noteModels.length])

  async function fetchDecks() {
    setIsLoading(true)
    try {
      const data = (await getDecksApiV1DecksGet({ page_size: 100 })) as PageResponseDeckResponse
      setDecks(data.items ?? [])
    } catch (err) {
      console.error('Failed to fetch decks:', err)
      toast.error('加载牌组失败')
    } finally {
      setIsLoading(false)
    }
  }

  async function createDeck() {
    if (!newDeckName.trim()) return
    if (!newDeckNoteModelId) {
      toast.error('请选择笔记模板')
      return
    }

    setIsCreating(true)
    try {
      await createDeckApiV1DecksPost({
        name: newDeckName.trim(),
        description: newDeckDesc.trim() || undefined,
        note_model_id: newDeckNoteModelId,
      })
      toast.success('牌组创建成功')
      setIsCreateOpen(false)
      setNewDeckName('')
      setNewDeckDesc('')
      setNewDeckNoteModelId('')
      fetchDecks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteDeck() {
    if (!deleteDeck) return

    try {
      await deleteDeckApiV1DecksDeckIdDelete(deleteDeck.id)
      toast.success('牌组已删除')
      setDeleteDeck(null)
      fetchDecks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function openPublishDialog(deck: DeckResponse) {
    try {
      // 获取笔记数量
      const notesData = await getNotesApiV1NotesGet({ deck_id: deck.id, page_size: 1 })
      setPublishNoteCount((notesData as { total?: number }).total ?? 0)
      setPublishDeck(deck)
    } catch (err) {
      toast.error('获取牌组信息失败')
    }
  }

  const columns: ColumnDef<DeckResponse>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          牌组名称
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const deck = row.original
        return (
          <Link
            to={`/studio/decks/${deck.id}`}
            className="font-medium hover:underline flex items-center gap-2"
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            {deck.name}
          </Link>
        )
      },
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => {
        const desc = row.original.description
        return <span className="text-muted-foreground line-clamp-1">{desc || '暂无描述'}</span>
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          创建时间
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.original.created_at
        return (
          <span className="text-muted-foreground">
            {date ? new Date(date).toLocaleDateString() : '未知'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const deck = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/studio/decks/${deck.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  查看详情
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPublishDialog(deck)}>
                <Share className="mr-2 h-4 w-4" />
                发布到市场
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteDeck(deck)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: decks,
    columns,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const deck = row.original
      const searchLower = filterValue.toLowerCase()
      return (
        deck.name.toLowerCase().includes(searchLower) ||
        (deck.description?.toLowerCase().includes(searchLower) ?? false)
      )
    },
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的牌组</h1>
          <p className="text-muted-foreground">管理您的学习牌组</p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (open) fetchNoteModels()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建牌组
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新牌组</DialogTitle>
              <DialogDescription>创建一个新的学习牌组</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  笔记模板 <span className="text-destructive">*</span>
                </label>
                {isLoadingNoteModels ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载模板中...
                  </div>
                ) : (
                  <Select value={newDeckNoteModelId} onValueChange={setNewDeckNoteModelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择一个笔记模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {noteModels.map((nm) => (
                        <SelectItem key={nm.id} value={nm.id}>
                          {nm.name}
                          {nm.is_builtin && (
                            <span className="ml-2 text-xs text-muted-foreground">内置</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  牌组名称 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="例如：日语 N5 词汇"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">描述（可选）</label>
                <Input
                  placeholder="牌组的简要描述"
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button
                onClick={createDeck}
                disabled={isCreating || !newDeckName.trim() || !newDeckNoteModelId}
              >
                {isCreating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      {!isLoading && decks.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索牌组名称或描述..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 pr-9"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setGlobalFilter('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : decks.length === 0 ? (
        <Empty className="border rounded-lg py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Folder className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>还没有牌组</EmptyTitle>
            <EmptyDescription>创建您的第一个学习牌组开始记忆</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {/* Table */}
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
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              共 {table.getFilteredRowModel().rows.length} 个牌组
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
              <span className="text-sm text-muted-foreground">
                第 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 页
              </span>
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
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteDeck} onOpenChange={(open) => !open && setDeleteDeck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除牌组吗？</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除牌组 "<strong>{deleteDeck?.name}</strong>"。
              <br />
              <br />
              所有关联的笔记和卡片也会被删除。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeck}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 发布对话框 */}
      {publishDeck && (
        <PublishDialog
          open={!!publishDeck}
          onOpenChange={(open) => !open && setPublishDeck(null)}
          deckId={publishDeck.id}
          deckName={publishDeck.name}
          noteCount={publishNoteCount}
          onSuccess={fetchDecks}
        />
      )}
    </div>
  )
}
