import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEncounters } from '../data/db'
import { DEXES, type Db } from '../data/types'
import { buildPlaces, type Place } from '../lib/locations'
import { isDlcForm } from '../lib/dlc'
import { usePrefs } from '../store/prefs'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Species catchable here in this player's game (Scarlet, DLC setting respected). */
export function speciesHere(p: Place, dlc: boolean): Set<string> {
  const out = new Set<string>()
  for (const sub of p.subs) for (const b of sub.biomes) for (const r of b.rows) {
    if (r.w.v === 'violet' || (!dlc && isDlcForm(r.species, r.form))) continue
    out.add(r.species.slug)
  }
  return out
}

export default function MapPage({ db }: { db: Db }) {
  const enc = useEncounters()
  const dlc = usePrefs((s) => s.dlc)
  const [q, setQ] = useState('')
  const places = useMemo(() => (enc ? buildPlaces(db, enc) : []), [db, enc])
  const query = norm(q)
  // a search matches area names, sub-area names, or a Pokémon that spawns there
  const matches = (p: Place) => {
    if (!query) return true
    if (norm(p.name).includes(query) || p.subs.some((s) => s.name && norm(s.name).includes(query))) return true
    return [...speciesHere(p, dlc)].some((slug) => norm(db.bySlug.get(slug)!.name).includes(query))
  }
  if (!enc) return <p className="py-16 text-center text-sm muted">Loading the map…</p>
  const regions = DEXES.filter((d) => dlc || d.id === 'paldea')

  return (
    <div className="space-y-4">
      <div className="sticky top-[calc(52px+env(safe-area-inset-top))] z-10 -mx-4 space-y-2 px-4 pb-2 pt-2" style={{ background: 'var(--bg)' }}>
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-extrabold">Map</h1>
          {!dlc && <Link to="/settings" className="text-[11px] font-semibold text-scarlet-600">DLC areas hidden · change</Link>}
        </div>
        <div className="relative">
          <input className="input pl-9" type="search" placeholder="Search an area or a Pokémon…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search areas" />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted">🔍</span>
        </div>
      </div>

      {regions.map((d) => {
        const list = places.filter((p) => p.r === d.id && matches(p))
        if (!list.length) return null
        return (
          <section key={d.id}>
            <h2 className="section-title">{d.label} · {list.length} {list.length === 1 ? 'area' : 'areas'}</h2>
            <ul className="card divide-y overflow-hidden" style={{ borderColor: 'var(--ring)' }}>
              {list.map((p) => {
                const n = speciesHere(p, dlc).size
                const subs = p.subs.filter((s) => s.name).length
                return (
                  <li key={p.key} style={{ borderColor: 'var(--ring)' }}>
                    <Link to={`/map/${p.key}`} className="flex items-center gap-2 px-3 py-2.5 active:bg-black/5">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-tight">{p.name}</span>
                        <span className="text-[11px] muted">
                          {n} Pokémon{subs ? ` · ${subs} sub-areas` : ''}{p.fixed.length ? ` · ${p.fixed.length} fixed spots` : ''}
                          {query && !norm(p.name).includes(query) ? ` · has “${q}”` : ''}
                        </span>
                      </span>
                      <span className="muted">›</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {places.filter(matches).filter((p) => regions.some((d) => d.id === p.r)).length === 0 && <p className="py-10 text-center text-sm muted">No areas match “{q}”.</p>}
    </div>
  )
}
