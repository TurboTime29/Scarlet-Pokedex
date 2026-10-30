import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formLabel, placeKey, thumb, useEncounters, useItems } from '../data/db'
import { DEXES, type Db } from '../data/types'
import { buildPlaces, type WildRow } from '../lib/locations'
import { isDlcForm } from '../lib/dlc'
import { usePrefs } from '../store/prefs'
import { CaughtToggle, DlcBadge, Img, Types } from '../components/ui'
import { TIME_ICON, TIME_LABEL, TimeStrip, noteIcon, rarity, timeMatters } from '../components/Encounters'

type Time = 'all' | 0 | 1 | 2 | 3

export default function LocationPage({ db }: { db: Db }) {
  const { key = '' } = useParams()
  const enc = useEncounters()
  const items = useItems()
  const { dlc, shiny } = usePrefs()
  const [time, setTime] = useState<Time>('all')
  const [showViolet, setShowViolet] = useState(false)
  if (!enc) return <p className="py-16 text-center text-sm muted">Loading…</p>

  const place = buildPlaces(db, enc).find((p) => p.key === key)
  const itemsHere = (items?.pockets ?? []).flatMap((p) => p.items).filter((it) => it.found.some((f) => f.places.some((pl) => placeKey(pl.n) === key)))
  const shopHere = itemsHere.filter((it) => it.found.some((f) => f.label === 'Shop' && f.places.some((pl) => placeKey(pl.n) === key)))
  const fieldHere = itemsHere.filter((it) => !shopHere.includes(it))
  const name = place?.name ?? items?.pockets.flatMap((p) => p.items).flatMap((i) => i.found).flatMap((f) => f.places).find((pl) => placeKey(pl.n) === key)?.n ?? key
  const region = place?.r ?? 'paldea'
  const dlcArea = region !== 'paldea'

  const keep = (r: WildRow) => (showViolet || r.w.v !== 'violet') && (dlc || !isDlcForm(r.species, r.form)) && (time === 'all' || r.w.p[time] > 0)
  const pct = (r: WildRow) => (time === 'all' ? Math.max(...r.w.p) : r.w.p[time])
  let hiddenViolet = 0
  const subs = (place?.subs ?? []).map((sub) => ({
    ...sub,
    biomes: sub.biomes.map((b) => {
      hiddenViolet += showViolet ? 0 : b.rows.filter((r) => r.w.v === 'violet').length
      return { ...b, rows: b.rows.filter(keep).sort((a, c) => pct(c) - pct(a)) }
    }).filter((b) => b.rows.length),
  })).filter((s) => s.biomes.length)
  const fixed = (place?.fixed ?? []).filter((f) => (showViolet || f.x.v !== 'violet') && (dlc || !isDlcForm(f.species, f.form)))

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold muted">{DEXES.find((d) => d.id === region)!.label}</p>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{name}</h1>
        {place && <p className="text-xs muted">{place.subs.filter((s) => s.name).length ? `${place.subs.filter((s) => s.name).length} sub-areas · ` : ''}wild odds are per biome: “12%” means 12% of the Pokémon spawning in that biome here.</p>}
      </div>

      {dlcArea && !dlc && (
        <div className="rounded-2xl border-2 border-teal-600 bg-teal-600/10 p-3 text-sm"><DlcBadge /> This area is in the DLC. <Link to="/settings" className="font-semibold underline">Turn on the DLC</Link> if you have it.</div>
      )}

      {place && (
        <div className="sticky top-[calc(52px+env(safe-area-inset-top))] z-10 -mx-4 space-y-2 px-4 pb-2 pt-1" style={{ background: 'var(--bg)' }}>
          <div className="seg" role="tablist" aria-label="Time of day">
            <button role="tab" aria-selected={time === 'all'} onClick={() => setTime('all')}>Any time</button>
            {([0, 1, 2, 3] as const).map((t) => (
              <button key={t} role="tab" aria-selected={time === t} onClick={() => setTime(t)} title={TIME_LABEL[t]}>{TIME_ICON[t]} {TIME_LABEL[t] === 'Morning' ? 'Morn' : TIME_LABEL[t] === 'Evening' ? 'Eve' : TIME_LABEL[t]}</button>
            ))}
          </div>
          {(hiddenViolet > 0 || showViolet) && (
            <button className="chip" aria-pressed={showViolet} onClick={() => setShowViolet(!showViolet)}>Show Violet-only{hiddenViolet ? ` (${hiddenViolet})` : ''}</button>
          )}
        </div>
      )}

      {subs.map((sub) => (
        <section key={sub.name ?? '_main'}>
          {(sub.name || subs.length > 1) && <h2 className="mb-1.5 font-display text-lg font-bold">{sub.name ?? 'Main area'}</h2>}
          <div className="space-y-3">
            {sub.biomes.map((b) => (
              <div key={b.name}>
                <h3 className="mb-1 text-xs font-bold muted">{b.name} · {b.rows.length} Pokémon</h3>
                <ul className="card divide-y overflow-hidden" style={{ borderColor: 'var(--ring)' }}>
                  {b.rows.map((r, i) => <Row key={i} r={r} pct={pct(r)} showStrip={time === 'all'} shiny={shiny} dlcOn={dlc} />)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
      {place && !subs.length && <p className="text-sm muted">Nothing spawns here {time === 'all' ? 'in your game' : `${TIME_LABEL[time].toLowerCase() === 'night' ? 'at night' : `in the ${TIME_LABEL[time].toLowerCase()}`}`}.</p>}

      {fixed.length > 0 && (
        <section>
          <h2 className="section-title">📍 Fixed spots, gifts &amp; trades</h2>
          <ul className="card divide-y text-sm" style={{ borderColor: 'var(--ring)' }}>
            {fixed.map((f, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-1.5" style={{ borderColor: 'var(--ring)' }}>
                <Img src={thumb(f.form, shiny)} alt="" size={40} className="h-10 w-10 shrink-0 object-contain" />
                <Link to={`/p/${f.species.slug}${f.form.default ? '' : `/${f.form.slug}`}`} className="min-w-0 flex-1">
                  <span className="font-semibold">{f.species.name}</span>
                  <span className="block text-[11px] muted">{f.x.where === 'Fixed' ? 'Always in the same spot' : f.x.where === 'Gift' ? 'Gift' : f.x.where === 'Trade' ? 'In-game trade' : f.x.where} · Lv {f.x.lv}{f.x.note ? ` · ${f.x.note}` : ''}</span>
                </Link>
                {f.x.v !== 'both' && <span className={`text-[10px] font-bold ${f.x.v === 'scarlet' ? 'text-scarlet-600' : 'text-violet-sv'}`}>{f.x.v === 'scarlet' ? 'Scarlet' : 'Violet'}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(place?.specials ?? []).filter((sp) => dlc || sp.x.r === 'paldea').length > 0 && (
        <section>
          <h2 className="section-title">⭐ Special encounters here</h2>
          <ul className="card divide-y text-sm" style={{ borderColor: 'var(--ring)' }}>
            {place!.specials.filter((sp) => dlc || sp.x.r === 'paldea').map((sp, i) => (
              <li key={i} style={{ borderColor: 'var(--ring)' }}>
                <Link to={`/p/${sp.species.slug}${sp.form.default ? '' : `/${sp.form.slug}`}`} className="flex items-center gap-2 px-3 py-1.5">
                  <Img src={thumb(sp.form, shiny)} alt="" size={40} className="h-10 w-10 shrink-0 object-contain" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{sp.species.name}</span>
                    <span className="block text-[11px] muted">{sp.x.group}{sp.x.lv ? ` · Lv ${sp.x.lv}` : ''} — tap for how to get it</span>
                  </span>
                  <span className="muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shopHere.length > 0 && <ItemList title="🛒 Sold here" items={shopHere} />}
      {fieldHere.length > 0 && <ItemList title="✨ Items found here" items={fieldHere} />}
      {!place && !itemsHere.length && <p className="py-10 text-center text-sm muted">No data for this place.</p>}
    </div>
  )
}

function Row({ r, pct, showStrip, shiny, dlcOn }: { r: WildRow; pct: number; showStrip: boolean; shiny: boolean; dlcOn: boolean }) {
  const rar = rarity(pct)
  const { species: s, form: f, w } = r
  return (
    <li className="flex items-center gap-2 px-2 py-1.5" style={{ borderColor: 'var(--ring)' }}>
      <Img src={thumb(f, shiny)} alt="" size={44} className="h-11 w-11 shrink-0 object-contain" />
      <Link to={`/p/${s.slug}${f.default ? '' : `/${f.slug}`}`} className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5">
          <span className="font-semibold">{s.name}</span>
          {!f.default && f.label && <span className="text-[11px] muted">{formLabel(f)}</span>}
          {dlcOn && isDlcForm(s, f) && <DlcBadge />}
          {w.v === 'scarlet' && <span className="text-[10px] font-bold text-scarlet-600">Scarlet only</span>}
          {w.v === 'violet' && <span className="text-[10px] font-bold text-violet-sv">Violet only</span>}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] muted">
          <Types types={f.types} size="sm" />
          <span>Lv {w.lv}{w.ls ? ` (${w.ls} later)` : ''}</span>
          {w.g ? <span>👥 {w.g}%</span> : null}
        </span>
        {showStrip && timeMatters(w.p) && <TimeStrip p={w.p} compact />}
        {w.n && <span className="mt-0.5 block text-[11px] leading-snug text-amber-700 dark:text-amber-300">{noteIcon(w.n)} {w.n}</span>}
      </Link>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-sm font-black tabular-nums">{pct}%</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${rar.cls}`}>{rar.label}</span>
      </span>
      <CaughtToggle species={s.slug} size={22} />
    </li>
  )
}

function ItemList({ title, items }: { title: string; items: { name: string; spr?: string; desc: string }[] }) {
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Link key={it.name} to={`/bag?q=${encodeURIComponent(it.name)}&item=${encodeURIComponent(it.name)}`} className="chip" title={it.desc}>
            {it.spr && <img src={it.spr} alt="" className="h-4 w-4 [image-rendering:pixelated]" loading="lazy" />}{it.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
