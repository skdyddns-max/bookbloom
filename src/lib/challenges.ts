/** 결 챌린지 — 결이 큐레이션하는 시즌 공동 챌린지.
 * 정의는 코드에 편성(에디토리얼), 진도는 사용자 자기 기록에서 자동 산출,
 * 참여자 수는 Supabase에 익명 집계(소셜 증거). */
import type { AppData } from '../types'
import { genreBucket } from './questions'
import { pagesReadByLog } from '../utils'
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
}

/** 편성된 챌린지 목록 — 기간이 오늘을 포함하면 '진행 중' */
export const CHALLENGES: Challenge[] = [
  {
    id: '2026-07-amond',
    emoji: '📖',
    title: '7월 함께읽기 · 『아몬드』',
    subtitle: '손원평의 『아몬드』를 이달 안에 함께 완독해요',
    start: '2026-07-01',
    end: '2026-07-31',
    kind: 'book',
    goal: 1,
    bookTitle: '아몬드',
    bookAuthor: '손원평',
    cheer: '감정을 배우는 여정, 끝까지 함께했어요.',
  },
  {
    id: '2026-summer-quotes',
    emoji: '✍️',
    title: '여름밤 문장 수집',
    subtitle: '마음에 닿은 문장 10개를 이 여름에 모아요',
    start: '2026-07-01',
    end: '2026-08-31',
    kind: 'count-quote',
    goal: 10,
    cheer: '당신의 여름은 열 개의 문장으로 남았어요.',
  },
  {
    id: '2026-genre-widen',
    emoji: '🌾',
    title: '장르 넓히기',
    subtitle: '서로 다른 5개 분야를 두루 읽어봐요',
    start: '2026-07-01',
    end: '2026-12-31',
    kind: 'genre-breadth',
    goal: 5,
    cheer: '다섯 갈래의 결, 당신의 독서가 넓어졌어요.',
  },
]

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

export function activeChallenges(today: string): Challenge[] {
  return CHALLENGES.filter((c) => today >= c.start && today <= c.end)
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

export interface ChallengeStats {
  count: number
  done_count: number
  recent: string[]
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
