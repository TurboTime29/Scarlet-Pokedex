import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { create } from 'zustand'
import { formLabel, thumb, useEncounters } from '../data/db'
import type { Db } from '../data/types'
import { buildHunt, sortValue, spotCondition, type HuntEntry, type SortKey, type Spot } from '../lib/hunt'
import { TYPES, typeName } from '../lib/types'
import { usePrefs } from '../store/prefs'
import { CaughtToggle, Img, Types } from '../components/ui'
import { TIME_ICON, TIME_LABEL, noteIcon, rarity } from '../components/Encounters'

const SORTS: { id: SortKey; label: string; short: string }[] = [
  { id: 'bst', label: 'Base stat total (BST)', short: 'BST' },
  { id: 'top', label: 'BST once fully evolved', short: 'Final BST' },
  { id: 'atk', label: 'Attack', short: 'Atk' },
  { id: 'spa', label: 'Sp. Atk', short: 'SpA' },
  { id: 'spe', label: 'Speed', short: 'Spe' },
  { id: 'hp', label: 'HP', short: 'HP' },
  { id: 'def', label: 'Defense', short: 'Def' },
  { id: 'spd', label: 'Sp. Def', short: 'SpD' },
  { id: 'odds', label: 'Easiest to find', short: 'Odds' },
  { id: 'dex', label: 'Paldea dex number', short: '#' },
]

// Hunt settings survive leaving the tab (not saved across app restarts on purpose: it's a session tool).
const useHunt = create<{ sort: SortKey; notCaught: boolean; finalOnly: boolean; time: number | null; type: string; q: string }>(() => ({
  sort: 'bst', notCaught: true, finalOnly: false, time: null, type: '', q: '',
}))

export function FindTabs({ active }: { active: 'hunt' | 'map' }) {
  return (
    <div className="seg" role="tablist">
      <Link to="/hunt" role="tab" aria-selected={active === 'hunt'} className="flex-1 rounded-[10px] px-2 py-1.5 text-center font-semibold" style={active === 'hunt' ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--muted)' }}>🎯 Pokémon to hunt</Link>
      <Link to="/map" role="tab" aria-selected={active === 'map'} className="flex-1 rounded-[10px] px-2 py-1.5 text-center font-semibold" style={active === 'map' ? { background: 'var(--surface)', color: 'var(--text)' } : { color: 'var(--muted)' }}>🗺️ By area</Link>
    </div>
  )
}

