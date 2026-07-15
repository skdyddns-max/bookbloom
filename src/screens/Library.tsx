import { useState } from 'react'
import { useAppData } from '../store'
import { BookCover } from '../components'
import {
  librarianAvailable, recommendBooks, askLibrarian, usesLeft, type RecResult,
} from '../lib/librarian'
import type { BookStatus } from '../types'

function LibrarianCard() {
  const data = useAppData()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RecResult | null>(null)
  const [answer, setAnswer] = useState('')
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [err, setErr] = useState('')

  if (!librarianAvailable) return null
  const hasBooks = data.books.length > 0

  const recommend = async () => {
    setBusy(true); setErr(''); setAnswer('')
    try {
      setResult(await recommendBooks())
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패했어요')
    } finally {
      setBusy(false)
    }
  }
  const ask = async () => {
    if (!question.trim()) return
    setBusy(true); setErr(''); setResult(null)
    try {
      setAnswer(await askLibrarian(question.trim()))
      setQuestion('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패했어요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card libra-card">
      <div className="libra-head">
        <span className="libra-mark">🕯️</span>
        <div>
          <h2>결 사서</h2>
          <p className="muted small">내 서재를 아는 사서가 다음 책을 골라드려요 · 오늘 {usesLeft()}회 남음</p>
        </div>
      </div>

      {!hasBooks ? (
        <p className="muted small">책을 몇 권 담으면, 사서가 취향을 읽고 추천해 드릴 수 있어요.</p>
      ) : (
        <>
          <div className="settings-actions">
            <button className="btn btn-green" onClick={recommend} disabled={busy}>
              {busy && !asking ? '서가를 살피는 중…' : '다음 책 추천받기'}
            </button>
            <button className="btn btn-outline" onClick={() => setAsking(!asking)}>
              사서에게 질문하기
            </button>
          </div>

          {asking && (
            <div className="quicklog-row libra-ask">
              <input
                placeholder="예: 요즘 마음이 어수선한데 어떤 책이 좋을까요?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
              />
              <button className="btn btn-green btn-sm" onClick={ask} disabled={busy || !question.trim()}>
                {busy ? '…' : '질문'}
              </button>
            </div>
          )}

          {result && (
            <div className="libra-result">
              {result.note && <p className="libra-note serif">“{result.note}”</p>}
              {result.recs.map((r, i) => (
                <div key={i} className="libra-rec">
                  <b className="serif">{r.title}</b>
                  <span className="muted small">{r.author}</span>
                  <p>{r.reason}</p>
                  <a
                    className="btn-text libra-link"
                    href={`https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${encodeURIComponent(r.title)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    알라딘에서 보기 ›
                  </a>
                </div>
              ))}
            </div>
          )}
          {answer && <p className="libra-answer">{answer}</p>}
        </>
      )}
      {err && <p className="error-msg">{err}</p>}
    </section>
  )
}

const TABS: Array<{ key: BookStatus; label: string }> = [
  { key: 'reading', label: '읽는 중' },
  { key: 'want', label: '읽고 싶어요' },
  { key: 'done', label: '다 읽음' },
]

export function Library({
  onOpenBook,
  onSearch,
}: {
  onOpenBook: (id: string) => void
  onSearch: () => void
}) {
  const data = useAppData()
  const [tab, setTab] = useState<BookStatus>('reading')
  const books = data.books.filter((b) => b.status === tab)

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>내 서재</h1>
        <button className="btn btn-green btn-sm" onClick={onSearch}>+ 책 추가</button>
      </header>

      <div className="seg">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`seg-btn ${tab === t.key ? 'seg-btn-on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="seg-count">{data.books.filter((b) => b.status === t.key).length}</span>
          </button>
        ))}
      </div>

      {books.length === 0 ? (
        <div className="card empty-card">
          <p>
            {tab === 'reading' && '읽는 중인 책이 없어요.'}
            {tab === 'want' && '읽고 싶은 책을 담아두세요.'}
            {tab === 'done' && '완독한 책이 여기에 쌓여요.'}
          </p>
          <button className="btn btn-outline" onClick={onSearch}>책 검색하기</button>
        </div>
      ) : (
        <div className="shelf-grid">
          {books.map((b) => (
            <button key={b.id} className="shelf-item" onClick={() => onOpenBook(b.id)}>
              <BookCover book={b} size="md" />
              <span className="shelf-title">{b.title}</span>
              {b.status === 'done' && b.rating > 0 && (
                <span className="shelf-rating">★ {b.rating}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <LibrarianCard />
    </div>
  )
}
