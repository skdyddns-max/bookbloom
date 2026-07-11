import { useState } from 'react'
import { useAppData } from '../store'
import { calcStreak, maxStreak, pagesReadByLog } from '../utils'
import { BarChart, Donut, MonthCalendar } from '../components'
import { makeYearCard, makePersonaCard, ensureCardFonts } from '../lib/sharecard'
import { computeBadges } from '../lib/badges'
import { computePersona } from '../lib/persona'

function PersonaCard() {
  const data = useAppData()
  const p = computePersona(data)

  const save = async () => {
    await ensureCardFonts()
    const url = makePersonaCard({
      mark: p.mark,
      name: p.name,
      tagline: p.tagline,
      line: p.line,
      traits: p.traits.map((t) => t.label),
      stats: p.stats,
    })
    const a = document.createElement('a')
    a.href = url
    a.download = `결-리딩페르소나.png`
    a.click()
  }

  if (!p.ready) {
    const pct = Math.round((p.progress.have / p.progress.need) * 100)
    return (
      <section className="card persona-card persona-locked">
        <span className="persona-eyebrow">나의 리딩 페르소나</span>
        <div className="persona-mark">🌱</div>
        <h2 className="persona-name">곧 당신의 결이 드러나요</h2>
        <p className="muted small">
          책 {p.progress.need}권을 읽거나 기록하면, 당신만의 독서 성향이 카드로 그려져요.
          지금은 {p.progress.have} / {p.progress.need}.
        </p>
        <div className="persona-progress">
          <span style={{ width: `${pct}%` }} />
        </div>
      </section>
    )
  }

  return (
    <section className="card persona-card">
      <span className="persona-eyebrow">나의 리딩 페르소나</span>
      <div className="persona-mark">{p.mark}</div>
      <h2 className="persona-name">{p.name}</h2>
      <p className="persona-tagline">{p.tagline}</p>
      <p className="persona-line">“{p.line}”</p>

      {p.traits.length > 0 && (
        <div className="persona-traits">
          {p.traits.map((t) => (
            <span key={t.key} className="persona-chip" title={t.desc}>{t.label}</span>
          ))}
        </div>
      )}

      {p.genres.length > 0 && (
        <div className="persona-genres">
          {p.genres.map((g) => (
            <div key={g.bucket} className="persona-genre-row">
              <span className="pg-label">{g.label}</span>
              <span className="pg-bar"><span style={{ width: `${Math.round(g.ratio * 100)}%` }} /></span>
              <span className="pg-val">{Math.round(g.ratio * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="persona-stats">
        <div><b>{p.stats.doneCount}</b><span>완독</span></div>
        <div><b>{p.stats.topGenre}</b><span>최애 분야</span></div>
        <div><b>{p.stats.bestStreak}일</b><span>최장 연속</span></div>
        <div><b>{p.stats.quotes}</b><span>모은 문장</span></div>
      </div>

      <button className="btn btn-green" onClick={save}>페르소나 카드 저장 (공유용)</button>
      <p className="muted small center persona-foot">읽을수록 페르소나는 계속 자라요.</p>
    </section>
  )
}

function monthStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function moveMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthStr(d)
}

export function Stats() {
  const data = useAppData()
  const [month, setMonth] = useState(monthStr())
  const year = month.slice(0, 4)

  const byLog = pagesReadByLog(data.logs)

  // 이 달: 날짜별 읽은 쪽수
  const marked = new Map<string, number>()
  let monthPages = 0
  for (const l of data.logs) {
    if (!l.date.startsWith(month)) continue
    const p = byLog.get(l.id) || 0
    marked.set(l.date, (marked.get(l.date) || 0) + p)
    monthPages += p
  }

  const doneInMonth = data.books.filter((b) => b.status === 'done' && b.finishedAt?.startsWith(month))
  const doneInYear = data.books.filter((b) => b.status === 'done' && b.finishedAt?.startsWith(year))

  // 카테고리 분포 (올해 완독 기준, 없으면 서재 전체)
  const catSource = doneInYear.length > 0 ? doneInYear : data.books
  const catMap = new Map<string, number>()
  for (const b of catSource) {
    catMap.set(b.category || '기타', (catMap.get(b.category || '기타') || 0) + 1)
  }
  const catData = [...catMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const streak = calcStreak(data.logs)
  const goal = data.settings.yearlyGoal
  const badges = computeBadges(data)
  const earnedCount = badges.filter((b) => b.earned).length

  // 최근 6개월 추이 (읽은 쪽수 + 완독 권수)
  const now = new Date()
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const m = monthStr(d)
    let pages = 0
    for (const l of data.logs) {
      if (l.date.startsWith(m)) pages += byLog.get(l.id) || 0
    }
    const done = data.books.filter((b) => b.status === 'done' && b.finishedAt?.startsWith(m)).length
    return { label: `${d.getMonth() + 1}월`, value: pages, sub: done > 0 ? `${done}권` : ' ' }
  })

  // 올해의 책 톱3 (별점순)
  const topBooks = [...doneInYear].filter((b) => b.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 3)

  const saveYearCard = async () => {
    await ensureCardFonts()
    const url = makeYearCard({
      year,
      doneCount: doneInYear.length,
      totalPages: data.logs
        .filter((l) => l.date.startsWith(year))
        .reduce((s, l) => s + (byLog.get(l.id) || 0), 0),
      bestStreak: maxStreak(data.logs),
      topCategories: catData,
      topBooks,
    })
    const a = document.createElement('a')
    a.href = url
    a.download = `bookbloom-${year}-결산.png`
    a.click()
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>독서 기록</h1>
        <span />
      </header>

      <div className="stat-tiles">
        <div className="card stat-tile">
          <span className="stat-num">{doneInMonth.length}</span>
          <span className="stat-label">이달 완독</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-num">{monthPages.toLocaleString()}</span>
          <span className="stat-label">이달 읽은 쪽</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-num">{streak}</span>
          <span className="stat-label">연속 기록일</span>
        </div>
      </div>

      <PersonaCard />

      <section className="card">
        <div className="card-title-row">
          <h2>독서 뱃지</h2>
          <span className="muted small">{earnedCount} / {badges.length}</span>
        </div>
        <div className="badge-grid">
          {badges.map((b) => (
            <div key={b.key} className={`badge ${b.earned ? 'badge-on' : ''}`} title={b.desc}>
              <span className="badge-icon">{b.icon}</span>
              <span className="badge-title">{b.title}</span>
              {b.earned ? (
                <span className="badge-status">완료</span>
              ) : (
                <span className="badge-status muted">{b.progress ?? ''}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>독서 캘린더</h2>
        <MonthCalendar month={month} marked={marked} onMove={(d) => setMonth(moveMonth(month, d))} />
        <p className="muted small">기록한 날이 진하게 표시돼요. 많이 읽을수록 더 진해집니다.</p>
      </section>

      <section className="card">
        <h2>최근 6개월 읽은 쪽수</h2>
        <BarChart data={trend} unit="쪽수" />
        <p className="muted small">막대 아래 숫자는 그 달의 완독 권수예요.</p>
      </section>

      <section className="card">
        <div className="card-title-row">
          <h2>{year}년 카테고리 분포</h2>
        </div>
        {catData.length === 0 ? (
          <p className="muted small">아직 데이터가 없어요. 책을 추가하면 분포가 그려져요.</p>
        ) : (
          <Donut data={catData} />
        )}
      </section>

      <section className="card">
        <div className="card-title-row">
          <h2>{year}년 완독</h2>
          <span className="muted">{doneInYear.length} / {goal}권</span>
        </div>
        {topBooks.length > 0 && (
          <div className="top-books">
            <p className="muted small">올해의 책</p>
            {topBooks.map((b, i) => (
              <p key={b.id} className="top-book-row">
                <b>{i + 1}.</b> {b.title} <span className="muted small">★{b.rating}</span>
              </p>
            ))}
          </div>
        )}
        {doneInYear.length > 0 && (
          <button className="btn btn-coral" onClick={saveYearCard}>
            {year}년 독서 결산 카드 저장
          </button>
        )}
        {doneInYear.length > 0 && (
          <ul className="done-list">
            {doneInYear
              .sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''))
              .map((b) => (
                <li key={b.id}>
                  <span className="book-title">{b.title}</span>
                  <span className="muted small">
                    {b.finishedAt?.slice(5).replace('-', '.')}{b.rating > 0 ? ` · ★${b.rating}` : ''}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}
