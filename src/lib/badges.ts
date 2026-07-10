import type { AppData } from '../types'
import { maxStreak } from '../utils'

export interface Badge {
  key: string
  icon: string
  title: string
  desc: string
  earned: boolean
  progress?: string // 미획득 시 "3/5"
}

/** 서재·기록·노트에서 뱃지 달성 여부를 계산 (순수 로컬, 저장 안 함) */
export function computeBadges(data: AppData): Badge[] {
  const done = data.books.filter((b) => b.status === 'done')
  const doneCount = done.length
  const logDays = new Set(data.logs.map((l) => l.date)).size
  const best = maxStreak(data.logs)
  const quoteCount = data.notes.filter((n) => n.type === 'quote').length
  const cats = new Set(done.map((b) => b.category || '기타')).size
  const fiveStar = done.filter((b) => b.rating >= 5).length

  const milestone = (
    key: string,
    icon: string,
    title: string,
    desc: string,
    value: number,
    target: number,
  ): Badge => ({
    key,
    icon,
    title,
    desc,
    earned: value >= target,
    progress: value >= target ? undefined : `${Math.min(value, target)}/${target}`,
  })

  return [
    milestone('first-log', '🌱', '첫 발자국', '처음으로 독서를 기록했어요', logDays, 1),
    milestone('first-done', '📖', '첫 완독', '한 권을 끝까지 읽었어요', doneCount, 1),
    milestone('streak-7', '🔥', '일주일 연속', '7일 연속으로 기록했어요', best, 7),
    milestone('streak-30', '⚡', '한 달 개근', '30일 연속으로 기록했어요', best, 30),
    milestone('done-5', '📚', '다섯 권', '다섯 권을 완독했어요', doneCount, 5),
    milestone('done-10', '🏆', '열 권', '열 권을 완독했어요', doneCount, 10),
    milestone('done-25', '👑', '스물다섯 권', '스물다섯 권을 완독했어요', doneCount, 25),
    milestone('diverse', '🗺️', '넓게 읽는 사람', '다섯 분야의 책을 완독했어요', cats, 5),
    milestone('quotes', '✍️', '문장 수집가', '마음에 남은 문장을 열 개 모았어요', quoteCount, 10),
    milestone('five-star', '⭐', '인생책 발견', '별점 5점을 세 번 줬어요', fiveStar, 3),
  ]
}
