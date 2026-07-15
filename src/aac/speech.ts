// 브라우저 내장 음성합성(Web Speech API) 래퍼.
// 서버·네트워크 없이 동작하고, 감각 예민 아동을 위해 음량·속도·톤을 부드럽게 제어합니다.

export type SpeakOptions = {
  volume?: number // 0 ~ 1
  rate?: number // 0.5 ~ 1.5 (느릴수록 또박또박)
  pitch?: number // 0.5 ~ 1.5
  voiceURI?: string
}

const synth: SpeechSynthesis | undefined =
  typeof window !== 'undefined' ? window.speechSynthesis : undefined

export const speechSupported = !!synth

let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices(): SpeechSynthesisVoice[] {
  if (!synth) return []
  const v = synth.getVoices()
  if (v.length) cachedVoices = v
  return cachedVoices
}

// 음성 목록은 비동기로 채워지므로 변경 이벤트를 구독해 캐시를 갱신합니다.
if (synth) {
  loadVoices()
  synth.addEventListener?.('voiceschanged', () => loadVoices())
}

export function onVoicesChanged(cb: () => void): () => void {
  if (!synth) return () => {}
  const handler = () => {
    loadVoices()
    cb()
  }
  synth.addEventListener?.('voiceschanged', handler)
  return () => synth.removeEventListener?.('voiceschanged', handler)
}

export function getKoreanVoices(): SpeechSynthesisVoice[] {
  const all = loadVoices()
  const ko = all.filter((v) => v.lang?.toLowerCase().startsWith('ko'))
  return ko.length ? ko : all
}

export function getAllVoices(): SpeechSynthesisVoice[] {
  return loadVoices()
}

function pickVoice(voiceURI?: string): SpeechSynthesisVoice | undefined {
  const voices = loadVoices()
  if (voiceURI) {
    const found = voices.find((v) => v.voiceURI === voiceURI)
    if (found) return found
  }
  // 한국어 음성 우선
  return voices.find((v) => v.lang?.toLowerCase().startsWith('ko')) ?? voices[0]
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!synth || !text.trim()) return
  // 이전 발화를 부드럽게 중단(연타 시 소리가 겹쳐 놀라지 않도록)
  synth.cancel()

  const utter = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(opts.voiceURI)
  if (voice) {
    utter.voice = voice
    utter.lang = voice.lang
  } else {
    utter.lang = 'ko-KR'
  }
  utter.volume = clamp(opts.volume ?? 0.9, 0, 1)
  utter.rate = clamp(opts.rate ?? 0.9, 0.5, 1.5)
  utter.pitch = clamp(opts.pitch ?? 1, 0.5, 1.5)

  synth.speak(utter)
}

export function stopSpeaking(): void {
  synth?.cancel()
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
