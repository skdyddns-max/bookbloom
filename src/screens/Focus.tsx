import { useEffect, useRef, useState } from 'react'
import { store } from '../store'
import { todayStr, uid, clamp } from '../utils'
import type { Book } from '../types'

const DURATIONS = [10, 15, 20, 30, 45]

/** WebAudio 빗소리 — 필터 노이즈, 외부 파일 없이 생성 */
class Rain {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  start() {
    if (this.ctx) return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const ch = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      // 브라운 노이즈 — 백색보다 부드러운 빗소리 결
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      ch[i] = last * 3.2
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const gain = ctx.createGain()
    gain.gain.value = 0
    src.connect(lp).connect(gain).connect(ctx.destination)
    src.start()
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.2)
    this.ctx = ctx
    this.gain = gain
  }
  stop() {
    if (!this.ctx) return
    const ctx = this.ctx
    this.gain?.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
    setTimeout(() => ctx.close().catch(() => {}), 800)
    this.ctx = null
    this.gain = null
  }
  chime() {
    // 끝날 때 낮은 차임 두 번
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AC()
      const note = (freq: number, at: number) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = freq
        g.gain.setValueAtTime(0, ctx.currentTime + at)
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + at + 0.03)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 1.4)
        o.connect(g).connect(ctx.destination)
        o.start(ctx.currentTime + at)
        o.stop(ctx.currentTime + at + 1.6)
      }
      note(523.25, 0)
      note(659.25, 0.5)
      setTimeout(() => ctx.close().catch(() => {}), 2600)
    } catch { /* noop */ }
  }
}

type Phase = 'pick' | 'run' | 'log'

export function Focus({ book, onClose }: { book: Book; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [minutes, setMinutes] = useState(20)
  const [remain, setRemain] = useState(0) // seconds
  const [rainOn, setRainOn] = useState(false)
  const [page, setPage] = useState('')
  const [elapsedMin, setElapsedMin] = useState(0)
  const endAt = useRef(0)
  const rain = useRef(new Rain())
  const wake = useRef<{ release: () => Promise<void> } | null>(null)

  const total = minutes * 60

  const start = () => {
    endAt.current = Date.now() + minutes * 60_000
    setRemain(minutes * 60)
    setPhase('run')
    // 화면 꺼짐 방지
    ;(navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } })
      .wakeLock?.request('screen').then((l) => { wake.current = l }).catch(() => {})
  }

  const finish = (completed: boolean) => {
    rain.current.stop()
    wake.current?.release().catch(() => {})
    wake.current = null
    if (completed) rain.current.chime()
    setElapsedMin(Math.max(1, Math.round((minutes * 60 - Math.max(0, endAt.current - Date.now()) / 1000) / 60)))
    setPhase('log')
  }

  useEffect(() => {
    if (phase !== 'run') return
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setRemain(left)
      if (left === 0) {
        clearInterval(t)
        finish(true)
      }
    }, 500)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => () => { rain.current.stop(); wake.current?.release().catch(() => {}) }, [])

  const toggleRain = () => {
    if (rainOn) rain.current.stop()
    else rain.current.start()
    setRainOn(!rainOn)
  }

  const saveLog = () => {
    const p = clamp(parseInt(page, 10) || 0, 1, book.totalPages > 0 ? book.totalPages : 99999)
    if (p) {
      store.addLog({ id: uid(), bookId: book.id, page: p, date: todayStr(), createdAt: new Date().toISOString() })
      if (book.totalPages > 0 && p >= book.totalPages) store.completeBook(book.id)
    }
    onClose()
  }

  const mm = String(Math.floor(remain / 60)).padStart(2, '0')
  const ss = String(remain % 60).padStart(2, '0')
  const R = 88
  const CIRC = 2 * Math.PI * R
  const frac = phase === 'run' ? remain / total : 1

  return (
    <div className="focus-overlay">
      {phase !== 'run' && (
        <button className="story-close" onClick={onClose} aria-label="닫기">×</button>
      )}

      {phase === 'pick' && (
        <div className="focus-body">
          <span className="focus-eyebrow">몰입 독서</span>
          <p className="focus-book serif">『{book.title}』</p>
          <p className="focus-sub">방해 없이, 책과 단둘이 있는 시간이에요</p>
          <div className="focus-durations">
            {DURATIONS.map((m) => (
              <button
                key={m}
                className={`focus-chip ${minutes === m ? 'focus-chip-on' : ''}`}
                onClick={() => setMinutes(m)}
              >
                {m}분
              </button>
            ))}
          </div>
          <button className="btn btn-green focus-start" onClick={start}>시작하기</button>
        </div>
      )}

      {phase === 'run' && (
        <div className="focus-body">
          <span className="focus-eyebrow">『{book.title}』</span>
          <div className="focus-ring-wrap">
            <svg viewBox="0 0 200 200" className="focus-ring">
              <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
              <circle
                cx="100" cy="100" r={R} fill="none"
                stroke="#6DBE8A" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - frac)}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 0.5s linear' }}
              />
            </svg>
            <span className="focus-time">{mm}:{ss}</span>
          </div>
          <p className="focus-sub">지금은 책의 시간. 화면은 제가 지키고 있을게요</p>
          <div className="focus-actions">
            <button className={`focus-chip ${rainOn ? 'focus-chip-on' : ''}`} onClick={toggleRain}>
              {rainOn ? '🌧️ 빗소리 끄기' : '🌧️ 빗소리'}
            </button>
            <button
              className="btn-text focus-stop"
              onClick={() => confirm('여기서 마칠까요? 지금까지 읽은 것도 소중해요.') && finish(false)}
            >
              마치기
            </button>
          </div>
        </div>
      )}

      {phase === 'log' && (
        <div className="focus-body">
          <span className="focus-eyebrow">수고했어요</span>
          <p className="focus-done serif">{elapsedMin}분을<br />책과 함께 보냈어요</p>
          <p className="focus-sub">몇 쪽까지 읽으셨나요? 기록하면 결이 쌓여요</p>
          <div className="quicklog-row focus-log">
            <input
              type="number"
              inputMode="numeric"
              placeholder="예: 132"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && page && saveLog()}
              autoFocus
            />
            <button className="btn btn-green btn-sm" onClick={saveLog} disabled={!page}>기록</button>
          </div>
          <button className="btn-text muted" onClick={onClose}>기록 없이 닫기</button>
        </div>
      )}
    </div>
  )
}
