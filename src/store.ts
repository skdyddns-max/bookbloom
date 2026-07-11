import { useSyncExternalStore } from 'react'
import type { AppData, Book, Note, ProgressLog, Settings } from './types'
import { todayStr } from './utils'

const KEY = 'bookbloom_v1'

const defaultData: AppData = {
  version: 1,
  settings: { yearlyGoal: 12, aladinKey: '', kakaoKey: '' },
  books: [],
  logs: [],
  notes: [],
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(defaultData)
    const parsed = JSON.parse(raw) as AppData
    return {
      ...structuredClone(defaultData),
      ...parsed,
      settings: { ...defaultData.settings, ...parsed.settings },
    }
  } catch {
    return structuredClone(defaultData)
  }
}

let data: AppData = load()
const listeners = new Set<() => void>()

function persist() {
  localStorage.setItem(KEY, JSON.stringify(data))
  listeners.forEach((fn) => fn())
}

export function getData(): AppData {
  return data
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => data,
  )
}

/** 스토어 변경 구독 (클라우드 동기화 푸시 트리거용) */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

let applyingRemote = false
export function isApplyingRemote(): boolean {
  return applyingRemote
}
/** 원격(클라우드)에서 받아온 데이터를 그대로 반영 — 푸시 에코 방지 플래그와 함께 */
export function applyRemote(next: AppData) {
  applyingRemote = true
  data = next
  persist()
  applyingRemote = false
}

function mutate(next: Partial<AppData>) {
  data = { ...data, ...next }
  persist()
}

// 완독 축하 모먼트 — 진도 100% 도달 시 앱에서 오버레이를 띄우기 위한 이벤트
let celebrateFn: ((book: Book) => void) | null = null
export function onCelebrate(fn: (book: Book) => void): () => void {
  celebrateFn = fn
  return () => {
    if (celebrateFn === fn) celebrateFn = null
  }
}

export const store = {
  addBook(book: Book) {
    if (data.books.some((b) => b.id === book.id)) return false
    mutate({ books: [book, ...data.books] })
    return true
  },
  updateBook(id: string, patch: Partial<Book>) {
    mutate({ books: data.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  },
  /** 완독 처리 + 축하 모먼트 발화 (진도로 다 읽었을 때) */
  completeBook(id: string) {
    const already = data.books.find((b) => b.id === id)?.status === 'done'
    mutate({
      books: data.books.map((b) =>
        b.id === id ? { ...b, status: 'done', finishedAt: b.finishedAt || todayStr() } : b,
      ),
    })
    if (!already) {
      const book = data.books.find((b) => b.id === id)
      if (book) celebrateFn?.(book)
    }
  },
  removeBook(id: string) {
    mutate({
      books: data.books.filter((b) => b.id !== id),
      logs: data.logs.filter((l) => l.bookId !== id),
      notes: data.notes.filter((n) => n.bookId !== id),
    })
  },
  addLog(log: ProgressLog) {
    mutate({ logs: [...data.logs, log] })
  },
  removeLog(id: string) {
    mutate({ logs: data.logs.filter((l) => l.id !== id) })
  },
  addNote(note: Note) {
    mutate({ notes: [note, ...data.notes] })
  },
  removeNote(id: string) {
    mutate({ notes: data.notes.filter((n) => n.id !== id) })
  },
  setSettings(patch: Partial<Settings>) {
    mutate({ settings: { ...data.settings, ...patch } })
  },
  exportJson(): string {
    return JSON.stringify(data, null, 2)
  },
  importJson(json: string): boolean {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || !Array.isArray(parsed.books)) return false
      data = {
        ...structuredClone(defaultData),
        ...parsed,
        settings: { ...defaultData.settings, ...parsed.settings },
      }
      persist()
      return true
    } catch {
      return false
    }
  },
  reset() {
    data = structuredClone(defaultData)
    persist()
  },
}
