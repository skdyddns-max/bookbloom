import { useEffect, useState } from 'react'
import type { Book } from '../types'
import { makeShareCard, ensureCardFonts } from '../lib/sharecard'
import { BookCover } from '../components'

/** 완독 축하 오버레이 — 페이퍼 톤(콘페티 대신 절제된 세리프 모먼트) */
export function Celebration({ book, onClose }: { book: Book; onClose: () => void }) {
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(onClose, 6000) // 6초 뒤 자동 닫힘
    return () => clearTimeout(t)
  }, [onClose])

  const saveCard = async () => {
    setSaving(true)
    await ensureCardFonts()
    const a = document.createElement('a')
    a.href = makeShareCard(book)
    a.download = `bookbloom-완독-${book.title.slice(0, 16)}.png`
    a.click()
    setSaving(false)
  }

  return (
    <div className="celebrate-back" onClick={onClose}>
      <div className="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <p className="celebrate-eyebrow">A BOOK COMPLETED</p>
        <div className="celebrate-cover">
          <BookCover book={book} size="lg" />
          <span className="celebrate-seal">🌱</span>
        </div>
        <h2 className="celebrate-title serif">한 권을 다 읽었어요</h2>
        <p className="celebrate-book serif">『{book.title}』</p>
        <p className="celebrate-sub">{book.author} · 끝까지 읽어낸 당신, 멋져요.</p>
        <div className="celebrate-actions">
          <button className="btn celebrate-cta" onClick={saveCard} disabled={saving}>
            {saving ? '만드는 중…' : '완독 카드 저장하기'}
          </button>
          <button className="btn-text celebrate-close" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
