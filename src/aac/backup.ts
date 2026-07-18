// 백업·복원 — 카드·사진·설정·사용 기록을 파일 하나로 내보내고 불러옵니다.
// 기기를 바꾸거나 태블릿에 옮길 때 사용. 일레븐랩스 API 키는 보안상 백업에서 제외합니다.

import { getState, restoreFromBackup, type Settings } from './store'
import { getImage, putImage } from './images'
import type { Card } from './data'

const BACKUP_APP = 'maeummal'
const BACKUP_VERSION = 1

type BackupFile = {
  app: string
  version: number
  exportedAt: string
  settings: Partial<Settings>
  customCards: Card[]
  hiddenIds: string[]
  usage: Record<string, number>
  images: Record<string, string> // 이미지 id → data URL
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  return await res.blob()
}

export async function exportBackup(): Promise<void> {
  const state = getState()

  // 사진 카드의 이미지를 data URL로 담는다
  const images: Record<string, string> = {}
  for (const card of state.customCards) {
    if (!card.image) continue
    const blob = await getImage(card.image)
    if (blob) images[card.image] = await blobToDataUrl(blob)
  }

  const { elevenApiKey: _omit, ...safeSettings } = state.settings
  const data: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: safeSettings,
    customCards: state.customCards,
    hiddenIds: state.hiddenIds,
    usage: state.usage,
    images,
  }

  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `마음말-백업-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<{ cards: number; images: number }> {
  const text = await file.text()
  let data: BackupFile
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('백업 파일이 아니에요')
  }
  if (data.app !== BACKUP_APP || typeof data.version !== 'number') {
    throw new Error('마음말 백업 파일이 아니에요')
  }
  if (data.version > BACKUP_VERSION) {
    throw new Error('더 새로운 버전의 백업이에요. 앱을 업데이트해 주세요')
  }

  // 이미지 먼저 복원(카드가 참조하므로)
  let imageCount = 0
  for (const [id, dataUrl] of Object.entries(data.images ?? {})) {
    try {
      await putImage(id, await dataUrlToBlob(dataUrl))
      imageCount++
    } catch {
      /* 개별 이미지 실패는 건너뜀 — 카드는 이모지 없이도 표시됨 */
    }
  }

  restoreFromBackup({
    settings: data.settings,
    customCards: data.customCards ?? [],
    hiddenIds: data.hiddenIds ?? [],
    usage: data.usage ?? {},
  })

  return { cards: (data.customCards ?? []).length, images: imageCount }
}
