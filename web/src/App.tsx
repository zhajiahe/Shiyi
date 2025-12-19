import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { Layout } from '@/components/Layout'
import { PrivateRoute } from '@/components/PrivateRoute'
import { AdminRoute } from '@/components/AdminRoute'
// 学习模块
import { Dashboard } from './pages/learn/Dashboard'
import { DecksPage } from './pages/learn/Decks'
import { ReviewPage } from './pages/learn/Review'
import { StatsPage } from './pages/learn/Stats'
// 市场模块
import { MarketPage } from './pages/market/Market'
import { MarketDetailPage } from './pages/market/MarketDetail'
// 设置
import { SettingsPage } from './pages/Settings'
// 认证模块
import { LoginPage } from './pages/auth/Login'
import { RegisterPage } from './pages/auth/Register'
// 用户模块
import { ProfilePage } from './pages/profile/Profile'
// 工作台模块
import { StudioOverview } from './pages/studio/Overview'
import { StudioTemplates } from './pages/studio/Templates'
import { StudioDecks } from './pages/studio/Decks'
import { StudioDeckDetail } from './pages/studio/DeckDetail'
// 管理员模块
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminSharedDecks } from './pages/admin/SharedDecks'
import { AdminUsers } from './pages/admin/Users'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="shiyi-theme">
      <BrowserRouter>
        <Routes>
          {/* Review 页面保持全屏模式 */}
          <Route path="/review" element={<ReviewPage />} />

          {/* 认证页面（无 Layout） */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />

          {/* 其他页面使用 sidebar 布局 */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  {/* 公开页面 */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/decks" element={<DecksPage />} />
                  <Route path="/market" element={<MarketPage />} />
                  <Route path="/market/:slug" element={<MarketDetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/stats" element={<StatsPage />} />

                  {/* 需要登录的页面 */}
                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <ProfilePage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/studio"
                    element={
                      <PrivateRoute>
                        <StudioOverview />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/studio/templates"
                    element={
                      <PrivateRoute>
                        <StudioTemplates />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/studio/decks"
                    element={
                      <PrivateRoute>
                        <StudioDecks />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/studio/decks/:id"
                    element={
                      <PrivateRoute>
                        <StudioDeckDetail />
                      </PrivateRoute>
                    }
                  />

                  {/* 管理员页面 */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/shared-decks"
                    element={
                      <AdminRoute>
                        <AdminSharedDecks />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <AdminUsers />
                      </AdminRoute>
                    }
                  />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
