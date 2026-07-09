const FEATURES: Array<{ title: string; desc: string; path: string }> = [
  {
    title: '읽는 책을 한곳에',
    desc: '읽고 싶은 책 · 읽는 중 · 다 읽음으로 서재를 정리해요',
    path: 'M4 5h5a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4zM20 5h-5a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h5z',
  },
  {
    title: '하루 한 쪽, 습관으로',
    desc: '오늘 읽은 쪽을 기록하면 연속 기록과 통계가 쌓여요',
    path: 'M4 20V10m5.5 10V4m5.5 16v-7m5.5 7V7',
  },
  {
    title: '남기고, 나누기',
    desc: '마음에 남은 문장은 사진으로 담고, 완독 카드로 나눠요',
    path: 'M12 21s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 3.5C19 16.5 12 21 12 21z',
  },
]

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <p className="hero-eyebrow">BOOKBLOOM</p>
        <h1 className="welcome-title serif">
          기록이 쌓이면,<br />습관이 피어나요
        </h1>
        <p className="welcome-sub">가입도 설치도 없이, 오늘 한 쪽부터.</p>

        <ul className="welcome-features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={f.path} />
              </svg>
              <div>
                <b>{f.title}</b>
                <span>{f.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="welcome-actions">
          <button className="btn btn-green welcome-cta" onClick={onStart}>
            첫 책 담고 시작하기
          </button>
          <button className="btn-text welcome-skip" onClick={onSkip}>
            먼저 둘러볼게요
          </button>
        </div>

        <p className="welcome-note">
          기록은 지금 이 기기(브라우저)에 저장돼요. 설정에서 언제든 백업할 수 있어요.
        </p>
      </div>
    </div>
  )
}
