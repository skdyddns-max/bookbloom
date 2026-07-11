/** 리딩 페르소나 — 사용자의 실제 기록에서 독서 성향을 도출한다.
 * "결만이 할 수 있는" 콘텐츠: 남의 취향 테스트가 아니라 내 기록이 그린 나의 초상. */
import type { AppData } from '../types'
import { genreBucket, type GenreBucket } from './questions'
import { maxStreak } from '../utils'

export interface PersonaTrait {
  key: string
  label: string
  desc: string
}

export interface GenreShare {
  bucket: GenreBucket
  label: string
  count: number
  ratio: number
}

export interface Persona {
  ready: boolean
  /** 아직 데이터가 얕을 때: 페르소나가 그려지기까지 남은 정도 */
  progress: { have: number; need: number }
  key: string
  name: string
  mark: string
  tagline: string
  /** 개인화된 결 문장(한 줄) */
  line: string
  traits: PersonaTrait[]
  stats: { doneCount: number; topGenre: string; bestStreak: number; quotes: number; readingDays: number }
  genres: GenreShare[]
}

const GENRE_LABEL: Record<GenreBucket, string> = {
  fiction: '소설·문학',
  essay: '에세이·산문',
  practical: '실용·자기계발',
  knowledge: '인문·사회',
  science: '과학·지식',
  kids: '어린이·그림책',
}

interface Archetype {
  key: string
  name: string
  mark: string
  tagline: string
  lines: string[]
}

