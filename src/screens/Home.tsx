import { useState } from 'react'
import { useAppData, store } from '../store'
import { calcStreak, daysSinceLastLog, pagesReadByLog, todayStr, uid, clamp } from '../utils'
import { BookCover, ProgressBar } from '../components'
import type { Book } from '../types'

function QuickLog({ book }: { book: Book }) {
  const data = useAppData()
  const [page, setPage] = useState('')
  const logs = data.logs.filter((l) => l.bookId === book.id)
  const current = logs.reduce((max, l) => Math.max(max, l.page), 0)

  const save = () => {
    const p = clamp(parseInt(page, 10) || 0, 1, book.totalPages > 0 ? book.totalPages : 99999)
    if (!p) return
    store.addLog({ id: uid(), bookId: book.id, page: p, date: todayStr(), createdAt: new Date().toISOString() })
    if (book.totalPages > 0 && p >= book.totalPages) {
      store.updateBook(book.id, { status: 'done', finishedAt: todayStr() })
    }
    setPage('')
  }

  return (
    <div className="quicklog">
      <ProgressBar current={current} total={book.totalPages} />
      <div className="quicklog-row">
        <input
          type="number"
          inputMode="numeric"
          placeholder={current > 0 ? `${current}쪽까지 읽었어요` : '오늘 몇 쪽까지?'}
          value={page}
          onChange={(e) => setPage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <button className="btn btn-green btn-sm" onClick={save} disabled={!page}>
          기록
        </button>
      </div>
    </div>
  )
}

export function Home({
  onOpenBook,
  onSearch,
}: {
  onOpenBook: (id: string) => void
  onSearch: () => void
}) {
  const data = useAppData()
  const streak = calcStreak(data.logs)
  const year = String(new Date().getFullYear())
  const doneThisYear = data.books.filter(
    (b) => b.status === 'done' && b.finishedAt?.startsWith(year),
  ).length
  const goal = data.settings.yearlyGoal
  const goalPct = goal > 0 ? clamp(Math.round((doneThisYear / goal) * 100), 0, 100) : 0
  const reading = data.books.filter((b) => b.status === 'reading')

  const byLog = pagesReadByLog(data.logs)
  const todayPages = data.logs
    .filter((l) => l.date === todayStr())
    .reduce((s, l) => s + (byLog.get(l.id) || 0), 0)

  const gap = daysSinceLastLog(data.logs)
  const showRest = reading.length > 0 && gap !== null && gap >= 3

  const want = data.books.filter((b) => b.status === 'want')

  const goalLeft = goal - doneThisYear

  return (
    <div className="screen screen-hero">
      <header className="hero">
        <div className="hero-topline">
          <p className="hero-eyebrow">BOOKBLOOM</p>
          <p className="hero-greeting">
            {streak === 0 ? '오늘 한 쪽부터 다시 피어나요' : '오늘도 한 쪽, 마음이 자라요'}
          </p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num accent">{streak}</span>
            <span className="hero-stat-label">일 연속</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="hero-stat-num">{todayPages}</span>
            <span className="hero-stat-label">오늘 읽은 쪽</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="hero-stat-num">{doneThisYear}</span>
            <span className="hero-stat-label">올해 완독</span>
          </div>
        </div>

        <div className="hero-goal">
          <div className="hero-goal-head">
            <span>올해 목표</span>
            <span className="hero-goal-count">
              {doneThisYear} <span className="hero-goal-total">/ {goal}권</span>
            </span>
          </div>
          <div className="hero-goal-bar">
            <div className="hero-goal-fill" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="hero-goal-note">
            {doneThisYear >= goal
              ? '목표 달성! 대단해요 🎉'
              : `${goalLeft}권 남았어요 · 천천히 꾸준히면 충분해요`}
          </p>
        </div>
      </header>

      {showRest && (
        <div className="card rest-banner">
          <p>
            <b>{gap}일 쉬어갔어요.</b> 오늘 한 쪽이면 다시 이어져요. 천천히 가도 괜찮아요.
          </p>
        </div>
      )}

      <section>
        <div className="section-title-row">
          <h2>읽는 중</h2>
          {reading.length > 0 && (
            <button className="section-add" onClick={onSearch}>+ 책 추가</button>
          )}
        </div>
        {reading.length === 0 ? (
          <div className="card empty-card">
            <p>지금 읽는 책이 없어요.</p>
            <button className="btn btn-green" onClick={onSearch}>+ 책 추가하기</button>
          </div>
        ) : (
          reading.map((b) => (
            <div key={b.id} className="card reading-card">
              <div className="reading-card-top" onClick={() => onOpenBook(b.id)}>
                <BookCover book={b} size="sm" />
                <div className="reading-card-meta">
                  <b className="book-title serif">{b.title}</b>
                  <span className="muted small">{b.author}</span>
                </div>
              </div>
              <QuickLog book={b} />
            </div>
          ))
        )}
      </section>

      {want.length > 0 && (
        <section>
          <div className="section-title-row">
            <h2>읽고 싶은 책</h2>
            <span className="muted small">{want.length}권</span>
          </div>
          <div className="want-shelf">
            {want.map((b) => (
              <button key={b.id} className="want-item" onClick={() => onOpenBook(b.id)}>
                <BookCover book={b} size="md" />
                <span className="shelf-title">{b.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
