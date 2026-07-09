/** 독후 질문 카드 — 기억 정착·연결·적용을 돕는 질문 설계 (책 유형별) */

const LITERARY = [
  '가장 오래 마음에 남는 장면은 어디였나요? 왜 그 장면이었을까요?',
  '주인공의 선택 중, 나라면 다르게 했을 것 같은 순간이 있나요?',
  '이 이야기에 새 제목을 붙인다면 뭐라고 짓고 싶나요?',
  '등장인물 한 명에게 편지를 쓴다면, 누구에게 어떤 첫 문장으로 시작할까요?',
  '결말 이후의 하루를 상상해 본다면, 인물들은 무엇을 하고 있을까요?',
  '작가가 끝내 말하지 않고 남겨둔 것은 무엇일까요?',
  '이 책을 색깔 하나로 표현한다면 무슨 색인가요? 이유는요?',
  '소리 내어 읽고 싶었던 문장이 있나요? 옮겨 적어볼까요?',
]

const NONFICTION = [
  '읽기 전과 생각이 달라진 지점이 하나 있다면 무엇인가요?',
  '책의 주장 중 동의하기 어려웠던 부분은 어디였나요?',
  '내일 당장 해볼 수 있는 것 하나를 꼽는다면?',
  '저자에게 딱 하나만 질문할 수 있다면 무엇을 묻고 싶나요?',
  '이 책의 핵심을 한 문장으로 요약한다면?',
  '이 책의 내용이 10년 뒤에도 유효할까요? 왜 그렇게 생각하세요?',
  '이 책에서 가장 의외였던 사실이나 정보는 무엇이었나요?',
  '책의 조언 중 이미 실천하고 있던 것이 있나요?',
]

const COMMON = [
  '이 책을 세 단어로 남긴다면?',
  '읽는 동안 떠올랐던 나의 경험이 있나요?',
  '별점을 매긴다면, 깎인(혹은 더 준) 이유는 무엇인가요?',
  '이 책과 함께 읽으면 좋을 책이 떠오르나요?',
  '밑줄 그은 문장 하나를 옮겨 적고, 그 이유를 한 줄로 남겨볼까요?',
  '6개월 뒤의 나에게 이 책에서 한 줄을 남겨준다면?',
  '이 책을 읽기 전의 나에게 해주고 싶은 말이 있나요?',
  '누구에게 이 책을 권하고 싶나요? 왜요?',
]

const LITERARY_CATS = ['소설/시/희곡', '에세이', '어린이']

export function questionsFor(category: string): string[] {
  const pool = LITERARY_CATS.includes(category) ? LITERARY : NONFICTION
  return [...pool, ...COMMON]
}

/** bookId 기반 결정적 셔플 — 같은 책이면 같은 순서, 버튼으로 순환 */
export function pickQuestion(category: string, bookId: string, index: number): string {
  const list = questionsFor(category)
  let seed = 0
  for (const ch of bookId) seed = (seed * 31 + ch.charCodeAt(0)) % 997
  return list[(seed + index) % list.length]
}
