const FEATURES: Array<{ title: string; desc: string }> = [
  { title: '읽는 책을 한곳에', desc: '읽고 싶은 책 · 읽는 중 · 다 읽음으로 서재를 정리해요' },
  { title: '하루 한 쪽, 습관으로', desc: '오늘 읽은 쪽을 기록하면 연속 기록과 통계가 쌓여요' },
  { title: '남기고, 나누기', desc: '마음에 남은 문장은 카드로 만들어 나눠요' },
]

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <p className="hero-eyebrow">BOOKBLOOM</p>
        <h1 className="welcome-title">
          기록이 쌓이면,<br />습관이 피어나요
        </h1>
        <p className="welcome-sub">가입도 설치도 없이, 오늘 한 쪽부터.</p>

        <ol className="welcome-index">
          {FEATURES.map((f, i) => (
            <li key={f.title}>
              <span className="welcome-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="welcome-idx-text">
                <b>{f.title}</b>
                <span>{f.desc}</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="welcome-actions">
          <button className="welcome-cta btn" onClick={onStart}>
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
