import { useEffect, useState } from 'react'
import { useAppData } from '../store'
import { hasSupabase } from '../lib/supabase'
import {
  groupApi, getGroupSession, clearGroupSession, takePostDraft,
  type GroupSession, type FeedPost, type PostDraft, type RoomBook,
} from '../lib/group'
import { StarRating } from '../components'
import { clamp } from '../utils'
import { OPEN_CHAT_URL } from '../config'

const KIND_LABEL = { review: '후기', quote: '문장', thought: '생각' } as const

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function JoinOrCreate({ onDone }: { onDone: (s: GroupSession) => void }) {
  const [mode, setMode] = useState<'join' | 'create'>('join')
  const [code, setCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      const s =
        mode === 'join'
          ? await groupApi.joinRoom(code, nickname)
          : await groupApi.createRoom(roomName, nickname)
      onDone(s)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패했어요')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = nickname.trim().length > 0 && (mode === 'join' ? code.trim().length >= 4 : roomName.trim().length > 0)

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>모임</h1>
        <span />
      </header>

      <div className="card group-intro">
        <p className="group-intro-title serif">같이 읽으면,<br />더 멀리 갑니다</p>
        <p className="muted small">
          독서모임 멤버들과 후기·문장·생각을 나누는 공간이에요. 방 코드 하나로 함께 시작해요.
        </p>
      </div>

      <a className="btn btn-kakao" href={OPEN_CHAT_URL} target="_blank" rel="noreferrer">
        💬 아직 모임이 없다면? 북블룸 오픈채팅 구경하기
      </a>

      <div className="seg">
        <button className={`seg-btn ${mode === 'join' ? 'seg-btn-on' : ''}`} onClick={() => setMode('join')}>
          코드로 참여
        </button>
        <button className={`seg-btn ${mode === 'create' ? 'seg-btn-on' : ''}`} onClick={() => setMode('create')}>
          새 모임 만들기
        </button>
      </div>

      <div className="card manual-form">
        {mode === 'join' ? (
          <>
            <label className="field-label">모임 코드</label>
            <input
              placeholder="예: ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
            />
          </>
        ) : (
          <>
            <label className="field-label">모임 이름</label>
            <input placeholder="예: 리딩유" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          </>
        )}
        <label className="field-label">내 닉네임</label>
        <input placeholder="모임에서 쓸 이름" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        {err && <p className="error-msg">{err}</p>}
        <button className="btn btn-green" onClick={submit} disabled={!canSubmit || busy}>
          {busy ? '연결 중…' : mode === 'join' ? '참여하기' : '만들기'}
        </button>
      </div>
    </div>
  )
}

function RoomBookCard({
  session,
  roomBook,
  onChanged,
}: {
  session: GroupSession
  roomBook: RoomBook | null
  onChanged: () => void
}) {
  const data = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [bookId, setBookId] = useState('')
  const [title, setTitle] = useState('')
  const [pages, setPages] = useState('')
  const [due, setDue] = useState('')
  const [myPage, setMyPage] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      onChanged()
    } catch (e) {
      alert(e instanceof Error ? e.message : '실패했어요')
    } finally {
      setBusy(false)
    }
  }

  const submitBook = () => {
    const book = data.books.find((b) => b.id === bookId)
    const t = book ? book.title : title.trim()
    if (!t) return
    act(() =>
      groupApi.setRoomBook(session, {
        title: t,
        author: book?.author ?? '',
        coverUrl: book?.coverUrl ?? '',
        totalPages: book?.totalPages || parseInt(pages, 10) || 0,
        dueDate: due || null,
      }),
    ).then(() => {
      setFormOpen(false)
      setBookId('')
      setTitle('')
      setPages('')
      setDue('')
    })
  }

  if (!roomBook) {
    return (
      <div className="card roombook-empty">
        {formOpen ? (
          <div className="manual-form">
            <b>함께 읽을 책 정하기</b>
            <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">내 서재에서 선택</option>
              {data.books.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
            {!bookId && (
              <>
                <input placeholder="책 제목 직접 입력" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input type="number" inputMode="numeric" placeholder="전체 쪽수 (선택)" value={pages} onChange={(e) => setPages(e.target.value)} />
              </>
            )}
            <label className="field-label">목표일 (선택)</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            <div className="note-actions">
              <button className="btn-text" onClick={() => setFormOpen(false)}>닫기</button>
              <button className="btn btn-green btn-sm" onClick={submitBook} disabled={busy || (!bookId && !title.trim())}>
                이 책으로 시작
              </button>
            </div>
          </div>
        ) : (
          <div className="roombook-empty-row">
            <span className="muted small">이달의 책을 정하면 멤버 진도 현황판이 생겨요</span>
            <button className="btn btn-outline btn-sm" onClick={() => setFormOpen(true)}>책 정하기</button>
          </div>
        )}
      </div>
    )
  }

  const dday = roomBook.due_date
    ? Math.ceil((new Date(roomBook.due_date + 'T00:00:00').getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="card roombook-card">
      <div className="roombook-head">
        <span className="roombook-label">📚 함께 읽는 책</span>
        {dday !== null && (
          <span className="roombook-dday">{dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : '기한 지남'}</span>
        )}
      </div>
      <b className="roombook-title serif">{roomBook.book_title}</b>
      {roomBook.book_author && <span className="roombook-author">{roomBook.book_author}</span>}

      <div className="roombook-progress">
        {roomBook.progress.map((p) => {
          const pct = roomBook.total_pages > 0 ? clamp(Math.round((p.page / roomBook.total_pages) * 100), 0, 100) : 0
          const done = roomBook.total_pages > 0 && p.page >= roomBook.total_pages
          return (
            <div key={p.member_id} className="roombook-row">
              <span className={`roombook-nick ${p.member_id === session.memberId ? 'me' : ''}`}>
                {p.nickname}
              </span>
              <div className="roombook-bar">
                <div className="roombook-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="roombook-num">
                {done ? '완독 🎉' : roomBook.total_pages > 0 ? `${pct}%` : `${p.page}쪽`}
              </span>
            </div>
          )
        })}
      </div>

      <div className="quicklog-row">
        <input
          type="number"
          inputMode="numeric"
          placeholder="내가 읽은 쪽수까지 입력"
          value={myPage}
          onChange={(e) => setMyPage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && myPage) {
              act(() => groupApi.updateRoomProgress(session, roomBook.id, parseInt(myPage, 10) || 0))
              setMyPage('')
            }
          }}
        />
        <button
          className="btn btn-green btn-sm"
          disabled={busy || !myPage}
          onClick={() => {
            act(() => groupApi.updateRoomProgress(session, roomBook.id, parseInt(myPage, 10) || 0))
            setMyPage('')
          }}
        >
          기록
        </button>
      </div>
      <button
        className="btn-text roombook-close"
        onClick={() => confirm('함께 읽기를 마칠까요? (기록은 남아요)') && act(() => groupApi.closeRoomBook(session, roomBook.id))}
      >
        함께 읽기 마치기
      </button>
    </div>
  )
}

