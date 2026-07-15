import { useEffect, useState } from 'react'
import { useAppData, store } from '../store'
import { addDays, calcStreak, daysSinceLastLog, pagesReadByLog, todayStr, uid, clamp, fmtDate } from '../utils'
import { BookCover, ProgressBar } from '../components'
import { readingPrompt } from '../lib/questions'
import { makeWeeklyCard, ensureCardFonts } from '../lib/sharecard'
import { lastWeekReview, weekStartOf, isReviewSeen, markReviewSeen } from '../lib/weekly'
import { activeChallenges, challengeProgress, challengeApi } from '../lib/challenges'
import { lastMonthReview, isStorySeen, markStorySeen } from '../lib/monthly'
import { MonthlyStory } from './MonthlyStory'
import { Garden } from './Garden'
import { Focus } from './Focus'
import type { Book } from '../types'

function MonthlyStoryBanner() {
  const data = useAppData()
  const review = lastMonthReview(data, todayStr())
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => (review ? isStorySeen(review.ym) : true))

  if (!review || dismissed) return null

  const close = () => {
    markStorySeen(review.ym)
    setDismissed(true)
    setOpen(false)
  }

  return (
    <>
      <button className="card story-banner" onClick={() => setOpen(true)}>
        <span className="story-banner-icon">🎁</span>
        <span className="story-banner-text">
          <b>{review.label}의 결산이 도착했어요</b>
          <span className="muted small">한 달의 결, 스토리로 넘겨보세요</span>
        </span>
        <span className="help-entry-arrow">›</span>
      </button>
      {open && <MonthlyStory review={review} onClose={close} />}
    </>
  )
}

function HomeChallenge({ onOpenGroup }: { onOpenGroup: () => void }) {
  const data = useAppData()
  const list = activeChallenges(todayStr())
  // 진행 중이면 진도 높은 것, 아니면 이달의 함께읽기(첫 번째)를 대표로
  const pick = [...list].sort((a, b) => challengeProgress(b, data).pct - challengeProgress(a, data).pct)[0]
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!pick) return
    let alive = true
    challengeApi.stats(pick.id).then((s) => alive && setCount(s?.count ?? null))
    return () => { alive = false }
  }, [pick?.id])

  if (!pick) return null
  const prog = challengeProgress(pick, data)

  return (
    <section className="home-challenge" onClick={onOpenGroup} role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenGroup()}>
      <div className="home-challenge-top">
        <span className="home-challenge-eyebrow">이달의 결 챌린지</span>
        {count !== null && count > 0 && <span className="home-challenge-count">{count}명 참여</span>}
      </div>
      <div className="home-challenge-main">
        <span className="home-challenge-emoji">{pick.emoji}</span>
        <b className="home-challenge-title serif">{pick.title}</b>
      </div>
      <div className="home-challenge-bar">
        <div className="home-challenge-fill" style={{ width: `${prog.pct}%` }} />
      </div>
      <span className="home-challenge-cta">
        {prog.done ? '완주했어요 🎉 · 모임에서 카드 저장 →' : '모임에서 함께 읽기 →'}
      </span>
    </section>
  )
}

function WeeklyReview() {
  const data = useAppData()
  const today = todayStr()
  const review = lastWeekReview(data, today)
  const [dismissed, setDismissed] = useState(() => (review ? isReviewSeen(review.start) : true))

  if (!review || dismissed) return null

  const close = () => {
    markReviewSeen(review.start)
    setDismissed(true)
  }
  const save = async () => {
    await ensureCardFonts()
    const items = review.items.length
      ? review.items
      : [{ quote: `${review.daysRead}일 기록 · ${review.pages}쪽을 읽은 한 주`, title: '결' }]
    const url = makeWeeklyCard(review.range, items)
    const a = document.createElement('a')
    a.href = url
    a.download = '결-지난주-되돌아보기.png'
    a.click()
  }

  const chips = [
    review.daysRead > 0 ? `${review.daysRead}일 기록` : '',
    review.pages > 0 ? `${review.pages.toLocaleString()}쪽` : '',
    review.done > 0 ? `완독 ${review.done}권` : '',
    review.quotes > 0 ? `밑줄 ${review.quotes}개` : '',
  ].filter(Boolean)

  return (
    <section className="card weekreview-card">
      <div className="weekreview-head">
        <span className="weekreview-eyebrow">지난 주 되돌아보기 · {review.range}</span>
        <button className="btn-text muted weekreview-close" onClick={close}>닫기</button>
      </div>
      <h2 className="weekreview-title serif">지난 주, 이렇게 읽으셨어요</h2>
      <div className="weekreview-chips">
        {chips.map((c) => (
          <span key={c} className="weekreview-chip">{c}</span>
        ))}
      </div>
      {review.items.length > 0 && (
        <p className="weekreview-quote serif">“{review.items[0].quote}”</p>
      )}
      <button className="btn btn-outline btn-sm weekreview-save" onClick={save}>
        되돌아보기 카드 저장
      </button>
    </section>
  )
}

