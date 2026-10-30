import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEncounters } from '../data/db'
import { usePrefs } from '../store/prefs'
import { DEXES, type Db, type DexId, type EvoNode, type FixedSpawn, type Form, type RaidSpawn, type Species, type WildSpawn } from '../data/types'

const TIMES = ['morning', 'day', 'evening', 'night'] as const
const TIME_ICON = ['🌅', '☀️', '🌇', '🌙'] as const
const TIME_LABEL = ['Morning', 'Day', 'Evening', 'Night'] as const
const TIME_SHORT = ['Morn', 'Day', 'Eve', 'Night'] as const
const PREVIEW = 5

/** Which form an encounter row is: explicit, else the form that region's dex shows. */
function formOf(s: Species, x: { f?: string; r: DexId }): string {
  return x.f ?? s.dexForm[x.r] ?? (s.forms.find((f) => f.default) ?? s.forms[0]).slug
}

function timeNote(p: WildSpawn['p']): string | null {
  const on = TIMES.filter((_, i) => p[i] > 0)
  if (on.length === 4) {
    const best = Math.max(...p), worst = Math.min(...p)
    if (best >= worst * 1.5) return `most common at ${TIMES[p.indexOf(best)]}`
    return null
  }
  if (on.length === 3) return `not at ${TIMES.find((_, i) => p[i] === 0)}`
  return `${on.join(' & ')} only`
}

const TIME_PHRASE = ['in the morning', 'during the day', 'in the evening', 'at night'] as const

