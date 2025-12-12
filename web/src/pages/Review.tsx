import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ReviewPage() {
  const [showAnswer, setShowAnswer] = useState(false)

  // 示例卡片数据
  const currentCard = null

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground flex items-center gap-1">
              <Home className="h-4 w-4" />
              首页
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">复习</span>
          </nav>

          <Card className="max-w-2xl mx-auto text-center py-16">
            <CardContent>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">恭喜！</h2>
              <p className="text-muted-foreground mb-6">
                今日复习已完成，或暂无待复习的卡片
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/decks">查看牌组</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/market">浏览市场</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground flex items-center gap-1">
            <Home className="h-4 w-4" />
            首页
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">复习</span>
        </nav>

        {/* Progress */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>进度</span>
            <span>0 / 0</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary w-0 transition-all" />
          </div>
        </div>

        {/* Card */}
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center min-h-[200px] flex items-center justify-center">
              <div className="text-xl">卡片内容</div>
            </div>

            {showAnswer && (
              <>
                <hr className="my-6" />
                <div className="text-center min-h-[100px] flex items-center justify-center">
                  <div className="text-lg text-muted-foreground">答案内容</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="max-w-2xl mx-auto mt-6">
          {!showAnswer ? (
            <Button className="w-full" size="lg" onClick={() => setShowAnswer(true)}>
              显示答案
            </Button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <Button variant="destructive" size="lg">
                重来
              </Button>
              <Button variant="outline" size="lg">
                困难
              </Button>
              <Button variant="secondary" size="lg">
                良好
              </Button>
              <Button size="lg">
                简单
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



