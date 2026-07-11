import { useRef, useState } from 'react'
import { useAppData, store } from '../store'
import { fmtDate } from '../utils'
import { OPEN_CHAT_URL } from '../config'
import {
  syncAvailable, getSyncState, createSync, linkSync, clearSyncState,
} from '../lib/cloudsync'
import {
  notificationsSupported, reviewNotifyOn, enableReviewNotify, disableReviewNotify,
} from '../lib/weekly'

function WeeklyNotify() {
  const [on, setOn] = useState(reviewNotifyOn())
  const [msg, setMsg] = useState('')
  if (!notificationsSupported) return null

  const toggle = async () => {
    if (on) {
      disableReviewNotify()
      setOn(false)
      setMsg('')
    } else {
      const ok = await enableReviewNotify()
      setOn(ok)
      setMsg(ok ? '' : '브라우저에서 알림이 차단돼 있어요. 사이트 알림 권한을 허용해 주세요.')
    }
  }

  return (
    <section className="card">
      <div className="setting-row">
        <div className="setting-row-text">
          <h2>주간 되돌아보기 알림</h2>
          <p className="muted small">
            새로운 한 주가 시작되면, 앱을 열 때 지난주 독서 요약을 살짝 알려드려요.
          </p>
        </div>
        <button
          className={`toggle ${on ? 'toggle-on' : ''}`}
          role="switch"
          aria-checked={on}
          onClick={toggle}
        >
          <span className="toggle-knob" />
        </button>
      </div>
      {msg && <p className="muted small">{msg}</p>}
    </section>
  )
}

function CloudSync() {
  const [state, setState] = useState(getSyncState())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [linking, setLinking] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)

  if (!syncAvailable) return null

  const start = async () => {
    setBusy(true); setErr('')
    try { await createSync(); setState(getSyncState()) }
    catch (e) { setErr(e instanceof Error ? e.message : '실패했어요') }
    finally { setBusy(false) }
  }
  const link = async () => {
    setBusy(true); setErr('')
    try { await linkSync(codeInput); setState(getSyncState()); setLinking(false); setCodeInput('') }
    catch (e) { setErr(e instanceof Error ? e.message : '실패했어요') }
    finally { setBusy(false) }
  }
  const unlink = () => {
    if (confirm('이 기기에서 동기화를 끌까요? (기록은 이 기기에 그대로 남아요)')) {
      clearSyncState(); setState(null)
    }
  }

  return (
    <section className="card">
      <h2>클라우드 동기화</h2>
      {state ? (
        <>
          <p className="muted small">
            동기화 중이에요. 다른 기기 설정에서 아래 코드를 입력하면 같은 기록을 이어서 볼 수 있어요.
          </p>
          <div className="sync-code-box">
            <span className="sync-code">{state.code}</span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(state.code)
                setCopied(true); setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? '복사됨' : '코드 복사'}
            </button>
          </div>
          <button className="btn-text danger" onClick={unlink}>동기화 끄기</button>
        </>
      ) : linking ? (
        <>
          <p className="muted small">다른 기기에서 받은 동기화 코드를 입력하세요.</p>
          <div className="quicklog-row">
            <input
              placeholder="예: 6GX22GZS"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              autoCapitalize="characters"
            />
            <button className="btn btn-green btn-sm" onClick={link} disabled={busy || codeInput.trim().length < 4}>
              {busy ? '…' : '연결'}
            </button>
          </div>
          <button className="btn-text" onClick={() => { setLinking(false); setErr('') }}>취소</button>
        </>
      ) : (
        <>
          <p className="muted small">
            코드 하나로 여러 기기에서 같은 기록을 봐요. 이메일·비밀번호 없이, 코드만 있으면 돼요.
          </p>
          <div className="settings-actions">
            <button className="btn btn-green" onClick={start} disabled={busy}>
              {busy ? '만드는 중…' : '동기화 켜기 (코드 만들기)'}
            </button>
            <button className="btn btn-outline" onClick={() => setLinking(true)}>
              코드로 이 기기 연결하기
            </button>
          </div>
        </>
      )}
      {err && <p className="error-msg">{err}</p>}
    </section>
  )
}

function csvField(v: string | number | undefined): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function Settings() {
  const data = useAppData()
  const importRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bookbloom-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportCsv = () => {
    const header = '제목,저자,출판사,카테고리,상태,별점,한줄평,전체쪽수,시작일,완독일'
    const statusKo = { want: '읽고싶어요', reading: '읽는중', done: '다읽음' } as const
    const rows = data.books.map((b) =>
      [
        b.title, b.author, b.publisher ?? '', b.category, statusKo[b.status],
        b.rating > 0 ? b.rating : '', b.oneLine, b.totalPages > 0 ? b.totalPages : '',
        b.startedAt ? fmtDate(b.startedAt) : '', b.finishedAt ? fmtDate(b.finishedAt) : '',
      ].map(csvField).join(','),
    )
    // BOM: 엑셀에서 한글 깨짐 방지
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bookbloom-서재-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file: File) => {
    const text = await file.text()
    if (store.importJson(text)) alert('데이터를 가져왔어요.')
    else alert('파일 형식이 올바르지 않아요.')
    if (importRef.current) importRef.current.value = ''
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>설정</h1>
        <span />
      </header>

      <section className="card">
        <h2>올해 목표</h2>
        <div className="quicklog-row">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={data.settings.yearlyGoal}
            onBlur={(e) =>
              store.setSettings({ yearlyGoal: Math.max(1, parseInt(e.target.value, 10) || 12) })
            }
          />
          <span className="muted">권</span>
        </div>
      </section>

      <section className="card">
        <h2>책 검색</h2>
        <p className="muted small">
          제목만 검색하면 표지·쪽수·카테고리가 자동으로 등록돼요. 검색 데이터는 알라딘에서
          제공합니다.
        </p>
      </section>

      <section className="card">
        <h2>커뮤니티</h2>
        <p className="muted small">
          오늘의 한 문장, 완독 인증이 오가는 결 오픈채팅방이 있어요. 함께 읽는 이웃을 만나보세요.
        </p>
        <a className="btn btn-kakao" href={OPEN_CHAT_URL} target="_blank" rel="noreferrer">
          💬 카카오 오픈채팅 참여하기
        </a>
      </section>

      <CloudSync />

      <WeeklyNotify />

      <section className="card">
        <h2>데이터</h2>
        <p className="muted small">
          기록은 이 기기(브라우저)에 저장돼요. 여러 기기에서 보려면 위 클라우드 동기화를, 백업은 아래 내보내기를 이용하세요.
        </p>
        <div className="settings-actions">
          <button className="btn btn-outline" onClick={exportData}>내보내기 (백업 JSON)</button>
          <button className="btn btn-outline" onClick={exportCsv}>서재 CSV 내보내기 (엑셀용)</button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          />
          <button className="btn btn-outline" onClick={() => importRef.current?.click()}>
            가져오기 (복원)
          </button>
          <button
            className="btn btn-outline danger-outline"
            onClick={() => {
              if (confirm('모든 기록이 삭제됩니다. 정말 초기화할까요?')) store.reset()
            }}
          >
            전체 초기화
          </button>
        </div>
      </section>

      <p className="muted small center">
        결 v0.30 · 한 줄씩, 나의 결이 쌓여요 🌱
      </p>
    </div>
  )
}
