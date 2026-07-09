export type BookStatus = 'want' | 'reading' | 'done'

export interface Book {
  id: string // isbn13 또는 manual-uuid
  title: string
  author: string
  publisher?: string
  coverUrl?: string
  totalPages: number
  category: string
  status: BookStatus
  rating: number // 0~5, 0.5 단위. 0 = 미평가
  oneLine: string
  startedAt?: string // YYYY-MM-DD
  finishedAt?: string
  createdAt: string
}

export interface ProgressLog {
  id: string
  bookId: string
  page: number // 그 날 도달한 쪽수(누적)
  date: string // YYYY-MM-DD
  createdAt: string
}

export interface Note {
  id: string
  bookId: string
  type: 'note' | 'quote'
  content: string
  page?: number
  createdAt: string
}

export interface Settings {
  yearlyGoal: number
  aladinKey: string
  kakaoKey: string
}

export interface AppData {
  version: 1
  settings: Settings
  books: Book[]
  logs: ProgressLog[]
  notes: Note[]
}

export interface SearchResult {
  id: string // isbn13 우선
  title: string
  author: string
  publisher: string
  coverUrl: string
  totalPages: number
  category: string
  source: 'aladin' | 'kakao'
}

export type Tab = 'home' | 'library' | 'group' | 'stats' | 'settings'
export type Screen =
  | { view: 'tab'; tab: Tab }
  | { view: 'search' }
  | { view: 'book'; bookId: string }
