import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { artwork, bst, formLabel, isFinal, mainForm, pad } from '../data/db'
import { DEXES, type Db, type EvoNode, type Form, type Species } from '../data/types'
import { TYPE_COLORS, type Type } from '../lib/types'
import { TEAM_SIZE, usePrefs } from '../store/prefs'
import { CaughtToggle, Img, Types, VersionBadge } from '../components/ui'
import { EvolutionLine } from '../components/EvolutionLine'
import { Matchups } from '../components/Matchups'
import { MoveTable } from '../components/MoveTable'
import { Encounters } from '../components/Encounters'
import { ShinyOdds } from '../components/ShinyOdds'

const STAT_NAMES = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed']

export default function PokemonPage({ db }: { db: Db }) {
  const { slug = '', form: formSlug } = useParams()
  const nav = useNavigate()
  const s = db.bySlug.get(slug)
  const shiny = usePrefs((p) => p.shiny)
  const setShiny = usePrefs((p) => p.setShiny)
  const team = usePrefs((p) => p.team)
  const toggleTeam = usePrefs((p) => p.toggleTeam)
  const [toast, setToast] = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [slug])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t) } }, [toast])

  if (!s) return <div className="py-16 text-center muted">Pokémon not found. <Link to="/" className="text-scarlet-600 underline">Back to the dex</Link></div>
  const f = s.forms.find((x) => x.slug === formSlug) ?? mainForm(s)
  const color = TYPE_COLORS[f.types[0] as Type]
  const onTeam = team.includes(f.slug)
  const selectable = s.forms.filter((x) => !x.battleOnly || x.slug === f.slug)
  const battleForms = s.forms.filter((x) => x.battleOnly)

  return (
    <div className="-mt-2 space-y-4 pb-6">
      {/* hero */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-4 pt-3" style={{ background: `linear-gradient(180deg, ${color}55, transparent)` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              {DEXES.filter((d) => s.dex[d.id]).map((d) => (
                <span key={d.id} className="rounded-full px-2 py-0.5" style={{ background: 'var(--surface)', boxShadow: '0 0 0 1px var(--ring)' }}>{d.short} #{pad(s.dex[d.id]!)}</span>
              ))}
            </div>
            <h1 className="mt-1.5 font-display text-3xl font-extrabold leading-tight">{s.name}</h1>
            <p className="text-sm muted">{f.label && !f.default ? `${formLabel(f)} · ` : ''}{s.genus}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5"><Types types={f.types} size="lg" /><VersionBadge form={f} long /></div>
          </div>
          <CaughtToggle species={s.slug} size={34} />
        </div>
        <div className="art-stage relative mx-auto mt-2 aspect-square w-full max-w-[18rem]">
          <Img key={artwork(f, shiny)} src={artwork(f, shiny)} alt={`${shiny ? 'Shiny ' : ''}${s.name}`} size={288} className="h-full w-full object-contain drop-shadow-xl" />
          <button
            type="button"
            onClick={() => setShiny(!shiny)}
            aria-pressed={shiny}
            className={`absolute bottom-1 right-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-md transition-colors ${shiny ? 'bg-amber-400 text-amber-950' : ''}`}
            style={shiny ? undefined : { background: 'var(--surface)' }}
          >
            <span className={shiny ? 'sparkle' : ''}>✨</span> {shiny ? 'Shiny' : 'Normal'}
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={onTeam ? 'btn-ghost flex-1' : 'btn-primary flex-1'}
            onClick={() => { if (!toggleTeam(f.slug, s.slug)) setToast(`Your team already has ${TEAM_SIZE}. Remove one on the Team tab first.`) }}
          >
            {onTeam ? '★ On my team — remove' : '☆ Add to team'}
          </button>
          <Link to={`/counters?t=${f.types.join(',')}`} className="btn-ghost">What beats it?</Link>
        </div>
        {toast && <p role="status" className="mt-2 rounded-lg bg-black/80 px-3 py-2 text-center text-xs text-white">{toast}</p>}
      </section>

      <AvailabilityBanner f={f} name={s.name} />

      {selectable.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {selectable.map((x) => (
            <button key={x.slug} className="chip" aria-pressed={x.slug === f.slug} onClick={() => nav(`/p/${s.slug}/${x.slug}`, { replace: true })}>
              {formLabel(x)}{x.ver === 'violet' ? ' (Violet)' : x.ver === 'scarlet' ? ' (Scarlet)' : ''}
            </button>
          ))}
        </div>
      )}

      {s.flavor && <p className="text-sm italic leading-relaxed muted">“{s.flavor}”</p>}

      <section>
        <h2 className="section-title">Where to find it</h2>
        <Encounters db={db} s={s} f={f} />
      </section>

      <WorthRaising db={db} s={s} f={f} />

      <section>
        <h2 className="section-title">Evolution line</h2>
        {s.chain != null ? <EvolutionLine db={db} chain={s.chain} current={s.slug} currentForm={f} shiny={shiny} /> : <p className="text-sm muted">Does not evolve.</p>}
      </section>

      <section>
        <h2 className="section-title">Type matchups</h2>
        <Matchups types={f.types} />
      </section>

      <section>
        <h2 className="section-title">✨ Shiny odds</h2>
        <ShinyOdds s={s} f={f} />
      </section>

      <section>
        <h2 className="section-title">Abilities</h2>
        <div className="card divide-y" style={{ borderColor: 'var(--ring)' }}>
          {f.ab.map(([a, hidden]) => (
            <div key={a} className="px-3 py-2" style={{ borderColor: 'var(--ring)' }}>
              <div className="text-sm font-semibold">{db.abilities[a]?.n ?? a}{hidden ? <span className="ml-1.5 rounded bg-violet-sv/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-sv">Hidden</span> : null}</div>
              <div className="text-xs muted">{db.abilities[a]?.e}</div>
            </div>
          ))}
        </div>
        {battleForms.length > 0 && <p className="mt-1.5 text-[11px] muted">Changes form in battle: {battleForms.map((x) => <Link key={x.slug} className="underline" to={`/p/${s.slug}/${x.slug}`} replace>{formLabel(x)}</Link>).reduce<ReactNode[]>((acc, el, i) => i ? [...acc, ', ', el] : [el], [])}</p>}
      </section>

      <section>
        <h2 className="section-title">Moves (Scarlet/Violet)</h2>
        <MoveTable key={f.slug} db={db} form={f} />
      </section>
    </div>
  )
}

