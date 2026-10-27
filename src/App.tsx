import { Suspense, lazy, type ComponentType } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useDb } from './data/db'
import type { Db } from './data/types'
import { ErrorBoundary, isStaleChunkError, reloadOnceForStaleChunk, rememberError } from './components/ErrorBoundary'
import { Pokeball, ShinyButton } from './components/ui'
import DexList from './pages/DexList'

/** lazy() that survives a deploy happening while the app is open: a missing chunk reloads the app once. */
function L<T extends { default: ComponentType<{ db: Db }> }>(f: () => Promise<T>) {
  return lazy(() => f().catch((e: unknown) => {
    rememberError(e, 'chunk')
    if (isStaleChunkError(e) && reloadOnceForStaleChunk()) return new Promise<T>(() => {})
    throw e
  }))
}

const PokemonPage = L(() => import('./pages/PokemonPage'))
const CountersPage = L(() => import('./pages/CountersPage'))
const TeamPage = L(() => import('./pages/TeamPage'))
const TypeChartPage = L(() => import('./pages/TypeChartPage') as Promise<{ default: ComponentType<{ db: Db }> }>)

const tabs = [
  { to: '/', label: 'Pokédex', icon: '📕', end: true },
  { to: '/counters', label: 'Beat a type', icon: '⚔️' },
  { to: '/team', label: 'My Team', icon: '★' },
  { to: '/types', label: 'Type chart', icon: '🔢' },
]

export default function App() {
  const { db, error } = useDb()
  const loc = useLocation()
  const nav = useNavigate()
  const isDetail = loc.pathname.startsWith('/p/')

  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-20 bg-scarlet-600 text-white shadow-md">
        <div className="mx-auto flex h-[52px] max-w-3xl items-center gap-2 px-4">
          {isDetail ? (
            <button className="-ml-2 rounded-full px-2 py-1 text-lg font-bold" aria-label="Back" onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav('/'))}>‹ Back</button>
          ) : (
            <span className="flex items-center gap-2"><Pokeball size={22} /><span className="font-display text-lg font-extrabold">Scarlet Pokédex</span></span>
          )}
          <span className="flex-1" />
          <ShinyButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-[calc(76px+env(safe-area-inset-bottom))] pt-2">
        {error ? (
          <div className="card mt-8 p-5 text-center">
            <p className="font-bold">Couldn’t load the Pokédex data.</p>
            <p className="mt-1 text-sm muted">{String((error as Error).message ?? error)}</p>
            <button className="btn-primary mt-3" onClick={() => window.location.reload()}>Try again</button>
          </div>
        ) : !db ? (
          <div className="grid place-items-center py-24"><Pokeball size={48} className="animate-spin" /></div>
        ) : (
          <ErrorBoundary key={loc.pathname}>
            <Suspense fallback={<div className="grid place-items-center py-24"><Pokeball size={40} className="animate-spin" /></div>}>
              <Routes>
                <Route path="/" element={<DexList db={db} />} />
                <Route path="/p/:slug/:form?" element={<PokemonPage db={db} />} />
                <Route path="/counters" element={<CountersPage db={db} />} />
                <Route path="/team" element={<TeamPage db={db} />} />
                <Route path="/types" element={<TypeChartPage db={db} />} />
                <Route path="*" element={<DexList db={db} />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        )}
        {db && <p className="mt-8 text-center text-[10px] muted">Data: PokeAPI · exclusives from Bulbapedia &amp; Serebii · built {db.meta.built} · app {__BUILD_TIME__}. Pokémon © Nintendo / Game Freak; fan-made, not affiliated.</p>}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--surface) 88%, transparent)', borderColor: 'var(--ring)' }}>
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-scarlet-600' : 'muted'}`}>
              <span className="text-lg leading-none">{t.icon}</span>{t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