function Composer({
  session,
  onPosted,
  draft,
}: {
  session: GroupSession
  onPosted: () => void
  draft: Partial<PostDraft> | null
}) {
  const data = useAppData()
  const [kind, setKind] = useState<PostDraft['kind']>(draft?.kind ?? 'thought')
  const [content, setContent] = useState(draft?.content ?? '')
  const [bookId, setBookId] = useState('')
  const [manualTitle, setManualTitle] = useState(draft?.bookTitle ?? '')
  const [rating, setRating] = useState(draft?.rating ?? 0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(!!draft)

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      const book = data.books.find((b) => b.id === bookId)
      await groupApi.createPost(session, {
        bookTitle: book ? book.title : manualTitle.trim(),
        bookAuthor: book ? book.author : '',
        coverUrl: book?.coverUrl ?? draft?.coverUrl ?? '',
        kind,
        content: content.trim(),
        rating: kind === 'review' ? rating : 0,
      })
      setContent('')
      setManualTitle('')
      setBookId('')
      setRating(0)
      setOpen(false)
      onPosted()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패했어요')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button className="card composer-closed" onClick={() => setOpen(true)}>
        <span className="muted">읽고 느낀 것을 모임에 남겨보세요…</span>
      </button>
    )
  }

  return (
    <div className="card manual-form">
      <div className="seg seg-sm">
        {(Object.keys(KIND_LABEL) as Array<PostDraft['kind']>).map((k) => (
          <button key={k} className={`seg-btn ${kind === k ? 'seg-btn-on' : ''}`} onClick={() => setKind(k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="manual-row">
        <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
          <option value="">책 선택 (내 서재)</option>
          {data.books.map((b) => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>
      </div>
      {!bookId && (
        <input placeholder="책 제목 직접 입력 (선택)" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
      )}
      {kind === 'review' && <StarRating value={rating} onChange={setRating} />}
      <textarea
        rows={3}
        placeholder={kind === 'quote' ? '나누고 싶은 문장을 옮겨 적어보세요' : kind === 'review' ? '이 책, 어땠나요?' : '요즘 읽으며 드는 생각을 편하게'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {err && <p className="error-msg">{err}</p>}
      <div className="note-actions">
        <button className="btn-text" onClick={() => setOpen(false)}>닫기</button>
        <button className="btn btn-green btn-sm" onClick={submit} disabled={busy || !content.trim()}>
          {busy ? '올리는 중…' : '모임에 올리기'}
        </button>
      </div>
    </div>
  )
}

function PostCard({
  post,
  session,
  onChanged,
}: {
  post: FeedPost
  session: GroupSession
  onChanged: () => void
}) {
  const [commentOpen, setCommentOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = post.member_id === session.memberId
  const liked = post.liked_by.includes(session.memberId)

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      onChanged()
    } catch (e) {
      alert(e instanceof Error ? e.message : '실패했어요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card post-card">
      <div className="post-head">
        <span className="post-avatar" aria-hidden="true">{post.nickname.slice(0, 1)}</span>
        <div className="post-head-meta">
          <b>{post.nickname}</b>
          <span className="muted small">{timeAgo(post.created_at)} · {KIND_LABEL[post.kind]}</span>
        </div>
        {mine && (
          <button
            className="btn-text danger"
            onClick={() => confirm('이 글을 삭제할까요?') && act(() => groupApi.deletePost(session, post.id))}
          >
            삭제
          </button>
        )}
      </div>

      {post.book_title && (
        <div className="post-book-chip">
          📖 {post.book_title}
          {post.rating > 0 && <span className="post-rating">★ {post.rating}</span>}
        </div>
      )}

      <p className={`post-content ${post.kind === 'quote' ? 'post-content-quote serif' : ''}`}>
        {post.kind === 'quote' ? `“${post.content}”` : post.content}
      </p>

      <div className="post-actions">
        <button
          className={`post-action ${liked ? 'post-action-on' : ''}`}
          disabled={busy}
          onClick={() => act(() => groupApi.toggleLike(session, post.id))}
        >
          ♥ {post.likes > 0 ? post.likes : '공감'}
        </button>
        <button className="post-action" onClick={() => setCommentOpen(!commentOpen)}>
          💬 {post.comments.length > 0 ? post.comments.length : '댓글'}
        </button>
      </div>

      {(commentOpen || post.comments.length > 0) && (
        <div className="post-comments">
          {post.comments.map((c) => (
            <div key={c.id} className="post-comment">
              <b>{c.nickname}</b>
              <span>{c.content}</span>
              {c.member_id === session.memberId && (
                <button className="btn-text danger" onClick={() => act(() => groupApi.deleteComment(session, c.id))}>×</button>
              )}
            </div>
          ))}
          {commentOpen && (
            <div className="quicklog-row">
              <input
                placeholder="따뜻한 한마디"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && comment.trim()) {
                    act(() => groupApi.createComment(session, post.id, comment.trim()))
                    setComment('')
                  }
                }}
              />
              <button
                className="btn btn-green btn-sm"
                disabled={busy || !comment.trim()}
                onClick={() => {
                  act(() => groupApi.createComment(session, post.id, comment.trim()))
                  setComment('')
                }}
              >
                등록
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Group() {
  const [session, setSession] = useState<GroupSession | null>(getGroupSession)
  const [feed, setFeed] = useState<FeedPost[] | null>(null)
  const [roomBook, setRoomBook] = useState<RoomBook | null>(null)
  const [err, setErr] = useState('')
  const [draft] = useState(takePostDraft)

  const refresh = async (s = session) => {
    if (!s) return
    try {
      setErr('')
      const [f, rb] = await Promise.all([groupApi.getFeed(s.roomId), groupApi.getRoomBook(s.roomId)])
      setFeed(f)
      setRoomBook(rb)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '피드를 불러오지 못했어요')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.roomId])

  if (!hasSupabase) {
    return (
      <div className="screen">
        <header className="screen-header"><h1>모임</h1><span /></header>
        <div className="card notice-card">
          <p>모임 기능은 곧 열려요. 조금만 기다려 주세요!</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <JoinOrCreate onDone={(s) => { setSession(s); refresh(s) }} />
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>{session.roomName}</h1>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            navigator.clipboard?.writeText(session.code)
            alert(`모임 코드 ${session.code}를 복사했어요. 멤버들에게 공유해 주세요!`)
          }}
        >
          코드 {session.code}
        </button>
      </header>
      <p className="muted small group-sub">
        {session.nickname}(으)로 참여 중 ·{' '}
        <button
          className="btn-text danger group-leave"
          onClick={() => {
            if (confirm('이 기기에서 모임 연결을 해제할까요? (글은 남아있어요)')) {
              clearGroupSession()
              setSession(null)
              setFeed(null)
              setRoomBook(null)
            }
          }}
        >
          나가기
        </button>
      </p>

      <RoomBookCard session={session} roomBook={roomBook} onChanged={() => refresh()} />

      <Composer session={session} onPosted={() => refresh()} draft={draft} />

      {err && <p className="error-msg">{err}</p>}
      {feed === null && !err && <p className="muted center small">불러오는 중…</p>}
      {feed !== null && feed.length === 0 && (
        <div className="card empty-card">
          <p>아직 글이 없어요.<br />첫 후기를 남겨 모임을 열어보세요!</p>
        </div>
      )}
      {feed?.map((p) => (
        <PostCard key={p.id} post={p} session={session} onChanged={() => refresh()} />
      ))}

      <button className="btn-text center group-refresh" onClick={() => refresh()}>
        ↺ 새로고침
      </button>
      <a className="btn-text center group-openchat" href={OPEN_CHAT_URL} target="_blank" rel="noreferrer">
        💬 북블룸 오픈채팅방에서 더 많은 이웃 만나기
      </a>
    </div>
  )
}
