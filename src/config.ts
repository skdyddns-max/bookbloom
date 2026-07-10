/** 북블룸 커뮤니티 카카오 오픈채팅 (독서기록·함께읽기 Book_bloom) */
export const OPEN_CHAT_URL = 'https://open.kakao.com/o/gd4EllDi'

/** 블룸 패밀리 — 용디쌤이 만드는 성장·돌봄 도구들 */
export interface BloomApp {
  name: string
  desc: string
  url: string
  emoji: string
}
export const BLOOM_FAMILY: BloomApp[] = [
  { name: 'TalkBloom', desc: '아이 발달 선별 + 가정 코칭', url: 'https://talkbloom.org', emoji: '🗣️' },
  { name: 'BabyBloom', desc: '생일부터 시작되는 육아 비서 달력', url: 'https://skdyddns-max.github.io/babybloom', emoji: '👶' },
  { name: 'BloomCare', desc: '우리 아이 지원제도 한눈에 찾기', url: 'https://skdyddns-max.github.io/bloomcare', emoji: '🌷' },
]

/** 알라딘 구매 링크 — 프록시(op=buy)가 TTB 키를 붙여 상품페이지로 리다이렉트.
 *  구매 시 3% 적립이 우리 키로 attribution 됨. 키는 서버 secret에만 존재. */
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export function aladinBookUrl(book: { id: string; title: string; author?: string }): string {
  const isbn = /^\d{13}$/.test(book.id) ? book.id : ''
  if (SUPA_URL) {
    return `${SUPA_URL}/functions/v1/bb-aladin?op=buy&isbn=${isbn}&t=${encodeURIComponent(book.title)}`
  }
  const q = [book.title, book.author].filter(Boolean).join(' ')
  return `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${encodeURIComponent(q)}`
}
