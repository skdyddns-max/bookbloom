/** 결 챌린지 — 결이 큐레이션하는 시즌 공동 챌린지.
 * 정의는 코드에 편성(에디토리얼), 진도는 사용자 자기 기록에서 자동 산출,
 * 참여자 수는 Supabase에 익명 집계(소셜 증거). */
import type { AppData } from '../types'
import type { Badge } from './badges'
import { genreBucket } from './questions'
import { pagesReadByLog, todayStr } from '../utils'
import { supabase, hasSupabase } from './supabase'

export type ChallengeKind = 'book' | 'count-quote' | 'count-done' | 'genre-breadth'

export interface Challenge {
  id: string
  emoji: string
  title: string
  subtitle: string
  start: string // YYYY-MM-DD
  end: string
  kind: ChallengeKind
  goal: number // 목표 수치 (book이면 1)
  bookTitle?: string
  bookAuthor?: string
  cheer: string // 완주 시 축하 한 줄
  badgeLabel: string // 완주 뱃지에 새길 짧은 이름
}

// ── 시즌 자동 편성 — 매달 코드 수정 없이 그 달의 챌린지가 생성된다 ──

/** 월별 함께읽기 도서 — 로테이션 풀(널리 읽히는 책). 특정 달은 아래 map으로 지정 편성 */
const BOOK_POOL: Array<{ t: string; a: string }> = [
  { t: '아몬드', a: '손원평' },
  { t: '불편한 편의점', a: '김호연' },
  { t: '달러구트 꿈 백화점', a: '이미예' },
  { t: '미드나잇 라이브러리', a: '매트 헤이그' },
  { t: '어린 왕자', a: '앙투안 드 생텍쥐페리' },
  { t: '데미안', a: '헤르만 헤세' },
  { t: '파친코 1', a: '이민진' },
  { t: '나미야 잡화점의 기적', a: '히가시노 게이고' },
]
/** 지정 편성(에디토리얼) — 없으면 풀에서 자동 로테이션 */
const BOOK_OF_MONTH: Record<string, { t: string; a: string }> = {
  '2026-07': { t: '아몬드', a: '손원평' },
}

/** 월별 로테이션 테마(3번째 챌린지) */
const THEME_POOL: Array<Omit<Challenge, 'id' | 'start' | 'end' | 'badgeLabel'>> = [
  {
    emoji: '🌾', kind: 'genre-breadth', goal: 4,
    title: '장르 넓히기', subtitle: '서로 다른 4개 분야를 이달 안에 읽어봐요',
    cheer: '네 갈래의 결, 독서가 한결 넓어졌어요.',
  },
  {
    emoji: '📚', kind: 'count-done', goal: 3,
    title: '이달 세 권', subtitle: '이번 달, 세 권을 완독해봐요',
    cheer: '한 달에 세 권, 단단한 리듬이에요.',
  },
]

const MONTH_NAME = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function d2(n: number): string {
  return String(n).padStart(2, '0')
}

function monthWindow(today: string): { y: number; m: number; ym: string; start: string; end: string; idx: number } {
  const [y, m] = today.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return {
    y, m,
    ym: `${y}-${d2(m)}`,
    start: `${y}-${d2(m)}-01`,
    end: `${y}-${d2(m)}-${d2(last)}`,
    idx: y * 12 + (m - 1),
  }
}

