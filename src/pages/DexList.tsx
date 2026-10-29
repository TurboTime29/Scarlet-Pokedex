import { useEffect, useLayoutEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { create } from 'zustand'
import { dexForm, formLabel, pad, thumb } from '../data/db'
import { DEXES, type Db, type DexId, type Species } from '../data/types'
import { searchSpecies } from '../lib/search'
import { usePrefs, type CaughtFilter } from '../store/prefs'
import { CaughtToggle, Img, Toggle, Types, VersionBadge } from '../components/ui'

// Search text and scroll position survive opening a Pokémon and coming back.
const useListState = create<{ q: string; scroll: Record<string, number> }>(() => ({ q: '', scroll: {} }))

const FILTERS: { id: CaughtFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'caught', label: 'Caught' },
  { id: 'missing', label: 'Not caught' },
  { id: 'team', label: 'My Team' },
]

export default function DexList({ db }: { db: Db }) {
  const { dex: savedDex, setDex, filter, setFilter, hideViolet, setHideViolet, shiny, caught, team, dlc } = usePrefs()
  // without the DLC only the Paldea dex exists
  const dex: DexId = dlc ? savedDex : 'paldea'
  const dexes = dlc ? DEXES : DEXES.filter((d) => d.id === 'paldea')
  const q = useListState((s) => s.q)
  const caughtSet = useMemo(() => new Set(caught), [caught])
  const teamSpecies = useMemo(() => new Set(team.map((f) => db.formBySlug.get(f)?.species.slug)), [team, db])

  const inDex = useMemo(() => db.dexes[dex].map((slug) => db.bySlug.get(slug)!).filter(Boolean), [db, dex])
  const shown = useMemo(() => {
    let list = inDex
    if (hideViolet) list = list.filter((s) => dexForm(s, dex).ver !== 'violet')
    if (filter === 'caught') list = list.filter((s) => caughtSet.has(s.slug))
    if (filter === 'missing') list = list.filter((s) => !caughtSet.has(s.slug))
    if (filter === 'team') list = list.filter((s) => teamSpecies.has(s.slug))
    return searchSpecies(db.species, list, q, dex, (s) => dexForm(s, dex).types)
  }, [inDex, hideViolet, filter, caughtSet, teamSpecies, q, dex, db])

  const elsewhere = useMemo(() => {
    if (!q.trim() || shown.length) return []
    return dexes.filter((d) => d.id !== dex).map((d) => ({
      ...d, n: searchSpecies(db.species, db.dexes[d.id].map((s) => db.bySlug.get(s)!), q, d.id, (s) => dexForm(s, d.id).types).length,
    })).filter((d) => d.n)
  }, [q, shown.length, dex, db, dexes])

  const caughtInDex = inDex.filter((s) => caughtSet.has(s.slug)).length

  // restore scroll per dex tab
  useLayoutEffect(() => { window.scrollTo(0, useListState.getState().scroll[dex] ?? 0) }, [dex])
  useEffect(() => {
    const save = () => useListState.setState((s) => ({ scroll: { ...s.scroll, [dex]: window.scrollY } }))
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [dex])

  return (
    <div>
      <div className="sticky top-[calc(52px+env(safe-area-inset-top))] z-10 -mx-4 space-y-2 px-4 pb-2 pt-2" style={{ background: 'var(--bg)' }}>
        {!dlc && (
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <span className="font-display text-base font-bold">Paldea Pokédex <span className="text-xs font-normal muted">{caughtInDex}/{inDex.length}</span></span>
            <Link to="/settings" className="text-[11px] font-semibold text-scarlet-600">DLC Pokémon hidden · change</Link>
          </div>
        )}
        {dlc && <div className="seg" role="tablist">
          {DEXES.map((d) => {
            const total = db.dexes[d.id].length
            const got = db.dexes[d.id].filter((s) => caughtSet.has(s)).length
            return (
              <button key={d.id} role="tab" aria-selected={dex === d.id} onClick={() => setDex(d.id)}>
                {d.short}<span className="ml-1 font-normal opacity-70">{got}/{total}</span>
              </button>
            )
          })}
        </div>}
        <div className="relative">
          <input
            className="input pl-9"
            type="search"
            inputMode="search"
            placeholder="Search name, number or type…"
            value={q}
            onChange={(e) => useListState.setState({ q: e.target.value })}
            aria-label="Search Pokémon"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted">🔍</span>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}{f.id === 'team' && team.length ? ` (${team.length})` : ''}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0" style={{ background: 'var(--ring)' }} />
          <Toggle on={hideViolet} onChange={setHideViolet} label="Hide Violet-only" />
        </div>
      </div>

      <p className="mb-2 mt-1 text-xs muted">
        {shown.length} shown · {caughtInDex} of {inDex.length} caught in the {DEXES.find((d) => d.id === dex)!.short} dex
      </p>

      <ul className="card divide-y overflow-hidden" style={{ borderColor: 'var(--ring)' }}>
        {shown.map((s) => <Row key={s.slug} s={s} dex={dex} shiny={shiny} />)}
      </ul>

      {!shown.length && (
        <div className="py-10 text-center text-sm muted">
          {elsewhere.length ? (
            <>No match in this dex. Found in{' '}
              {elsewhere.map((d, i) => (
                <span key={d.id}>{i > 0 && ' and '}<button className="font-semibold text-scarlet-600 underline" onClick={() => setDex(d.id)}>{d.short} ({d.n})</button></span>
              ))}.
            </>
          ) : filter === 'caught' || filter === 'team' ? (
            filter === 'team' ? 'No team yet. Open a Pokémon and tap “Add to team”.' : 'Nothing caught yet. Tap the Poké Ball on a row to mark it caught.'
          ) : 'No Pokémon match that search.'}
        </div>
      )}
    </div>
  )
}

function Row({ s, dex, shiny }: { s: Species; dex: DexId; shiny: boolean }) {
  const f = dexForm(s, dex)
  const violet = f.ver === 'violet'
  return (
    <li className="dex-row flex items-center pr-1.5" style={{ borderColor: 'var(--ring)' }}>
      <Link to={`/p/${s.slug}${f.default ? '' : `/${f.slug}`}`} className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pl-3 active:bg-black/5">
        <span className="w-10 shrink-0 font-mono text-sm font-bold tabular-nums muted">#{pad(s.dex[dex]!)}</span>
        <Img src={thumb(f, shiny)} alt="" size={52} className={`h-[52px] w-[52px] shrink-0 object-contain ${violet ? 'violet-only' : ''}`} />
        <span className={`min-w-0 flex-1 ${violet ? 'opacity-70' : ''}`}>
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span className="truncate font-semibold">{s.name}</span>
            {!f.default && f.label && <span className="text-xs muted">{formLabel(f)}</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1">
            <Types types={f.types} size="sm" />
            <VersionBadge form={f} />
          </span>
        </span>
      </Link>
      <CaughtToggle species={s.slug} size={26} />
    </li>
  )
}
