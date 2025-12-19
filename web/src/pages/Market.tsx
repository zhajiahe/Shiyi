import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Star, BookOpen, Loader2, Eye, ArrowUpDown, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getSharedDecks, importSharedDeck, type SharedDeckResponse } from '@/api/sharedDecks'
import { deckRepository } from '@/db/repositories'

export function MarketPage() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<SharedDeckResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // 导入对话框状态
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedDeck, setSelectedDeck] = useState<SharedDeckResponse | null>(null)
  const [deckName, setDeckName] = useState('')
  const [importing, setImporting] = useState(false)

  // 收集所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    decks.forEach((deck) => {
      deck.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [decks])

  // 根据选中标签过滤数据
  const filteredDecks = useMemo(() => {
    if (!selectedTag) return decks
    return decks.filter((deck) => deck.tags?.includes(selectedTag))
  }, [decks, selectedTag])

  useEffect(() => {
    loadDecks()
  }, [])

  const loadDecks = async () => {
    try {
      setLoading(true)
      setError(null)
      // 加载所有牌组（不分页，由前端处理）
      const result = await getSharedDecks({ page: 1, pageSize: 100 })
      setDecks(result.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 打开导入对话框
  const openImportDialog = async (deck: SharedDeckResponse) => {
    setSelectedDeck(deck)
    // 检查名称是否已存在并建议唯一名称
    const existingDecks = await deckRepository.getAll()
    const existingNames = new Set(existingDecks.map((d) => d.name))
    let suggestedName = deck.title
    let counter = 1
    while (existingNames.has(suggestedName)) {
      suggestedName = `${deck.title} (${counter})`
      counter++
    }
    setDeckName(suggestedName)
    setImportDialogOpen(true)
  }

  // 确认导入
  const confirmImport = async () => {
    if (!selectedDeck || !deckName.trim()) return

    try {
      setImporting(true)
      const result = await importSharedDeck(selectedDeck.slug, deckName.trim())
      toast.success('导入成功', {
        description: `已导入 ${result.noteCount} 条笔记，${result.cardCount} 张卡片`,
      })
      setImportDialogOpen(false)
      setSelectedDeck(null)
      // 询问是否跳转到学习
      navigate('/decks')
    } catch (err) {
      toast.error('导入失败', {
        description: err instanceof Error ? err.message : '请重试',
      })
    } finally {
      setImporting(false)
    }
  }

  const columns: ColumnDef<SharedDeckResponse>[] = [
    {
      accessorKey: 'title',
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
          <div className="flex items-center gap-2">
            <span className="font-medium">{deck.title}</span>
            {deck.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            {deck.is_official && (
              <Badge variant="secondary" className="text-xs">
                官方
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'tags',
      header: '标签',
      cell: ({ row }) => {
        const tags = row.original.tags ?? []
        if (tags.length === 0) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'noteCount',
      accessorFn: (row) => row.note_count ?? 0,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          笔记数
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.getValue('noteCount') as number
        return (
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            {count}
          </div>
        )
      },
    },
    {
      id: 'downloadCount',
      accessorFn: (row) => row.download_count ?? 0,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          下载数
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.getValue('downloadCount') as number
        return (
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4 text-muted-foreground" />
            {count}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const deck = row.original
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/market/${deck.slug}`}>
                <Eye className="h-4 w-4 mr-1" />
                查看
              </Link>
            </Button>
            <Button size="sm" onClick={() => openImportDialog(deck)}>
              <Download className="h-4 w-4 mr-1" />
              导入
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredDecks,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const deck = row.original
      const searchLower = filterValue.toLowerCase()
      return (
        deck.title.toLowerCase().includes(searchLower) ||
        (deck.description?.toLowerCase().includes(searchLower) ?? false) ||
        (deck.tags ?? []).some((tag) => tag.toLowerCase().includes(searchLower))
      )
    },
    state: {
      sorting,
      columnFilters,
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
      {/* Search and Filter */}
      {!loading && !error && decks.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索牌组名称、描述或标签..."
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

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">标签筛选：</span>
              <Button
                variant={selectedTag === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                全部
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadDecks}>重试</Button>
        </div>
      ) : decks.length === 0 ? (
        <Empty className="border rounded-lg py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>暂无共享牌组</EmptyTitle>
            <EmptyDescription>目前市场中没有可用的共享牌组</EmptyDescription>
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

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入牌组</DialogTitle>
            <DialogDescription>{selectedDeck?.title} - 请输入牌组名称</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="输入牌组名称"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmImport()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmImport} disabled={importing || !deckName.trim()}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