/** 오늘이 속한 달의 챌린지 3종을 자동 편성 */
export function activeChallenges(today: string): Challenge[] {
  const w = monthWindow(today)
  const mn = MONTH_NAME[w.m - 1]

  const book = BOOK_OF_MONTH[w.ym] ?? BOOK_POOL[w.idx % BOOK_POOL.length]
  const bookCh: Challenge = {
    id: `book-${w.ym}`,
    emoji: '📖',
    title: `${mn} 함께읽기 · 『${book.t}』`,
    subtitle: `${book.a}의 『${book.t}』를 이달 안에 함께 완독해요`,
    start: w.start, end: w.end,
    kind: 'book', goal: 1,
    bookTitle: book.t, bookAuthor: book.a,
    cheer: `『${book.t}』의 마지막 장을 함께 덮었어요.`,
    badgeLabel: `『${book.t}』 완독`,
  }

  const quoteCh: Challenge = {
    id: `quotes-${w.ym}`,
    emoji: '✍️',
    title: `${mn} 문장 수집`,
    subtitle: '마음에 닿은 문장 10개를 이달 안에 모아요',
    start: w.start, end: w.end,
    kind: 'count-quote', goal: 10,
    cheer: `${mn}의 당신은 열 개의 문장으로 남았어요.`,
    badgeLabel: `${mn} 문장 수집`,
  }

  const t = THEME_POOL[w.idx % THEME_POOL.length]
  const themeCh: Challenge = {
    ...t,
    id: `theme-${w.ym}`,
    start: w.start, end: w.end,
    badgeLabel: t.title,
  }

  return [bookCh, quoteCh, themeCh]
}

export interface ChallengeProgress {
  value: number
  target: number
  pct: number
  done: boolean
  unit: string
}

function inWindow(date: string | undefined, c: Challenge): boolean {
  if (!date) return false
  const d = date.slice(0, 10)
  return d >= c.start && d <= c.end
}

/** 사용자 기록에서 이 챌린지의 진도를 계산 */
export function challengeProgress(c: Challenge, data: AppData): ChallengeProgress {
  if (c.kind === 'book') {
    const book = data.books.find(
      (b) => b.title.replace(/\s/g, '') === (c.bookTitle ?? '').replace(/\s/g, ''),
    )
    if (!book) return { value: 0, target: 1, pct: 0, done: false, unit: '완독' }
    if (book.status === 'done') return { value: 1, target: 1, pct: 100, done: true, unit: '완독' }
    const byLog = pagesReadByLog(data.logs)
    const page = data.logs
      .filter((l) => l.bookId === book.id)
      .reduce((m, l) => Math.max(m, l.page), 0)
    void byLog
    const pct = book.totalPages > 0 ? Math.min(100, Math.round((page / book.totalPages) * 100)) : 0
    return { value: pct, target: 100, pct, done: false, unit: '%' }
  }
  if (c.kind === 'count-quote') {
    const n = data.notes.filter((x) => x.type === 'quote' && inWindow(x.createdAt, c)).length
    return { value: n, target: c.goal, pct: Math.min(100, Math.round((n / c.goal) * 100)), done: n >= c.goal, unit: '문장' }
  }
  if (c.kind === 'count-done') {
    const n = data.books.filter((b) => b.status === 'done' && inWindow(b.finishedAt, c)).length
    return { value: n, target: c.goal, pct: Math.min(100, Math.round((n / c.goal) * 100)), done: n >= c.goal, unit: '권' }
  }
  // genre-breadth: 기간 내 완독한 책의 서로 다른 장르 버킷 수
  const buckets = new Set(
    data.books.filter((b) => b.status === 'done' && inWindow(b.finishedAt, c)).map((b) => genreBucket(b.category)),
  )
  const n = buckets.size
  return { value: n, target: c.goal, pct: Math.min(100, Math.round((n / c.goal) * 100)), done: n >= c.goal, unit: '분야' }
}

// ── 완주 기록(영구) — 챌린지 기간·창이 지나도 뱃지는 남는다 ──
const DONE_KEY = 'bookbloom_challenge_done' // { [id]: { date, emoji, label } }

interface DoneRecord { date: string; emoji: string; label: string }

export function getCompletedChallenges(): Record<string, DoneRecord> {
  try {
    const raw = JSON.parse(localStorage.getItem(DONE_KEY) || '{}') as Record<string, DoneRecord | string>
    const out: Record<string, DoneRecord> = {}
    for (const [id, v] of Object.entries(raw)) {
      // 구버전(문자열 날짜) 호환
      out[id] = typeof v === 'string' ? { date: v, emoji: '🏅', label: id } : v
    }
    return out
  } catch {
    return {}
  }
}
/** 완주 조건을 만족하면 최초 1회 기록. 뱃지가 기간 후에도 남도록 메타를 함께 저장. */
export function recordCompletion(c: Challenge): boolean {
  const map = getCompletedChallenges()
  if (map[c.id]) return false
  map[c.id] = { date: todayStr(), emoji: c.emoji, label: c.badgeLabel }
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(map))
  } catch { /* private mode */ }
  return true
}

