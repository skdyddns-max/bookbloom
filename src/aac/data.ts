// AAC 기본 어휘 — 자폐스펙트럼 아동의 핵심 의사소통(요구·거절·감정·기본 욕구) 중심.
// 각 카드는 이모지 아이콘 + 큰 한글 낱말. speak가 없으면 label을 그대로 말합니다.

export type Card = {
  id: string
  label: string // 카드에 보이는 낱말
  emoji?: string // 이모지 아이콘(사진이 없을 때 표시)
  image?: string // 사용자 사진 id(IndexedDB aac_images). 있으면 사진을 우선 표시
  speak?: string // 실제로 말할 문장(없으면 label)
  categoryId: string
}

export type Category = {
  id: string
  name: string
  emoji: string
}

export const CATEGORIES: Category[] = [
  { id: 'core', name: '자주', emoji: '⭐' },
  { id: 'feel', name: '마음', emoji: '💗' },
  { id: 'food', name: '먹을거', emoji: '🍚' },
  { id: 'do', name: '하고파', emoji: '🎨' },
  { id: 'people', name: '사람', emoji: '👨‍👩‍👧' },
  { id: 'place', name: '장소', emoji: '🏠' },
  { id: 'body', name: '몸', emoji: '🩹' },
]

export const DEFAULT_CARDS: Card[] = [
  // 자주 쓰는 핵심 어휘 (요구·거절·조절)
  { id: 'yes', label: '네', emoji: '⭕', categoryId: 'core' },
  { id: 'no', label: '아니요', emoji: '❌', categoryId: 'core' },
  { id: 'want', label: '주세요', emoji: '🙏', speak: '주세요', categoryId: 'core' },
  { id: 'more', label: '더', emoji: '➕', speak: '더 주세요', categoryId: 'core' },
  { id: 'stop', label: '그만', emoji: '✋', speak: '그만할래요', categoryId: 'core' },
  { id: 'help', label: '도와줘', emoji: '🆘', speak: '도와주세요', categoryId: 'core' },
  { id: 'wait', label: '기다려요', emoji: '⏳', speak: '잠깐 기다려요', categoryId: 'core' },
  { id: 'done', label: '다 했어', emoji: '🏁', speak: '다 했어요', categoryId: 'core' },
  { id: 'like', label: '좋아', emoji: '👍', speak: '좋아요', categoryId: 'core' },
  { id: 'dislike', label: '싫어', emoji: '👎', speak: '싫어요', categoryId: 'core' },
  { id: 'thanks', label: '고마워', emoji: '💐', speak: '고마워요', categoryId: 'core' },
  { id: 'toilet', label: '화장실', emoji: '🚻', speak: '화장실 가고 싶어요', categoryId: 'core' },

  // 마음(감정)
  { id: 'happy', label: '기뻐', emoji: '😊', speak: '기뻐요', categoryId: 'feel' },
  { id: 'sad', label: '슬퍼', emoji: '😢', speak: '슬퍼요', categoryId: 'feel' },
  { id: 'angry', label: '화나', emoji: '😠', speak: '화가 나요', categoryId: 'feel' },
  { id: 'scared', label: '무서워', emoji: '😨', speak: '무서워요', categoryId: 'feel' },
  { id: 'tired', label: '피곤해', emoji: '😴', speak: '피곤해요', categoryId: 'feel' },
  { id: 'calm', label: '편안해', emoji: '🌿', speak: '편안해요', categoryId: 'feel' },
  { id: 'loud', label: '너무 시끄러워', emoji: '🔊', speak: '너무 시끄러워요', categoryId: 'feel' },
  { id: 'bright', label: '너무 밝아', emoji: '☀️', speak: '너무 밝아요', categoryId: 'feel' },

  // 먹을거
  { id: 'water', label: '물', emoji: '💧', speak: '물 주세요', categoryId: 'food' },
  { id: 'milk', label: '우유', emoji: '🥛', speak: '우유 주세요', categoryId: 'food' },
  { id: 'rice', label: '밥', emoji: '🍚', speak: '밥 먹을래요', categoryId: 'food' },
  { id: 'bread', label: '빵', emoji: '🍞', speak: '빵 먹고 싶어요', categoryId: 'food' },
  { id: 'fruit', label: '과일', emoji: '🍎', speak: '과일 먹고 싶어요', categoryId: 'food' },
  { id: 'snack', label: '과자', emoji: '🍪', speak: '과자 먹고 싶어요', categoryId: 'food' },
  { id: 'hungry', label: '배고파', emoji: '🍽️', speak: '배고파요', categoryId: 'food' },
  { id: 'thirsty', label: '목말라', emoji: '🥤', speak: '목말라요', categoryId: 'food' },

  // 하고파(활동)
  { id: 'play', label: '놀아요', emoji: '🧸', speak: '놀고 싶어요', categoryId: 'do' },
  { id: 'sleep', label: '자요', emoji: '🛏️', speak: '자고 싶어요', categoryId: 'do' },
  { id: 'walk', label: '산책', emoji: '🚶', speak: '산책 가고 싶어요', categoryId: 'do' },
  { id: 'book', label: '책', emoji: '📖', speak: '책 볼래요', categoryId: 'do' },
  { id: 'draw', label: '그림', emoji: '🖍️', speak: '그림 그릴래요', categoryId: 'do' },
  { id: 'music', label: '음악', emoji: '🎵', speak: '음악 듣고 싶어요', categoryId: 'do' },
  { id: 'tv', label: '티비', emoji: '📺', speak: '티비 보고 싶어요', categoryId: 'do' },
  { id: 'outside', label: '밖에', emoji: '🌳', speak: '밖에 나가고 싶어요', categoryId: 'do' },

  // 사람
  { id: 'mom', label: '엄마', emoji: '👩', categoryId: 'people' },
  { id: 'dad', label: '아빠', emoji: '👨', categoryId: 'people' },
  { id: 'me', label: '나', emoji: '🙋', categoryId: 'people' },
  { id: 'teacher', label: '선생님', emoji: '👩‍🏫', categoryId: 'people' },
  { id: 'friend', label: '친구', emoji: '🧒', categoryId: 'people' },
  { id: 'grandma', label: '할머니', emoji: '👵', categoryId: 'people' },
  { id: 'grandpa', label: '할아버지', emoji: '👴', categoryId: 'people' },

  // 장소
  { id: 'home', label: '집', emoji: '🏠', speak: '집에 가고 싶어요', categoryId: 'place' },
  { id: 'school', label: '학교', emoji: '🏫', speak: '학교에 가고 싶어요', categoryId: 'place' },
  { id: 'room', label: '내 방', emoji: '🚪', speak: '내 방에 가고 싶어요', categoryId: 'place' },
  { id: 'hospital', label: '병원', emoji: '🏥', speak: '병원에 가고 싶어요', categoryId: 'place' },
  { id: 'park', label: '공원', emoji: '🏞️', speak: '공원에 가고 싶어요', categoryId: 'place' },

  // 몸(불편·아픔)
  { id: 'hurt', label: '아파', emoji: '🤕', speak: '아파요', categoryId: 'body' },
  { id: 'head', label: '머리', emoji: '🧠', speak: '머리가 아파요', categoryId: 'body' },
  { id: 'tummy', label: '배', emoji: '🫄', speak: '배가 아파요', categoryId: 'body' },
  { id: 'itch', label: '가려워', emoji: '🖐️', speak: '가려워요', categoryId: 'body' },
  { id: 'cold', label: '추워', emoji: '🥶', speak: '추워요', categoryId: 'body' },
  { id: 'hot', label: '더워', emoji: '🥵', speak: '더워요', categoryId: 'body' },
]
