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

/** 알라딘 검색 링크 (제휴 등록 후 partner 파라미터 추가 가능) */
export function aladinBookUrl(title: string, author?: string): string {
  const q = [title, author].filter(Boolean).join(' ')
  return `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${encodeURIComponent(q)}`
}
