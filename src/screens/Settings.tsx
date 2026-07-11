import { useRef } from 'react'
import { useAppData, store } from '../store'
import { fmtDate } from '../utils'
import { OPEN_CHAT_URL } from '../config'

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

      <section className="card">
        <h2>데이터</h2>
        <p className="muted small">
          기록은 이 기기(브라우저)에만 저장돼요. 기기를 바꾸기 전에 내보내기로 백업하세요.
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
        결 v0.23 · 한 줄씩, 나의 결이 쌓여요 🌱
      </p>
    </div>
  )
}
