import { useRef, useState, type PointerEvent } from 'react'

// 길게 누르기(보호자 잠금)용 훅.
// enabled=false면 일반 탭으로 즉시 실행. enabled=true면 duration 만큼 눌러야 실행되고,
// 짧게 떼면 onTooShort(안내 힌트)로 알립니다.
export function useHold(
  onActivate: () => void,
  enabled: boolean,
  duration = 600,
  onTooShort?: () => void,
) {
  const timer = useRef<number | null>(null)
  const fired = useRef(false)
  const [holding, setHolding] = useState(false)

  function clear() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setHolding(false)
  }

  function onPointerDown(e: PointerEvent) {
    if (!enabled) return
    e.preventDefault()
    fired.current = false
    setHolding(true)
    timer.current = window.setTimeout(() => {
      fired.current = true
      clear()
      onActivate()
    }, duration)
  }

  function onPointerUp() {
    if (!enabled) return
    const wasFired = fired.current
    clear()
    if (!wasFired) onTooShort?.()
  }

  function onPointerLeave() {
    if (!enabled) return
    clear()
  }

  function onClick() {
    // 잠금이 꺼져 있으면 일반 클릭으로 실행
    if (!enabled) onActivate()
  }

  return { holding, handlers: { onPointerDown, onPointerUp, onPointerLeave, onClick } }
}
