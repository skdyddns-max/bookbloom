import type { SearchResult } from '../types'

/** 알라딘 카테고리 "국내도서>소설/시/희곡>한국소설" → "소설/시/희곡" */
export function simplifyCategory(categoryName: string): string {
  const parts = (categoryName || '').split('>')
  return (parts[1] || parts[0] || '기타').trim() || '기타'
}

// 알라딘 API는 CORS 미지원 → Supabase Edge Function(bb-aladin) 프록시 경유.
// TTB 키는 서버 secret에만 존재.
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasAladinProxy = !!(SUPA_URL && SUPA_KEY)

async function proxyFetch<T>(params: string): Promise<T> {
  const res = await fetch(`${SUPA_URL}/functions/v1/bb-aladin?${params}`, {
    headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY! },
  })
  if (!res.ok) throw new Error(`검색 서버 오류 (${res.status})`)
  return res.json() as Promise<T>
}

interface AladinItem {
  title: string
  author: string
  publisher: string
  cover: string
  isbn13: string
  isbn: string
  categoryName: string
  subInfo?: { itemPage?: number }
}

export async function searchAladin(query: string): Promise<SearchResult[]> {
  const res = await proxyFetch<{ item?: AladinItem[]; errorMessage?: string }>(
    `op=search&query=${encodeURIComponent(query)}`,
  )
  if (res.errorMessage) throw new Error(res.errorMessage)
  return (res.item ?? []).map((it) => ({
    id: it.isbn13 || it.isbn || `aladin-${it.title}`,
    title: it.title,
    author: it.author,
    publisher: it.publisher,
    coverUrl: it.cover,
    totalPages: it.subInfo?.itemPage ?? 0,
    category: simplifyCategory(it.categoryName),
    source: 'aladin' as const,
  }))
}

/** 추가 시점에 쪽수 보강 (ItemSearch에는 itemPage가 없음) */
export async function lookupAladinPages(isbn13: string): Promise<number> {
  try {
    const res = await proxyFetch<{ item?: AladinItem[] }>(
      `op=lookup&isbn=${encodeURIComponent(isbn13)}`,
    )
    return res.item?.[0]?.subInfo?.itemPage ?? 0
  } catch {
    return 0
  }
}

interface KakaoDoc {
  title: string
  authors: string[]
  publisher: string
  thumbnail: string
  isbn: string // "10자리 13자리" 공백 구분
}

/** 카카오 책검색 — 프록시가 없는 빌드에서의 대안 (설정에 저장된 키 사용) */
export async function searchKakao(restKey: string, query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://dapi.kakao.com/v3/search/book?target=title&size=20&query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `KakaoAK ${restKey}` } },
  )
  if (!res.ok) throw new Error(`kakao ${res.status}`)
  const json = (await res.json()) as { documents: KakaoDoc[] }
  return json.documents.map((d) => {
    const isbn13 = d.isbn.split(' ').find((s) => s.length === 13) || d.isbn.trim()
    return {
      id: isbn13 || `kakao-${d.title}`,
      title: d.title,
      author: d.authors.join(', '),
      publisher: d.publisher,
      coverUrl: d.thumbnail,
      totalPages: 0,
      category: '기타',
      source: 'kakao' as const,
    }
  })
}