/** "in the evening and at night" / "in the morning or during the day" */
function joinTimes(ix: number[], conj: 'and' | 'or' = 'and'): string {
  const names = ix.map((i) => TIME_PHRASE[i])
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${conj} ${names[names.length - 1]}`
}

/** Worth showing per-time odds: it never spawns at some time, or one time is clearly better. */
const timeMatters = (p: WildSpawn['p']) => p.some((v) => v === 0) || Math.max(...p) >= Math.min(...p) * 1.3

/** When the Pokémon can be found, across all its spawns shown here. */
function whenToLook(wild: WildSpawn[]): { tone: 'warn' | 'info' | 'plain'; text: string } | null {
  if (!wild.length) return null
  const best = [0, 1, 2, 3].map((t) => Math.max(...wild.map((w) => w.p[t])))
  const on = [0, 1, 2, 3].filter((t) => best[t] > 0)
  const off = [0, 1, 2, 3].filter((t) => best[t] === 0)
  if (off.length) {
    return { tone: 'warn', text: `${on.map((t) => TIME_ICON[t]).join('')} Only appears ${joinTimes(on)} — it won’t spawn ${joinTimes(off, 'or')}.` }
  }
  const top = best.indexOf(Math.max(...best)), low = Math.min(...best)
  if (best[top] >= low * 1.5) return { tone: 'info', text: `${TIME_ICON[top]} Easiest to find ${joinTimes([top])} (up to ${best[top]}% vs ${low}% at its rarest time).` }
  return { tone: 'plain', text: '🕒 Spawns at any time of day.' }
}

/** Icon for a spawn note by what kind of condition it is. */
function noteIcon(n: string): string {
  if (/main story|titan|league club|diversity|after /i.test(n)) return '🔓'
  if (/tree/i.test(n)) return '🌳'
  if (/disguise/i.test(n)) return '🎭'
  if (/postcard|pokémon go/i.test(n)) return '✉️'
  if (/only (spawns|appears|be found|spawn)|peak|eastern|western|southern|northern|entrance|cave/i.test(n)) return '📍'
  return 'ℹ️'
}

function rarity(pct: number) {
  if (pct >= 15) return { label: 'Common', cls: 'bg-emerald-600 text-white' }
  if (pct >= 5) return { label: 'Uncommon', cls: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' }
  if (pct >= 2) return { label: 'Rare', cls: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' }
  return { label: 'Very rare', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' }
}

const place = (w: { loc: string; sub?: string }) => (w.sub ? `${w.loc} · ${w.sub}` : w.loc)

function parentOf(db: Db, s: Species): Species | null {
  if (s.chain == null) return null
  const find = (n: EvoNode, parent: string | null): string | null =>
    n.s === s.slug ? parent : (n.to ?? []).map((k) => find(k, n.s)).find((x) => x !== null) ?? null
  const p = find(db.evolutions[s.chain], null)
  return p ? db.bySlug.get(p) ?? null : null
}

export function Encounters({ db, s, f }: { db: Db; s: Species; f: Form }) {
  const enc = useEncounters()
  const dlc = usePrefs((p) => p.dlc)
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})
  if (!enc) return <p className="text-sm muted">Loading locations…</p>

  const target = f.battleOnly ? (s.forms.find((x) => x.default) ?? s.forms[0]).slug : f.slug
  const e = enc[s.slug] ?? { wild: [], fixed: [], raids: [] }
  const mine = <T extends { f?: string; r: DexId; v: string }>(xs: T[]) => xs.filter((x) => formOf(s, x) === target)
  const wildAll = mine(e.wild), fixedAll = mine(e.fixed), raidsAll = mine(e.raids)
  const violetOnlyForm = f.ver === 'violet'
  // For Scarlet players show Scarlet spawns; a Violet exclusive shows where Violet players find it instead.
  // Without the DLC, Kitakami and Blueberry spawns can't be reached.
  const keep = (x: { v: string; r: DexId }) => (violetOnlyForm || x.v !== 'violet') && (dlc || x.r === 'paldea')
  const wild = wildAll.filter(keep)
  const fixed = fixedAll.filter(keep)
  const raids = raidsAll.filter(keep)
  const violetExtra = violetOnlyForm ? 0 : wildAll.filter((w) => w.v === 'violet' && (dlc || w.r === 'paldea')).length
  const dlcExtra = dlc ? 0 : [...wildAll, ...fixedAll, ...raidsAll].filter((x) => x.r !== 'paldea').length

  if (!wild.length && !fixed.length && !raids.length) {
    const parent = parentOf(db, s)
    return (
      <div className="card p-3 text-sm">
        <p className="font-semibold">Not found in the wild{violetOnlyForm ? '' : ' in Scarlet'}{!dlc ? ' without the DLC' : ''}.</p>
        {dlcExtra > 0 && <p className="mt-0.5 text-xs text-violet-sv">It appears in {dlcExtra} DLC {dlcExtra === 1 ? 'spot' : 'spots'} (The Teal Mask / The Indigo Disk). <Link to="/settings" className="underline">Turn on the DLC</Link> to see them.</p>}
        {parent ? (
          <p className="mt-0.5 muted">Catch <Link className="font-semibold text-scarlet-600 underline" to={`/p/${parent.slug}`}>{parent.name}</Link> and evolve it.</p>
        ) : s.legend || s.paradox ? (
          <p className="mt-0.5 muted">It’s a one-time story or special encounter.</p>
        ) : (
          <p className="mt-0.5 muted">It may be a gift, a trade or a special event Pokémon.</p>
        )}
      </div>
    )
  }

  const best = wild[0]
  const when = whenToLook(wild)
  // a condition every spawn shares (e.g. "only after beating the main story") goes in the summary
  const sharedNote = wild.length > 0 && wild.every((w) => w.n && w.n === wild[0].n) ? wild[0].n! : null
  const byRegion = DEXES.map((d) => ({ ...d, rows: wild.filter((w) => w.r === d.id).sort((a, b) => Math.max(...b.p) - Math.max(...a.p)) })).filter((g) => g.rows.length)

  return (
    <div className="space-y-3">
      {violetOnlyForm && <p className="text-xs font-semibold text-violet-sv">These spawns are in Pokémon Violet only — useful if you’re trading with a Violet player.</p>}
      {when && (
        <div className={`rounded-2xl p-3 text-sm font-semibold ${when.tone === 'warn' ? 'border-2 border-indigo-500 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200' : when.tone === 'info' ? 'bg-indigo-500/10' : 'surface-2'}`}>
          {when.text}
          {sharedNote && <span className="mt-1 block font-normal">{noteIcon(sharedNote)} {sharedNote}</span>}
        </div>
      )}
      {best && (
        <div className="rounded-2xl bg-emerald-500/10 p-3 text-sm">
          <span className="font-bold text-emerald-700 dark:text-emerald-300">Best odds:</span>{' '}
          <b>{Math.max(...best.p)}%</b> of {best.b.toLowerCase()} spawns in <b>{place(best)}</b> (Lv {best.lv})
          {timeNote(best.p) ? `, ${timeNote(best.p)}` : ''}.
          {best.n && best.n !== sharedNote && <span className="mt-1 block text-xs">{noteIcon(best.n)} {best.n}</span>}
        </div>
      )}

      {byRegion.map((g) => {
        const all = showAll[g.id]
        const rows = all ? g.rows : g.rows.slice(0, PREVIEW)
        return (
          <section key={g.id}>
            <h3 className="mb-1 text-xs font-bold muted">{g.label} · {g.rows.length} spawn {g.rows.length === 1 ? 'area' : 'areas'}</h3>
            <ul className="card divide-y overflow-hidden" style={{ borderColor: 'var(--ring)' }}>
              {rows.map((w, i) => <WildRow key={i} w={w} hideNote={w.n === sharedNote} />)}
            </ul>
            {g.rows.length > PREVIEW && (
              <button className="mt-1 text-xs font-semibold text-scarlet-600" onClick={() => setShowAll({ ...showAll, [g.id]: !all })}>
                {all ? 'Show fewer' : `Show all ${g.rows.length}`}
              </button>
            )}
          </section>
        )
      })}

      {fixed.length > 0 && <FixedList fixed={fixed} />}
      {raids.length > 0 && <RaidList raids={raids} />}

      {wild.length > 0 && <p className="text-[11px] leading-snug muted">
        % = the share of wild spawns in that <b>biome</b> of the area that are this Pokémon, from the game’s spawn weights (via Bulbapedia).
        Areas mix several biomes, so stand in the named one.{violetExtra > 0 ? ` ${violetExtra} more spawn ${violetExtra === 1 ? 'area is' : 'areas are'} Violet-only and hidden here.` : ''}{dlcExtra > 0 ? ` ${dlcExtra} DLC ${dlcExtra === 1 ? 'spot is' : 'spots are'} hidden (DLC is off in Settings).` : ''}
      </p>}
    </div>
  )
}

function WildRow({ w, hideNote }: { w: WildSpawn; hideNote?: boolean }) {
  const pct = Math.max(...w.p)
  const r = rarity(pct)
  const varies = timeMatters(w.p)
  return (
    <li className="flex items-center gap-2 px-3 py-2" style={{ borderColor: 'var(--ring)' }}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{place(w)}</span>
        <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] muted">
          <span>{w.b}</span><span>Lv {w.lv}{w.ls ? ` (Lv ${w.ls} later)` : ''}</span>
          {!varies && <span>🕒 any time</span>}
          {w.on?.includes('water') && <span>🌊 {w.on.includes('land') ? 'land & water' : 'water'}</span>}
          {w.on?.includes('sky') && <span>🪽 flying</span>}
          {w.g ? <span>👥 groups {w.g}%</span> : null}
          {w.v === 'scarlet' && <span className="font-semibold text-scarlet-600">Scarlet only</span>}
          {w.v === 'violet' && <span className="font-semibold text-violet-sv">Violet only</span>}
        </span>
        {varies && <TimeStrip p={w.p} />}
        {w.n && !hideNote && <span className="mt-1 block text-[11px] leading-snug text-amber-700 dark:text-amber-300">{noteIcon(w.n)} {w.n}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-base font-black tabular-nums">{pct}%</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${r.cls}`}>{r.label}</span>
      </span>
    </li>
  )
}

