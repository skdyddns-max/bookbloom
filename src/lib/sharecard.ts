import type { Book } from '../types'
import { fmtDate } from '../utils'

export interface YearSummary {
  year: string
  doneCount: number
  totalPages: number
  bestStreak: number
  topCategories: Array<{ label: string; value: number }>
  topBooks: Book[]
}

const GREEN = '#6DBE8A'
const CREAM = '#FAF7F0'
const CORAL = '#F2845C'
const DARK = '#3A3A3A'

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line)
      line = ch
      if (lines.length === maxLines) {
        lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…'
        return lines
      }
    } else {
      line += ch
    }
  }
  if (line) lines.push(line)
  return lines
}

/** 완독 공유 카드(1080x1350)를 PNG dataURL로 생성. 표지는 CORS 문제로 텍스트 중심 디자인 */
export function makeShareCard(book: Book): string {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const font = (weight: number, size: number) =>
    `${weight} ${size}px Pretendard, "Pretendard Variable", sans-serif`

  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)

  // 상단 그린 밴드
  ctx.fillStyle = GREEN
  ctx.beginPath()
  ctx.roundRect(60, 60, W - 120, 120, 32)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.font = font(700, 44)
  ctx.textAlign = 'center'
  ctx.fillText('📖 한 권을 다 읽었어요', W / 2, 136)

  // 제목
  ctx.fillStyle = DARK
  ctx.font = font(800, 72)
  const titleLines = wrapText(ctx, book.title, W - 200, 3)
  let y = 340
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, y)
    y += 96
  }

  // 저자
  ctx.font = font(400, 44)
  ctx.fillStyle = '#6b6b6b'
  ctx.fillText(book.author, W / 2, y + 10)
  y += 110

  // 별점 (코랄 — 화면당 1곳)
  if (book.rating > 0) {
    ctx.font = font(400, 72)
    ctx.fillStyle = CORAL
    const full = Math.floor(book.rating)
    const half = book.rating % 1 >= 0.5
    ctx.fillText('★'.repeat(full) + (half ? '½' : ''), W / 2, y)
    y += 100
  }

  // 한줄평
  if (book.oneLine) {
    ctx.font = font(500, 48)
    ctx.fillStyle = DARK
    const lines = wrapText(ctx, `“${book.oneLine}”`, W - 240, 4)
    y += 30
    for (const line of lines) {
      ctx.fillText(line, W / 2, y)
      y += 72
    }
  }

  // 하단 정보
  ctx.font = font(400, 36)
  ctx.fillStyle = '#8a8a8a'
  const period =
    book.startedAt && book.finishedAt
      ? `${fmtDate(book.startedAt)} ~ ${fmtDate(book.finishedAt)}`
      : fmtDate(book.finishedAt)
  ctx.fillText(period, W / 2, H - 180)
  if (book.totalPages > 0) {
    ctx.fillText(`${book.totalPages.toLocaleString()}쪽`, W / 2, H - 130)
  }

  ctx.font = font(700, 40)
  ctx.fillStyle = GREEN
  ctx.fillText('🌱 북블룸', W / 2, H - 60)

  return canvas.toDataURL('image/png')
}

/** 연간 독서 결산 카드(1080x1350) — 코랄은 완독 권수 1곳만 */
export function makeYearCard(s: YearSummary): string {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const font = (weight: number, size: number) =>
    `${weight} ${size}px Pretendard, "Pretendard Variable", sans-serif`

  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'

  ctx.fillStyle = DARK
  ctx.font = font(800, 64)
  ctx.fillText(`${s.year}년 나의 독서 결산`, W / 2, 140)

  // 완독 권수 (코랄 1곳)
  ctx.fillStyle = CORAL
  ctx.font = font(800, 200)
  ctx.fillText(String(s.doneCount), W / 2, 400)
  ctx.fillStyle = DARK
  ctx.font = font(700, 52)
  ctx.fillText('권을 읽었어요', W / 2, 480)

  // 보조 지표 2개
  ctx.fillStyle = GREEN
  ctx.beginPath()
  ctx.roundRect(90, 560, 430, 150, 24)
  ctx.roundRect(560, 560, 430, 150, 24)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.font = font(800, 56)
  ctx.fillText(`${s.totalPages.toLocaleString()}쪽`, 305, 635)
  ctx.fillText(`${s.bestStreak}일`, 775, 635)
  ctx.font = font(500, 30)
  ctx.fillText('읽은 쪽수', 305, 685)
  ctx.fillText('최장 연속 기록', 775, 685)

  // 톱 카테고리
  let y = 810
  if (s.topCategories.length > 0) {
    ctx.fillStyle = DARK
    ctx.font = font(700, 40)
    ctx.fillText('많이 읽은 분야', W / 2, y)
    y += 60
    ctx.font = font(500, 36)
    ctx.fillStyle = '#6b6b6b'
    ctx.fillText(
      s.topCategories.slice(0, 3).map((c) => `${c.label} ${c.value}권`).join(' · '),
      W / 2,
      y,
    )
    y += 90
  }

  // 올해의 책 톱3
  if (s.topBooks.length > 0) {
    ctx.fillStyle = DARK
    ctx.font = font(700, 40)
    ctx.fillText('올해의 책', W / 2, y)
    y += 62
    ctx.font = font(500, 36)
    for (const b of s.topBooks.slice(0, 3)) {
      const t = b.title.length > 18 ? b.title.slice(0, 18) + '…' : b.title
      ctx.fillStyle = '#6b6b6b'
      ctx.fillText(`${t}${b.rating > 0 ? `  ★${b.rating}` : ''}`, W / 2, y)
      y += 56
    }
  }

  ctx.font = font(700, 40)
  ctx.fillStyle = GREEN
  ctx.fillText('🌱 북블룸', W / 2, H - 60)

  return canvas.toDataURL('image/png')
}
