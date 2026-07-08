import { useState } from 'react'
import { useAppData } from '../store'
import { calcStreak, pagesReadByLog } from '../utils'
import { Donut, MonthCalendar } from '../components'

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

      <section className="card">
        <h2>독서 캘린더</h2>
        <MonthCalendar month={month} marked={marked} onMove={(d) => setMonth(moveMonth(month, d))} />
        <p className="muted small">기록한 날이 진하게 표시돼요. 많이 읽을수록 더 진해집니다.</p>
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
