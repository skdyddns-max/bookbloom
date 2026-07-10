import { useState } from 'react'
import { useAppData, store } from '../store'
import { searchAladin, searchKakao, lookupAladinPages, hasAladinProxy } from '../lib/search'
import { BookCover, CATEGORIES } from '../components'
import { todayStr, uid } from '../utils'
import type { BookStatus, SearchResult } from '../types'

function statusLabel(s: BookStatus) {
  return s === 'want' ? '읽고 싶어요' : s === 'reading' ? '읽는 중' : '다 읽음'
}

export function Search({ onBack, onAdded }: { onBack: () => void; onAdded: (id: string) => void }) {
  const data = useAppData()
  const { kakaoKey } = data.settings
  const hasKey = hasAladinProxy || !!kakaoKey
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [manualOpen, setManualOpen] = useState(!hasKey)

  // 수동 등록 폼
  const [mTitle, setMTitle] = useState('')
  const [mAuthor, setMAuthor] = useState('')
  const [mPages, setMPages] = useState('')
  const [mCategory, setMCategory] = useState('소설/시/희곡')

  const runSearch = async () => {
    const q = query.trim()
    if (!q || !hasKey) return
    setState('loading')
    setErrMsg('')
    try {
      const res = hasAladinProxy ? await searchAladin(q) : await searchKakao(kakaoKey, q)
      setResults(res)
      setState('done')
    } catch (e) {
      setState('error')
      setErrMsg(e instanceof Error ? e.message : '검색에 실패했어요')
    }
  }

  const addFromResult = async (r: SearchResult, status: BookStatus) => {
    let pages = r.totalPages
    if (!pages && r.source === 'aladin' && hasAladinProxy && /^\d{13}$/.test(r.id)) {
      pages = await lookupAladinPages(r.id)
    }
    const ok = store.addBook({
      id: r.id,
      title: r.title,
      author: r.author,
      publisher: r.publisher,
      coverUrl: r.coverUrl,
      totalPages: pages,
      category: r.category,
      status,
      rating: 0,
      oneLine: '',
      startedAt: status !== 'want' ? todayStr() : undefined,
      finishedAt: status === 'done' ? todayStr() : undefined,
      createdAt: new Date().toISOString(),
    })
    if (!ok) {
      alert('이미 서재에 있는 책이에요.')
      return
    }
    onAdded(r.id)
  }

  const addManual = () => {
    if (!mTitle.trim()) return
    const id = `manual-${uid()}`
    store.addBook({
      id,
      title: mTitle.trim(),
      author: mAuthor.trim() || '저자 미상',
      totalPages: parseInt(mPages, 10) || 0,
      category: mCategory,
      status: 'want',
      rating: 0,
      oneLine: '',
      createdAt: new Date().toISOString(),
    })
    onAdded(id)
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack} aria-label="뒤로">‹</button>
        <h1>책 추가</h1>
        <span />
      </header>

      {hasKey ? (
        <div className="search-row">
          <input
            type="search"
            placeholder="책 제목이나 저자를 검색해 보세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            autoFocus
          />
          <button className="btn btn-green" onClick={runSearch} disabled={state === 'loading'}>
            {state === 'loading' ? '…' : '검색'}
          </button>
        </div>
      ) : (
        <div className="card notice-card">
          <p>
            <b>이 빌드는 검색 서버에 연결되지 않았어요.</b>
            <br />
            아래 직접 입력으로 책을 추가할 수 있어요.
          </p>
        </div>
      )}

      {state === 'error' && <p className="error-msg">검색 실패: {errMsg}</p>}
      {state === 'done' && results.length === 0 && (
        <p className="muted center">검색 결과가 없어요. 다른 검색어로 시도해 보세요.</p>
      )}

      {results.map((r) => (
        <div key={r.id} className="card result-card">
          <BookCover book={{ title: r.title, coverUrl: r.coverUrl }} size="sm" />
          <div className="result-meta">
            <b className="book-title">{r.title}</b>
            <span className="muted small">{r.author} · {r.publisher}</span>
            <div className="result-actions">
              {(['want', 'reading', 'done'] as BookStatus[]).map((s) => (
                <button key={s} className="chip" onClick={() => addFromResult(r, s)}>
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <button className="manual-toggle" onClick={() => setManualOpen(!manualOpen)}>
          직접 입력으로 추가 {manualOpen ? '▾' : '▸'}
        </button>
        {manualOpen && (
          <div className="manual-form">
            <input placeholder="책 제목 (필수)" value={mTitle} onChange={(e) => setMTitle(e.target.value)} />
            <input placeholder="저자" value={mAuthor} onChange={(e) => setMAuthor(e.target.value)} />
            <div className="manual-row">
              <input
                type="number"
                inputMode="numeric"
                placeholder="전체 쪽수"
                value={mPages}
                onChange={(e) => setMPages(e.target.value)}
              />
              <select value={mCategory} onChange={(e) => setMCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-green" onClick={addManual} disabled={!mTitle.trim()}>
              서재에 담기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
