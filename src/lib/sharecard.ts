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
  ctx.fillText('🌱 북블룸', W / 2, H - 78)
  ctx.font = font(400, 26)
  ctx.fillStyle = '#9a9a9a'
  ctx.fillText('skdyddns-max.github.io/bookbloom', W / 2, H - 42)

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
  ctx.fillText('🌱 북블룸', W / 2, H - 78)
  ctx.font = font(400, 26)
  ctx.fillStyle = '#9a9a9a'
  ctx.fillText('skdyddns-max.github.io/bookbloom', W / 2, H - 42)

  return canvas.toDataURL('image/png')
}

export type QuoteStyle = 'forest' | 'light' | 'mesh'

export const QUOTE_STYLES: Array<{ key: QuoteStyle; label: string }> = [
  { key: 'forest', label: '딥그린' },
  { key: 'light', label: '라이트' },
  { key: 'mesh', label: '메시' },
]

const serif = (w: number, s: number) => `${w} ${s}px "Noto Serif KR", Pretendard, serif`
const sans = (w: number, s: number) => `${w} ${s}px Pretendard, "Pretendard Variable", sans-serif`

/** 단어·문장부호 단위(토큰)로 나눈 뒤 줄 수를 구해 균형 배치 — 단어 중간 끊김·고아 줄 방지 */
function wrapQuote(ctx: CanvasRenderingContext2D, quote: string, maxW: number): string[] {
  const result: string[] = []
  for (const seg of quote.split('\n')) {
    if (!seg) {
      result.push('')
      continue
    }
    // 토큰화: 공백/문장부호 뒤에서 끊어 붙임 (예: "투쟁한다." 를 한 덩어리로)
    let tokens: string[] = []
    let t = ''
    for (const ch of seg) {
      t += ch
      if (ch === ' ' || '.!?,'.includes(ch)) {
        tokens.push(t)
        t = ''
      }
    }
    if (t) tokens.push(t)
    // 한 토큰이 너무 길면(공백 없는 긴 어절) 글자 단위로 쪼갬
    tokens = tokens.flatMap((tk) => {
      if (ctx.measureText(tk).width <= maxW) return [tk]
      const parts: string[] = []
      let p = ''
      for (const ch of tk) {
        if (ctx.measureText(p + ch).width > maxW) {
          parts.push(p)
          p = ch
        } else p += ch
      }
      if (p) parts.push(p)
      return parts
    })

    // 그리디로 줄 수 산정
    let n = 1
    let g = ''
    for (const tk of tokens) {
      if (g && ctx.measureText(g + tk).width > maxW) {
        n++
        g = tk
      } else g += tk
    }
    if (n <= 1) {
      result.push(seg.trim())
      continue
    }
    // 균형 배치: 목표 폭(전체/줄수)까지 채우고 넘기기
    const target = ctx.measureText(seg).width / n
    const lines: string[] = []
    let line = ''
    for (const tk of tokens) {
      const over = line && ctx.measureText(line + tk).width > maxW
      const balanced = line && lines.length < n - 1 && ctx.measureText(line).width >= target
      if (over || balanced) {
        lines.push(line.trim())
        line = tk
      } else line += tk
    }
    if (line.trim()) lines.push(line.trim())
    result.push(...lines)
  }
  if (result.length > 9) {
    const clamped = result.slice(0, 9)
    clamped[8] = clamped[8].slice(0, -1) + '…'
    return clamped
  }
  return result
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** 문장 수집 카드(1080x1080) — 3가지 스타일 중 선택 */
export function makeQuoteCard(
  book: Pick<Book, 'title' | 'author'>,
  quote: string,
  style: QuoteStyle = 'forest',
): string {
  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'

  const size = quote.length > 120 ? 40 : quote.length > 60 ? 48 : 56

  if (style === 'light') {
    // 밝은 종이 + 큰 세리프 (미니멀·고급)
    ctx.fillStyle = '#FBF9F4'
    ctx.fillRect(0, 0, W, H)
    ctx.font = sans(700, 22)
    ctx.fillStyle = '#B0A99A'
    ctx.save()
    ctx.letterSpacing = '8px'
    ctx.fillText('BOOKBLOOM', W / 2, 150)
    ctx.restore()

    ctx.font = serif(700, size + 6)
    ctx.fillStyle = '#1A1A1A'
    const lines = wrapQuote(ctx, quote, W - 220)
    const lh = (size + 6) * 1.5
    let y = H / 2 - ((lines.length - 1) * lh) / 2
    for (const l of lines) {
      ctx.fillText(l, W / 2, y)
      y += lh
    }
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(W / 2 - 40, y + 6)
    ctx.lineTo(W / 2 + 40, y + 6)
    ctx.stroke()
    ctx.font = sans(500, 30)
    ctx.fillStyle = '#8a8375'
    ctx.fillText(`${book.author ? book.author + ' ' : ''}『${book.title}』`, W / 2, y + 66)
    ctx.font = sans(800, 28)
    ctx.fillStyle = '#4E9C6F'
    ctx.fillText('🌱 북블룸 · skdyddns-max.github.io/bookbloom', W / 2, H - 70)
    return canvas.toDataURL('image/png')
  }

  if (style === 'mesh') {
    // 파스텔 메시 그라디언트 + 유리 카드 (2025 트렌드)
    ctx.fillStyle = '#FBF7EE'
    ctx.fillRect(0, 0, W, H)
    const blob = (cx: number, cy: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
    blob(W * 0.18, H * 0.2, 560, 'rgba(189,233,206,0.9)')
    blob(W * 0.85, H * 0.14, 540, 'rgba(255,225,201,0.9)')
    blob(W * 0.82, H * 0.85, 540, 'rgba(207,224,255,0.85)')
    blob(W * 0.2, H * 0.88, 560, 'rgba(243,230,184,0.85)')

    // 유리 카드
    ctx.save()
    roundRectPath(ctx, 90, 150, W - 180, H - 300, 44)
    ctx.shadowColor = 'rgba(80,90,70,0.18)'
    ctx.shadowBlur = 60
    ctx.shadowOffsetY = 30
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fill()
    ctx.restore()
    ctx.save()
    roundRectPath(ctx, 90, 150, W - 180, H - 300, 44)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = '#4E9C6F'
    ctx.font = serif(900, 130)
    ctx.fillText('“', W / 2, 350)
    ctx.font = serif(700, size)
    ctx.fillStyle = '#243B2E'
    const lines = wrapQuote(ctx, quote, W - 320)
    const lh = size * 1.55
    let y = H / 2 - ((lines.length - 1) * lh) / 2 + 30
    for (const l of lines) {
      ctx.fillText(l, W / 2, y)
      y += lh
    }
    ctx.font = sans(600, 30)
    ctx.fillStyle = '#5c6b5f'
    ctx.fillText(`${book.author ? book.author + ' ' : ''}『${book.title}』`, W / 2, y + 40)
    ctx.font = sans(800, 27)
    ctx.fillStyle = '#4E9C6F'
    ctx.fillText('🌱 북블룸', W / 2, y + 88)
    return canvas.toDataURL('image/png')
  }

  // forest (기본) — 딥 포레스트
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#1E3329')
  bg.addColorStop(1, '#16281F')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W * 0.85, -50, 0, W * 0.85, -50, 700)
  glow.addColorStop(0, 'rgba(109,190,138,0.28)')
  glow.addColorStop(1, 'rgba(109,190,138,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#6DBE8A'
  ctx.font = serif(900, 160)
  ctx.fillText('“', W / 2, 230)
  ctx.font = serif(600, size)
  ctx.fillStyle = '#F7F4EC'
  const lines = wrapQuote(ctx, quote, W - 260)
  const lh = size * 1.65
  let y = H / 2 - ((lines.length - 1) * lh) / 2 + 40
  for (const l of lines) {
    ctx.fillText(l, W / 2, y)
    y += lh
  }
  ctx.font = sans(700, 34)
  ctx.fillStyle = 'rgba(247,244,236,0.85)'
  ctx.fillText(`『${book.title}』`, W / 2, H - 170)
  if (book.author) {
    ctx.font = sans(400, 28)
    ctx.fillStyle = 'rgba(247,244,236,0.55)'
    ctx.fillText(book.author, W / 2, H - 125)
  }
  ctx.font = sans(700, 28)
  ctx.fillStyle = '#6DBE8A'
  ctx.fillText('🌱 북블룸', W / 2, H - 72)
  ctx.font = sans(400, 24)
  ctx.fillStyle = 'rgba(247,244,236,0.45)'
  ctx.fillText('skdyddns-max.github.io/bookbloom', W / 2, H - 40)
  return canvas.toDataURL('image/png')
}
