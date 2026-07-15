import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, type Card } from './data'
import {
  addCard,
  removeCustomCard,
  toggleHidden,
  updateSettings,
  useAacStore,
  visibleCards,
  allCards,
} from './store'
import { speak as speakBrowser, stopSpeaking, speechSupported } from './speech'
import { speakEleven, stopEleven } from './eleven'
import { SettingsSheet } from './Settings'

export default function App() {
  const { settings, hiddenIds } = useAacStore()
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id)
  const [sentence, setSentence] = useState<Card[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [editing, setEditing] = useState(false)

  // 테마·감각 설정을 최상위 data 속성으로 반영(CSS가 이걸 읽음)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.aacTheme = settings.theme
    root.dataset.aacMotion = settings.reduceMotion ? 'reduce' : 'ok'
    root.dataset.aacColor = settings.colorCards ? 'on' : 'off'
    root.dataset.aacBigtext = settings.bigText ? 'on' : 'off'
    root.dataset.aacDensity = settings.density
  }, [settings.theme, settings.reduceMotion, settings.colorCards, settings.bigText, settings.density])

  const cards = useMemo(
    () => (editing ? allCards(categoryId) : visibleCards(categoryId)),
    // hiddenIds/settings 변화를 반영하기 위한 의존성
    [categoryId, editing, hiddenIds],
  )

  function haptic() {
    if (settings.hapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12) // 아주 짧고 부드럽게
      } catch {
        /* ignore */
      }
    }
  }

  async function say(text: string) {
    // 일레븐랩스가 켜져 있고 키·목소리가 있으면 우선 사용, 실패하면 기기 음성으로 대체
    if (settings.voiceProvider === 'elevenlabs' && settings.elevenApiKey && settings.elevenVoiceId) {
      try {
        await speakEleven(text, {
          apiKey: settings.elevenApiKey,
          voiceId: settings.elevenVoiceId,
          model: settings.elevenModel,
          volume: settings.volume,
          rate: settings.rate,
        })
        return
      } catch {
        /* 네트워크·키 문제 → 아래 기기 음성으로 안전하게 대체 */
      }
    }
    stopEleven()
    speakBrowser(text, {
      volume: settings.volume,
      rate: settings.rate,
      pitch: settings.pitch,
      voiceURI: settings.voiceURI || undefined,
    })
  }

  function onCardTap(card: Card) {
    if (editing) return
    haptic()
    const word = card.speak ?? card.label
    if (settings.sentenceMode) {
      setSentence((s) => [...s, card])
      say(card.label) // 문장 모드에선 낱말만 짧게 확인
    } else {
      say(word)
    }
  }

  function speakSentence() {
    if (!sentence.length) return
    haptic()
    // 문장은 낱말을 자연스럽게 이어 말합니다.
    const text = sentence.map((c) => c.label).join(' ')
    say(text)
  }

  return (
    <div className="aac">
      <header className="aac-top">
        <div className="aac-title">
          <span className="aac-logo" aria-hidden>🗣️</span>
          <span>또박또박</span>
        </div>
        <div className="aac-top-actions">
          <button
            className={`aac-iconbtn ${editing ? 'is-on' : ''}`}
            onClick={() => setEditing((e) => !e)}
            aria-pressed={editing}
            title="카드 편집(보호자)"
          >
            {editing ? '완료' : '✏️ 편집'}
          </button>
          <button
            className="aac-iconbtn"
            onClick={() => setShowSettings(true)}
            title="설정"
            aria-label="설정 열기"
          >
            ⚙️
          </button>
        </div>
      </header>

      {!speechSupported && (
        <div className="aac-note">
          이 브라우저는 말하기(음성)를 지원하지 않아요. 최신 크롬·사파리에서 열어 주세요.
        </div>
      )}

      {settings.sentenceMode && !editing && (
        <div className="aac-strip">
          <div className="aac-strip-cards">
            {sentence.length === 0 ? (
              <span className="aac-strip-empty">카드를 눌러 문장을 만들어요</span>
            ) : (
              sentence.map((c, i) => (
                <span className="aac-chip" key={`${c.id}-${i}`}>
                  <span className="aac-chip-emoji" aria-hidden>{c.emoji}</span>
                  {c.label}
                </span>
              ))
            )}
          </div>
          <div className="aac-strip-btns">
            <button
              className="aac-stripbtn"
              onClick={() => setSentence((s) => s.slice(0, -1))}
              disabled={!sentence.length}
              aria-label="한 개 지우기"
            >
              ⌫
            </button>
            <button
              className="aac-stripbtn"
              onClick={() => setSentence([])}
              disabled={!sentence.length}
              aria-label="모두 지우기"
            >
              지움
            </button>
            <button
              className="aac-stripbtn aac-stripbtn--say"
              onClick={speakSentence}
              disabled={!sentence.length}
            >
              ▶ 말하기
            </button>
          </div>
        </div>
      )}

      <nav className="aac-tabs" aria-label="카테고리">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`aac-tab ${cat.id === categoryId ? 'is-active' : ''}`}
            onClick={() => {
              setCategoryId(cat.id)
              stopSpeaking()
              stopEleven()
            }}
          >
            <span className="aac-tab-emoji" aria-hidden>{cat.emoji}</span>
            <span className="aac-tab-name">{cat.name}</span>
          </button>
        ))}
      </nav>

      <main className="aac-grid" data-editing={editing ? 'on' : 'off'}>
        {cards.map((card) => {
          const hidden = hiddenIds.includes(card.id)
          const isCustom = card.id.startsWith('custom_')
          return (
            <div className={`aac-card-wrap ${hidden ? 'is-hidden' : ''}`} key={card.id}>
              <button
                className="aac-card"
                data-cat={card.categoryId}
                onClick={() => onCardTap(card)}
              >
                <span className="aac-card-emoji" aria-hidden>{card.emoji}</span>
                <span className="aac-card-label">{card.label}</span>
              </button>
              {editing && (
                <div className="aac-card-edit">
                  <button
                    className="aac-editchip"
                    onClick={() => toggleHidden(card.id)}
                    title={hidden ? '보이기' : '숨기기'}
                  >
                    {hidden ? '👁 보이기' : '🚫 숨기기'}
                  </button>
                  {isCustom && (
                    <button
                      className="aac-editchip aac-editchip--del"
                      onClick={() => removeCustomCard(card.id)}
                      title="삭제"
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {editing && <AddCardButton categoryId={categoryId} />}
      </main>

      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          onPreview={() => say('안녕하세요. 이렇게 말해요.')}
          onSettingChange={(patch) => updateSettings(patch)}
        />
      )}
    </div>
  )
}

function AddCardButton({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false)
  const [emoji, setEmoji] = useState('🙂')
  const [label, setLabel] = useState('')
  const [speakText, setSpeakText] = useState('')

  function submit() {
    const l = label.trim()
    if (!l) return
    addCard({
      emoji: emoji.trim() || '🙂',
      label: l,
      speak: speakText.trim() || undefined,
      categoryId,
    })
    setLabel('')
    setSpeakText('')
    setEmoji('🙂')
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="aac-card aac-card--add" onClick={() => setOpen(true)}>
        <span className="aac-card-emoji" aria-hidden>＋</span>
        <span className="aac-card-label">카드 추가</span>
      </button>
    )
  }

  return (
    <div className="aac-addform">
      <label className="aac-field">
        <span>아이콘(이모지)</span>
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
      </label>
      <label className="aac-field">
        <span>낱말</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 안아줘"
          autoFocus
        />
      </label>
      <label className="aac-field">
        <span>말할 문장(선택)</span>
        <input
          value={speakText}
          onChange={(e) => setSpeakText(e.target.value)}
          placeholder="비우면 낱말을 그대로 말해요"
        />
      </label>
      <div className="aac-addform-btns">
        <button className="aac-ghostbtn" onClick={() => setOpen(false)}>
          취소
        </button>
        <button className="aac-primarybtn" onClick={submit} disabled={!label.trim()}>
          추가
        </button>
      </div>
    </div>
  )
}
