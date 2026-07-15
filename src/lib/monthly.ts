/** 월간 결산 스토리 — 지난달을 Wrapped 스타일 풀스크린 스토리로 돌아본다. */
import type { AppData, Book } from '../types'
import { pagesReadByLog, maxStreak } from '../utils'

export interface MonthReview {
  ym: string // YYYY-MM
  label: string // 2026년 6월
  pages: number
  daysRead: number
  doneBooks: Book[]
  topBook: { title: string; author: string; pages: number } | null
  quotes: number
  bestQuote: { quote: string; title: string } | null
  bestStreak: number
}

function prevMonthYm(today: string): string {
  const [y, m] = today.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${y}년 ${m}월`
}

/** 해당 월(YYYY-MM)의 결산. 활동이 없으면 null */
export function monthReview(data: AppData, ym: string): MonthReview | null {
  const inMonth = (dt?: string) => !!dt && dt.slice(0, 7) === ym

  const byLog = pagesReadByLog(data.logs)
  const monthLogs = data.logs.filter((l) => inMonth(l.date))
  const pages = monthLogs.reduce((s, l) => s + (byLog.get(l.id) || 0), 0)
  const daysRead = new Set(monthLogs.map((l) => l.date)).size

  const doneBooks = data.books
    .filter((b) => b.status === 'done' && inMonth(b.finishedAt))
    .sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''))

  // 가장 오래 머문 책 — 그 달에 가장 많은 쪽수를 읽은 책
  const perBook = new Map<string, number>()
  for (const l of monthLogs) perBook.set(l.bookId, (perBook.get(l.bookId) || 0) + (byLog.get(l.id) || 0))
  let topBook: MonthReview['topBook'] = null
  let best = 0
  for (const [bookId, p] of perBook) {
    if (p > best) {
      const b = data.books.find((x) => x.id === bookId)
      if (b) {
        best = p
        topBook = { title: b.title, author: b.author, pages: p }
      }
    }
  }

  const quotesNotes = data.notes.filter((n) => n.type === 'quote' && inMonth(n.createdAt))
  const titleOf = (id: string) => data.books.find((b) => b.id === id)?.title ?? ''
  // 대표 문장 — 너무 길지 않은 것 중 가장 긴 문장(내용이 있는 쪽으로)
  const cand = [...quotesNotes]
    .filter((n) => n.content.length >= 8 && n.content.length <= 110)
    .sort((a, b) => b.content.length - a.content.length)[0] ?? quotesNotes[0]
  const bestQuote = cand ? { quote: cand.content, title: titleOf(cand.bookId) } : null

  const bestStreak = maxStreak(monthLogs)

  if (pages === 0 && daysRead === 0 && doneBooks.length === 0 && quotesNotes.length === 0) return null
  return {
    ym,
    label: monthLabel(ym),
    pages,
    daysRead,
    doneBooks,
    topBook,
    quotes: quotesNotes.length,
    bestQuote,
    bestStreak,
  }
}

/** 지난달 결산 (오늘 기준) */
export function lastMonthReview(data: AppData, today: string): MonthReview | null {
  return monthReview(data, prevMonthYm(today))
}

// ── 열람 상태 — 월별 1회 배너 ──
const SEEN_KEY = 'bookbloom_monthstory_seen'
export function isStorySeen(ym: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === ym
  } catch {
    return false
  }
}
export function markStorySeen(ym: string) {
  try {
    localStorage.setItem(SEEN_KEY, ym)
  } catch { /* private mode */ }
}
