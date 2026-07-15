// ElevenLabs TTS — 안정적이고 자연스러운 고품질 음성.
// 키는 보호자가 설정에서 입력하며 이 기기(localStorage)에만 저장됩니다. 코드엔 어떤 키도 없습니다.
// 생성된 오디오는 IndexedDB에 캐시해, 반복 재생 시 즉시·오프라인·동일한 목소리로 나오게 합니다.

const API = 'https://api.elevenlabs.io/v1'

export type ElevenVoice = {
  voice_id: string
  name: string
  labels?: Record<string, string>
}

export type ElevenOpts = {
  apiKey: string
  voiceId: string
  model: string
  volume?: number
  rate?: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

// ---- 계정의 목소리 목록 ----
export async function listVoices(apiKey: string): Promise<ElevenVoice[]> {
  const res = await fetch(`${API}/voices`, { headers: { 'xi-api-key': apiKey } })
  if (!res.ok) throw new Error(errMessage(res.status))
  const data = await res.json()
  return (data.voices ?? []).map((v: any) => ({
    voice_id: v.voice_id,
    name: v.name,
    labels: v.labels,
  }))
}

function errMessage(status: number): string {
  if (status === 401) return '키가 올바르지 않아요'
  if (status === 429) return '요청이 많아요. 잠시 후 다시 시도해요'
  return `오류가 났어요 (${status})`
}

// ---- IndexedDB 오디오 캐시 ----
const DB_NAME = 'aac_tts'
const STORE = 'audio'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function cacheKey(voiceId: string, model: string, text: string): string {
  return `${voiceId}|${model}|${text}`
}

async function cacheGet(key: string): Promise<Blob | undefined> {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => resolve(undefined)
    })
  } catch {
    return undefined
  }
}

async function cacheSet(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    /* 캐시 실패는 무시 — 재생 자체엔 지장 없음 */
  }
}

export async function cacheClear(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    /* ignore */
  }
}

// ---- 합성 ----
async function synthesize(o: ElevenOpts, text: string): Promise<Blob> {
  const res = await fetch(`${API}/text-to-speech/${o.voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': o.apiKey,
      'content-type': 'application/json',
      accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: o.model,
      voice_settings: { stability: 0.55, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) throw new Error(errMessage(res.status))
  return await res.blob()
}

// 캐시 우선, 없으면 합성 후 저장
async function getAudioBlob(o: ElevenOpts, text: string): Promise<Blob> {
  const key = cacheKey(o.voiceId, o.model, text)
  const hit = await cacheGet(key)
  if (hit) return hit
  const blob = await synthesize(o, text)
  await cacheSet(key, blob)
  return blob
}

// ---- 재생 (단일 오디오 엘리먼트, 연타 시 이전 소리 부드럽게 중단) ----
let audioEl: HTMLAudioElement | null = null
let currentUrl: string | null = null

export function stopEleven(): void {
  if (audioEl) {
    audioEl.pause()
    audioEl.currentTime = 0
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

export async function speakEleven(text: string, o: ElevenOpts): Promise<void> {
  if (!text.trim()) return
  const blob = await getAudioBlob(o, text)
  stopEleven()
  const url = URL.createObjectURL(blob)
  currentUrl = url
  const el = audioEl ?? (audioEl = new Audio())
  el.src = url
  el.volume = clamp(o.volume ?? 0.9, 0, 1)
  el.playbackRate = clamp(o.rate ?? 1, 0.5, 1.5)
  await el.play()
}

// ---- 미리 캐시(모든 카드 문장) ----
export async function precache(
  o: ElevenOpts,
  texts: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: number; fail: number }> {
  let ok = 0
  let fail = 0
  for (let i = 0; i < texts.length; i++) {
    try {
      await getAudioBlob(o, texts[i])
      ok++
    } catch {
      fail++
    }
    onProgress?.(i + 1, texts.length)
  }
  return { ok, fail }
}
