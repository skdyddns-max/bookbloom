import { useEffect, useState } from 'react'
import { fetchShelf, type PublicShelf as Shelf } from '../lib/shelf'

function Stars({ n }: { n: number }) {
  if (n <= 0) return null
  const full = Math.floor(n)
  const half = n % 1 >= 0.5
  return <span className="shelf-stars">{'★'.repeat(full)}{half ? '½' : ''}</span>
}

/** 공개 서재 페이지 — 링크만 있으면 누구나 (앱 데이터와 무관) */
export function PublicShelfView({ slug }: { slug: string }) {
  const [shelf, setShelf] = useState<Shelf | null | 'loading'>('loading')

  useEffect(() => {
    let alive = true
    fetchShelf(slug).then((s) => alive && setShelf(s))
    return () => { alive = false }
  }, [slug])

  if (shelf === 'loading') {
    return (
      <div className="screen shelf-screen">
        <p className="muted center shelf-loading">서재를 여는 중…</p>
      </div>
    )
  }
  if (!shelf) {
    return (
      <div className="screen shelf-screen">
        <div className="card empty-card shelf-notfound">
          <p>이 주소의 서재를 찾지 못했어요.<br />링크가 바뀌었거나 비공개로 전환됐을 수 있어요.</p>
          <a className="btn btn-green" href="./">결 시작하기</a>
        </div>
      </div>
    )
  }

  const d = shelf.data
  const name = shelf.nickname || shelf.slug

  return (
    <div className="screen shelf-screen">
      <header className="shelf-hero">
        <p className="hero-eyebrow">GYEOL</p>
        <h1 className="shelf-title serif">{name}의 서재</h1>
        {d.persona && (
          <p className="shelf-persona">
            {d.persona.mark} {d.persona.name} <span className="muted small">· {d.persona.tagline}</span>
          </p>
        )}
        <div className="shelf-stats">
          <span><b>{d.stats.doneCount}</b> 완독</span>
          <span className="shelf-dot">·</span>
          <span><b>{d.stats.quotes}</b> 밑줄</span>
        </div>
      </header>

      {d.quotes.length > 0 && (
        <section>
          <div className="section-title-row"><h2>모아둔 밑줄</h2></div>
          <div className="card weekly-card">
            {d.quotes.slice(0, 4).map((q, i) => (
              <div key={i} className="weekly-item">
                <p className="weekly-quote serif">“{q.quote}”</p>
                {q.title && <span className="weekly-book muted small">— 『{q.title}』</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {d.books.length > 0 && (
        <section>
          <div className="section-title-row">
            <h2>다 읽은 책</h2>
            <span className="muted small">{d.books.length}권</span>
          </div>
          <div className="card shelf-books">
            {d.books.map((b, i) => (
              <div key={i} className="shelf-book-row">
                {b.coverUrl ? (
                  <img className="shelf-cover" src={b.coverUrl} alt="" loading="lazy" />
                ) : (
                  <span className="shelf-cover shelf-cover-empty serif">{b.title.slice(0, 1)}</span>
                )}
                <div className="shelf-book-meta">
                  <b className="serif">{b.title}</b>
                  <span className="muted small">{b.author}</span>
                  {b.oneLine && <span className="shelf-oneline">“{b.oneLine}”</span>}
                </div>
                <Stars n={b.rating} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="card shelf-cta">
        <p className="serif shelf-cta-title">나의 결도 쌓아볼까요?</p>
        <p className="muted small">가입 없이 바로, 한 줄씩 쌓는 독서 기록</p>
        <a className="btn btn-green" href="./">🌱 결 시작하기</a>
      </div>
    </div>
  )
}
