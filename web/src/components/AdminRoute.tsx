import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

interface AdminRouteProps {
  children: React.ReactNode
}

/**
 * 管理员路由守卫
 * 仅允许超级管理员访问
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    // 未登录，跳转到登录页
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (!user?.is_superuser) {
    // 非管理员，跳转到首页
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}


