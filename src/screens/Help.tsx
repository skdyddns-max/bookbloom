import { useState } from 'react'
import { OPEN_CHAT_URL } from '../config'

interface Section {
  icon: string
  title: string
  body: string[]
}

const SECTIONS: Section[] = [
  {
    icon: '🌱',
    title: '결은 어떤 앱인가요?',
    body: [
      '읽은 책과 문장, 매일의 한 쪽을 조용히 쌓아가는 독서 기록 공간이에요.',
      '가입도 로그인도 없어요. 기록은 이 기기(브라우저)에 저장돼요.',
      '홈 화면에 추가하면 앱처럼 쓸 수 있어요. (브라우저 메뉴 → 홈 화면에 추가)',
    ],
  },
  {
    icon: '📚',
    title: '책 추가하기',
    body: [
      '아래 탭의 서재 또는 홈에서 “+ 책 추가”를 눌러 제목으로 검색하세요.',
      '제목만 검색하면 표지·쪽수·분야가 자동으로 채워져요. (검색은 알라딘 제공)',
      '상태를 “읽고 싶어요 · 읽는 중 · 다 읽음”으로 바꿀 수 있어요.',
      '검색에 없으면 직접 입력으로도 추가할 수 있어요.',
    ],
  },
  {
    icon: '✍️',
    title: '매일 기록 · 스트릭',
    body: [
      '홈의 “읽는 중” 책에서 오늘 읽은 쪽수를 적으면 진도가 쌓여요.',
      '기록한 날은 연속 기록(스트릭)으로 이어지고, 홈에서 이번 주 현황을 볼 수 있어요.',
      '쪽수를 적은 순간, 지금 읽는 지점에 맞는 “생각 한 조각”이 떠올라요.',
      '며칠 쉬어도 괜찮아요. 오늘 한 쪽이면 다시 이어져요.',
    ],
  },
  {
    icon: '🔖',
    title: '문장 수집 · 사진으로 밑줄 담기',
    body: [
      '책을 열고 아래 “문장 수집 · 메모”에서 마음에 남은 문장을 담아요.',
      '“📷 사진으로 밑줄 담기”를 누르면 책 사진 속 글자를 자동으로 옮겨 적어요(베타).',
      '밝고 평평하게 찍을수록 잘 인식돼요.',
      '모은 문장은 “이번 주 밑줄”과 “문장 수집 챌린지”에 자동으로 반영돼요.',
      '문장마다 예쁜 카드로 저장해 공유할 수 있어요.',
    ],
  },
  {
    icon: '🗓️',
    title: '되돌아보기 · 기록 탭',
    body: [
      '홈에서 “이번 주 밑줄”로 이번 주 모은 문장을 모아 볼 수 있어요.',
      '새로운 한 주가 시작되면 “지난 주 되돌아보기” 카드가 인사해요.',
      '아래 “기록” 탭에는 독서 뱃지·캘린더·분야 분포·연간 결산이 있어요.',
      '설정에서 “주간 되돌아보기 알림”을 켜면 앱을 열 때 지난주 요약을 알려드려요.',
    ],
  },
  {
    icon: '🧭',
    title: '리딩 페르소나',
    body: [
      '“기록” 탭 위쪽에서, 내 기록이 그린 나의 독서 성향을 볼 수 있어요.',
      '설문이 아니라 실제로 읽은 기록에서 유형이 만들어져요.',
      '책을 읽을수록 페르소나는 계속 자라고, 카드로 저장해 공유할 수 있어요.',
    ],
  },
  {
    icon: '🌾',
    title: '결 챌린지',
    body: [
      '“모임” 탭 위쪽에 결이 매달 여는 챌린지가 있어요. 방 없이 누구나 참여해요.',
      '진도는 내 기록에서 자동으로 채워져요(함께읽기 책·문장 수·완독 수 등).',
      '“완주 리더보드”에서 함께하는 사람들의 진도를 볼 수 있어요.',
      '완주하면 축하 카드와 뱃지가 남아요. 홈에서도 이달의 챌린지를 볼 수 있어요.',
    ],
  },
  {
    icon: '🕯️',
    title: '결 사서 (AI 추천)',
    body: [
      '“서재” 탭 아래쪽에 결 사서가 있어요.',
      '“다음 책 추천받기”를 누르면 내 완독 책·별점·성향을 읽고 3권을 골라드려요.',
      '“사서에게 질문하기”로 요즘 기분에 맞는 책 같은 고민도 나눌 수 있어요.',
      '사서 상담은 하루 5회까지예요. 천천히, 필요할 때 찾아주세요.',
    ],
  },
  {
    icon: '💬',
    title: '모임 (함께 읽기)',
    body: [
      '“모임” 탭에서 새 모임을 만들거나 코드로 참여할 수 있어요.',
      '후기·문장·생각을 나누고, 서로의 글에 공감·댓글을 남겨요.',
      '“함께 읽는 책”을 정하면 멤버들의 진도 현황판이 생겨요.',
      '모임 코드를 친구에게 공유하면 같은 방에서 함께 읽어요.',
    ],
  },
  {
    icon: '🔄',
    title: '여러 기기에서 보기 (동기화)',
    body: [
      '설정 → “클라우드 동기화”에서 “동기화 켜기”를 누르면 코드가 만들어져요.',
      '다른 기기 설정에서 그 코드를 입력하면 같은 기록을 이어서 볼 수 있어요.',
      '이메일·비밀번호 없이 코드만 있으면 돼요. 코드는 열쇠이니 아무 데나 공개하지 마세요.',
    ],
  },
  {
    icon: '💾',
    title: '백업 · 데이터',
    body: [
      '기록은 이 기기에 저장돼요. 기기를 바꾸거나 지우면 사라질 수 있어요.',
      '설정 → “데이터”에서 백업(JSON)·서재 CSV를 내보내고, 다시 가져올 수 있어요.',
      '중요한 기록은 가끔 백업해 두면 안심돼요.',
    ],
  },
]

const FAQ: Section[] = [
  {
    icon: '❓',
    title: '자주 묻는 질문',
    body: [
      '가입해야 하나요? — 아니요. 로그인 없이 바로 써요.',
      '돈이 드나요? — 무료예요.',
      '기록은 어디에 저장되나요? — 이 기기(브라우저)에요. 동기화를 켜면 여러 기기에서 봐요.',
      '광고가 있나요? — 없어요. 조용히 읽는 데 집중해요.',
    ],
  },
]

function Accordion({ s, open, onToggle }: { s: Section; open: boolean; onToggle: () => void }) {
  return (
    <div className={`help-item ${open ? 'help-open' : ''}`}>
      <button className="help-head" onClick={onToggle} aria-expanded={open}>
        <span className="help-icon">{s.icon}</span>
        <span className="help-title">{s.title}</span>
        <span className="help-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="help-body">
          {s.body.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Help({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<number>(0)
  const all = [...SECTIONS, ...FAQ]

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack} aria-label="뒤로">‹</button>
        <h1>사용 방법</h1>
        <span />
      </header>

      <div className="card help-intro">
        <p className="serif help-intro-title">결, 이렇게 쓰면 돼요</p>
        <p className="muted small">
          궁금한 항목을 눌러 펼쳐 보세요. 천천히 하나씩 익혀도 충분해요.
        </p>
      </div>

      <div className="help-list">
        {all.map((s, i) => (
          <Accordion key={i} s={s} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
      </div>

      <a className="btn btn-kakao help-openchat" href={OPEN_CHAT_URL} target="_blank" rel="noreferrer">
        💬 더 궁금하면 결 오픈채팅에 물어보세요
      </a>
    </div>
  )
}