const ARCHETYPES: Record<GenreBucket | 'mixed' | 'seed', Archetype> = {
  fiction: {
    key: 'fiction',
    name: '이야기 속을 걷는 사람',
    mark: '📖',
    tagline: '다른 삶을 살아보며 나를 넓히는 독서가',
    lines: [
      '한 권을 펼칠 때마다, 살아보지 못한 하루를 겪어요.',
      '인물의 마음을 따라 걷다 보면, 어느새 내 마음도 넓어져요.',
      '이야기의 결을 따라, 오늘도 다른 삶 하나를 살아냈어요.',
    ],
  },
  essay: {
    key: 'essay',
    name: '마음을 살피는 사람',
    mark: '🌿',
    tagline: '문장 속에서 자기 삶을 발견하는 독서가',
    lines: [
      '남의 문장에서 자꾸 내 이야기를 발견해요.',
      '조용한 문장 하나가, 오늘의 나를 다독여요.',
      '읽는 동안 마음의 결이 한 겹 더 부드러워져요.',
    ],
  },
  practical: {
    key: 'practical',
    name: '매일 자라는 사람',
    mark: '🌱',
    tagline: '읽은 것을 삶으로 옮기는 독서가',
    lines: [
      '읽고 끝내지 않고, 내일의 나로 옮겨 심어요.',
      '한 줄의 조언이 하루의 습관이 되곤 해요.',
      '오늘 읽은 만큼, 조금 더 나은 내일이 자라요.',
    ],
  },
  knowledge: {
    key: 'knowledge',
    name: '질문을 품는 사람',
    mark: '🕯️',
    tagline: '세상을 더 깊이 이해하려는 독서가',
    lines: [
      '답보다 좋은 질문을 데리고 책장을 덮어요.',
      '읽을수록 세상이 조금 더 또렷하게 보여요.',
      '한 권이 끝나면, 물음표 하나가 더 깊어져요.',
    ],
  },
  science: {
    key: 'science',
    name: '세계를 탐구하는 사람',
    mark: '🔭',
    tagline: '앎의 경계를 넓혀가는 독서가',
    lines: [
      '몰랐던 사실 하나에, 세상이 다르게 보여요.',
      '호기심을 나침반 삼아 앎의 경계를 넓혀가요.',
      '작은 발견 하나하나가 오늘의 즐거움이 돼요.',
    ],
  },
  kids: {
    key: 'kids',
    name: '함께 읽는 사람',
    mark: '🧸',
    tagline: '아이와 나란히 책장을 넘기는 독서가',
    lines: [
      '나란히 앉아 넘기는 책장이, 오늘의 온기가 돼요.',
      '아이의 눈으로 다시 읽으면, 세상이 새로워요.',
      '함께 넘긴 페이지마다 추억이 한 장씩 쌓여요.',
    ],
  },
  mixed: {
    key: 'mixed',
    name: '결을 넓히는 사람',
    mark: '🌾',
    tagline: '장르를 가리지 않고 두루 읽는 독서가',
    lines: [
      '어떤 책이든 편식 없이, 결을 넓게 쌓아가요.',
      '소설도 지식도, 그날의 마음 따라 골라 읽어요.',
      '다양한 결이 모여, 나만의 무늬가 돼요.',
    ],
  },
  seed: {
    key: 'seed',
    name: '첫 장을 넘긴 사람',
    mark: '🌱',
    tagline: '이제 막 자신의 결을 쌓기 시작한 독서가',
    lines: [
      '이제 막 첫 결을 새기기 시작했어요.',
      '한 쪽씩 쌓다 보면, 곧 나만의 무늬가 드러나요.',
    ],
  },
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

export function computePersona(data: AppData): Persona {
  const done = data.books.filter((b) => b.status === 'done')
  const reading = data.books.filter((b) => b.status === 'reading')
  const bookIdsWithLogs = new Set(data.logs.map((l) => l.bookId))
  const activity = data.books.filter((b) => b.status === 'done' || bookIdsWithLogs.has(b.id)).length

  const quotes = data.notes.filter((n) => n.type === 'quote').length
  const notes = data.notes.length
  const bestStreak = maxStreak(data.logs)
  const readingDays = new Set(data.logs.map((l) => l.date)).size

  // 장르 분포 — 완독 우선, 없으면 서재 전체
  const src = done.length > 0 ? done : data.books
  const counts = new Map<GenreBucket, number>()
  for (const b of src) {
    const g = genreBucket(b.category)
    counts.set(g, (counts.get(g) || 0) + 1)
  }
  const total = [...counts.values()].reduce((s, v) => s + v, 0) || 1
  const genres: GenreShare[] = [...counts.entries()]
    .map(([bucket, count]) => ({ bucket, label: GENRE_LABEL[bucket], count, ratio: count / total }))
    .sort((a, b) => b.count - a.count)

  const topGenre = genres[0]
  const distinctCats = new Set(src.map((b) => b.category || '기타')).size

  // 아키타입 선택
  let archKey: GenreBucket | 'mixed' | 'seed'
  if (activity < 3) {
    archKey = 'seed'
  } else if (topGenre && topGenre.ratio >= 0.34) {
    archKey = topGenre.bucket
  } else if (genres.length >= 3) {
    archKey = 'mixed'
  } else {
    archKey = topGenre ? topGenre.bucket : 'seed'
  }
  const arch = ARCHETYPES[archKey]

  // 성향 태그 (행동 기반) — 우선순위대로 최대 3개
  const pool: PersonaTrait[] = []
  if (bestStreak >= 7) {
    pool.push({ key: 'walker', label: '꾸준한 산책러', desc: `한 번에 최장 ${bestStreak}일을 이어 읽었어요` })
  } else if (readingDays >= 8) {
    pool.push({ key: 'steady', label: '틈틈이 읽는 사람', desc: `${readingDays}일에 걸쳐 조금씩 읽었어요` })
  }
  if (quotes >= 5 || (done.length > 0 && quotes / done.length >= 1.5)) {
    pool.push({ key: 'collector', label: '문장 수집가', desc: `마음에 든 문장 ${quotes}개를 모았어요` })
  }
  if (distinctCats >= 5) {
    pool.push({ key: 'explorer', label: '넓게 읽는 탐험가', desc: `${distinctCats}개 분야를 넘나들었어요` })
  } else if (activity >= 3 && distinctCats <= 2) {
    pool.push({ key: 'digger', label: '한 우물 파는 사람', desc: '한 분야를 깊이 파고들어요' })
  }
  const finishable = done.length + reading.length
  if (done.length >= 3 && finishable > 0 && done.length / finishable >= 0.7) {
    pool.push({ key: 'finisher', label: '끝까지 읽는 사람', desc: `펼친 책의 대부분을 완독했어요` })
  } else if (reading.length >= 3 && reading.length > done.length) {
    pool.push({ key: 'wanderer', label: '여러 책을 오가는 사람', desc: `${reading.length}권을 동시에 읽는 중이에요` })
  }
  if (notes - quotes >= 5) {
    pool.push({ key: 'thinker', label: '생각을 적는 사람', desc: '읽으며 떠오른 생각을 남겨요' })
  }
  const traits = pool.slice(0, 3)

  return {
    ready: activity >= 3,
    progress: { have: activity, need: 3 },
    key: arch.key,
    name: arch.name,
    mark: arch.mark,
    tagline: arch.tagline,
    line: pick(arch.lines, done.length + readingDays),
    traits,
    stats: {
      doneCount: done.length,
      topGenre: topGenre ? topGenre.label : '—',
      bestStreak,
      quotes,
      readingDays,
    },
    genres: genres.slice(0, 4),
  }
}
