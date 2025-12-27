import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Star,
  BookOpen,
  Download,
  Loader2,
  ArrowUpDown,
  Search,
  X,
  Eye,
  EyeOff,
  Award,
  Home,
  ChevronRight,
} from 'lucide-react'
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
  toggleFeaturedApiV1AdminSharedDecksSharedDeckIdFeaturePut,
  toggleOfficialApiV1AdminSharedDecksSharedDeckIdOfficialPut,
  toggleActiveApiV1AdminSharedDecksSharedDeckIdActivePut,
} from '@/api/generated/admin/admin'
import { getSharedDecks, type SharedDeckResponse } from '@/api/sharedDecks'

export function AdminSharedDecks() {
  const [decks, setDecks] = useState<SharedDeckResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadDecks()
  }, [])

  const loadDecks = async () => {
    try {
      setLoading(true)
      setError(null)
      // 加载所有牌组（包括非活跃的，管理员需要看到）
      const result = await getSharedDecks({ page: 1, pageSize: 200 })
      setDecks(result.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFeatured = async (deck: SharedDeckResponse) => {
    try {
      setActionLoading(deck.id)
      const newValue = !deck.is_featured
      await toggleFeaturedApiV1AdminSharedDecksSharedDeckIdFeaturePut(deck.id, {
        featured: newValue,
      })
      toast.success(newValue ? '已设为精选' : '已取消精选')
      // 更新本地状态
      setDecks((prev) => prev.map((d) => (d.id === deck.id ? { ...d, is_featured: newValue } : d)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleOfficial = async (deck: SharedDeckResponse) => {
    try {
      setActionLoading(deck.id)
      const newValue = !deck.is_official
      await toggleOfficialApiV1AdminSharedDecksSharedDeckIdOfficialPut(deck.id, {
        official: newValue,
      })
      toast.success(newValue ? '已设为官方' : '已取消官方')
      setDecks((prev) => prev.map((d) => (d.id === deck.id ? { ...d, is_official: newValue } : d)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleActive = async (deck: SharedDeckResponse) => {
    try {
      setActionLoading(deck.id)
      const newValue = !deck.is_active
      await toggleActiveApiV1AdminSharedDecksSharedDeckIdActivePut(deck.id, { active: newValue })
      toast.success(newValue ? '已上架' : '已下架')
      setDecks((prev) => prev.map((d) => (d.id === deck.id ? { ...d, is_active: newValue } : d)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setActionLoading(null)
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
            {!deck.is_active && (
              <Badge variant="secondary" className="text-xs">
                已下架
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: '状态',
      cell: ({ row }) => {
        const deck = row.original
        return (
          <div className="flex items-center gap-1">
            {deck.is_featured && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" title="精选" />
            )}
            {deck.is_official && <Award className="h-4 w-4 text-blue-500" title="官方" />}
            {deck.is_active ? (
              <Eye className="h-4 w-4 text-green-500" title="已上架" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" title="已下架" />
            )}
          </div>
        )
      },
    },
    {
      id: 'noteCount',
      accessorFn: (row) => row.note_count ?? 0,
      header: '笔记数',
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
      header: '下载数',
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
        const isLoading = actionLoading === deck.id
        return (
          <div className="flex gap-2">
            <Button
              variant={deck.is_featured ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleFeatured(deck)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Star className={`h-4 w-4 ${deck.is_featured ? 'fill-current' : ''}`} />
              )}
            </Button>
            <Button
              variant={deck.is_official ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleOfficial(deck)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant={deck.is_active ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleToggleActive(deck)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : deck.is_active ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
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
        deck.title.toLowerCase().includes(searchLower) ||
        (deck.description?.toLowerCase().includes(searchLower) ?? false)
      )
    },
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground flex items-center gap-1">
          <Home className="h-4 w-4" />
          管理控制台
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">共享牌组管理</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">共享牌组管理</h1>
        <p className="text-muted-foreground">管理市场中的共享牌组</p>
      </div>

      {/* Actions Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4" /> 精选
        </div>
        <div className="flex items-center gap-1">
          <Award className="h-4 w-4" /> 官方
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" /> 上架/下架
        </div>
      </div>

      {/* Search */}
      {!loading && !error && decks.length > 0 && (
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
            <EmptyDescription>目前没有任何共享牌组</EmptyDescription>
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
    </div>
  )
}