function FixedList({ fixed }: { fixed: FixedSpawn[] }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-bold muted">📍 Fixed spots, gifts &amp; trades</h3>
      <ul className="card divide-y text-sm" style={{ borderColor: 'var(--ring)' }}>
        {fixed.map((x, i) => (
          <li key={i} className="px-3 py-2" style={{ borderColor: 'var(--ring)' }}>
            <span className="font-semibold">{x.loc}</span>
            <span className="muted"> — {x.where === 'Fixed' ? 'always in the same spot here' : x.where === 'Gift' ? 'gift' : x.where === 'Trade' ? 'in-game trade' : x.where}, Lv {x.lv}{x.note ? ` (${x.note})` : ''}</span>
            {x.v !== 'both' && <span className={`ml-1 text-[11px] font-semibold ${x.v === 'scarlet' ? 'text-scarlet-600' : 'text-violet-sv'}`}>{x.v === 'scarlet' ? 'Scarlet only' : 'Violet only'}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function RaidList({ raids }: { raids: RaidSpawn[] }) {
  const region = (r: DexId) => DEXES.find((d) => d.id === r)!.short
  return (
    <section>
      <h3 className="mb-1 text-xs font-bold muted">💎 Tera Raid Battles</h3>
      <div className="flex flex-wrap gap-1.5">
        {raids.map((x, i) => (
          <span key={i} className="chip cursor-default">
            <span className="text-amber-500">{'★'.repeat(x.s)}</span> {region(x.r)} · Lv {x.lv}
            {x.v !== 'both' && <span className={x.v === 'scarlet' ? 'text-scarlet-600' : 'text-violet-sv'}>· {x.v === 'scarlet' ? 'Scarlet' : 'Violet'}</span>}
          </span>
        ))}
      </div>
    </section>
  )
}

/** Morning / day / evening / night chance for one spawn; greyed out when it never appears then. */
function TimeStrip({ p }: { p: WildSpawn['p'] }) {
  return (
    <span className="mt-1 grid max-w-[16rem] grid-cols-4 gap-1" aria-label="Chance by time of day">
      {p.map((v, i) => (
        <span
          key={i}
          title={`${TIME_LABEL[i]}: ${v ? `${v}%` : 'does not spawn'}`}
          className={`flex flex-col items-center rounded-md px-1 py-0.5 text-[10px] leading-tight ${v ? '' : 'opacity-35'}`}
          style={{ background: 'var(--surface-2)' }}
        >
          <span className="whitespace-nowrap"><span aria-hidden>{TIME_ICON[i]}</span> {TIME_SHORT[i]}</span>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{v ? `${v}%` : '—'}</span>
        </span>
      ))}
    </span>
  )
}
