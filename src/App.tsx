import { useState } from 'react'
import type { Screen, Tab } from './types'
import { Home } from './screens/Home'
import { Library } from './screens/Library'
import { Search } from './screens/Search'
import { BookDetail } from './screens/BookDetail'
import { Stats } from './screens/Stats'
import { Settings } from './screens/Settings'

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'home', label: '홈', icon: '🏠' },
  { key: 'library', label: '서재', icon: '📚' },
  { key: 'stats', label: '기록', icon: '📅' },
  { key: 'settings', label: '설정', icon: '⚙️' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>({ view: 'tab', tab: 'home' })
  const [lastTab, setLastTab] = useState<Tab>('home')

  const goTab = (tab: Tab) => {
    setLastTab(tab)
    setScreen({ view: 'tab', tab })
    window.scrollTo(0, 0)
  }
  const openBook = (bookId: string) => setScreen({ view: 'book', bookId })
  const openSearch = () => setScreen({ view: 'search' })
  const back = () => setScreen({ view: 'tab', tab: lastTab })

  return (
    <div className="app">
      {screen.view === 'tab' && screen.tab === 'home' && (
        <Home onOpenBook={openBook} onSearch={openSearch} />
      )}
      {screen.view === 'tab' && screen.tab === 'library' && (
        <Library onOpenBook={openBook} onSearch={openSearch} />
      )}
      {screen.view === 'tab' && screen.tab === 'stats' && <Stats />}
      {screen.view === 'tab' && screen.tab === 'settings' && <Settings />}
      {screen.view === 'search' && <Search onBack={back} onAdded={openBook} />}
      {screen.view === 'book' && <BookDetail bookId={screen.bookId} onBack={back} />}

      {screen.view === 'tab' && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tabbar-btn ${screen.tab === t.key ? 'tabbar-btn-on' : ''}`}
              onClick={() => goTab(t.key)}
            >
              <span className="tabbar-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
