import type { ProgressLog } from './types'

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

/** 기록한 날짜 집합 기준, 오늘 또는 어제로 끝나는 연속 일수 */
export function calcStreak(logs: ProgressLog[]): number {
  const days = new Set(logs.map((l) => l.date))
  if (days.size === 0) return 0
  const today = todayStr()
  let cursor = days.has(today) ? today : addDays(today, -1)
  if (!days.has(cursor)) return 0
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** 책별로 날짜순 정렬된 로그에서, 각 로그의 '그날 읽은 쪽수'(이전 도달점과의 차) 계산 */
export function pagesReadByLog(logs: ProgressLog[]): Map<string, number> {
  const byBook = new Map<string, ProgressLog[]>()
  for (const l of logs) {
    const arr = byBook.get(l.bookId) ?? []
    arr.push(l)
    byBook.set(l.bookId, arr)
  }
  const result = new Map<string, number>()
  for (const arr of byBook.values()) {
    const sorted = [...arr].sort(
      (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    )
    let prev = 0
    for (const l of sorted) {
      result.set(l.id, Math.max(0, l.page - prev))
      prev = Math.max(prev, l.page)
    }
  }
  return result
}

export function fmtDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${y}.${m}.${d}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
