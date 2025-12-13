import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { Layout } from '@/components/Layout'
import { Dashboard } from './pages/Dashboard'
import { DecksPage } from './pages/Decks'
import { ReviewPage } from './pages/Review'
import { MarketPage } from './pages/Market'
import { MarketDetailPage } from './pages/MarketDetail'
import { SettingsPage } from './pages/Settings'
import { StatsPage } from './pages/Stats'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="shiyi-theme">
      <BrowserRouter>
        <Routes>
          {/* Review 页面保持全屏模式 */}
          <Route path="/review" element={<ReviewPage />} />
          
          {/* 其他页面使用 sidebar 布局 */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/decks" element={<DecksPage />} />
                  <Route path="/market" element={<MarketPage />} />
                  <Route path="/market/:slug" element={<MarketDetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/stats" element={<StatsPage />} />
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
