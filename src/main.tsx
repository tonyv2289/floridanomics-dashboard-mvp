import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Each deploy replaces the hashed chunks, so a visitor holding an older page can fail to load a view it has not opened yet.
// Reload once to pick up the new build; the session flag stops a loop if the chunk is genuinely missing.
const CHUNK_RELOAD_KEY = 'fn:chunk-reload'
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => {
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }, 10000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker (cache-first for immutable assets) to beat the Pages cache ceiling.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Service worker is a progressive enhancement; ignore registration failures.
    })
  })
}
