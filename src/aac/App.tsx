import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { CATEGORIES, type Card } from './data'
import { useHold } from './hold'
import {
  addCard,
  removeCustomCard,
  toggleHidden,
  updateSettings,
  setLocked,
  recordUse,
  useAacStore,
  visibleCards,
  allCards,
} from './store'
import { speak as speakBrowser, stopSpeaking, speechSupported } from './speech'
import { speakEleven, stopEleven } from './eleven'
import {
  getImageUrl,
  putImage,
  deleteImage,
  processImageFile,
  newImageId,
} from './images'
import { SettingsSheet } from './Settings'

export default function App() {
  const { settings, hiddenIds, customCards, locked } = useAacStore()
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id)
  const [sentence, setSentence] = useState<Card[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [editing, setEditing] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const hintTimer = useRef<number | null>(null)
  const [showVolume, setShowVolume] = useState(false)

  function showHint(msg: string) {
    setHint(msg)
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 1800)
  }

  const lock = settings.guardianLock
  const settingsHold = useHold(() => setShowSettings(true), lock, 600, () =>
    showHint('설정은 길게 눌러 열어요'),
  )
  const editHold = useHold(() => setEditing(true), lock, 600, () =>
    showHint('편집은 길게 눌러 열어요'),
  )
  // 사용 잠금 해제는 항상 3초 길게 누르기 — 아이가 우연히 풀 수 없게
  const unlockHold = useHold(
    () => {
      setLocked(false)
      showHint('잠금이 풀렸어요')
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    },
    true,
    3000,
    () => showHint('3초간 꾹 누르면 풀려요'),
  )

  function engageLock() {
    setLocked(true)
    setEditing(false)
    setShowSettings(false)
    showHint('잠금! 카드만 누를 수 있어요')
    // 안드로이드 크롬: 전체화면으로 브라우저 UI 숨김(미지원 기기는 조용히 무시)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }

  // 테마·감각 설정을 최상위 data 속성으로 반영(CSS가 이걸 읽음)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.aacTheme = settings.theme
    root.dataset.aacContrast = settings.highContrast ? 'high' : 'normal'
    root.dataset.aacMotion = settings.reduceMotion ? 'reduce' : 'ok'
    root.dataset.aacColor = settings.colorCards ? 'on' : 'off'
    root.dataset.aacBigtext = settings.bigText ? 'on' : 'off'
    root.dataset.aacDensity = settings.density
  }, [settings.theme, settings.highContrast, settings.reduceMotion, settings.colorCards, settings.bigText, settings.density])

  const cards = useMemo(
    () => (editing ? allCards(categoryId) : visibleCards(categoryId)),
    // 카드 추가·삭제(customCards)와 숨김(hiddenIds), 정렬 설정 변화를 즉시 반영.
    // usage는 일부러 뺌 — 누르는 도중 카드가 자리를 옮기면 혼란스러우니
    // 정렬은 카테고리를 다시 열 때(또는 새로고침) 반영됩니다.
    [categoryId, editing, hiddenIds, customCards, settings.sortByUsage],
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
    recordUse(card.id)
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

  async function deleteCard(card: Card) {
    if (card.image) await deleteImage(card.image) // 사진도 함께 정리
    removeCustomCard(card.id)
  }

  return (
    <div className="aac">
      <header className="aac-top">
        <div className="aac-title">
          <span className="aac-logo" aria-hidden>🗣️</span>
          <span>마음말</span>
        </div>
        <div className="aac-top-actions">
          <button
            className={`aac-iconbtn ${showVolume ? 'is-on' : ''}`}
            onClick={() => setShowVolume((v) => !v)}
            aria-label="소리 크기 조절"
            aria-expanded={showVolume}
            title="소리 크기"
          >
            {settings.volume === 0 ? '🔇' : settings.volume < 0.5 ? '🔉' : '🔊'}
          </button>
          {locked ? (
            <button
              className={`aac-iconbtn aac-unlockbtn ${unlockHold.holding ? 'is-holding' : ''}`}
              {...unlockHold.handlers}
              aria-label="잠금 풀기 (3초간 길게 눌러요)"
              title="3초간 길게 누르면 잠금이 풀려요"
            >
              🔒
            </button>
          ) : (
            <>
              <button
                className="aac-iconbtn"
                onClick={engageLock}
                aria-label="사용 잠금 켜기"
                title="잠그면 카드 말하기만 할 수 있어요"
              >
                🔓
              </button>
              {editing ? (
                <button
                  className="aac-iconbtn is-on"
                  onClick={() => setEditing(false)}
                  aria-pressed={true}
                  title="편집 마치기"
                >
                  완료
                </button>
              ) : (
                <button
                  className={`aac-iconbtn ${editHold.holding ? 'is-holding' : ''}`}
                  {...editHold.handlers}
                  aria-label={lock ? '카드 편집 (길게 눌러요)' : '카드 편집'}
                  title="카드 편집(보호자)"
                >
                  ✏️{lock && <span className="aac-lock" aria-hidden>🔒</span>}
                </button>
              )}
              <button
                className={`aac-iconbtn ${settingsHold.holding ? 'is-holding' : ''}`}
                {...settingsHold.handlers}
                title="설정"
                aria-label={lock ? '설정 열기 (길게 눌러요)' : '설정 열기'}
              >
                ⚙️{lock && <span className="aac-lock" aria-hidden>🔒</span>}
              </button>
            </>
          )}
        </div>
      </header>

      {showVolume && (
        <div className="aac-volumebar" role="group" aria-label="소리 크기 조절">
          <span className="aac-volumebar-icon" aria-hidden>🔉</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
            aria-label="소리 크기"
          />
          <span className="aac-volumebar-val">{Math.round(settings.volume * 100)}%</span>
          <button
            className="aac-volumebar-test"
            onClick={() => say('이 크기로 말해요')}
            aria-label="소리 미리 듣기"
          >
            들어보기
          </button>
        </div>
      )}

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
                  <CardFace card={c} chip />
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
                <CardFace card={card} />
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
                      onClick={() => deleteCard(card)}
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

      {hint && (
        <div className="aac-hint" role="status">
          {hint}
        </div>
      )}
    </div>
  )
}

