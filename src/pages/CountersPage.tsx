import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { thumb } from '../data/db'
import type { Db } from '../data/types'
import { findCounters } from '../lib/counters'
import { TYPES, TYPE_COLORS, typeName, type Type } from '../lib/types'
import { usePrefs } from '../store/prefs'
import { Img, Toggle, Types, VersionBadge } from '../components/ui'

const mult = (m: number) => (m === 0.25 ? '¼×' : m === 0.5 ? '½×' : `${m}×`)
const PAGE = 40

export default function CountersPage({ db }: { db: Db }) {
  const [params, setParams] = useSearchParams()
  const picked = (params.get('t') ?? '').split(',').filter((t): t is Type => (TYPES as readonly string[]).includes(t)).slice(0, 2)
  const { caught, team, shiny, dlc } = usePrefs()
  const [includeViolet, setIncludeViolet] = useState(false)
  const [finalOnly, setFinalOnly] = useState(true)
  const [scope, setScope] = useState<'all' | 'caught' | 'team'>('all')
  const [limit, setLimit] = useState(PAGE)

  const only = useMemo(() => {
    if (scope === 'caught') return new Set(caught)
    if (scope === 'team') return new Set(team.map((f) => db.formBySlug.get(f)?.species.slug ?? ''))
    return undefined
  }, [scope, caught, team, db])

  const results = useMemo(
    // Without the DLC, DLC Pokémon stay out of every list, including caught/team marks made while browsing the DLC dexes.
    () => findCounters(db, picked, { includeViolet, finalOnly: finalOnly && scope === 'all', only, baseGameOnly: !dlc }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, picked.join(), includeViolet, finalOnly, scope, only, dlc],
  )

  const toggleType = (t: Type) => {
    const next = picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t].slice(-2)
    setParams(next.length ? { t: next.join(',') } : {}, { replace: true })
    setLimit(PAGE)
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-extrabold">Beat a type</h1>
          <Link to="/types" className="text-xs font-semibold text-scarlet-600">🔢 Full type chart</Link>
        </div>
        <p className="text-sm muted">Pick the opponent’s type (up to two, like a Tera Raid or a dual-type Pokémon). You’ll see Pokémon whose own type hits it super-effectively — best switch-ins first.</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {TYPES.map((t) => {
          const on = picked.includes(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              aria-pressed={on}
              className={`type-badge h-9 rounded-xl text-xs transition-transform active:scale-95 ${on ? 'ring-4 ring-offset-2' : picked.length ? 'opacity-45' : ''}`}
              style={{ background: TYPE_COLORS[t], ['--tw-ring-color' as string]: TYPE_COLORS[t], ['--tw-ring-offset-color' as string]: 'var(--bg)' }}
            >
              {typeName(t)}
            </button>
          )
        })}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        <div className="seg shrink-0" role="tablist">
          {(['all', 'caught', 'team'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={scope === s} onClick={() => setScope(s)}>
              {s === 'all' ? 'All Pokémon' : s === 'caught' ? `I’ve caught (${caught.length})` : `My team (${team.length})`}
            </button>
          ))}
        </div>
        {scope === 'all' && <Toggle on={finalOnly} onChange={setFinalOnly} label="Fully evolved only" />}
        <Toggle on={includeViolet} onChange={setIncludeViolet} label="Include Violet-only" />
      </div>

      {!picked.length ? (
        <p className="py-8 text-center text-sm muted">Tap a type above to start.</p>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-semibold">{results.length}</span> Pokémon hit <Types types={picked} size="sm" /> super-effectively.
            {picked.length === 2 && <span className="muted"> Opponent STAB checked for both types.</span>}
            {!dlc && <span className="muted"> Base game only — <Link to="/settings" className="font-semibold text-scarlet-600">DLC Pokémon hidden</Link>.</span>}
          </p>
          {!results.length && (
            <p className="py-6 text-center text-sm muted">
              {scope === 'all' ? 'Nothing found — try including Violet-only Pokémon.' : scope === 'caught' ? 'None of your caught Pokémon have a super-effective type. Mark more as caught, or look at All Pokémon.' : 'Nobody on your team hits this super-effectively.'}
            </p>
          )}
          <ul className="space-y-1.5">
            {results.slice(0, limit).map((c) => (
              <li key={c.species.slug}>
                <Link to={`/p/${c.species.slug}${c.form.default ? '' : `/${c.form.slug}`}`} className={`card flex items-center gap-3 p-2 active:scale-[0.99] ${c.form.ver === 'violet' ? 'opacity-70' : ''}`}>
                  <Img src={thumb(c.form, shiny)} alt="" size={52} className="h-[52px] w-[52px] shrink-0 object-contain" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><span className="truncate font-semibold">{c.species.name}</span><VersionBadge form={c.form} /></span>
                    <Types types={c.form.types} size="sm" />
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-[10px] font-bold">
                    <span className={`rounded-full px-2 py-0.5 ${c.hits >= 4 ? 'bg-emerald-600 text-white' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'}`}>Hits {mult(c.hits)}</span>
                    <span className={`rounded-full px-2 py-0.5 ${c.takes < 1 ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : c.takes > 1 ? 'bg-red-500/15 text-red-600' : 'muted'}`} style={c.takes === 1 ? { background: 'var(--surface-2)' } : undefined}>
                      Takes {mult(c.takes)}
                    </span>
                    <span className="muted">BST {c.bst}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {results.length > limit && <button className="btn-ghost w-full" onClick={() => setLimit(limit + PAGE)}>Show more ({results.length - limit} left)</button>}
          <p className="text-[11px] muted">“Hits” = best damage from its own type. “Takes” = worst damage it takes from the opponent’s own type (lower is safer). Sorted by safe switch-ins first, then damage, then base stat total.</p>
        </>
      )}
    </div>
  )
}
