import { useRef, useState } from 'react'
import { useAppData, store } from '../store'
import { BookCover, ProgressBar, StarRating, CATEGORIES } from '../components'
import { fmtDate, todayStr, uid, clamp } from '../utils'
import { makeShareCard, makeQuoteCard } from '../lib/sharecard'
import { ocrImage } from '../lib/ocr'
import { getGroupSession, setPostDraft } from '../lib/group'
import { hasSupabase } from '../lib/supabase'
import { aladinBookUrl } from '../config'
import { pickQuestion } from '../lib/questions'
import type { BookStatus } from '../types'

export function BookDetail({
  bookId,
  onBack,
  onShareToGroup,
}: {
  bookId: string
  onBack: () => void
  onShareToGroup: () => void
}) {
  const data = useAppData()
  const book = data.books.find((b) => b.id === bookId)
  const [page, setPage] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'quote'>('quote')
  const [qIndex, setQIndex] = useState(0)
  const [ocrState, setOcrState] = useState<'idle' | 'busy'>('idle')
  const [ocrPct, setOcrPct] = useState(0)
  const [editMeta, setEditMeta] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!book) {
    return (
      <div className="screen">
        <p className="muted center">책을 찾을 수 없어요.</p>
        <button className="btn btn-outline" onClick={onBack}>돌아가기</button>
      </div>
    )
  }

  const logs = data.logs
    .filter((l) => l.bookId === book.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const current = logs.reduce((max, l) => Math.max(max, l.page), 0)
  const notes = data.notes.filter((n) => n.bookId === book.id)

  const setStatus = (s: BookStatus) => {
    const patch: Parameters<typeof store.updateBook>[1] = { status: s }
    if (s === 'reading' && !book.startedAt) patch.startedAt = todayStr()
    if (s === 'done') {
      patch.finishedAt = book.finishedAt || todayStr()
      if (!book.startedAt) patch.startedAt = todayStr()
    }
    store.updateBook(book.id, patch)
  }

  const addProgress = () => {
    const p = clamp(parseInt(page, 10) || 0, 1, book.totalPages > 0 ? book.totalPages : 99999)
    if (!p) return
    store.addLog({ id: uid(), bookId: book.id, page: p, date: todayStr(), createdAt: new Date().toISOString() })
    if (book.status !== 'reading' && book.status !== 'done') setStatus('reading')
    if (book.totalPages > 0 && p >= book.totalPages) setStatus('done')
    setPage('')
  }

  const addNote = () => {
    if (!noteText.trim()) return
    store.addNote({
      id: uid(),
      bookId: book.id,
      type: noteType,
      content: noteText.trim(),
      createdAt: new Date().toISOString(),
    })
    setNoteText('')
  }

  const runOcr = async (file: File) => {
    setOcrState('busy')
    setOcrPct(0)
    try {
      const text = await ocrImage(file, setOcrPct)
      if (text) setNoteText((prev) => (prev ? prev + '\n' + text : text))
      else alert('사진에서 글자를 찾지 못했어요. 더 밝고 평평하게 찍어보세요.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'OCR에 실패했어요.')
    } finally {
      setOcrState('idle')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const share = () => {
    const url = makeShareCard(book)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookbloom-${book.title.slice(0, 20)}.png`
    a.click()
  }

  const remove = () => {
    if (confirm(`『${book.title}』과 모든 기록을 삭제할까요?`)) {
      store.removeBook(book.id)
      onBack()
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack} aria-label="뒤로">‹</button>
        <h1>책 정보</h1>
        <button className="btn-text danger" onClick={remove}>삭제</button>
      </header>

      <section className="detail-hero">
        {book.coverUrl && (
          <div className="detail-backdrop" style={{ backgroundImage: `url(${book.coverUrl})` }} />
        )}
        <div className="detail-hero-inner">
          <BookCover book={book} size="lg" />
          <b className="book-title-lg serif">{book.title}</b>
          <span className="detail-author">{book.author}</span>
          <span className="detail-sub">
            {book.publisher ? `${book.publisher} · ` : ''}
            {book.category}
            {book.totalPages > 0 ? ` · ${book.totalPages}쪽` : ''}
          </span>
          <button className="btn-text detail-edit" onClick={() => setEditMeta(!editMeta)}>
            {editMeta ? '닫기' : '정보 수정'}
          </button>
        </div>
      </section>

      {editMeta && (
        <section className="card manual-form">
          <label className="field-label">전체 쪽수</label>
          <input
            type="number"
            inputMode="numeric"
            defaultValue={book.totalPages || ''}
            placeholder="전체 쪽수"
            onBlur={(e) => store.updateBook(book.id, { totalPages: parseInt(e.target.value, 10) || 0 })}
          />
          <label className="field-label">카테고리</label>
          <select
            value={book.category}
            onChange={(e) => store.updateBook(book.id, { category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {!CATEGORIES.includes(book.category) && (
              <option value={book.category}>{book.category}</option>
            )}
          </select>
        </section>
      )}

      <div className="seg">
        {(['want', 'reading', 'done'] as BookStatus[]).map((s) => (
          <button
            key={s}
            className={`seg-btn ${book.status === s ? 'seg-btn-on' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s === 'want' ? '읽고 싶어요' : s === 'reading' ? '읽는 중' : '다 읽음'}
          </button>
        ))}
      </div>

      <a
        className="btn-text book-shop-link"
        href={aladinBookUrl(book)}
        target="_blank"
        rel="noreferrer"
      >
        알라딘에서 이 책 보기 ›
      </a>

      {book.status !== 'want' && (
        <section className="card">
          <h2>진도</h2>
          <ProgressBar current={current} total={book.totalPages} />
          {book.status === 'reading' && (
            <div className="quicklog-row">
              <input
                type="number"
                inputMode="numeric"
                placeholder="오늘 몇 쪽까지 읽었나요?"
                value={page}
                onChange={(e) => setPage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addProgress()}
              />
              <button className="btn btn-green btn-sm" onClick={addProgress} disabled={!page}>기록</button>
            </div>
          )}
          {logs.length > 0 && (
            <ul className="log-list">
              {logs.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <span>{fmtDate(l.date)}</span>
                  <span>{l.page}쪽까지</span>
                  <button className="btn-text danger" onClick={() => store.removeLog(l.id)}>×</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {book.status === 'done' && (
        <section className="card">
          <h2>나의 평가</h2>
          <StarRating value={book.rating} onChange={(v) => store.updateBook(book.id, { rating: v })} />
          <textarea
            className="oneline-input"
            placeholder="이 책을 한 문장으로 남기면?"
            defaultValue={book.oneLine}
            rows={2}
            onBlur={(e) => store.updateBook(book.id, { oneLine: e.target.value.trim() })}
          />
          <p className="muted small">
            {fmtDate(book.startedAt)} ~ {fmtDate(book.finishedAt)}
          </p>
          <button className="btn btn-coral" onClick={share}>완독 카드 저장하기</button>
          {hasSupabase && getGroupSession() && (
            <button
              className="btn btn-outline"
              onClick={() => {
                setPostDraft({
                  bookTitle: book.title,
                  bookAuthor: book.author,
                  coverUrl: book.coverUrl ?? '',
                  kind: 'review',
                  content: book.oneLine,
                  rating: book.rating,
                })
                onShareToGroup()
              }}
            >
              모임에 후기 공유하기
            </button>
          )}
        </section>
      )}

      {book.status !== 'want' && (
        <section className="card question-card">
          <div className="card-title-row">
            <h2>독후 질문 카드</h2>
            <button className="btn-text" onClick={() => setQIndex(qIndex + 1)}>다른 질문 ↻</button>
          </div>
          <p className="question-text serif">{pickQuestion(book.category, book.id, qIndex)}</p>
          <div className="note-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setNoteType('note')
                setNoteText((prev) => {
                  const q = `Q. ${pickQuestion(book.category, book.id, qIndex)}\n\n`
                  return prev.startsWith('Q. ') ? q : q + prev
                })
              }}
            >
              메모로 답하기
            </button>
            {hasSupabase && getGroupSession() && (
              <button
                className="btn btn-green btn-sm"
                onClick={() => {
                  setPostDraft({
                    bookTitle: book.title,
                    bookAuthor: book.author,
                    coverUrl: book.coverUrl ?? '',
                    kind: 'thought',
                    content: `Q. ${pickQuestion(book.category, book.id, qIndex)}\n\n`,
                    rating: 0,
                  })
                  onShareToGroup()
                }}
              >
                모임 글감으로
              </button>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <h2>문장 수집 · 메모</h2>
        <div className="seg seg-sm">
          <button className={`seg-btn ${noteType === 'quote' ? 'seg-btn-on' : ''}`} onClick={() => setNoteType('quote')}>문장 수집</button>
          <button className={`seg-btn ${noteType === 'note' ? 'seg-btn-on' : ''}`} onClick={() => setNoteType('note')}>메모</button>
        </div>
        <textarea
          placeholder={noteType === 'quote' ? '마음에 남은 문장을 옮겨 적어보세요' : '떠오른 생각을 남겨보세요'}
          value={noteText}
          rows={3}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <div className="note-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => e.target.files?.[0] && runOcr(e.target.files[0])}
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={ocrState === 'busy'}
          >
            {ocrState === 'busy' ? `📷 인식 중… ${ocrPct}%` : '📷 사진에서 글자 추출 (베타)'}
          </button>
          <button className="btn btn-green btn-sm" onClick={addNote} disabled={!noteText.trim()}>
            저장
          </button>
        </div>
        {notes.map((n) => (
          <div key={n.id} className={`note-item note-${n.type}`}>
            <p>{n.content}</p>
            <div className="note-foot">
              <span className="muted small">{n.type === 'quote' ? '문장' : '메모'} · {fmtDate(n.createdAt.slice(0, 10))}</span>
              <span className="note-foot-actions">
                {n.type === 'quote' && (
                  <button
                    className="btn-text"
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = makeQuoteCard(book, n.content)
                      a.download = `bookbloom-문장-${book.title.slice(0, 12)}.png`
                      a.click()
                    }}
                  >
                    카드 저장
                  </button>
                )}
                <button className="btn-text danger" onClick={() => store.removeNote(n.id)}>삭제</button>
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
