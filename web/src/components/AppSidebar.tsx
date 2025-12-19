import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Folder,
  ShoppingBag,
  BarChart3,
  Settings,
  BookOpen,
  GraduationCap,
  Layers,
  User,
  LogIn,
  LogOut,
  Shield,
  Package,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'

// 学习相关导航
const learnItems = [
  { title: '学习', url: '/', icon: GraduationCap },
  { title: '我的牌组', url: '/decks', icon: Folder },
  { title: '牌组市场', url: '/market', icon: ShoppingBag },
  { title: '学习统计', url: '/stats', icon: BarChart3 },
]

// 创作者相关导航（需要登录）
const studioItems = [
  { title: '工作台', url: '/studio', icon: Layers },
  { title: '模板市场', url: '/studio/templates', icon: Folder },
  { title: '我的牌组', url: '/studio/decks', icon: ShoppingBag },
]

// 管理员导航（需要超级管理员权限）
const adminItems = [
  { title: '管理控制台', url: '/admin', icon: Shield },
  { title: '牌组管理', url: '/admin/shared-decks', icon: Package },
  { title: '用户管理', url: '/admin/users', icon: User },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/'
    return location.pathname.startsWith(url)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="拾遗 Shiyi">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">拾遗</span>
                  <span className="text-xs text-muted-foreground">Shiyi</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* 学习模块 */}
        <SidebarGroup>
          <SidebarGroupLabel>学习</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {learnItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 创作者工作台（需要登录） */}
        {isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel>创作者</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {studioItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 管理员控制台（仅超级管理员可见） */}
        {user?.is_superuser && (
          <SidebarGroup>
            <SidebarGroupLabel>管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* 设置 */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="设置">
                  <Link to="/settings">
                    <Settings />
                    <span>设置</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {/* 用户信息或登录按钮 */}
          {isAuthenticated ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/profile')} tooltip="个人中心">
                  <Link to="/profile">
                    <User />
                    <span>{user?.nickname || '个人中心'}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="退出登录">
                  <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                    <LogOut className="size-4" />
                    <span>退出登录</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="登录">
                <Link to="/auth/login">
                  <LogIn />
                  <span>登录</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
