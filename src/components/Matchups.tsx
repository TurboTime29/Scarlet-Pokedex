import { Link } from 'react-router-dom'
import { TYPES, defensiveMatchups, effectiveness, offensiveCoverage, type Type } from '../lib/types'
import { TypeBadge } from './ui'

function Row({ label, types, tone, mult }: { label: string; types: Type[]; tone: string; mult?: string }) {
  if (!types.length) return null
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className={`w-12 shrink-0 pt-0.5 text-right text-xs font-black tabular-nums ${tone}`}>{mult}</span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{label}: </span>
        <span className="flex flex-wrap gap-1">{types.map((t) => (
          <Link key={t} to={`/counters?t=${t}`} title={`What beats ${t} types?`}><TypeBadge type={t} /></Link>
        ))}</span>
      </span>
    </div>
  )
}

/** "Weak against" = types that hit it hard; "Strong against" = types its own types hit for 2×. */
export function Matchups({ types }: { types: string[] }) {
  const d = defensiveMatchups(types)
  const strong = offensiveCoverage(types)
  // types that resist every one of its STAB types
  const walls = TYPES.filter((t) => types.every((a) => effectiveness(a as Type, [t]) < 1))
  // ...and of those, ones immune to at least one of them
  const blanks = walls.filter((t) => types.some((a) => effectiveness(a as Type, [t]) === 0))
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="card p-3">
        <h3 className="font-display text-base font-bold">🛡️ Weak against</h3>
        <p className="mb-1 text-xs muted">Moves of these types hit it super-effectively. Avoid these opponents.</p>
        <Row label="4× damage" mult="4×" tone="text-red-600" types={d.x4} />
        <Row label="2× damage" mult="2×" tone="text-orange-500" types={d.x2} />
        {!d.x4.length && !d.x2.length && <p className="text-sm muted">No weaknesses!</p>}
        <h4 className="mt-2 text-xs font-bold muted">Takes less damage from</h4>
        <Row label="Quarter damage" mult="¼×" tone="text-emerald-600" types={d.quarter} />
        <Row label="Half damage" mult="½×" tone="text-emerald-500" types={d.half} />
        <Row label="Immune" mult="0×" tone="text-sky-500" types={d.immune} />
        {!d.quarter.length && !d.half.length && !d.immune.length && <p className="text-sm muted">No resistances.</p>}
      </section>
      <section className="card p-3">
        <h3 className="font-display text-base font-bold">⚔️ Strong against</h3>
        <p className="mb-1 text-xs muted">Its {types.length > 1 ? 'two types hit' : 'type hits'} these types for 2× (same-type moves get a 1.5× bonus too).</p>
        <Row label="Super effective" mult="2×" tone="text-emerald-600" types={strong} />
        {!strong.length && <p className="text-sm muted">Its own type isn’t super-effective against anything — rely on coverage moves.</p>}
        {walls.length > 0 && (
          <>
            <h4 className="mt-2 text-xs font-bold muted">Struggles to damage</h4>
            <Row label="Resists its types" mult="½×" tone="text-stone-400" types={walls.filter((t) => !blanks.includes(t))} />
            <Row label="Immune to one of its types, resists the other" mult="0×" tone="text-stone-400" types={blanks} />
          </>
        )}
        <p className="mt-2 text-[11px] muted">Tap a type to see what beats it.</p>
      </section>
    </div>
  )
}
