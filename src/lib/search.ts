import type { SearchResult } from '../types'

/** 알라딘 카테고리 "국내도서>소설/시/희곡>한국소설" → "소설/시/희곡" */
export function simplifyCategory(categoryName: string): string {
  const parts = (categoryName || '').split('>')
  return (parts[1] || parts[0] || '기타').trim() || '기타'
}

let jsonpSeq = 0

/** 알라딘 Open API는 CORS 미지원이지만 JSONP(callback 파라미터)를 지원한다 */
function jsonp<T>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__bb_jsonp_${++jsonpSeq}`
    const script = document.createElement('script')
    const cleanup = () => {
      delete (window as any)[cbName]
      script.remove()
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, timeoutMs)
    ;(window as any)[cbName] = (payload: T) => {
      clearTimeout(timer)
      cleanup()
      resolve(payload)
    }
    script.src = `${url}&callback=${cbName}`
    script.onerror = () => {
      clearTimeout(timer)
      cleanup()
      reject(new Error('script error'))
    }
    document.head.appendChild(script)
  })
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

export async function searchAladin(ttbKey: string, query: string): Promise<SearchResult[]> {
  const url =
    `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=20&start=1` +
    `&SearchTarget=Book&output=js&Version=20131101&Cover=Big`
  const res = await jsonp<{ item?: AladinItem[]; errorMessage?: string }>(url)
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
export async function lookupAladinPages(ttbKey: string, isbn13: string): Promise<number> {
  try {
    const url =
      `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${encodeURIComponent(ttbKey)}` +
      `&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn13)}&output=js&Version=20131101`
    const res = await jsonp<{ item?: AladinItem[] }>(url)
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