function WeeklyUnderline({ weekStart, weekEnd }: { weekStart: string; weekEnd: string }) {
  const data = useAppData()
  const titleOf = (bookId: string) => data.books.find((b) => b.id === bookId)?.title ?? ''
  const items = data.notes
    .filter((n) => n.type === 'quote' && n.createdAt.slice(0, 10) >= weekStart && n.createdAt.slice(0, 10) <= weekEnd)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n) => ({ quote: n.content, title: titleOf(n.bookId) }))
    .filter((it) => it.quote)

  if (items.length === 0) return null

  const range = `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`
  const save = async () => {
    await ensureCardFonts()
    const url = makeWeeklyCard(range, items)
    const a = document.createElement('a')
    a.href = url
    a.download = '결-이번주밑줄.png'
    a.click()
  }

  return (
    <section className="weekly-underline">
      <div className="section-title-row">
        <h2>이번 주 밑줄</h2>
        <span className="muted small">{items.length}개의 문장</span>
      </div>
      <div className="card weekly-card">
        {items.slice(0, 4).map((it, i) => (
          <div key={i} className="weekly-item">
            <p className="weekly-quote serif">“{it.quote}”</p>
            {it.title && <span className="weekly-book muted small">— 『{it.title}』</span>}
          </div>
        ))}
        {items.length > 4 && (
          <p className="muted small weekly-more">그리고 {items.length - 4}개의 문장을 더 담았어요.</p>
        )}
        <button className="btn btn-outline btn-sm weekly-save" onClick={save}>
          이번 주 밑줄 카드 저장
        </button>
      </div>
    </section>
  )
}

function QuickLog({ book, onOpenBook }: { book: Book; onOpenBook: (id: string) => void }) {
  const data = useAppData()
  const [page, setPage] = useState('')
  const [think, setThink] = useState<string | null>(null)
  const logs = data.logs.filter((l) => l.bookId === book.id)
  const current = logs.reduce((max, l) => Math.max(max, l.page), 0)

  const save = () => {
    const p = clamp(parseInt(page, 10) || 0, 1, book.totalPages > 0 ? book.totalPages : 99999)
    if (!p) return
    store.addLog({ id: uid(), bookId: book.id, page: p, date: todayStr(), createdAt: new Date().toISOString() })
    const done = book.totalPages > 0 && p >= book.totalPages
    if (done) {
      store.completeBook(book.id)
      setThink(null)
    } else {
      // 진도를 기록한 '그 순간' = 독서 상황 → 읽은 지점에 맞는 생각거리를 띄운다
      const pct = book.totalPages > 0 ? (p / book.totalPages) * 100 : 0
      setThink(readingPrompt(book.id, pct, logs.length, book.category))
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
      {think && (
        <div className="think-chip">
          <span className="think-label">🌱 생각 한 조각</span>
          <p className="think-q serif">{think}</p>
          <div className="think-actions">
            <button className="btn-text" onClick={() => onOpenBook(book.id)}>메모하기 →</button>
            <button className="btn-text muted" onClick={() => setThink(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Home({
  onOpenBook,
  onSearch,
  onOpenGroup,
}: {
  onOpenBook: (id: string) => void
  onSearch: () => void
  onOpenGroup: () => void
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

  // 이번 주(일~토) 기록 현황 — 홈에서 바로 보는 습관 피드백
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const today = todayStr()
  const weekStart = addDays(today, -new Date(today + 'T00:00:00').getDay())
  const logDates = new Set(data.logs.map((l) => l.date))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return {
      date,
      label: WEEKDAYS[i],
      read: logDates.has(date),
      isToday: date === today,
      future: date > today,
    }
  })
  const weekReadCount = weekDays.filter((d) => d.read).length

  const want = data.books.filter((b) => b.status === 'want')
  const [focusBook, setFocusBook] = useState<Book | null>(null)

  const goalLeft = goal - doneThisYear

  return (
    <div className="screen screen-hero">
      <header className="hero">
        <div className="hero-topline">
          <p className="hero-eyebrow">GYEOL</p>
          <p className="hero-greeting">
            {streak === 0 ? '오늘 한 쪽부터, 다시' : '오늘도 한 쪽, 결이 쌓여요'}
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

        <div className="hero-week">
          <div className="hero-week-head">
            <span>이번 주</span>
            <span className="hero-week-count">
              {weekReadCount > 0 ? `${weekReadCount}일 읽었어요` : '오늘 한 쪽부터 시작해요'}
            </span>
          </div>
          <div className="hero-week-dots">
            {weekDays.map((d) => (
              <div
                key={d.date}
                className={`hw-day${d.read ? ' hw-read' : ''}${d.isToday ? ' hw-today' : ''}${d.future ? ' hw-future' : ''}`}
              >
                <span className="hw-dot" />
                <span className="hw-label">{d.label}</span>
              </div>
            ))}
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

      <MonthlyStoryBanner />

      <Garden />

      <WeeklyReview />

      <HomeChallenge onOpenGroup={onOpenGroup} />

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
                <button
                  className="focus-launch"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFocusBook(b)
                  }}
                >
                  ⏳ 몰입
                </button>
              </div>
              <QuickLog book={b} onOpenBook={onOpenBook} />
            </div>
          ))
        )}
      </section>

      <WeeklyUnderline weekStart={weekStart} weekEnd={addDays(weekStart, 6)} />

      {focusBook && <Focus book={focusBook} onClose={() => setFocusBook(null)} />}

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
