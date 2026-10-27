import { Component, type ReactNode } from 'react'

const RELOAD_KEY = 'scarlet-chunk-reload'

/** True for "a lazily loaded page chunk is gone", which happens when a new build is deployed while the app is open. */
export function isStaleChunkError(e: unknown) {
  const m = String((e as Error)?.message ?? e)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch|Load failed|ChunkLoadError|MIME type/i.test(m)
}

/** Reload once to pick up the new build; returns false if we already tried (avoids a reload loop). */
export function reloadOnceForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return false // reloaded for this reason less than a minute ago: a real error, not a stale build
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch { /* storage blocked: still reload once */ }
  window.location.reload()
  return true
}

export function rememberError(e: unknown, where: string) {
  try { localStorage.setItem('scarlet-last-error', JSON.stringify({ at: new Date().toISOString(), where, message: String((e as Error)?.message ?? e), stack: String((e as Error)?.stack ?? '').slice(0, 800) })) } catch { /* ignore */ }
}

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error) {
    rememberError(error, 'render')
    if (isStaleChunkError(error) && reloadOnceForStaleChunk()) return
  }
  componentDidUpdate(_: unknown, prev: State) {
    // clear the error when the route changes underneath us (children re-rendered by the parent)
    if (prev.error && this.state.error && prev.error !== this.state.error) return
  }
  reset = () => this.setState({ error: null })
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const stale = isStaleChunkError(error)
    return (
      <div className="card fade-up mx-auto mt-6 max-w-md p-5 text-center">
        <div className="text-4xl">{stale ? '🔄' : '💥'}</div>
        <h2 className="mt-2 font-display text-lg font-bold">{stale ? 'A new version was installed' : 'Something went wrong'}</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{stale ? 'Reload to finish updating the app.' : 'Your caught list is safe. Reload the app to continue.'}</p>
        {!stale && <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-stone-100 p-2 text-left text-[11px] text-stone-600 dark:bg-stone-800 dark:text-stone-300">{error.message}</pre>}
        <div className="mt-3 flex justify-center gap-2">
          <button className="btn-primary" onClick={() => { try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* ignore */ } window.location.reload() }}>Reload app</button>
          <a className="btn-ghost" href="#/" onClick={this.reset}>Go home</a>
        </div>
      </div>
    )
  }
}
