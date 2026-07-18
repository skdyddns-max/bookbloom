import { useSyncExternalStore } from 'react'
import { DEFAULT_CARDS, type Card } from './data'

const KEY = 'bookbloom_aac_v1'

// 감각 예민 아동을 위한 조절 값. 기본값은 "낮은 자극"으로 시작합니다.
export type Settings = {
  volume: number // 0 ~ 1  — 기본 조금 낮게
  rate: number // 0.5 ~ 1.5 — 또박또박(느리게)
  pitch: number // 0.5 ~ 1.5
  voiceURI: string // '' = 자동(한국어 우선)
  theme: 'calm' | 'dim' | 'paper' // 저채도 팔레트
  highContrast: boolean // 선명하게 — 진한 글자·두꺼운 테두리(야외·저시력)
  reduceMotion: boolean // 움직임 최소화(애니메이션 끔)
  colorCards: boolean // 카테고리별 옅은 색조 on/off (단색이 더 차분)
  density: 'roomy' | 'normal' // 한 화면 카드 수(과부하 방지)
  sentenceMode: boolean // 문장 만들기(여러 장 조합) vs. 바로 말하기
  sortByUsage: boolean // 자주 쓰는 카드를 카테고리 안에서 먼저 보여주기
  hapticFeedback: boolean // 진동 피드백
  bigText: boolean // 더 큰 글자
  guardianLock: boolean // 설정·편집을 '길게 눌러' 열기(아이 오작동 방지)

  // 음성 제공자 — 'browser'(기기 내장) 또는 'elevenlabs'(고품질·안정)
  voiceProvider: 'browser' | 'elevenlabs'
  elevenApiKey: string // 이 기기에만 저장. 코드/서버에 없음
  elevenVoiceId: string
  elevenModel: string
}

export type State = {
  settings: Settings
  customCards: Card[] // 보호자가 추가한 카드
  hiddenIds: string[] // 숨긴 기본 카드 id
  locked: boolean // 사용 잠금(어린이 모드) — 카드 말하기만 가능, 길게 눌러 해제
  usage: Record<string, number> // 카드별 누른 횟수 — '자주 쓰는 카드 먼저' 정렬용
  helpSeen: boolean // 첫 환영 안내를 봤는지 (한 번만 표시)
}

const DEFAULT_SETTINGS: Settings = {
  volume: 0.85,
  rate: 0.85,
  pitch: 1,
  voiceURI: '',
  theme: 'calm',
  highContrast: false,
  reduceMotion: false,
  colorCards: true,
  density: 'normal',
  sentenceMode: false,
  sortByUsage: true,
  hapticFeedback: false,
  bigText: false,
  guardianLock: true,
  voiceProvider: 'browser',
  elevenApiKey: '',
  elevenVoiceId: '',
  elevenModel: 'eleven_multilingual_v2',
}

const DEFAULT_STATE: State = {
  settings: DEFAULT_SETTINGS,
  customCards: [],
  hiddenIds: [],
  locked: false,
  usage: {},
  helpSeen: false,
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<State>
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      customCards: parsed.customCards ?? [],
      hiddenIds: parsed.hiddenIds ?? [],
      locked: parsed.locked ?? false,
      usage: parsed.usage ?? {},
      helpSeen: parsed.helpSeen ?? false,
    }
  } catch {
    return DEFAULT_STATE
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 저장 실패는 조용히 무시(사용에 지장 없음) */
  }
}

function set(next: Partial<State>) {
  state = { ...state, ...next }
  persist()
  emit()
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getState(): State {
  return state
}

export function useAacStore(): State {
  return useSyncExternalStore(subscribe, getState, getState)
}

// --- 액션 ---

export function updateSettings(patch: Partial<Settings>) {
  set({ settings: { ...state.settings, ...patch } })
}

export function addCard(card: Omit<Card, 'id'>) {
  const id = `custom_${Date.now().toString(36)}`
  set({ customCards: [...state.customCards, { ...card, id }] })
}

export function removeCustomCard(id: string) {
  set({ customCards: state.customCards.filter((c) => c.id !== id) })
}

export function setLocked(locked: boolean) {
  set({ locked })
}

export function markHelpSeen() {
  set({ helpSeen: true })
}

// 백업 복원 — API 키는 백업에 없으므로 이 기기의 기존 키를 유지
export function restoreFromBackup(payload: {
  settings?: Partial<Settings>
  customCards?: Card[]
  hiddenIds?: string[]
  usage?: Record<string, number>
}) {
  set({
    settings: {
      ...state.settings,
      ...(payload.settings ?? {}),
      elevenApiKey: state.settings.elevenApiKey,
    },
    customCards: payload.customCards ?? [],
    hiddenIds: payload.hiddenIds ?? [],
    usage: payload.usage ?? {},
    helpSeen: true,
  })
}

// 카드 사용 기록 — 누를 때마다 +1 (기기에만 저장)
export function recordUse(id: string) {
  set({ usage: { ...state.usage, [id]: (state.usage[id] ?? 0) + 1 } })
}

export function toggleHidden(id: string) {
  const hidden = state.hiddenIds.includes(id)
  set({
    hiddenIds: hidden
      ? state.hiddenIds.filter((x) => x !== id)
      : [...state.hiddenIds, id],
  })
}

// 화면에 보일 카드(기본 + 커스텀, 숨김 제외).
// '자주 쓰는 카드 먼저'가 켜져 있으면 카테고리 안에서 사용 횟수 내림차순으로 정렬
// (동률이면 원래 순서 유지 — 안 쓴 카드들은 위치가 바뀌지 않아 예측 가능)
export function visibleCards(categoryId: string): Card[] {
  const all = [...DEFAULT_CARDS, ...state.customCards]
  const cards = all.filter(
    (c) => c.categoryId === categoryId && !state.hiddenIds.includes(c.id),
  )
  if (!state.settings.sortByUsage) return cards
  return cards
    .map((c, i) => ({ c, i, n: state.usage[c.id] ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.c)
}

// 편집 화면용(숨김 포함 전체)
export function allCards(categoryId: string): Card[] {
  return [...DEFAULT_CARDS, ...state.customCards].filter((c) => c.categoryId === categoryId)
}

// 미리 캐시할 문장 모음(보이는 카드의 말할 문장 + 낱말, 중복 제거)
export function allSpeakables(): string[] {
  const set = new Set<string>()
  for (const c of [...DEFAULT_CARDS, ...state.customCards]) {
    if (state.hiddenIds.includes(c.id)) continue
    set.add(c.speak ?? c.label)
    set.add(c.label)
  }
  return [...set]
}
