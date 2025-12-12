import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { DecksPage } from './pages/Decks'
import { ReviewPage } from './pages/Review'
import { MarketPage } from './pages/Market'
import { MarketDetailPage } from './pages/MarketDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/decks" element={<DecksPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/market/:slug" element={<MarketDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
