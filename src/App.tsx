import { useState } from 'react'
import type { Screen, Tab } from './types'
import { Home } from './screens/Home'
import { Library } from './screens/Library'
import { Search } from './screens/Search'
import { BookDetail } from './screens/BookDetail'
import { Stats } from './screens/Stats'
import { Settings } from './screens/Settings'

const ICON_PATHS: Record<Tab, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v11h5v-6h3v6h5V9',
  library: 'M4 4h5a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4zM20 4h-5a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h5z',
  stats: 'M4 20V10m5.5 10V4m5.5 16v-7m5.5 7V7',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.06-.4.1-.8.1-1.2z',
}

function TabIcon({ tab }: { tab: Tab }) {
  return (
    <svg viewBox="0 0 24 24" className="tabbar-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[tab]} />
    </svg>
  )
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'home', label: '홈' },
  { key: 'library', label: '서재' },
  { key: 'stats', label: '기록' },
  { key: 'settings', label: '설정' },
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
              <TabIcon tab={t.key} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
