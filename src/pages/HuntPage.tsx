import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { create } from 'zustand'
import { formLabel, pad, placeKey, thumb, useEncounters } from '../data/db'
import type { Db } from '../data/types'
import { METHOD_ORDER, buildHunt, methodOf, sortValue, spotCondition, type HuntEntry, type Method, type SortKey, type Spot, type Via } from '../lib/hunt'
import { TYPES, typeName } from '../lib/types'
import { usePrefs } from '../store/prefs'
import { CaughtToggle, Img, TargetStar, Types } from '../components/ui'
import { TIME_ICON, TIME_LABEL, noteIcon, rarity } from '../components/Encounters'
import { CodeChip, TradeLine, monName } from '../components/LinkCodes'

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
const useHunt = create<{ sort: SortKey; notCaught: boolean; finalOnly: boolean; targetsOnly: boolean; how: Method | null; time: number | null; type: string; q: string }>(() => ({
  sort: 'dex', notCaught: true, finalOnly: false, targetsOnly: false, how: null, time: null, type: '', q: '',
}))

const METHOD: Record<Method, { icon: string; label: string; pill: string }> = {
  catch: { icon: '🎯', label: 'Catch', pill: '' },
  evolve: { icon: '🧬', label: 'Evolve', pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  trade: { icon: '🔁', label: 'Trade', pill: 'bg-violet-sv/15 text-violet-sv' },
  special: { icon: '🎁', label: 'Gift & special', pill: 'bg-amber-500/15 text-amber-800 dark:text-amber-200' },
}

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
  const { caught, shiny, wanted } = usePrefs()
  const wantedSet = useMemo(() => new Set(wanted), [wanted])
  const st = useHunt()
  const set = useHunt.setState
  const caughtSet = useMemo(() => new Set(caught), [caught])
  const all = useMemo(() => (enc ? buildHunt(db, enc) : []), [db, enc])

  // everything but the method filter, so the method counts match what each one would show
  const filtered = useMemo(() => {
    const q = st.q.trim().toLowerCase()
    return all
      .filter((h) => !st.notCaught || !caughtSet.has(h.species.slug))
      .filter((h) => !st.finalOnly || h.final)
      .filter((h) => !st.targetsOnly || wantedSet.has(h.form.slug))
      .filter((h) => st.time == null || h.times[st.time])
      .filter((h) => !st.type || h.form.types.includes(st.type))
      .filter((h) => !q || h.species.name.toLowerCase().includes(q))
      .sort((a, b) => sortValue(b, st.sort, st.time) - sortValue(a, st.sort, st.time) || b.bst - a.bst)
  }, [all, st.q, st.notCaught, st.finalOnly, st.targetsOnly, st.time, st.type, st.sort, caughtSet, wantedSet])
  const list = useMemo(() => (st.how ? filtered.filter((h) => methodOf(h) === st.how) : filtered), [filtered, st.how])
  // counted per species (forms like Squawkabilly's plumages are one dex entry)
  const byMethod = useMemo(() => {
    const n = { catch: new Set<string>(), evolve: new Set<string>(), trade: new Set<string>(), special: new Set<string>() }
    for (const h of filtered) n[methodOf(h)].add(h.species.slug)
    return n
  }, [filtered])
  const shownSpecies = useMemo(() => new Set(list.map((h) => h.species.slug)).size, [list])
  const paldea = db.dexes.paldea
  const registered = useMemo(() => paldea.filter((s) => caughtSet.has(s)).length, [paldea, caughtSet])

  if (!enc) return <p className="py-16 text-center text-sm muted">Loading spawns…</p>
  const sort = SORTS.find((s) => s.id === st.sort)!

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
          <button className="chip" aria-pressed={st.targetsOnly} onClick={() => set({ targetsOnly: !st.targetsOnly })}>★ My targets{wanted.length ? ` (${all.filter((h) => wantedSet.has(h.form.slug) && (!st.notCaught || !caughtSet.has(h.species.slug))).length})` : ''}</button>
          <button className="chip" aria-pressed={st.notCaught} onClick={() => set({ notCaught: !st.notCaught })}>Not caught yet</button>
          <button className="chip" aria-pressed={st.finalOnly} onClick={() => set({ finalOnly: !st.finalOnly })}>Fully evolved</button>
          <span className="mx-0.5 w-px shrink-0" style={{ background: 'var(--ring)' }} />
          <button className="chip" aria-pressed={st.time == null} onClick={() => set({ time: null })}>Any time</button>
          {[0, 1, 2, 3].map((t) => (
            <button key={t} className="chip" aria-pressed={st.time === t} onClick={() => set({ time: st.time === t ? null : t })}>{TIME_ICON[t]} {TIME_LABEL[t]}</button>
          ))}
        </div>
      </div>

      <section className="card p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-bold">📕 Paldea Pokédex</h2>
          <span className="text-sm tabular-nums"><b className="text-lg font-black">{registered}</b><span className="muted"> / {paldea.length}</span></span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="progressbar" aria-valuemin={0} aria-valuemax={paldea.length} aria-valuenow={registered} aria-label="Paldea Pokédex caught">
          <div className="h-full rounded-full bg-scarlet-600 transition-[width]" style={{ width: `${(registered / paldea.length) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-xs muted">{registered === paldea.length ? 'Complete — every Paldea entry caught! 🎉' : `${paldea.length - registered} to go. Tap a way to get them to filter:`}</p>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {METHOD_ORDER.map((m) => (
            <button key={m} className="chip flex-col !gap-0 !rounded-xl !py-1.5" aria-pressed={st.how === m} onClick={() => set({ how: st.how === m ? null : m })}>
              <span className="text-base font-black tabular-nums leading-tight">{METHOD[m].icon} {byMethod[m].size}</span>
              <span className="text-[10px] leading-tight">{METHOD[m].label}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-xs muted">
        <b style={{ color: 'var(--text)' }}>{shownSpecies}</b> Pokémon{st.how ? ` (${METHOD[st.how].label.toLowerCase()})` : ''}{st.time != null ? ` ${st.time === 3 ? 'at night' : `in the ${TIME_LABEL[st.time].toLowerCase()}`}` : ''}, sorted by {sort.id === 'odds' || sort.id === 'dex' ? sort.label.toLowerCase() : sort.label}.
        {' '}Every Paldea dex entry with the easiest way to get it in Scarlet’s base game: catch it, evolve it, trade for Violet-only ones on a link code, or a gift / one-time encounter.
        {' '}<Link to="/trades" className="font-semibold text-scarlet-600 underline">All link codes</Link>
      </p>

      {st.targetsOnly && list.length > 0 && <BestAreas list={list} time={st.time} />}
      {st.targetsOnly && !list.length && <p className="py-6 text-center text-sm muted">{wanted.length ? 'All your targets are caught — nice! Turn off “Not caught yet” to see them again.' : 'No targets yet. Tap ☆ on any Pokémon below (or on its page) to add it.'}</p>}

      <ul className="space-y-1.5">
        {list.map((h) => <HuntRow key={h.form.slug} db={db} h={h} sortKey={st.sort} sortShort={sort.short} time={st.time} shiny={shiny} />)}
      </ul>
      {!list.length && <p className="py-10 text-center text-sm muted">{st.notCaught ? 'Nothing left with these filters — nice work!' : 'No Pokémon match these filters.'}</p>}
    </div>
  )
}

function placeOf(sp: Spot): string {
  const loc = sp.kind === 'wild' ? sp.w.loc : sp.x.loc
  const sub = sp.kind === 'wild' ? sp.w.sub : undefined
  return sub ? `${loc} · ${sub}` : loc
}

function HuntRow({ db, h, sortKey, sortShort, time, shiny }: { db: Db; h: HuntEntry; sortKey: SortKey; sortShort: string; time: number | null; shiny: boolean }) {
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
          <span className="text-[10px] font-bold tabular-nums muted" title="Paldea dex number">#{pad(s.dex.paldea!)}</span>
          <Img src={thumb(f, shiny)} alt="" size={48} className="h-12 w-12 object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-semibold">{s.name}</span>
            {!f.default && f.label && <span className="text-[11px] muted">{formLabel(f)}</span>}
            {f.ver === 'scarlet' && <span className="text-[10px] font-bold text-scarlet-600">Scarlet only</span>}
            {f.ver === 'violet' && <span className="text-[10px] font-bold text-violet-sv">Violet only</span>}
          </span>
          <Types types={f.types} size="sm" />
          {h.via && <ViaLine db={db} via={h.via} slug={s.slug} />}
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
        {h.via ? <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${METHOD[h.via.kind].pill}`}>{h.via.kind === 'special' ? (h.via.gift ? 'gift' : 'special') : h.via.kind}</span> : rar && wildPct != null ? <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${rar.cls}`}>{wildPct}%</span> : <span className="text-[9px] font-bold muted">fixed</span>}
      </span>
      <span className="flex flex-col items-center justify-center"><TargetStar form={f.slug} size="sm" /><CaughtToggle species={s.slug} size={22} /></span>
    </li>
  )
}

/** How to get an entry that can't be caught in the wild. */
function ViaLine({ db, via, slug }: { db: Db; via: Via; slug: string }) {
  const caught = usePrefs((p) => p.caught)
  if (via.kind === 'trade') return <TradeLine db={db} entry={via.entry} evolveFrom={via.evolveFrom} />
  if (via.kind === 'evolve') {
    const have = caught.includes(via.from.slug)
    return (
      <span className="mt-1 block text-[11px] leading-snug">
        <span aria-hidden>🧬</span> Evolve <span className="font-semibold">{via.from.name}</span>
        {have ? <span className="text-emerald-600 dark:text-emerald-400"> ✓ caught</span> : null}
        {via.how && <span className="muted"> · {via.how}</span>}
        {via.code && <> <span className="muted">· trade on</span> <CodeChip code={via.code.code} size="sm" /></>}
        {via.raids.length > 0 && <span className="muted"> · also in {via.raids.join('/')}★ raids</span>}
      </span>
    )
  }
  return (
    <span className="mt-1 block text-[11px] leading-snug">
      <span aria-hidden>{via.gift ? '🎁' : '📌'}</span> <span className="font-semibold">{via.group.replace(/^./, (c) => c.toUpperCase())}</span>
      <span className="muted"> · {via.loc}</span>
      {via.codes.length > 0 && (
        <span className="mt-0.5 block">
          <span className="muted">Picked another starter? Swap: </span>
          {via.codes.map((c, i) => (
            <span key={c.code}>{i > 0 && <span className="muted"> · </span>}<span className="muted">offer </span>{monName(db, c.a === slug ? c.b : c.a)} <CodeChip code={c.code} size="sm" /></span>
          ))}
        </span>
      )}
    </span>
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

/** Areas where the most of your (filtered) targets can be caught, so you can plan a route. */
function BestAreas({ list, time }: { list: HuntEntry[]; time: number | null }) {
  const areas = new Map<string, { name: string; targets: Set<string> }>()
  for (const h of list) {
    for (const sp of h.spots) {
      if (time != null && sp.kind === 'wild' && sp.w.p[time] === 0) continue
      const name = sp.kind === 'wild' ? sp.w.loc : sp.x.loc
      const a = areas.get(name) ?? { name, targets: new Set<string>() }
      a.targets.add(h.species.name)
      areas.set(name, a)
    }
  }
  const ranked = [...areas.values()].filter((a) => a.targets.size > 0).sort((a, b) => b.targets.size - a.targets.size).slice(0, 5)
  if (!ranked.length) return null
  return (
    <section className="card p-3">
      <h2 className="font-display text-base font-bold">🧭 Best areas for your targets</h2>
      <ul className="mt-1.5 space-y-1.5">
        {ranked.map((a) => (
          <li key={a.name}>
            <Link to={`/map/${placeKey(a.name)}`} className="flex items-baseline gap-2 text-sm">
              <span className="w-12 shrink-0 font-black tabular-nums text-amber-500">★ {a.targets.size}</span>
              <span className="min-w-0 flex-1"><span className="font-semibold underline decoration-dotted">{a.name}</span><span className="block text-[11px] muted">{[...a.targets].join(', ')}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
