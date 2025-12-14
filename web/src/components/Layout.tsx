import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Separator } from '@/components/ui/separator'

// 路由到页面标题的映射
const routeTitles: Record<string, string> = {
  '/': '学习',
  '/decks': '我的牌组',
  '/market': '牌组市场',
  '/stats': '学习统计',
  '/settings': '设置',
}

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const pathname = location.pathname

  // 获取当前页面标题
  const getPageTitle = () => {
    // 处理市场详情页
    if (pathname.startsWith('/market/') && pathname !== '/market') {
      return '牌组详情'
    }
    return routeTitles[pathname] || '页面'
  }

  const pageTitle = getPageTitle()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-semibold">{pageTitle}</h1>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

