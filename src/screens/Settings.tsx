import { useRef } from 'react'
import { useAppData, store } from '../store'

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
        <h2>책 검색 API 키</h2>
        <p className="muted small">
          키를 등록하면 제목 검색으로 표지·쪽수까지 자동 등록돼요. 키는 이 기기에만 저장됩니다.
        </p>
        <label className="field-label">알라딘 TTB 키 (권장 — 쪽수·카테고리 제공)</label>
        <input
          type="text"
          placeholder="ttb로 시작하는 키"
          defaultValue={data.settings.aladinKey}
          onBlur={(e) => store.setSettings({ aladinKey: e.target.value.trim() })}
        />
        <p className="muted small">
          발급: aladin.co.kr → 알라딘 Open API 신청 (무료, 일 5,000건)
        </p>
        <label className="field-label">카카오 REST API 키 (대안)</label>
        <input
          type="text"
          placeholder="카카오 디벨로퍼스 REST API 키"
          defaultValue={data.settings.kakaoKey}
          onBlur={(e) => store.setSettings({ kakaoKey: e.target.value.trim() })}
        />
        <p className="muted small">발급: developers.kakao.com → 앱 만들기 → REST API 키</p>
      </section>

      <section className="card">
        <h2>데이터</h2>
        <p className="muted small">
          기록은 이 기기(브라우저)에만 저장돼요. 기기를 바꾸기 전에 내보내기로 백업하세요.
        </p>
        <div className="settings-actions">
          <button className="btn btn-outline" onClick={exportData}>내보내기 (백업)</button>
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
        북블룸 v0.1 · 기록이 쌓이면, 습관이 피어나요 🌱
      </p>
    </div>
  )
}
