import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { Layout } from '@/components/Layout'
import { PrivateRoute } from '@/components/PrivateRoute'
import { Dashboard } from './pages/Dashboard'
import { DecksPage } from './pages/Decks'
import { ReviewPage } from './pages/Review'
import { MarketPage } from './pages/Market'
import { MarketDetailPage } from './pages/MarketDetail'
import { SettingsPage } from './pages/Settings'
import { StatsPage } from './pages/Stats'
import { LoginPage } from './pages/auth/Login'
import { RegisterPage } from './pages/auth/Register'
import { ProfilePage } from './pages/profile/Profile'
import { StudioOverview } from './pages/studio/Overview'
import { StudioTemplates } from './pages/studio/Templates'
import { StudioDecks } from './pages/studio/Decks'
import { StudioDeckDetail } from './pages/studio/DeckDetail'

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