// 카드 앞면 — 사진이 있으면 사진, 없으면 이모지
function useImageUrl(id?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    let alive = true
    if (!id) {
      setUrl(undefined)
      return
    }
    getImageUrl(id).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [id])
  return url
}

function CardFace({ card, chip }: { card: Card; chip?: boolean }) {
  const url = useImageUrl(card.image)
  const cls = chip ? 'aac-chip-emoji' : 'aac-card-emoji'
  if (card.image) {
    if (url) {
      return <img className={chip ? 'aac-chip-img' : 'aac-card-img'} src={url} alt="" />
    }
    return (
      <span className={cls} aria-hidden>
        🖼️
      </span>
    )
  }
  return (
    <span className={cls} aria-hidden>
      {card.emoji || '🙂'}
    </span>
  )
}

function AddCardButton({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false)
  const [emoji, setEmoji] = useState('🙂')
  const [label, setLabel] = useState('')
  const [speakText, setSpeakText] = useState('')
  const [imageId, setImageId] = useState<string | undefined>(undefined)
  const [imgUrl, setImgUrl] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function reset() {
    setLabel('')
    setSpeakText('')
    setEmoji('🙂')
    setImageId(undefined)
    setImgUrl(undefined)
    setErr('')
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일 다시 선택 가능하게
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      // 이전에 담아둔(미저장) 사진이 있으면 정리
      if (imageId) await deleteImage(imageId)
      const blob = await processImageFile(file)
      const id = newImageId()
      await putImage(id, blob)
      setImageId(id)
      setImgUrl(URL.createObjectURL(blob))
    } catch {
      setErr('사진을 불러오지 못했어요. 다른 사진을 골라 주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function clearPhoto() {
    if (imageId) await deleteImage(imageId)
    setImageId(undefined)
    setImgUrl(undefined)
  }

  function submit() {
    const l = label.trim()
    if (!l) return
    addCard({
      label: l,
      image: imageId,
      emoji: imageId ? undefined : emoji.trim() || '🙂',
      speak: speakText.trim() || undefined,
      categoryId,
    })
    reset()
    setOpen(false)
  }

  async function cancel() {
    if (imageId) await deleteImage(imageId) // 저장 안 한 사진은 정리
    reset()
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
      <div className="aac-photo-row">
        <div className="aac-photo-preview" aria-hidden>
          {imgUrl ? <img src={imgUrl} alt="" /> : <span>{emoji || '🙂'}</span>}
        </div>
        <div className="aac-photo-actions">
          <label className="aac-ghostbtn aac-photo-pick">
            📷 사진 선택
            <input
              type="file"
              accept="image/*"
              onChange={onPickFile}
              style={{ display: 'none' }}
            />
          </label>
          {imageId && (
            <button className="aac-ghostbtn" onClick={clearPhoto}>
              사진 빼기
            </button>
          )}
          {busy && <span className="aac-photo-busy">사진 준비 중…</span>}
        </div>
      </div>

      {!imageId && (
        <label className="aac-field">
          <span>아이콘(이모지) — 사진을 안 쓸 때</span>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
        </label>
      )}
      <label className="aac-field">
        <span>낱말</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 우리 엄마"
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
      {err && <p className="aac-photo-err">{err}</p>}
      <div className="aac-addform-btns">
        <button className="aac-ghostbtn" onClick={cancel}>
          취소
        </button>
        <button className="aac-primarybtn" onClick={submit} disabled={!label.trim() || busy}>
          추가
        </button>
      </div>
    </div>
  )
}
