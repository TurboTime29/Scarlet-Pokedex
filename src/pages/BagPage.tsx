import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { dexForm, formLabel, mainForm, placeKey, thumb, useItems } from '../data/db'
import type { Db, EvoUse, Item, ItemSource, Tm } from '../data/types'
import { isDlcForm, isDlcSpecies } from '../lib/dlc'
import { usePrefs } from '../store/prefs'
import { DlcBadge, Img, TypeBadge } from '../components/ui'

const POCKET_ICON: Record<string, string> = {
  medicine: '💊', balls: '⚪', battle: '⚔️', berries: '🍓', held: '🎒', evolution: '💎', training: '🏋️', other: '📦', picnic: '🥪', key: '🔑', tms: '💿',
}
const REGION_LABEL = { paldea: 'Paldea', kitakami: 'Kitakami', blueberry: 'Blueberry' } as const
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export default function BagPage({ db }: { db: Db }) {
  const data = useItems()
  const dlc = usePrefs((s) => s.dlc)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const pocket = params.get('pocket') ?? 'medicine'
  const [open, setOpenState] = useState<string | null>(params.get('item'))
  const [touched, setTouched] = useState(false)
  const setOpen = (v: string | null) => { setTouched(true); setOpenState(v) }
  const setPocket = (id: string) => setParams((p) => { p.set('pocket', id); p.delete('item'); return p }, { replace: true })

  const query = norm(q)
  const visible = (x: { dlc: boolean }) => dlc || !x.dlc
  const sections = useMemo(() => {
    if (!data) return []
    const pockets = data.pockets.map((p) => ({ id: p.id, label: p.label, items: p.items.filter(visible), hidden: p.items.filter((i) => !visible(i)).length }))
    if (!query) return pockets.filter((p) => p.id === pocket)
    return pockets
      .map((p) => ({ ...p, items: p.items.filter((i) => norm(i.name).includes(query) || norm(i.desc).includes(query)) }))
      .filter((p) => p.items.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pocket, query, dlc])
  const tms = useMemo(() => {
    if (!data) return []
    const list = data.tms.filter(visible)
    if (query) return list.filter((t) => norm(t.move).includes(query) || `tm${String(t.num).padStart(3, '0')}`.includes(query) || norm(t.desc).includes(query))
    return pocket === 'tms' ? list : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pocket, query, dlc])

  if (!data) return <p className="py-16 text-center text-sm muted">Loading items…</p>
  // a search (e.g. from a Pokémon's evolution) that finds exactly one item opens it
  const found = sections.flatMap((s) => s.items)
  const shownOpen = open ?? (!touched && query && found.length === 1 && !tms.length ? found[0].name : null)
  const hiddenHere = query ? 0 : pocket === 'tms' ? data.tms.filter((t) => !visible(t)).length : sections[0]?.hidden ?? 0

  return (
    <div className="space-y-3">
      <div className="sticky top-[calc(52px+env(safe-area-inset-top))] z-10 -mx-4 space-y-2 px-4 pb-2 pt-2" style={{ background: 'var(--bg)' }}>
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-extrabold">Bag</h1>
          {!dlc && <Link to="/settings" className="text-[11px] font-semibold text-scarlet-600">DLC items hidden · change</Link>}
        </div>
        <div className="relative">
          <input className="input pl-9" type="search" placeholder="Search all items and TMs…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted">🔍</span>
        </div>
        {!query && (
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {[...data.pockets.map((p) => ({ id: p.id, label: p.label.replace(/ \(.*\)$/, '') })), { id: 'tms', label: 'TMs' }].map((p) => (
              <button key={p.id} className="chip" aria-pressed={pocket === p.id} onClick={() => setPocket(p.id)}>{POCKET_ICON[p.id]} {p.label}</button>
            ))}
          </div>
        )}
      </div>

      {sections.map((sec) => (
        <section key={sec.id}>
          {(query || sec.label.includes('(')) && <h2 className="section-title">{POCKET_ICON[sec.id]} {sec.label}</h2>}
          <ul className="card divide-y overflow-hidden" style={{ borderColor: 'var(--ring)' }}>
            {sec.items.map((it) => (
              <ItemRow key={it.name} db={db} it={it} icon={POCKET_ICON[sec.id]} open={shownOpen === it.name} onToggle={() => setOpen(shownOpen === it.name ? null : it.name)} />
            ))}
          </ul>
        </section>
      ))}

      {tms.length > 0 && (
        <section>
          {query && <h2 className="section-title">💿 TMs</h2>}
          <ul className="card divide-y overflow-hidden" style={{ borderColor: 'var(--ring)' }}>
            {tms.map((t) => <TmRow key={t.num} t={t} open={open === `tm${t.num}`} onToggle={() => setOpen(open === `tm${t.num}` ? null : `tm${t.num}`)} />)}
          </ul>
          <p className="mt-1.5 text-[11px] muted">Make TMs at any Pokémon Center’s TM Machine with League Points (LP) and the materials listed — you get materials by defeating Pokémon.</p>
        </section>
      )}

      {query && !sections.length && !tms.length && <p className="py-10 text-center text-sm muted">No items match “{q}”.</p>}
      {hiddenHere > 0 && <p className="text-center text-xs muted">{hiddenHere} more {hiddenHere === 1 ? 'item is' : 'items are'} DLC-only and hidden. <Link to="/settings" className="font-semibold text-scarlet-600">Change</Link></p>}
    </div>
  )
}

function ItemRow({ db, it, icon, open, onToggle }: { db: Db; it: Item; icon: string; open: boolean; onToggle: () => void }) {
  const dlcOn = usePrefs((s) => s.dlc)
  return (
    <li style={{ borderColor: 'var(--ring)' }} id={`item-${norm(it.name)}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-3 py-2 text-left active:bg-black/5" aria-expanded={open}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--surface-2)' }}>
          {it.spr ? <Img src={it.spr} alt="" size={32} className="h-8 w-8 object-contain [image-rendering:pixelated]" /> : <span className="text-lg">{icon}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold">{it.name}</span>
            {it.dlc && dlcOn && <DlcBadge />}
            {it.evo && <span className="rounded-full bg-scarlet-600/10 px-1.5 py-0.5 text-[9px] font-bold text-scarlet-700 dark:text-scarlet-400">EVOLVES {new Set(it.evo.map((u) => u.to)).size}</span>}
          </span>
          <span className={`mt-0.5 block text-xs leading-snug muted ${open ? '' : 'line-clamp-2'}`}>{it.desc}</span>
        </span>
        <span className="pt-1 text-xs muted">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3 pl-[4.25rem]">
          {it.evo && <EvoUses db={db} uses={it.evo} />}
          <Sources found={it.found} />
        </div>
      )}
    </li>
  )
}

/** The Pokémon an evolution item works on, respecting the DLC setting. */
function EvoUses({ db, uses }: { db: Db; uses: EvoUse[] }) {
  const dlc = usePrefs((s) => s.dlc)
  const needsDlc = (u: EvoUse) => {
    const from = db.bySlug.get(u.from), to = db.bySlug.get(u.to)
    if (!from || !to) return true
    if (isDlcSpecies(from) || isDlcSpecies(to)) return true
    const f = u.form ? from.forms.find((x) => x.slug === u.form) : null
    return !!f && isDlcForm(from, f)
  }
  const shown = uses.filter((u) => dlc || !needsDlc(u))
  const hidden = uses.length - shown.length
  return (
    <div>
      <p className="mb-1 text-xs font-bold">Works on {shown.length} Pokémon in your game:</p>
      {!shown.length && <p className="text-xs muted">None without the DLC.</p>}
      <ul className="space-y-1.5">
        {shown.map((u, i) => {
          const from = db.bySlug.get(u.from)!, to = db.bySlug.get(u.to)!
          const fromForm = u.form ? from.forms.find((x) => x.slug === u.form) ?? mainForm(from) : mainForm(from)
          const toForm = u.form ? dexForm(to, (Object.keys(from.dexForm) as (keyof typeof from.dexForm)[]).find((d) => from.dexForm[d] === u.form)) : mainForm(to)
          const violet = fromForm.ver === 'violet' || toForm.ver === 'violet'
          return (
            <li key={i} className="rounded-xl p-1.5" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center gap-1 text-sm">
                <Link to={`/p/${from.slug}${u.form ? `/${u.form}` : ''}`} className="flex min-w-0 items-center gap-1 font-semibold">
                  <Img src={thumb(fromForm, false)} alt="" size={36} className="h-9 w-9 shrink-0 object-contain" />
                  <span className="truncate">{from.name}{u.form ? ` (${formLabel(fromForm)})` : ''}</span>
                </Link>
                <span className="px-0.5 muted">→</span>
                <Link to={`/p/${to.slug}`} className="flex min-w-0 items-center gap-1 font-semibold">
                  <Img src={thumb(toForm, false)} alt="" size={36} className="h-9 w-9 shrink-0 object-contain" />
                  <span className="truncate">{to.name}</span>
                </Link>
                {dlc && needsDlc(u) && <DlcBadge />}
                {violet && <span className="ml-auto rounded-full bg-violet-sv px-1.5 py-0.5 text-[9px] font-bold text-white">Violet</span>}
              </div>
              <p className="mt-0.5 pl-1 text-[11px] muted">{u.how}</p>
            </li>
          )
        })}
      </ul>
      {hidden > 0 && <p className="mt-1 text-[11px] muted">+{hidden} more with the DLC (The Teal Mask / The Indigo Disk).</p>}
    </div>
  )
}

/** Where to get it, grouped by how; DLC places are left out while the DLC is off. */
function Sources({ found }: { found: ItemSource[] }) {
  const dlc = usePrefs((s) => s.dlc)
  const rows = found
    .map((f) => ({ ...f, places: f.places.filter((p) => dlc || p.r === 'paldea') }))
    .filter((f) => f.places.length || (f.text && (dlc || !/kitakami|blueberry|teal mask|indigo disk/i.test(f.text))))
  if (!rows.length) return <p className="text-xs muted">No location listed{dlc ? '' : ' in the base game'}.</p>
  return (
    <div className="space-y-1.5">
      {rows.map((f, i) => (
        <div key={i} className="text-xs">
          <span className="font-bold">{f.label === 'Found' ? '📍 Found in' : f.label === 'Shop' ? '🛒 Sold in' : f.label}</span>{' '}
          {f.places.map((p, j) => (
            <span key={j}>{j > 0 && ', '}<Link to={`/map/${placeKey(p.n)}`} className="underline decoration-dotted">{p.n}</Link>{p.r !== 'paldea' && dlc ? <span className="muted"> ({REGION_LABEL[p.r]})</span> : null}</span>
          ))}
          {f.text && <span className="muted">{f.places.length ? ' · ' : ''}{f.text}</span>}
        </div>
      ))}
    </div>
  )
}

function TmRow({ t, open, onToggle }: { t: Tm; open: boolean; onToggle: () => void }) {
  const dlcOn = usePrefs((s) => s.dlc)
  const cat = t.cat === 'ph' ? 'Physical' : t.cat === 'sp' ? 'Special' : 'Status'
  return (
    <li style={{ borderColor: 'var(--ring)' }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-left active:bg-black/5" aria-expanded={open}>
        <span className="w-12 shrink-0 font-mono text-xs font-bold muted">TM{String(t.num).padStart(3, '0')}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{t.move}</span>
        {t.dlc && dlcOn && <DlcBadge />}
        <TypeBadge type={t.type} size="sm" />
        <span className="w-14 shrink-0 text-right text-[11px] tabular-nums muted">{t.power && t.power !== '--' ? `${t.power} pow` : cat}</span>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3 pl-[4.25rem] text-xs">
          <p className="muted">{t.desc}</p>
          <p><b>{cat}</b> · Power {t.power || '—'} · Accuracy {t.acc || '—'} · PP {t.pp}</p>
          {t.recipe.length > 0 && <p><span className="font-bold">🛠️ Make it:</span> {t.recipe.join(' + ').replace(/ \* /g, ' ×')}</p>}
          <Sources found={t.found} />
        </div>
      )}
    </li>
  )
}
