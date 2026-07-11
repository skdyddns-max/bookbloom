import { useEffect, useState } from 'react'
import { useAppData } from '../store'
import { todayStr } from '../utils'
import {
  activeChallenges, challengeProgress, challengeApi, isJoined, recordCompletion, getPid,
  type Challenge, type ChallengeStats,
} from '../lib/challenges'
import { getGroupSession } from '../lib/group'
import { makeChallengeCard, ensureCardFonts } from '../lib/sharecard'

function ChallengeCard({ c }: { c: Challenge }) {
  const data = useAppData()
  const prog = challengeProgress(c, data)
  const [joined, setJoinedState] = useState(isJoined(c.id))
  const [stats, setStats] = useState<ChallengeStats | null>(null)
  const [busy, setBusy] = useState(false)
  const [showBoard, setShowBoard] = useState(false)
  const myPid = getPid()

  useEffect(() => {
    let alive = true
    challengeApi.stats(c.id).then((s) => alive && setStats(s))
    return () => { alive = false }
  }, [c.id])

  // 참여 중이면 진도를 서버에 반영(소셜 완주 집계) + 완주 시 뱃지 영구 기록
  useEffect(() => {
    if (joined) challengeApi.progress(c, prog).then((s) => s && setStats(s))
    if (prog.done) recordCompletion(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, prog.value, prog.done])

  const join = async () => {
    setBusy(true)
    const nick = getGroupSession()?.nickname ?? ''
    const s = await challengeApi.join(c, nick)
    setJoinedState(true)
    if (s) setStats(s)
    setBusy(false)
  }
  const leave = async () => {
    if (!confirm('이 챌린지에서 빠질까요? (내 기록은 그대로예요)')) return
    setBusy(true)
    const s = await challengeApi.leave(c)
    setJoinedState(false)
    if (s) setStats(s)
    setBusy(false)
  }

  const saveCard = async () => {
    await ensureCardFonts()
    const valueLabel =
      c.kind === 'book' ? '완독 🎉' : `${prog.value}${prog.unit} 달성`
    const url = makeChallengeCard({ emoji: c.emoji, title: c.title, cheer: c.cheer, valueLabel })
    const a = document.createElement('a')
    a.href = url
    a.download = '결-챌린지-완주.png'
    a.click()
  }

  const dday = Math.ceil((new Date(c.end + 'T23:59:59').getTime() - Date.now()) / 86400000)

  return (
    <div className={`card challenge-card ${prog.done ? 'challenge-done' : ''}`}>
      <div className="challenge-head">
        <span className="challenge-emoji">{c.emoji}</span>
        <div className="challenge-head-meta">
          <b className="challenge-title serif">{c.title}</b>
          <span className="muted small">{c.subtitle}</span>
        </div>
        {dday >= 0 && <span className="challenge-dday">{dday === 0 ? '오늘까지' : `D-${dday}`}</span>}
      </div>

      <div className="challenge-progress">
        <div className="challenge-bar">
          <div className="challenge-bar-fill" style={{ width: `${prog.pct}%` }} />
        </div>
        <span className="challenge-num">
          {prog.done ? '완주 🎉' : c.kind === 'book' ? `${prog.value}%` : `${prog.value} / ${prog.target}${prog.unit}`}
        </span>
      </div>

      <div className="challenge-foot">
        <span className="muted small challenge-social">
          {stats && stats.count > 0
            ? `${stats.count}명이 함께 읽고 있어요${stats.done_count > 0 ? ` · ${stats.done_count}명 완주` : ''}`
            : '가장 먼저 함께해요'}
        </span>
        {!joined ? (
          <button className="btn btn-green btn-sm" onClick={join} disabled={busy}>참여하기</button>
        ) : prog.done ? (
          <button className="btn btn-green btn-sm" onClick={saveCard}>완주 카드 저장</button>
        ) : (
          <button className="btn-text muted challenge-leave" onClick={leave}>참여 중 · 빠지기</button>
        )}
      </div>

      {stats && stats.board && stats.board.length > 0 && (
        <div className="challenge-board-wrap">
          <button className="btn-text challenge-board-toggle" onClick={() => setShowBoard((v) => !v)}>
            🏅 완주 리더보드 {showBoard ? '숨기기' : `보기 (${stats.count}명)`}
          </button>
          {showBoard && (
            <ol className="challenge-board">
              {stats.board.map((row, i) => {
                const me = row.pid === myPid
                const label = row.done
                  ? '완주 🎉'
                  : c.kind === 'book'
                    ? `${row.progress}%`
                    : `${row.progress}/${row.target}`
                return (
                  <li key={row.pid || i} className={`board-row ${me ? 'board-me' : ''} ${row.done ? 'board-done' : ''}`}>
                    <span className="board-rank">{i + 1}</span>
                    <span className="board-nick">{row.nickname || '익명의 독자'}{me ? ' · 나' : ''}</span>
                    <span className="board-val">{label}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

export function ChallengeSection() {
  const list = activeChallenges(todayStr())
  if (list.length === 0) return null
  return (
    <section className="challenge-section">
      <div className="section-title-row">
        <h2>결 챌린지</h2>
        <span className="muted small">함께 읽는 이달의 결</span>
      </div>
      {list.map((c) => (
        <ChallengeCard key={c.id} c={c} />
      ))}
    </section>
  )
}
