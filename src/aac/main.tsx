import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './aac.css'

ReactDOM.createRoot(document.getElementById('aac-root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 앱 셸 오프라인 캐시 (독서앱과 동일한 서비스워커·스코프 재사용)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
