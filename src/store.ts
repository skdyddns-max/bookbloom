import { useSyncExternalStore } from 'react'
import type { AppData, Book, Note, ProgressLog, Settings } from './types'

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

function mutate(next: Partial<AppData>) {
  data = { ...data, ...next }
  persist()
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
