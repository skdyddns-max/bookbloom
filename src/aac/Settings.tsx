import { useEffect, useState } from 'react'
import { updateSettings, useAacStore, type Settings } from './store'
import { getKoreanVoices, onVoicesChanged } from './speech'

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

          <p className="aac-sheet-foot">
            설정은 이 기기에 저장돼요. 카드 편집은 상단 ‘편집’에서 할 수 있어요.
          </p>
        </div>
      </div>
    </div>
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