export default function HuntPage({ db }: { db: Db }) {
  const enc = useEncounters()
  const { caught, shiny } = usePrefs()
  const st = useHunt()
  const set = useHunt.setState
  const caughtSet = useMemo(() => new Set(caught), [caught])
  const all = useMemo(() => (enc ? buildHunt(db, enc) : []), [db, enc])

  const list = useMemo(() => {
    const q = st.q.trim().toLowerCase()
    return all
      .filter((h) => !st.notCaught || !caughtSet.has(h.species.slug))
      .filter((h) => !st.finalOnly || h.final)
      .filter((h) => st.time == null || h.times[st.time])
      .filter((h) => !st.type || h.form.types.includes(st.type))
      .filter((h) => !q || h.species.name.toLowerCase().includes(q))
      .sort((a, b) => sortValue(b, st.sort, st.time) - sortValue(a, st.sort, st.time) || b.bst - a.bst)
  }, [all, st, caughtSet])

  if (!enc) return <p className="py-16 text-center text-sm muted">Loading spawns…</p>
  const sort = SORTS.find((s) => s.id === st.sort)!
  const caughtCount = all.filter((h) => caughtSet.has(h.species.slug)).length

  return (
    <div className="space-y-3">
      <FindTabs active="hunt" />
      <div className="sticky top-[calc(52px+env(safe-area-inset-top))] z-10 -mx-4 space-y-2 px-4 pb-2 pt-1" style={{ background: 'var(--bg)' }}>
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Sort by</span>
            <select className="input appearance-none pr-7 text-sm font-semibold" value={st.sort} onChange={(e) => set({ sort: e.target.value as SortKey })}>
              {SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs muted">▾</span>
          </label>
          <label className="relative w-28 shrink-0">
            <span className="sr-only">Type</span>
            <select className="input appearance-none pr-6 text-sm" value={st.type} onChange={(e) => set({ type: e.target.value })}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{typeName(t)}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs muted">▾</span>
          </label>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <button className="chip" aria-pressed={st.notCaught} onClick={() => set({ notCaught: !st.notCaught })}>Not caught yet</button>
          <button className="chip" aria-pressed={st.finalOnly} onClick={() => set({ finalOnly: !st.finalOnly })}>Fully evolved</button>
          <span className="mx-0.5 w-px shrink-0" style={{ background: 'var(--ring)' }} />
          <button className="chip" aria-pressed={st.time == null} onClick={() => set({ time: null })}>Any time</button>
          {[0, 1, 2, 3].map((t) => (
            <button key={t} className="chip" aria-pressed={st.time === t} onClick={() => set({ time: st.time === t ? null : t })}>{TIME_ICON[t]} {TIME_LABEL[t]}</button>
          ))}
        </div>
      </div>

      <p className="text-xs muted">
        <b style={{ color: 'var(--text)' }}>{list.length}</b> Pokémon you can catch yourself in Scarlet’s base game{st.time != null ? ` ${st.time === 3 ? 'at night' : `in the ${TIME_LABEL[st.time].toLowerCase()}`}` : ''}, sorted by {sort.id === 'odds' || sort.id === 'dex' ? sort.label.toLowerCase() : sort.label}.
        {' '}You’ve caught {caughtCount} of {all.length}. Wild spawns and fixed spots only — no gifts, trades, raids, Violet or DLC.
      </p>

      <ul className="space-y-1.5">
        {list.map((h, i) => <HuntRow key={h.form.slug} h={h} rank={i + 1} sortKey={st.sort} sortShort={sort.short} time={st.time} shiny={shiny} />)}
      </ul>
      {!list.length && <p className="py-10 text-center text-sm muted">{st.notCaught ? 'Nothing left to catch with these filters — nice work!' : 'No Pokémon match these filters.'}</p>}
    </div>
  )
}

function placeOf(sp: Spot): string {
  const loc = sp.kind === 'wild' ? sp.w.loc : sp.x.loc
  const sub = sp.kind === 'wild' ? sp.w.sub : undefined
  return sub ? `${loc} · ${sub}` : loc
}

function HuntRow({ h, rank, sortKey, sortShort, time, shiny }: { h: HuntEntry; rank: number; sortKey: SortKey; sortShort: string; time: number | null; shiny: boolean }) {
  const { species: s, form: f } = h
  // best spot for the chosen time (fixed spots always count)
  const spots = time == null ? h.spots : h.spots.filter((sp) => sp.kind === 'fixed' || sp.w.p[time] > 0)
  const best = spots[0]
  const cond = best ? spotCondition(best) : ''
  const onlyTimes = h.times.every(Boolean) ? null : [0, 1, 2, 3].filter((t) => h.times[t])
  const value = sortKey === 'top' ? h.topBst : sortKey === 'odds' || sortKey === 'dex' ? h.bst : sortValue(h, sortKey, time)
  const wildPct = best?.kind === 'wild' ? (time == null ? Math.max(...best.w.p) : best.w.p[time]) : null
  const rar = wildPct != null ? rarity(wildPct) : null
  return (
    <li className="card flex items-stretch gap-2 p-2" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 96px' }}>
      <Link to={`/p/${s.slug}${f.default ? '' : `/${f.slug}`}`} className="flex min-w-0 flex-1 gap-2">
        <span className="flex w-12 shrink-0 flex-col items-center">
          <span className="text-[10px] font-bold tabular-nums muted">#{rank}</span>
          <Img src={thumb(f, shiny)} alt="" size={48} className="h-12 w-12 object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-semibold">{s.name}</span>
            {!f.default && f.label && <span className="text-[11px] muted">{formLabel(f)}</span>}
            {f.ver === 'scarlet' && <span className="text-[10px] font-bold text-scarlet-600">Scarlet only</span>}
          </span>
          <Types types={f.types} size="sm" />
          {best && (
            <span className="mt-1 block text-[11px] leading-snug">
              <span aria-hidden>{best.kind === 'wild' ? '📍' : '📌'}</span>{' '}
              <span className="font-semibold">{placeOf(best)}</span>
              <span className="muted">
                {best.kind === 'wild' ? ` · ${best.w.b} · Lv ${best.w.lv}` : ` · ${best.x.where === 'Fixed' ? 'fixed spot' : best.x.where} · Lv ${best.x.lv}`}
              </span>
              {spots.length > 1 && <span className="muted"> · +{spots.length - 1} more {spots.length === 2 ? 'spot' : 'spots'}</span>}
            </span>
          )}
          <span className="mt-0.5 flex flex-wrap gap-1">
            {cond && <Badge tone="amber">{noteIcon(cond)} {short(cond)}</Badge>}
            {onlyTimes && <Badge tone="indigo">{onlyTimes.map((t) => TIME_ICON[t]).join('')} {onlyTimes.map((t) => TIME_LABEL[t]).join(' & ')} only</Badge>}
            {best?.kind === 'wild' && best.w.n && !cond && <Badge tone="plain">{noteIcon(best.w.n)} {short(best.w.n)}</Badge>}
            {!h.final && h.topName && <Badge tone="plain">→ {h.topName} {h.topBst}</Badge>}
          </span>
        </span>
      </Link>
      <span className="flex shrink-0 flex-col items-end justify-between">
        <span className="text-right leading-tight">
          <span className="block text-lg font-black tabular-nums">{value}</span>
          <span className="block text-[9px] font-bold uppercase muted">{sortKey === 'odds' || sortKey === 'dex' ? 'BST' : sortShort}</span>
        </span>
        {rar && wildPct != null ? <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${rar.cls}`}>{wildPct}%</span> : <span className="text-[9px] font-bold muted">fixed</span>}
      </span>
      <span className="flex items-center"><CaughtToggle species={s.slug} size={24} /></span>
    </li>
  )
}

/** Notes trimmed to a badge: "This Pokémon only appears after beating the main story." -> "After the main story". */
function short(n: string): string {
  if (/main story/i.test(n)) return 'After the main story'
  if (/titan/i.test(n)) return 'After its Titan battle'
  if (/tree/i.test(n)) return 'Spawns in trees'
  if (/disguise/i.test(n)) return 'May be disguised'
  return n.replace(/^This Pokémon (can )?only /, 'Only ').replace(/\.$/, '').slice(0, 60)
}

function Badge({ tone, children }: { tone: 'amber' | 'indigo' | 'plain'; children: ReactNode }) {
  const cls = tone === 'amber' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200' : tone === 'indigo' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200' : 'muted'
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cls}`} style={tone === 'plain' ? { background: 'var(--surface-2)' } : undefined}>{children}</span>
}
