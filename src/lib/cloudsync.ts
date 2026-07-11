import { supabase, hasSupabase } from './supabase'
import { getData, applyRemote, isApplyingRemote, subscribe } from '../store'
import type { AppData, Book, ProgressLog, Note } from '../types'

const SYNC_KEY = 'bookbloom_sync' // { code }

export interface SyncState {
  code: string
}

export function getSyncState(): SyncState | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    return raw ? (JSON.parse(raw) as SyncState) : null
  } catch {
    return null
  }
}
function saveSyncState(s: SyncState) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(s))
}
export function clearSyncState() {
  localStorage.removeItem(SYNC_KEY)
}

export const syncAvailable = hasSupabase

function friendly(e: unknown): Error {
  const m = e instanceof Error ? e.message : String(e)
  if (m.includes('SYNC_NOT_FOUND')) return new Error('그 코드를 찾지 못했어요. 코드를 다시 확인해 주세요.')
  return new Error('동기화 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('동기화를 사용할 수 없어요.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw friendly(new Error(error.message))
  return data as T
}

/** 두 데이터를 병합 — id 기준 합집합(데이터 손실 방지), 설정은 로컬 우선 */
function merge(local: AppData, remote: Partial<AppData>): AppData {
  const byId = <T extends { id: string }>(a: T[] = [], b: T[] = []): T[] => {
    const map = new Map<string, T>()
    for (const x of b) map.set(x.id, x) // 원격 먼저
    for (const x of a) map.set(x.id, x) // 로컬이 덮어씀(현재 기기 우선)
    return [...map.values()]
  }
  return {
    version: 1,
    settings: { ...(remote.settings ?? local.settings), ...local.settings },
    books: byId<Book>(local.books, remote.books),
    logs: byId<ProgressLog>(local.logs, remote.logs),
    notes: byId<Note>(local.notes, remote.notes),
  }
}

/** 새 동기화 시작 — 현재 데이터를 올리고 코드 발급 */
export async function createSync(): Promise<string> {
  const res = await rpc<{ code: string }>('bb_sync_create', { p_data: getData() })
  saveSyncState({ code: res.code })
  return res.code
}

/** 코드로 연결 — 서버 데이터를 받아 로컬과 병합 후 다시 올림 */
export async function linkSync(code: string): Promise<void> {
  const res = await rpc<{ data: AppData }>('bb_sync_pull', { p_code: code.trim().toUpperCase() })
  const merged = merge(getData(), res.data ?? {})
  applyRemote(merged)
  saveSyncState({ code: code.trim().toUpperCase() })
  await rpc('bb_sync_push', { p_code: code.trim().toUpperCase(), p_data: merged })
}

/** 앱 로드 시 — 연결돼 있으면 서버 변경을 받아 병합 */
export async function pullMerge(): Promise<void> {
  const s = getSyncState()
  if (!s) return
  try {
    const res = await rpc<{ data: AppData }>('bb_sync_pull', { p_code: s.code })
    const merged = merge(getData(), res.data ?? {})
    if (JSON.stringify(merged) !== JSON.stringify(getData())) {
      applyRemote(merged)
      await rpc('bb_sync_push', { p_code: s.code, p_data: merged })
    }
  } catch {
    // 오프라인 등 — 조용히 넘어감
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
async function push() {
  const s = getSyncState()
  if (!s) return
  try {
    await rpc('bb_sync_push', { p_code: s.code, p_data: getData() })
  } catch {
    // 조용히 (다음 변경 때 재시도)
  }
}

/** 스토어 변경 시 디바운스 푸시 등록 (앱 시작 때 1회 호출) */
export function startSyncEngine() {
  subscribe(() => {
    if (isApplyingRemote()) return // 원격 반영 중엔 푸시 안 함(에코 방지)
    if (!getSyncState()) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(push, 1500)
  })
}
