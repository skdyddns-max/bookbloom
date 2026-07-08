/** Tesseract.js를 CDN에서 지연 로드해 사진 속 문장을 추출 (베타) */

declare global {
  interface Window {
    Tesseract?: {
      recognize: (
        image: File | string,
        langs: string,
        options?: { logger?: (m: { status: string; progress: number }) => void },
      ) => Promise<{ data: { text: string } }>
    }
  }
}

let loading: Promise<void> | null = null

function loadTesseract(): Promise<void> {
  if (window.Tesseract) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('OCR 엔진을 불러오지 못했어요. 네트워크를 확인해 주세요.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export async function ocrImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  await loadTesseract()
  const result = await window.Tesseract!.recognize(file, 'kor+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  return result.data.text.replace(/\n{3,}/g, '\n\n').trim()
}
