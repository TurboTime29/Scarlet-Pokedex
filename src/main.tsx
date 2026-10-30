import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { isStaleChunkError, reloadOnceForStaleChunk, rememberError } from './components/ErrorBoundary'

// A deploy while the app is open leaves it pointing at chunks that no longer exist: reload once to pick up the new build.
window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); rememberError((e as unknown as { payload?: unknown }).payload ?? e, 'preload'); reloadOnceForStaleChunk() })
window.addEventListener('unhandledrejection', (e) => { rememberError(e.reason, 'promise'); if (isStaleChunkError(e.reason)) reloadOnceForStaleChunk() })
window.addEventListener('error', (e) => rememberError(e.error ?? e.message, 'window'))

// A home-screen app on iPhone can stay open for days and only looks for updates on a cold launch:
// also check whenever it comes back to the foreground (autoUpdate then reloads into the new version).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.update().catch(() => {}))).catch(() => {})
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
