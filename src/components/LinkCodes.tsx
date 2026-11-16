import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Db } from '../data/types'
import { codesFor, violetTrade, type CodeMon, type ExclusiveCode } from '../data/linkCodes'
import { formKey, usePrefs } from '../store/prefs'
import { DlcBadge } from './ui'

/**
 * Has the player caught this Pokémon? For a specific form, use that form's own mark when they tick
 * off forms of the species separately (Hunt rows), otherwise the species mark.
 */
export function useHasCaught(mon: CodeMon): boolean {
  return usePrefs((p) => {
    if (!mon.f) return p.caught.includes(mon.s)
    if (p.caughtForms.includes(formKey(mon.s, mon.f))) return true
    return p.caught.includes(mon.s) && !p.caughtForms.some((k) => k.startsWith(`${mon.s}/`))
  })
}

export function monName(db: Db, c: CodeMon | string): string {
  const m = typeof c === 'string' ? { s: c } : c
  return m.label ?? db.bySlug.get(m.s)?.name ?? m.s
}

export function MonLink({ db, mon }: { db: Db; mon: CodeMon | string }) {
  const m = typeof mon === 'string' ? { s: mon } : mon
  const sp = db.bySlug.get(m.s)
  if (!sp) return <>{monName(db, m)}</>
  const path = m.f && sp.forms.find((f) => f.slug === m.f && !f.default) ? `/p/${m.s}/${m.f}` : `/p/${m.s}`
  return <Link to={path} className="font-semibold underline decoration-dotted">{monName(db, m)}</Link>
}

/** The 8-digit code; tap to copy it. */
export function CodeChip({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard?.writeText(code.replace(/\s/g, '')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }, () => {})
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Tap to copy"
      aria-label={`Link code ${code}${copied ? ', copied' : ', tap to copy'}`}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-mono font-bold tabular-nums tracking-wider ${size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-sm'}`}
      style={{ background: 'var(--surface-2)', boxShadow: '0 0 0 1px var(--ring)' }}
    >
      {code}
      <span className="font-sans text-[9px] font-semibold muted">{copied ? 'copied' : 'copy'}</span>
    </button>
  )
}

/** One-line "offer X on code Y" for a Violet-only Pokémon (Hunt rows). */
export function TradeLine({ db, entry, evolveFrom }: { db: Db; entry: ExclusiveCode; evolveFrom: string | null }) {
  const haveOffer = useHasCaught(entry.scarlet)
  return (
    <span className="mt-1 block text-[11px] leading-snug">
      <span aria-hidden>🔁</span> Trade on <CodeChip code={entry.code} size="sm" />{' '}
      <span className="muted">· offer</span> <span className="font-semibold">{monName(db, entry.scarlet)}</span>
      {haveOffer ? <span className="text-emerald-600 dark:text-emerald-400"> ✓ caught</span> : <span className="muted"> (catch one first)</span>}
      {evolveFrom && <span className="muted"> · get {monName(db, evolveFrom)}, then evolve</span>}
    </span>
  )
}

/** How to get a Violet-only form by trading, for the "Can't be caught in Scarlet" banner. */
export function VioletTradeHowTo({ db, s, f }: { db: Db; s: string; f: string }) {
  const t = violetTrade(s, f)
  const dlc = usePrefs((p) => p.dlc)
  const haveOffer = useHasCaught(t?.entry.scarlet ?? { s: '' })
  if (!t || (t.entry.dlc && !dlc)) return null
  const { entry, evolveFrom } = t
  return (
    <div className="mt-2 rounded-xl p-2.5" style={{ background: 'var(--surface)' }}>
      <p className="text-sm font-bold">🔁 Trade for it with a link code</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">
        <li>Have a <MonLink db={db} mon={entry.scarlet} /> to offer{haveOffer ? <span className="text-emerald-600 dark:text-emerald-400"> (you’ve caught one ✓)</span> : null}.</li>
        <li>Poké Portal → <b>Link Trade</b> → set this Link Code: <CodeChip code={entry.code} /></li>
        <li>A Violet player on the same code offers <MonLink db={db} mon={entry.violet} />{evolveFrom ? <>; evolve it into {monName(db, s)}</> : null}.</li>
      </ol>
      {entry.note && <p className="mt-1 text-xs muted">{entry.note}</p>}
      <p className="mt-1 text-[11px] muted"><Link to="/trades" className="underline">All link codes</Link></p>
    </div>
  )
}

/** Every community link code that involves this Pokémon (other than the Violet-only how-to above). */
export function LinkCodesCard({ db, s, f, skipVioletSide }: { db: Db; s: string; f: string; skipVioletSide: boolean }) {
  const dlc = usePrefs((p) => p.dlc)
  const c = codesFor(s, f)
  const exclusive = c.exclusive.filter((e) => (dlc || !e.dlc) && !(skipVioletSide && e.violet.s === s))
  const evo = c.evo.filter((e) => dlc || !e.dlc)
  const starter = c.starter
  if (!exclusive.length && !evo.length && !starter.length) return null
  return (
    <section>
      <h2 className="section-title">🔁 Link trade codes</h2>
      <ul className="card divide-y text-sm" style={{ borderColor: 'var(--ring)' }}>
        {exclusive.map((e) => {
          const mine = e.scarlet.s === s
          return (
            <li key={e.code} className="space-y-1 px-3 py-2" style={{ borderColor: 'var(--ring)' }}>
              <div className="flex flex-wrap items-center gap-1.5"><CodeChip code={e.code} />{e.dlc ? <DlcBadge /> : null}</div>
              <p>{mine
                ? <>Trade your {monName(db, e.scarlet)} to a Violet player for <MonLink db={db} mon={e.violet} /> (Violet only).</>
                : <>Offer <MonLink db={db} mon={e.scarlet} /> to get {monName(db, e.violet)} from a Violet player.</>}</p>
              {e.note && <p className="text-xs muted">{e.note}</p>}
            </li>
          )
        })}
        {evo.map((e) => (
          <li key={e.code + e.from.label} className="space-y-1 px-3 py-2" style={{ borderColor: 'var(--ring)' }}>
            <div className="flex flex-wrap items-center gap-1.5"><CodeChip code={e.code} />{e.dlc ? <DlcBadge /> : null}</div>
            <p>Trade evolution: <MonLink db={db} mon={e.from} />{e.item ? <> holding <b>{e.item}</b></> : ' (no item)'} → <MonLink db={db} mon={e.into} />. Both players offer the same Pokémon and keep the evolved one — it’s not a tradeback.</p>
            {e.pla && <p className="text-xs muted">Can also evolve in Pokémon Legends: Arceus without trading.</p>}
          </li>
        ))}
        {starter.map((e) => {
          const other = e.a === s ? e.b : e.a
          return (
            <li key={e.code} className="space-y-1 px-3 py-2" style={{ borderColor: 'var(--ring)' }}>
              <CodeChip code={e.code} />
              <p>Starter swap: trade {monName(db, s)} for <MonLink db={db} mon={other} />. You can breed more to trade.</p>
              {e.note && <p className="text-xs muted">{e.note}</p>}
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-[11px] muted">Codes from the r/PokemonVioletScarlet wiki. <Link to="/trades" className="underline">All link codes</Link></p>
    </section>
  )
}
