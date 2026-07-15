/** 공개 서재 링크 — 핸들 하나로 내 완독·밑줄·페르소나를 보여주는 공개 페이지. */
import { supabase, hasSupabase } from './supabase'
import { getData } from '../store'
import { getPid } from './challenges'
import { computePersona } from './persona'

export interface ShelfBook {
  title: string
  author: string
  coverUrl: string
  rating: number
  oneLine: string
  category: string
  finishedAt: string
}
export interface ShelfPayload {
  books: ShelfBook[]
  quotes: Array<{ quote: string; title: string }>
  persona: { name: string; mark: string; tagline: string } | null
  stats: { doneCount: number; quotes: number }
}
export interface PublicShelf {
  slug: string
  nickname: string
  data: ShelfPayload
  updated_at: string
}

export const shelfAvailable = hasSupabase

const SHELF_KEY = 'bookbloom_shelf' // { slug }

export function getShelfState(): { slug: string } | null {
  try {
    const raw = localStorage.getItem(SHELF_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function saveShelfState(slug: string) {
  localStorage.setItem(SHELF_KEY, JSON.stringify({ slug }))
}
export function clearShelfState() {
  localStorage.removeItem(SHELF_KEY)
}

export function shelfUrl(slug: string): string {
  return `${location.origin}${location.pathname}#/shelf/${slug}`
}

/** 현재 기록에서 공개용 페이로드 구성 — 완독 책 + 최근 밑줄 + 페르소나만 (진행중·메모는 비공개) */
export function buildShelfPayload(): ShelfPayload {
  const data = getData()
  const done = data.books
    .filter((b) => b.status === 'done')
    .sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''))
    .slice(0, 100)
    .map((b) => ({
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl ?? '',
      rating: b.rating,
      oneLine: b.oneLine,
      category: b.category,
      finishedAt: b.finishedAt ?? '',
    }))
  const titleOf = (id: string) => data.books.find((b) => b.id === id)?.title ?? ''
  const quotes = data.notes
    .filter((n) => n.type === 'quote' && n.content.length >= 5)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((n) => ({ quote: n.content, title: titleOf(n.bookId) }))
  const p = computePersona(data)
  return {
    books: done,
    quotes,
    persona: p.ready ? { name: p.name, mark: p.mark, tagline: p.tagline } : null,
    stats: { doneCount: done.length, quotes: data.notes.filter((n) => n.type === 'quote').length },
  }
}

function friendly(e: unknown): Error {
  const m = e instanceof Error ? e.message : String(e)
  if (m.includes('SLUG_TAKEN')) return new Error('이미 누군가 쓰고 있는 링크예요. 다른 이름으로 정해보세요.')
  if (m.includes('SLUG_INVALID')) return new Error('링크 이름은 2~24자로 정해주세요.')
  return new Error('연결에 실패했어요. 잠시 후 다시 시도해 주세요.')
}

export async function publishShelf(slug: string, nickname: string): Promise<string> {
  if (!supabase) throw new Error('아직 사용할 수 없어요.')
  const { data, error } = await supabase.rpc('bb_shelf_publish', {
    p_slug: slug,
    p_pid: getPid(),
    p_nickname: nickname,
    p_data: buildShelfPayload(),
  })
  if (error) throw friendly(new Error(error.message))
  const out = (data as { slug: string }).slug
  saveShelfState(out)
  return out
}

export async function fetchShelf(slug: string): Promise<PublicShelf | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('bb_shelf_get', { p_slug: slug })
  if (error) return null
  return data as PublicShelf | null
}

export async function unpublishShelf(): Promise<void> {
  const s = getShelfState()
  clearShelfState()
  if (!supabase || !s) return
  await supabase.rpc('bb_shelf_unpublish', { p_slug: s.slug, p_pid: getPid() }).then(() => {}, () => {})
}
