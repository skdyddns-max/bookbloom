import { useAppData } from '../store'
import { calcStreak } from '../utils'

/** 연속 기록일 → 나무 성장 단계 (0~5) */
function stageOf(streak: number): number {
  if (streak <= 0) return 0
  if (streak <= 2) return 1
  if (streak <= 6) return 2
  if (streak <= 13) return 3
  if (streak <= 29) return 4
  return 5
}

const STAGE_LABEL = [
  '오늘 한 쪽이 씨앗이 돼요',
  '새싹이 돋았어요',
  '어린 나무가 자라요',
  '가지가 뻗고 있어요',
  '잎이 무성해졌어요',
  '꽃이 피었어요',
]

/** 성장 단계별 나무 SVG (페이퍼 톤) */
function Tree({ stage, size = 96 }: { stage: number; size?: number }) {
  const leaf = '#4e9c6f'
  const leafSoft = '#7cb894'
  const trunk = '#8a6d4f'
  const soil = '#d9cdb6'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="garden-tree">
      {/* 흙 */}
      <ellipse cx="50" cy="88" rx="26" ry="6" fill={soil} />
      {stage === 0 && (
        <ellipse cx="50" cy="84" rx="5" ry="7" fill={trunk} />
      )}
      {stage === 1 && (
        <>
          <path d="M50 86 L50 70" stroke={leaf} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <ellipse cx="43" cy="66" rx="8" ry="5" fill={leaf} transform="rotate(-28 43 66)" />
          <ellipse cx="57" cy="63" rx="8" ry="5" fill={leafSoft} transform="rotate(24 57 63)" />
        </>
      )}
      {stage === 2 && (
        <>
          <path d="M50 86 L50 52" stroke={trunk} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="42" r="16" fill={leaf} />
          <circle cx="39" cy="50" r="10" fill={leafSoft} />
        </>
      )}
      {stage === 3 && (
        <>
          <path d="M50 86 L50 46 M50 62 L38 52 M50 56 L61 47" stroke={trunk} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="34" r="17" fill={leaf} />
          <circle cx="34" cy="46" r="11" fill={leafSoft} />
          <circle cx="65" cy="42" r="12" fill={leaf} />
        </>
      )}
      {stage >= 4 && (
        <>
          <path d="M50 86 L50 42 M50 60 L35 48 M50 54 L66 42 M50 68 L62 60" stroke={trunk} strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="28" r="18" fill={leaf} />
          <circle cx="31" cy="40" r="13" fill={leafSoft} />
          <circle cx="69" cy="36" r="14" fill={leaf} />
          <circle cx="44" cy="44" r="11" fill={leafSoft} />
          <circle cx="60" cy="50" r="10" fill={leaf} />
          {stage === 5 && (
            <>
              <circle cx="41" cy="26" r="3.4" fill="#f3c8b2" />
              <circle cx="62" cy="30" r="3.4" fill="#f3c8b2" />
              <circle cx="52" cy="40" r="3" fill="#f7ddcf" />
              <circle cx="70" cy="45" r="2.8" fill="#f3c8b2" />
            </>
          )}
        </>
      )}
    </svg>
  )
}

/** 완독 나무(작은) — 정원 숲 */
function MiniTree({ i }: { i: number }) {
  const greens = ['#4e9c6f', '#5fae80', '#3e7d59', '#7cb894']
  const g = greens[i % greens.length]
  return (
    <svg viewBox="0 0 40 44" width={30} height={33} aria-hidden="true">
      <path d="M20 40 L20 26" stroke="#8a6d4f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="17" r="11" fill={g} />
      <circle cx="12" cy="23" r="6" fill={g} opacity="0.75" />
      <circle cx="28" cy="22" r="6.5" fill={g} opacity="0.85" />
    </svg>
  )
}

export function Garden() {
  const data = useAppData()
  const streak = calcStreak(data.logs)
  const stage = stageOf(streak)
  const year = String(new Date().getFullYear())
  const grove = data.books
    .filter((b) => b.status === 'done' && b.finishedAt?.startsWith(year))
    .sort((a, b) => (a.finishedAt || '').localeCompare(b.finishedAt || ''))

  return (
    <section className="card garden-card">
      <div className="garden-main">
        <Tree stage={stage} />
        <div className="garden-meta">
          <span className="garden-eyebrow">나의 결 정원</span>
          <b className="garden-status serif">{STAGE_LABEL[stage]}</b>
          <span className="muted small">
            {streak > 0
              ? `${streak}일째 물을 주고 있어요 · 기록이 이어질수록 자라나요`
              : '한 쪽을 기록하면 물을 준 거예요'}
          </span>
        </div>
      </div>

      {grove.length > 0 && (
        <div className="garden-grove">
          <span className="muted small">올해 완독의 숲 · {grove.length}그루</span>
          <div className="garden-grove-row">
            {grove.map((b, i) => (
              <span key={b.id} className="garden-grove-item" title={b.title}>
                <MiniTree i={i} />
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
