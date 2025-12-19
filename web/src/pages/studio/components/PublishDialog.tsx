import { useState } from 'react'
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
import { publishDeckApiV1DecksDeckIdPublishPost } from '@/api/generated/decks/decks'
import { toast } from 'sonner'
import { Check, AlertCircle } from 'lucide-react'

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  deckName: string
  noteCount: number
  onSuccess?: () => void
}

export function PublishDialog({
  open,
  onOpenChange,
  deckId,
  deckName,
  noteCount,
  onSuccess,
}: PublishDialogProps) {
  const [slug, setSlug] = useState('')
  const [tags, setTags] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  // 生成默认 slug
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .slice(0, 50)
  }

  async function handlePublish() {
    if (!slug.trim()) {
      toast.error('请输入唯一标识')
      return
    }

    if (noteCount === 0) {
      toast.error('牌组至少需要一条笔记才能发布')
      return
    }

    setIsPublishing(true)
    try {
      await publishDeckApiV1DecksDeckIdPublishPost(deckId, {
        slug: slug.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      setIsPublished(true)
      toast.success('发布成功！')
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败')
    } finally {
      setIsPublishing(false)
    }
  }

  function handleClose() {
    onOpenChange(false)
    // 重置状态
    setTimeout(() => {
      setSlug('')
      setTags('')
      setIsPublished(false)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isPublished ? '发布成功' : '发布到牌组市场'}</DialogTitle>
          <DialogDescription>
            {isPublished ? '您的牌组已成功发布到市场' : '发布后其他用户可以搜索和导入您的牌组'}
          </DialogDescription>
        </DialogHeader>

        {isPublished ? (
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium">{deckName}</p>
            <p className="text-muted-foreground mt-1">已发布到牌组市场</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 牌组信息 */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="font-medium">{deckName}</div>
              <div className="text-sm text-muted-foreground mt-1">{noteCount} 条笔记</div>
            </div>

            {/* 验证提示 */}
            {noteCount === 0 && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">牌组至少需要一条笔记才能发布</span>
              </div>
            )}

            {/* 唯一标识 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                唯一标识 <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="例如：n5-vocabulary"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSlug(generateSlug(deckName))}
                >
                  自动生成
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                用于生成分享链接，只能包含字母、数字和连字符
              </p>
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              <Input
                placeholder="多个标签用逗号分隔，如：日语,N5,词汇"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              {tags && (
                <div className="flex gap-1 flex-wrap">
                  {tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {isPublished ? (
            <Button onClick={handleClose}>完成</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing || noteCount === 0}>
                {isPublishing ? '发布中...' : '确认发布'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
