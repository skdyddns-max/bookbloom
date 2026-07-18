// 사용 방법(매뉴얼) 시트 — 처음 쓰는 보호자를 위한 안내.
// 안심 톤 존댓말, 짧은 문단, 이모지 소제목으로 훑어보기 쉽게 구성합니다.

type Props = {
  onClose: () => void
}

export function HelpSheet({ onClose }: Props) {
  return (
    <div className="aac-sheet-backdrop" onClick={onClose}>
      <div
        className="aac-sheet"
        role="dialog"
        aria-label="사용 방법"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aac-sheet-head">
          <h2>📖 사용 방법</h2>
          <button className="aac-iconbtn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="aac-sheet-body aac-help">
          <section>
            <h3>💚 마음말은요</h3>
            <p>
              말로 표현하기 어려운 아이가 <b>카드를 눌러 마음을 전하는 도구</b>예요. 카드를
              누르면 기기가 대신 말해 줘요. 조용한 색과 큰 글자로, 감각이 예민한 아이도
              편안하게 쓸 수 있게 만들었어요.
            </p>
          </section>

          <section>
            <h3>👆 기본 사용</h3>
            <p>
              카드를 누르면 바로 말해요. 예를 들어 <b>‘물’</b> 카드를 누르면 “물
              주세요”라고 말해 줘요.
            </p>
            <p>
              위쪽의 <b>자주 · 마음 · 먹을거</b> 같은 탭을 누르면 다른 종류의 카드로
              바뀌어요. 많이 쓴 카드는 자연스럽게 위쪽으로 와요.
            </p>
          </section>

          <section>
            <h3>🧩 문장 만들기</h3>
            <p>
              설정에서 <b>‘문장 만들기’</b>를 켜면, 카드를 여러 장 골라 이어 붙인 뒤{' '}
              <b>▶ 말하기</b>를 눌러 한 문장으로 말할 수 있어요. 예: ‘더’ + ‘주세요’ → “더
              주세요”.
            </p>
          </section>

          <section>
            <h3>🔊 소리 조절</h3>
            <p>
              화면 맨 위 <b>스피커 버튼</b>을 누르면 소리 크기 바가 나와요. 시끄러운 곳,
              조용한 곳 어디서든 바로 조절할 수 있어요.
            </p>
          </section>

          <section>
            <h3>🔒 사용 잠금</h3>
            <p>
              <b>🔓 버튼</b>을 누르면 잠겨요. 잠긴 동안엔 카드 말하기만 할 수 있어서,
              아이가 실수로 설정을 바꾸거나 다른 화면으로 가지 않아요.
            </p>
            <p>
              풀 때는 <b>🔒를 3초간 꾹</b> 눌러 주세요. 짧게 누르면 풀리지 않아요.
            </p>
            <p>
              휴대폰 홈 화면까지 못 나가게 하려면: 아이폰은 <b>사용법 유도</b>(설정 &gt;
              손쉬운 사용), 안드로이드는 <b>앱 고정</b>(설정 &gt; 보안)을 함께 켜 주세요.
            </p>
          </section>

          <section>
            <h3>✏️ 카드 편집 (보호자)</h3>
            <p>
              <b>✏️ 버튼을 길게</b> 누르면 편집이 열려요. 카드를 <b>숨기거나</b>, 새 카드를{' '}
              <b>추가</b>할 수 있어요.
            </p>
            <p>
              카드를 추가할 때 <b>📷 사진</b>을 넣으면 진짜 가족·물건 사진 카드가 돼요.
              아이가 알아보기 훨씬 쉬워요. ‘말할 문장’을 적으면 그 문장을 말해 줘요.
            </p>
          </section>

          <section>
            <h3>⚙️ 설정 (보호자)</h3>
            <p>
              <b>⚙️ 버튼을 길게</b> 누르면 설정이 열려요. 화면 색(차분·종이·어둑),{' '}
              <b>선명하게(고대비)</b>, 글자 크기, 말 속도를 아이에게 맞게 바꿀 수 있어요.
            </p>
            <p>
              <b>일레븐랩스</b> 음성을 연결하면 더 자연스러운 목소리로 말해요. 설정 &gt;
              목소리 종류에서 API 키를 넣고, <b>‘모든 카드 미리 만들기’</b>를 눌러 두면
              인터넷이 없어도 바로바로 말해요.
            </p>
          </section>

          <section>
            <h3>🔐 데이터는 안전해요</h3>
            <p>
              카드, 사진, 설정, 사용 기록은 <b>모두 이 기기에만</b> 저장돼요. 서버로
              보내지 않고, 회원가입도 필요 없어요.
            </p>
          </section>

          <button className="aac-primarybtn aac-help-close" onClick={onClose}>
            알겠어요
          </button>
        </div>
      </div>
    </div>
  )
}

// 첫 실행 환영 화면 — 한 번만 표시
export function Welcome({
  onStart,
  onOpenHelp,
}: {
  onStart: () => void
  onOpenHelp: () => void
}) {
  return (
    <div className="aac-welcome" role="dialog" aria-label="마음말 시작하기">
      <div className="aac-welcome-card">
        <div className="aac-welcome-logo" aria-hidden>💚</div>
        <h2>마음말에 온 걸 환영해요</h2>
        <p>
          카드를 누르면 아이의 마음을 대신 말해 줘요.
          <br />
          천천히, 편한 속도로 시작해 보세요.
        </p>
        <div className="aac-welcome-btns">
          <button className="aac-primarybtn" onClick={onOpenHelp}>
            📖 사용 방법 보기
          </button>
          <button className="aac-ghostbtn" onClick={onStart}>
            바로 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
