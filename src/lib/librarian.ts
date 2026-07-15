/** 결 사서 — 내 서재를 아는 AI 사서. 키는 서버(Edge Function)에만 있다. */
import { hasSupabase } from './supabase'
import { getData } from '../store'
import { computePersona } from './persona'
import { todayStr } from '../utils'

export const librarianAvailable = hasSupabase

export interface Rec {
  title: string
  author: string
  reason: string
}
export interface RecResult {
  recs: Rec[]
  note: string
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gyeol-libra`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ── 하루 사용 한도(크레딧 보호) ──
const USE_KEY = 'bookbloom_libra' // { date, n }
const DAILY_LIMIT = 5

export function usesLeft(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(USE_KEY) || '{}')
    if (raw.date !== todayStr()) return DAILY_LIMIT
    return Math.max(0, DAILY_LIMIT - (raw.n || 0))
  } catch {
    return DAILY_LIMIT
  }
}
function markUse() {
  try {
    const raw = JSON.parse(localStorage.getItem(USE_KEY) || '{}')
    const n = raw.date === todayStr() ? (raw.n || 0) + 1 : 1
    localStorage.setItem(USE_KEY, JSON.stringify({ date: todayStr(), n }))
  } catch { /* noop */ }
}

/** 사서에게 보여줄 서재 요약 (텍스트) */
export function buildLibraryContext(): string {
  const data = getData()
  const done = data.books
    .filter((b) => b.status === 'done')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 30)
    .map((b) => `${b.title}(${b.author}${b.rating > 0 ? `, ★${b.rating}` : ''}${b.oneLine ? `, "${b.oneLine}"` : ''})`)
  const reading = data.books.filter((b) => b.status === 'reading').map((b) => b.title)
  const want = data.books.filter((b) => b.status === 'want').map((b) => b.title).slice(0, 15)
  const p = computePersona(data)
  const lines = [
    done.length ? `완독: ${done.join(', ')}` : '완독한 책이 아직 없음',
    reading.length ? `읽는 중: ${reading.join(', ')}` : '',
    want.length ? `읽고 싶어요(추천 제외 대상): ${want.join(', ')}` : '',
    p.ready ? `독서 성향: ${p.name} — ${p.tagline}${p.traits.length ? ` (${p.traits.map((t) => t.label).join(', ')})` : ''}` : '',
    p.genres.length ? `분야 분포: ${p.genres.map((g) => `${g.label} ${Math.round(g.ratio * 100)}%`).join(', ')}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}

async function call(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok || !out.text) throw new Error('사서가 잠시 자리를 비웠어요. 조금 뒤에 다시 시도해 주세요.')
  markUse()
  return out.text as string
}

export async function recommendBooks(): Promise<RecResult> {
  if (usesLeft() <= 0) throw new Error('오늘의 사서 상담은 여기까지예요. 내일 다시 찾아주세요.')
  const text = await call({ op: 'recommend', library: buildLibraryContext() })
  try {
    const m = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(m ? m[0] : text) as RecResult
    if (!Array.isArray(parsed.recs)) throw new Error('bad')
    return { recs: parsed.recs.slice(0, 3), note: parsed.note || '' }
  } catch {
    // JSON 파싱 실패 시 원문을 note로
    return { recs: [], note: text.slice(0, 400) }
  }
}

export async function askLibrarian(question: string): Promise<string> {
  if (usesLeft() <= 0) throw new Error('오늘의 사서 상담은 여기까지예요. 내일 다시 찾아주세요.')
  return call({ op: 'ask', library: buildLibraryContext(), question })
}
