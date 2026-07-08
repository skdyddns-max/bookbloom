import type { Book } from './types'
import { clamp } from './utils'

export function BookCover({ book, size = 'md' }: { book: Pick<Book, 'title' | 'coverUrl'>; size?: 'sm' | 'md' | 'lg' }) {
  if (book.coverUrl) {
    return <img className={`cover cover-${size}`} src={book.coverUrl} alt={book.title} loading="lazy" />
  }
  return (
    <div className={`cover cover-${size} cover-placeholder`} aria-label={book.title}>
      <span>{book.title.slice(0, 14)}</span>
    </div>
  )
}

export function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange?: (v: number) => void
}) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className={`stars ${onChange ? 'stars-editable' : ''}`} role="radiogroup" aria-label="별점">
      {stars.map((n) => {
        const fill = value >= n ? 'full' : value >= n - 0.5 ? 'half' : 'empty'
        return (
          <span
            key={n}
            className={`star star-${fill}`}
            onClick={
              onChange
                ? (e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                    const half = e.clientX - rect.left < rect.width / 2
                    const v = half ? n - 0.5 : n
                    onChange(v === value ? 0 : v)
                  }
                : undefined
            }
          >
            {fill === 'half' ? '⯨' : '★'}
          </span>
        )
      })}
      {value > 0 && <span className="stars-num">{value}</span>}
    </div>
  )
}

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? clamp(Math.round((current / total) * 100), 0, 100) : 0
  return (
    <div className="pbar-wrap">
      <div className="pbar">
        <div className="pbar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="pbar-label">
        {total > 0 ? `${current}/${total}쪽 · ${pct}%` : `${current}쪽`}
      </span>
    </div>
  )
}

const DONUT_COLORS = ['#6DBE8A', '#8FCEA6', '#B4DFC4', '#4E9C6F', '#D5ECDF', '#3E7D59']

export function Donut({ data }: { data: Array<{ label: string; value: number }> }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const R = 40
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut">
        {data.map((d, i) => {
          const frac = d.value / total
          const el = (
            <circle
              key={d.label}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${frac * C} ${C}`}
              strokeDashoffset={-offset * C}
              transform="rotate(-90 60 60)"
            />
          )
          offset += frac
          return el
        })}
        <text x="60" y="66" textAnchor="middle" className="donut-center">
          {total}권
        </text>
      </svg>
      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            {d.label} <b>{d.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** month: 'YYYY-MM', marked: date(YYYY-MM-DD) → 읽은 쪽수 */
export function MonthCalendar({
  month,
  marked,
  onMove,
}: {
  month: string
  marked: Map<string, number>
  onMove: (delta: number) => void
}) {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const startDow = first.getDay()
  const cells: Array<{ day: number; date: string } | null> = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: `${month}-${String(d).padStart(2, '0')}` })
  }
  const max = Math.max(1, ...marked.values())
  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => onMove(-1)} aria-label="이전 달">‹</button>
        <b>{y}년 {m}월</b>
        <button className="cal-nav" onClick={() => onMove(1)} aria-label="다음 달">›</button>
      </div>
      <div className="cal-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <span key={d} className="cal-dow">{d}</span>
        ))}
        {cells.map((c, i) =>
          c ? (
            <span
              key={c.date}
              className={`cal-day ${marked.has(c.date) ? 'cal-day-read' : ''}`}
              style={
                marked.has(c.date)
                  ? { opacity: 0.45 + 0.55 * ((marked.get(c.date) || 0) / max) }
                  : undefined
              }
              title={marked.has(c.date) ? `${marked.get(c.date)}쪽` : undefined}
            >
              {c.day}
            </span>
          ) : (
            <span key={`empty-${i}`} />
          ),
        )}
      </div>
    </div>
  )
}

/** 월별 추이 막대 차트 — 값 라벨 항상 표시, 브랜드 그린 단색 */
export function BarChart({
  data,
  unit,
}: {
  data: Array<{ label: string; value: number; sub?: string }>
  unit: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bars" role="img" aria-label={`월별 ${unit} 추이`}>
      {data.map((d) => (
        <div key={d.label} className="bar-col">
          <span className="bar-value">{d.value > 0 ? d.value.toLocaleString() : ''}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: `${Math.max(d.value > 0 ? 6 : 0, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="bar-label">{d.label}</span>
          {d.sub && <span className="bar-sub">{d.sub}</span>}
        </div>
      ))}
    </div>
  )
}

export const CATEGORIES = [
  '소설/시/희곡', '에세이', '인문학', '자기계발', '경제경영', '과학',
  '역사', '사회과학', '예술/대중문화', '종교/역학', '어린이', '기타',
]