/** 완주한 챌린지 → 뱃지 목록 (Stats 뱃지 그리드에 노출). 완주 기록에서 직접 생성해 과거 시즌도 유지 */
export function challengeBadges(): Badge[] {
  const done = getCompletedChallenges()
  return Object.entries(done)
    .sort((a, b) => b[1].date.localeCompare(a[1].date))
    .map(([id, r]) => ({
      key: `ch-${id}`,
      icon: r.emoji,
      title: r.label,
      desc: `결 챌린지 완주 · ${r.date}`,
      earned: true,
    }))
}

// ── 참여 상태 (로컬) + 익명 집계 (Supabase) ──
const JOIN_KEY = 'bookbloom_challenges' // { [id]: true }
const PID_KEY = 'bookbloom_pid'

export function getPid(): string {
  let pid = ''
  try {
    pid = localStorage.getItem(PID_KEY) || ''
    if (!pid) {
      pid = 'p_' + Math.abs(hashStr(String(performance.now()) + navigator.userAgent + document.cookie)).toString(36) + rand()
      localStorage.setItem(PID_KEY, pid)
    }
  } catch { /* private mode */ }
  return pid
}
function rand(): string {
  // Date.now/Math.random 회피 없이 브라우저에선 crypto 사용
  try {
    const a = new Uint32Array(2)
    crypto.getRandomValues(a)
    return a[0].toString(36) + a[1].toString(36)
  } catch {
    return Math.random().toString(36).slice(2)
  }
}
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function getJoined(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(JOIN_KEY) || '{}')
  } catch {
    return {}
  }
}
function setJoined(map: Record<string, boolean>) {
  localStorage.setItem(JOIN_KEY, JSON.stringify(map))
}
export function isJoined(id: string): boolean {
  return !!getJoined()[id]
}

export interface BoardRow {
  pid: string
  nickname: string
  progress: number
  target: number
  done: boolean
}

export interface ChallengeStats {
  count: number
  done_count: number
  recent: string[]
  board: BoardRow[]
}

export const challengeApi = {
  enabled: hasSupabase,
  async stats(id: string): Promise<ChallengeStats | null> {
    if (!supabase) return null
    const { data, error } = await supabase.rpc('bb_challenge_stats', { p_challenge: id })
    if (error) return null
    return data as ChallengeStats
  },
  async join(c: Challenge, nickname: string): Promise<ChallengeStats | null> {
    const map = getJoined()
    map[c.id] = true
    setJoined(map)
    if (!supabase) return null
    const { data, error } = await supabase.rpc('bb_challenge_join', {
      p_challenge: c.id,
      p_pid: getPid(),
      p_nickname: nickname || '',
      p_target: c.goal,
    })
    if (error) return null
    return data as ChallengeStats
  },
  async progress(c: Challenge, p: ChallengeProgress): Promise<ChallengeStats | null> {
    if (!supabase || !isJoined(c.id)) return null
    const { data, error } = await supabase.rpc('bb_challenge_progress', {
      p_challenge: c.id,
      p_pid: getPid(),
      p_progress: p.value,
      p_target: p.target,
      p_done: p.done,
    })
    if (error) return null
    return data as ChallengeStats
  },
  async leave(c: Challenge): Promise<ChallengeStats | null> {
    const map = getJoined()
    delete map[c.id]
    setJoined(map)
    if (!supabase) return null
    const { data, error } = await supabase.rpc('bb_challenge_leave', {
      p_challenge: c.id,
      p_pid: getPid(),
    })
    if (error) return null
    return data as ChallengeStats
  },
}
