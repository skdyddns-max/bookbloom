/** 주간 되돌아보기 — 지난 한 주(일~토)를 요약해 매주 한 번 리추얼로 인사한다. */
import type { AppData } from '../types'
import { addDays, pagesReadByLog } from '../utils'

export interface WeekReview {
  start: string
  end: string
  range: string
  daysRead: number
  pages: number
  quotes: number
  done: number
  items: Array<{ quote: string; title: string }>
}

function d2(n: number): string {
  return String(n).padStart(2, '0')
}
function fmtShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}

/** 오늘이 속한 주의 시작(일요일) */
export function weekStartOf(today: string): string {
  const dow = new Date(today + 'T00:00:00').getDay() // 0=일
  return addDays(today, -dow)
}

/** 지난 주(직전 일~토) 요약. 활동이 전혀 없으면 null */
export function lastWeekReview(data: AppData, today: string): WeekReview | null {
  const thisWeekStart = weekStartOf(today)
  const start = addDays(thisWeekStart, -7)
  const end = addDays(start, 6)
  const inRange = (dt?: string) => !!dt && dt.slice(0, 10) >= start && dt.slice(0, 10) <= end

  const byLog = pagesReadByLog(data.logs)
  const weekLogs = data.logs.filter((l) => inRange(l.date))
  const daysRead = new Set(weekLogs.map((l) => l.date)).size
  const pages = weekLogs.reduce((s, l) => s + (byLog.get(l.id) || 0), 0)
  const quotesNotes = data.notes.filter((n) => n.type === 'quote' && inRange(n.createdAt))
  const done = data.books.filter((b) => b.status === 'done' && inRange(b.finishedAt)).length
  const titleOf = (id: string) => data.books.find((b) => b.id === id)?.title ?? ''
  const items = quotesNotes
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n) => ({ quote: n.content, title: titleOf(n.bookId) }))
    .filter((it) => it.quote)

  if (daysRead === 0 && quotesNotes.length === 0 && done === 0) return null
  return {
    start,
    end,
    range: `${fmtShort(start)} – ${fmtShort(end)}`,
    daysRead,
    pages,
    quotes: quotesNotes.length,
    done,
    items,
  }
}

// ── 열람(닫기) 상태 — 주별 1회 ──
const SEEN_KEY = 'bookbloom_weekreview_seen'
export function isReviewSeen(weekStart: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === weekStart
  } catch {
    return false
  }
}
export function markReviewSeen(weekStart: string) {
  try {
    localStorage.setItem(SEEN_KEY, weekStart)
  } catch { /* private mode */ }
}

// ── 주간 알림(선택) — 앱을 열 때 지난주 요약을 로컬 알림으로 ──
const NOTIFY_PREF = 'bookbloom_weekreview_notify'
const NOTIFIED_KEY = 'bookbloom_weekreview_notified'

export function reviewNotifyOn(): boolean {
  try {
    return localStorage.getItem(NOTIFY_PREF) === '1'
  } catch {
    return false
  }
}

export const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window

/** 알림 켜기: 권한 요청 후 저장. 성공 여부 반환 */
export async function enableReviewNotify(): Promise<boolean> {
  if (!notificationsSupported) return false
  let perm = Notification.permission
  if (perm === 'default') {
    try { perm = await Notification.requestPermission() } catch { return false }
  }
  if (perm !== 'granted') return false
  localStorage.setItem(NOTIFY_PREF, '1')
  return true
}
export function disableReviewNotify() {
  localStorage.setItem(NOTIFY_PREF, '0')
}

/** 앱 시작 시 호출 — 새 주에 지난주 요약이 있으면 (한 번만) 로컬 알림 */
export function runWeeklyReminder(data: AppData, today: string) {
  if (!reviewNotifyOn() || !notificationsSupported || Notification.permission !== 'granted') return
  const review = lastWeekReview(data, today)
  if (!review) return
  try {
    if (localStorage.getItem(NOTIFIED_KEY) === review.start) return
    localStorage.setItem(NOTIFIED_KEY, review.start)
    const bits = [
      review.daysRead > 0 ? `${review.daysRead}일 기록` : '',
      review.done > 0 ? `${review.done}권 완독` : '',
      review.quotes > 0 ? `밑줄 ${review.quotes}개` : '',
    ].filter(Boolean).join(' · ')
    new Notification('지난 주 독서를 되돌아볼까요?', {
      body: bits ? `${bits} — 결에서 이번 주도 한 쪽부터` : '결에서 지난 주를 돌아보세요',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'gyeol-weekly',
    })
  } catch { /* noop */ }
}
