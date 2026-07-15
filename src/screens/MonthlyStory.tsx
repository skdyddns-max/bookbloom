import { useEffect, useMemo, useState } from 'react'
import type { MonthReview } from '../lib/monthly'
import { makeMonthlyCard, ensureCardFonts } from '../lib/sharecard'

interface Slide {
  tone: 'paper' | 'forest'
  eyebrow: string
  render: () => JSX.Element
}

/** 월간 결산 풀스크린 스토리 — 탭해서 넘기는 Wrapped 스타일 */
export function MonthlyStory({ review, onClose }: { review: MonthReview; onClose: () => void }) {
  const [idx, setIdx] = useState(0)

  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = []
    s.push({
      tone: 'forest',
      eyebrow: review.label,
      render: () => (
        <>
          <p className="story-hello">한 달의 결이<br />쌓였어요</p>
          <p className="story-sub">톡, 톡. 화면을 눌러 넘겨보세요</p>
        </>
      ),
    })
    s.push({
      tone: 'paper',
      eyebrow: '이만큼 걸었어요',
      render: () => (
        <>
          <p className="story-num">{review.pages.toLocaleString()}</p>
          <p className="story-unit">쪽</p>
          <p className="story-sub">
            {review.daysRead}일을 책과 함께 보냈어요
            {review.bestStreak >= 3 ? ` · 최장 ${review.bestStreak}일 연속` : ''}
          </p>
        </>
      ),
    })
    if (review.topBook) {
      s.push({
        tone: 'forest',
        eyebrow: '가장 오래 머문 책',
        render: () => (
          <>
            <p className="story-book serif">『{review.topBook!.title}』</p>
            {review.topBook!.author && <p className="story-sub">{review.topBook!.author}</p>}
            <p className="story-sub2">이 책에서 {review.topBook!.pages.toLocaleString()}쪽을 보냈어요</p>
          </>
        ),
      })
    }
    s.push({
      tone: 'paper',
      eyebrow: '다 읽은 책',
      render: () => (
        <>
          <p className="story-num">{review.doneBooks.length}</p>
          <p className="story-unit">권 완독</p>
          {review.doneBooks.length > 0 ? (
            <ul className="story-list">
              {review.doneBooks.slice(0, 4).map((b) => (
                <li key={b.id} className="serif">『{b.title}』{b.rating > 0 ? ` ★${b.rating}` : ''}</li>
              ))}
              {review.doneBooks.length > 4 && <li>…그리고 {review.doneBooks.length - 4}권 더</li>}
            </ul>
          ) : (
            <p className="story-sub">아직 여정 중이에요. 완독은 천천히 와요</p>
          )}
        </>
      ),
    })
    if (review.bestQuote) {
      s.push({
        tone: 'forest',
        eyebrow: '이달의 밑줄',
        render: () => (
          <>
            <p className="story-quote serif">“{review.bestQuote!.quote}”</p>
            {review.bestQuote!.title && <p className="story-sub">— 『{review.bestQuote!.title}』</p>}
            {review.quotes > 1 && <p className="story-sub2">모두 {review.quotes}개의 문장을 모았어요</p>}
          </>
        ),
      })
    }
    s.push({
      tone: 'paper',
      eyebrow: `${review.label}의 결`,
      render: () => (
        <>
          <div className="story-summary">
            <div><b>{review.pages.toLocaleString()}</b><span>쪽</span></div>
            <div><b>{review.daysRead}</b><span>일 기록</span></div>
            <div><b>{review.doneBooks.length}</b><span>권 완독</span></div>
            <div><b>{review.quotes}</b><span>밑줄</span></div>
          </div>
          <p className="story-sub">잘 걸어왔어요. 이번 달도 한 쪽부터.</p>
          <button
            className="btn btn-green story-save"
            onClick={async (e) => {
              e.stopPropagation()
              await ensureCardFonts()
              const a = document.createElement('a')
              a.href = makeMonthlyCard(review)
              a.download = `결-${review.ym}-결산.png`
              a.click()
            }}
          >
            결산 카드 저장 (공유용)
          </button>
        </>
      ),
    })
    return s
  }, [review])

  const next = () => (idx < slides.length - 1 ? setIdx(idx + 1) : onClose())
  const prev = () => idx > 0 && setIdx(idx - 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const cur = slides[idx]

  return (
    <div className={`story-overlay story-${cur.tone}`}>
      <div className="story-progress">
        {slides.map((_, i) => (
          <span key={i} className={i <= idx ? 'sp-on' : ''} />
        ))}
      </div>
      <button className="story-close" onClick={onClose} aria-label="닫기">×</button>

      <div className="story-body">
        <span className="story-eyebrow">{cur.eyebrow}</span>
        {cur.render()}
      </div>

      {/* 탭 존: 왼쪽 1/3 이전 · 오른쪽 2/3 다음 */}
      <div className="story-taps">
        <button className="story-tap-left" onClick={prev} aria-label="이전" />
        <button className="story-tap-right" onClick={next} aria-label="다음" />
      </div>
    </div>
  )
}
