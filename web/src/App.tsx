import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/market/:slug" element={<MarketDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
