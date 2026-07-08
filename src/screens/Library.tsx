import { useState } from 'react'
import { useAppData } from '../store'
import { BookCover } from '../components'
import type { BookStatus } from '../types'

const TABS: Array<{ key: BookStatus; label: string }> = [
  { key: 'reading', label: '읽는 중' },
  { key: 'want', label: '읽고 싶어요' },
  { key: 'done', label: '다 읽음' },
]

export function Library({
  onOpenBook,
  onSearch,
}: {
  onOpenBook: (id: string) => void
  onSearch: () => void
}) {
  const data = useAppData()
  const [tab, setTab] = useState<BookStatus>('reading')
  const books = data.books.filter((b) => b.status === tab)

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>내 서재</h1>
        <button className="btn btn-green btn-sm" onClick={onSearch}>+ 책 추가</button>
      </header>

      <div className="seg">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`seg-btn ${tab === t.key ? 'seg-btn-on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="seg-count">{data.books.filter((b) => b.status === t.key).length}</span>
          </button>
        ))}
      </div>

      {books.length === 0 ? (
        <div className="card empty-card">
          <p>
            {tab === 'reading' && '읽는 중인 책이 없어요.'}
            {tab === 'want' && '읽고 싶은 책을 담아두세요.'}
            {tab === 'done' && '완독한 책이 여기에 쌓여요.'}
          </p>
          <button className="btn btn-outline" onClick={onSearch}>책 검색하기</button>
        </div>
      ) : (
        <div className="shelf-grid">
          {books.map((b) => (
            <button key={b.id} className="shelf-item" onClick={() => onOpenBook(b.id)}>
              <BookCover book={b} size="md" />
              <span className="shelf-title">{b.title}</span>
              {b.status === 'done' && b.rating > 0 && (
                <span className="shelf-rating">★ {b.rating}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