function AvailabilityBanner({ f, name }: { f: Form; name: string }) {
  if (f.ver === 'violet') {
    return (
      <div className="rounded-2xl border-2 border-violet-sv bg-violet-sv/10 p-3">
        <p className="font-bold text-violet-sv">🚫 Can’t be caught in Scarlet</p>
        <p className="mt-0.5 text-sm">{name}{f.label && !f.default ? ` (${formLabel(f)})` : ''} only appears in Pokémon Violet. You’d need to trade for it with a Violet player.</p>
        {f.note && <p className="mt-1 text-xs muted">{f.note}</p>}
      </div>
    )
  }
  if (f.ver === 'coop') return <div className="rounded-2xl bg-violet-sv/10 p-3 text-sm">{f.note}</div>
  if (f.ver === 'scarlet') {
    return (
      <div className="rounded-2xl bg-scarlet-600/10 p-3 text-sm">
        <span className="font-bold text-scarlet-700 dark:text-scarlet-400">Scarlet exclusive</span> — Violet players can’t catch it, but you can.
        {f.note && <span className="block text-xs muted">{f.note}</span>}
      </div>
    )
  }
  return null
}

/** The base stat total, where it ends up after evolving, and a plain-English verdict. */
function WorthRaising({ db, s, f }: { db: Db; s: Species; f: Form }) {
  const total = bst(f)
  const final = isFinal(db, s)
  const max = Math.max(...f.stats, 1)
  const finals = final ? [] : finalEvolutions(db, s)
  const bestFinal = finals.sort((a, b) => bst(mainForm(b)) - bst(mainForm(a)))[0]
  const verdict = s.legend
    ? { tone: 'text-amber-600', text: `${s.legend === 'mythical' ? 'Mythical' : 'Legendary'} — top-tier stats.` }
    : !final && bestFinal
      ? { tone: 'text-sky-600', text: `Not fully evolved. Becomes ${bestFinal.name} (BST ${bst(mainForm(bestFinal))}) — judge it by that.` }
      : tier(total)
  const bestStat = f.stats.indexOf(max)
  return (
    <section>
      <h2 className="section-title">Worth raising?</h2>
      <div className="card p-3">
        <p className={`text-sm font-semibold ${verdict.tone}`}>{verdict.text}</p>
        <p className="mt-0.5 text-xs muted">Best stat: {STAT_NAMES[bestStat]} ({max}). {f.stats[1] > f.stats[3] + 15 ? 'Prefers physical moves.' : f.stats[3] > f.stats[1] + 15 ? 'Prefers special moves.' : 'Works with physical or special moves.'}</p>
        <div className="mt-2 space-y-1">
          {f.stats.map((v, i) => (
            <div key={i} className="grid grid-cols-[4.2rem_2rem_1fr] items-center gap-2 text-xs">
              <span className="muted">{STAT_NAMES[i]}</span>
              <span className="text-right font-bold tabular-nums">{v}</span>
              <span className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (v / 180) * 100)}%`, background: statColor(v) }} />
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[4.2rem_2rem_1fr] items-center gap-2 border-t pt-1 text-xs" style={{ borderColor: 'var(--ring)' }}>
            <span className="font-bold">Total</span><span className="text-right font-black tabular-nums">{total}</span>
            <span className="text-[10px] muted">Base stat total (BST)</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function tier(total: number) {
  if (total >= 600) return { tone: 'text-amber-600', text: `BST ${total} — elite, pseudo-legendary level. Absolutely worth raising.` }
  if (total >= 520) return { tone: 'text-emerald-600', text: `BST ${total} — strong final evolution. A great team pick.` }
  if (total >= 470) return { tone: 'text-emerald-600', text: `BST ${total} — solid. Good if its typing fills a gap on your team.` }
  if (total >= 400) return { tone: 'text-orange-500', text: `BST ${total} — average. Fine early on, likely replaced later.` }
  return { tone: 'text-red-500', text: `BST ${total} — weak. Mostly one for the Pokédex.` }
}

const statColor = (v: number) => v >= 120 ? '#10b981' : v >= 90 ? '#84cc16' : v >= 60 ? '#f59e0b' : '#ef4444'

function finalEvolutions(db: Db, s: Species): Species[] {
  if (s.chain == null) return []
  const find = (n: EvoNode): EvoNode | null => n.s === s.slug ? n : (n.to ?? []).map(find).find(Boolean) ?? null
  const out: Species[] = []
  const walk = (n: EvoNode) => {
    const kids = (n.to ?? []).filter((k) => !k.x)
    if (!kids.length && n.s !== s.slug) { const sp = db.bySlug.get(n.s); if (sp) out.push(sp) }
    kids.forEach(walk)
  }
  const node = find(db.evolutions[s.chain])
  if (node) walk(node)
  return out
}
