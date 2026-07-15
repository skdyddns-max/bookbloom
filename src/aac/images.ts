// 사용자 사진 카드 저장소.
// 사진은 용량이 커서 localStorage 대신 IndexedDB(aac_images)에 Blob으로 저장하고,
// 카드에는 이미지 id만 보관합니다. 업로드 시 축소·압축해 저장·렌더 부담을 줄입니다.

const DB_NAME = 'aac_images'
const STORE = 'img'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function newImageId(): string {
  try {
    return `img_${crypto.randomUUID()}`
  } catch {
    return `img_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`
  }
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getImage(id: string): Promise<Blob | undefined> {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => resolve(undefined)
    })
  } catch {
    return undefined
  }
}

export async function deleteImage(id: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    /* ignore */
  }
}

// 화면 표시용 object URL 캐시(같은 사진을 반복 생성하지 않도록)
const urlCache = new Map<string, string>()

export async function getImageUrl(id: string): Promise<string | undefined> {
  const cached = urlCache.get(id)
  if (cached) return cached
  const blob = await getImage(id)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  urlCache.set(id, url)
  return url
}

export function dropImageUrl(id: string): void {
  const url = urlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(id)
  }
}

// 업로드한 사진을 정사각형에 맞춰 축소·압축(카드가 정사각형이라 가운데를 채움)
export async function processImageFile(
  file: File,
  size = 512,
  quality = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    throw new Error('canvas 미지원')
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close?.()

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))),
      'image/jpeg',
      quality,
    )
  })
}
