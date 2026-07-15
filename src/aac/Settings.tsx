import { useEffect, useState } from 'react'
import { updateSettings, useAacStore, allSpeakables, type Settings } from './store'
import { getKoreanVoices, onVoicesChanged } from './speech'
import {
  listVoices,
  precache,
  cacheClear,
  speakEleven,
  type ElevenVoice,
} from './eleven'

const ELEVEN_MODELS: Array<[string, string]> = [
  ['eleven_multilingual_v2', '멀티링구얼 v2 (안정·자연)'],
  ['eleven_turbo_v2_5', '터보 v2.5 (빠름)'],
  ['eleven_flash_v2_5', '플래시 v2.5 (가장 빠름)'],
]

type Props = {
  onClose: () => void
  onPreview: () => void
  onSettingChange: (patch: Partial<Settings>) => void
}

export function SettingsSheet({ onClose, onPreview }: Props) {
  const { settings } = useAacStore()
  const [voices, setVoices] = useState(getKoreanVoices())

  useEffect(() => {
    setVoices(getKoreanVoices())
    return onVoicesChanged(() => setVoices(getKoreanVoices()))
  }, [])

  return (
    <div className="aac-sheet-backdrop" onClick={onClose}>
      <div
        className="aac-sheet"
        role="dialog"
        aria-label="설정"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aac-sheet-head">
          <h2>설정</h2>
          <button className="aac-iconbtn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="aac-sheet-body">
          <section className="aac-set-group">
            <h3>🔊 소리</h3>
            <Slider
              label="소리 크기"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(v) => updateSettings({ volume: v })}
            />
            <Slider
              label="말 속도 (느릴수록 또박또박)"
              min={0.5}
              max={1.3}
              step={0.05}
              value={settings.rate}
              onChange={(v) => updateSettings({ rate: v })}
            />
            <Slider
              label="목소리 톤"
              min={0.6}
              max={1.4}
              step={0.05}
              value={settings.pitch}
              onChange={(v) => updateSettings({ pitch: v })}
            />
            {voices.length > 0 && (
              <label className="aac-field">
                <span>목소리</span>
                <select
                  value={settings.voiceURI}
                  onChange={(e) => updateSettings({ voiceURI: e.target.value })}
                >
                  <option value="">자동 (한국어 우선)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="aac-primarybtn aac-preview" onClick={onPreview}>
              🔈 미리 들어보기
            </button>
          </section>

          <ElevenSection />

          <section className="aac-set-group">
            <h3>🌙 화면 (감각 조절)</h3>
            <div className="aac-seg" role="group" aria-label="화면 테마">
              {(
                [
                  ['calm', '차분'],
                  ['paper', '종이'],
                  ['dim', '어둑'],
                ] as const
              ).map(([val, name]) => (
                <button
                  key={val}
                  className={`aac-segbtn ${settings.theme === val ? 'is-on' : ''}`}
                  onClick={() => updateSettings({ theme: val })}
                >
                  {name}
                </button>
              ))}
            </div>
            <Toggle
              label="선명하게 (고대비)"
              hint="글자·테두리를 진하게 — 밝은 야외나 저시력에 좋아요"
              checked={settings.highContrast}
              onChange={(v) => updateSettings({ highContrast: v })}
            />
            <Toggle
              label="움직임 최소화"
              hint="눌렀을 때 애니메이션을 끕니다"
              checked={settings.reduceMotion}
              onChange={(v) => updateSettings({ reduceMotion: v })}
            />
            <Toggle
              label="카드 색 옅게 표시"
              hint="끄면 단색으로 더 차분해요"
              checked={settings.colorCards}
              onChange={(v) => updateSettings({ colorCards: v })}
            />
            <Toggle
              label="글자 크게"
              checked={settings.bigText}
              onChange={(v) => updateSettings({ bigText: v })}
            />
            <div className="aac-seg" role="group" aria-label="카드 크기">
              {(
                [
                  ['roomy', '큼·적게'],
                  ['normal', '보통'],
                ] as const
              ).map(([val, name]) => (
                <button
                  key={val}
                  className={`aac-segbtn ${settings.density === val ? 'is-on' : ''}`}
                  onClick={() => updateSettings({ density: val })}
                >
                  {name}
                </button>
              ))}
            </div>
          </section>

          <section className="aac-set-group">
            <h3>💬 말하기 방식</h3>
            <Toggle
              label="문장 만들기"
              hint="여러 카드를 골라 이어 말해요 (끄면 누르면 바로 말함)"
              checked={settings.sentenceMode}
              onChange={(v) => updateSettings({ sentenceMode: v })}
            />
            <Toggle
              label="진동 피드백"
              hint="누를 때 짧게 진동 (지원 기기)"
              checked={settings.hapticFeedback}
              onChange={(v) => updateSettings({ hapticFeedback: v })}
            />
          </section>

          <section className="aac-set-group">
            <h3>🔒 보호자</h3>
            <Toggle
              label="보호자 잠금"
              hint="설정·편집을 ‘길게 눌러야’ 열려요 (아이 오작동 방지)"
              checked={settings.guardianLock}
              onChange={(v) => updateSettings({ guardianLock: v })}
            />
          </section>

          <p className="aac-sheet-foot">
            설정은 이 기기에 저장돼요. 카드 편집은 상단 ‘편집’에서 할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  )
}

function ElevenSection() {
  const { settings } = useAacStore()
  const on = settings.voiceProvider === 'elevenlabs'
  const [voices, setVoices] = useState<ElevenVoice[]>([])
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'err'; msg: string }>({
    kind: 'idle',
    msg: '',
  })
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  async function loadVoices() {
    if (!settings.elevenApiKey.trim()) {
      setStatus({ kind: 'err', msg: '키를 먼저 입력해요' })
      return
    }
    setStatus({ kind: 'busy', msg: '목소리를 불러와요…' })
    try {
      const list = await listVoices(settings.elevenApiKey.trim())
      setVoices(list)
      // 아직 고른 목소리가 없으면 첫 번째를 기본값으로
      if (!settings.elevenVoiceId && list[0]) {
        updateSettings({ elevenVoiceId: list[0].voice_id })
      }
      setStatus({ kind: 'ok', msg: `목소리 ${list.length}개를 불러왔어요` })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '불러오지 못했어요' })
    }
  }

  async function preview() {
    if (!settings.elevenVoiceId) {
      setStatus({ kind: 'err', msg: '목소리를 먼저 골라요' })
      return
    }
    setStatus({ kind: 'busy', msg: '들려줄 소리를 만드는 중…' })
    try {
      await speakEleven('안녕하세요. 이렇게 말해요.', {
        apiKey: settings.elevenApiKey.trim(),
        voiceId: settings.elevenVoiceId,
        model: settings.elevenModel,
        volume: settings.volume,
        rate: settings.rate,
      })
      setStatus({ kind: 'ok', msg: '' })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '재생하지 못했어요' })
    }
  }

  async function buildCache() {
    if (!settings.elevenVoiceId) {
      setStatus({ kind: 'err', msg: '목소리를 먼저 골라요' })
      return
    }
    const texts = allSpeakables()
    setProgress({ done: 0, total: texts.length })
    setStatus({ kind: 'busy', msg: '카드 음성을 미리 만드는 중…' })
    const res = await precache(
      {
        apiKey: settings.elevenApiKey.trim(),
        voiceId: settings.elevenVoiceId,
        model: settings.elevenModel,
      },
      texts,
      (done, total) => setProgress({ done, total }),
    )
    setProgress(null)
    setStatus({
      kind: res.fail ? 'err' : 'ok',
      msg: res.fail
        ? `${res.ok}개 완료, ${res.fail}개 실패`
        : `${res.ok}개 모두 준비됐어요 (오프라인에서도 즉시 재생)`,
    })
  }

  async function clearCache() {
    await cacheClear()
    setStatus({ kind: 'ok', msg: '저장된 음성을 지웠어요' })
  }

  return (
    <section className="aac-set-group">
      <h3>🎙️ 목소리 종류</h3>
      <div className="aac-seg" role="group" aria-label="음성 제공자">
        <button
          className={`aac-segbtn ${!on ? 'is-on' : ''}`}
          onClick={() => updateSettings({ voiceProvider: 'browser' })}
        >
          기기 음성
        </button>
        <button
          className={`aac-segbtn ${on ? 'is-on' : ''}`}
          onClick={() => updateSettings({ voiceProvider: 'elevenlabs' })}
        >
          일레븐랩스
        </button>
      </div>

      {on && (
        <div className="aac-eleven">
          <label className="aac-field">
            <span>API 키 (이 기기에만 저장돼요)</span>
            <input
              type="password"
              value={settings.elevenApiKey}
              onChange={(e) => updateSettings({ elevenApiKey: e.target.value })}
              placeholder="sk_..."
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <div className="aac-eleven-row">
            <button className="aac-ghostbtn" onClick={loadVoices}>
              🔄 목소리 불러오기
            </button>
            {voices.length > 0 && (
              <button className="aac-ghostbtn" onClick={preview}>
                🔈 들어보기
              </button>
            )}
          </div>

          {voices.length > 0 && (
            <label className="aac-field">
              <span>목소리</span>
              <select
                value={settings.elevenVoiceId}
                onChange={(e) => updateSettings({ elevenVoiceId: e.target.value })}
              >
                {voices.map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="aac-field">
            <span>음질/속도 모델</span>
            <select
              value={settings.elevenModel}
              onChange={(e) => updateSettings({ elevenModel: e.target.value })}
            >
              {ELEVEN_MODELS.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div className="aac-eleven-row">
            <button className="aac-primarybtn" onClick={buildCache} disabled={!!progress}>
              ⚡ 모든 카드 미리 만들기
            </button>
            <button className="aac-ghostbtn" onClick={clearCache} disabled={!!progress}>
              🗑 캐시 지우기
            </button>
          </div>

          {progress && (
            <div className="aac-progress" aria-live="polite">
              <div
                className="aac-progress-bar"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
              <span className="aac-progress-text">
                {progress.done} / {progress.total}
              </span>
            </div>
          )}

          {status.msg && (
            <p className={`aac-eleven-status is-${status.kind}`} aria-live="polite">
              {status.msg}
            </p>
          )}

          <p className="aac-eleven-help">
            일레븐랩스 계정에서 발급한 API 키가 필요해요. 만든 음성은 이 기기에 저장되어 반복
            재생 시 즉시·오프라인·같은 목소리로 나와요. 연결이 안 되면 기기 음성으로 자동
            대체돼요.
          </p>
        </div>
      )}
    </section>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="aac-slider">
      <span className="aac-slider-label">
        {label}
        <b>{Math.round(value * 100) / 100}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      className={`aac-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="aac-toggle-text">
        <span className="aac-toggle-label">{label}</span>
        {hint && <span className="aac-toggle-hint">{hint}</span>}
      </span>
      <span className="aac-toggle-track" aria-hidden>
        <span className="aac-toggle-knob" />
      </span>
    </button>
  )
}
