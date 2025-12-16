import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'

// 路由到页面标题的映射
const routeTitles: Record<string, string> = {
  '/': '学习',
  '/decks': '我的牌组',
  '/market': '牌组市场',
  '/stats': '学习统计',
  '/settings': '设置',
  '/profile': '个人中心',
  '/studio': '工作台',
  '/studio/templates': '模板市场',
  '/studio/decks': '我的牌组',
}

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const pathname = location.pathname
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // 获取当前页面标题
  const getPageTitle = () => {
    // 处理市场详情页
    if (pathname.startsWith('/market/') && pathname !== '/market') {
      return '牌组详情'
    }
    // 处理 Studio 牌组详情页
    if (pathname.startsWith('/studio/decks/') && pathname !== '/studio/decks') {
      return '牌组详情'
    }
    return routeTitles[pathname] || '页面'
  }

  const pageTitle = getPageTitle()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-7 w-7" />
            <h1 className="font-semibold">{pageTitle}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            title={theme === 'dark' ? '浅色模式' : '深色模式'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
