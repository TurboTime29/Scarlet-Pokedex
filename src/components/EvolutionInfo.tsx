import { Link } from 'react-router-dom'
import { formLabel, mainForm, thumb } from '../data/db'
import type { Db, EvoNode, Form, Species } from '../data/types'
import { DlcBadge, Img } from './ui'
import { usePrefs } from '../store/prefs'
import { dlcPart, isDlcForm, isDlcSpecies, withoutDlcBranches } from '../lib/dlc'

// Branches that only apply to one regional form of the species (the rest of the chain is shared).
const FORM_ONLY: Record<string, string> = {
  'wooper>quagsire': 'wooper',
  'wooper>clodsire': 'wooper-paldea',
  // Kantonian Qwilfish can learn Barb Barrage as an egg move but still never evolves
  'qwilfish>overqwil': 'qwilfish-hisui',
}

interface Edge { from: string; to: EvoNode }

/** "Hisuian Qwilfish", or "regular Wooper" for the unlabeled default form. */
const formName = (s: Species, f: Form) => (f.label ? `${formLabel(f)} ${s.name}` : `regular ${s.name}`)
const formPath = (s: Species, f: Form) => (f.default ? `/p/${s.slug}` : `/p/${s.slug}/${f.slug}`)

function findNode(n: EvoNode, slug: string): { node: EvoNode; parent: EvoNode | null } | null {
  if (n.s === slug) return { node: n, parent: null }
  for (const k of n.to ?? []) {
    if (k.s === slug) return { node: k, parent: n }
    const hit = findNode(k, slug)
    if (hit) return hit
  }
  return null
}

const applies = (from: string, to: string, form: Form) => {
  const only = FORM_ONLY[`${from}>${to}`]
  return !only || only === form.slug
}

/** The kind of condition, for an icon and a plain-English tip. */
function explain(how: string): { icon: string; tip: string | null } {
  const h = how.toLowerCase()
  if (h.includes('trade')) return { icon: '🔁', tip: `Trade it to another player (Poké Portal → Link Trade, or in a Union Circle)${h.includes('holding') ? ' while it holds the item' : ''} — it evolves on arrival. Ask them to trade it back.` }
  if (h.startsWith('use ')) return { icon: '💎', tip: 'Use the item on it from your bag (Items → choose the item → choose this Pokémon). No level needed.' }
  if (h.includes('friendship')) return { icon: '❤️', tip: 'Raise its friendship — keep it in your party, battle with it, play and wash it at picnics, and give it a Soothe Bell. Then level it up once (a Rare Candy or Exp. Candy counts).' }
  if (h.includes('knowing')) return { icon: '📖', tip: 'Make sure it knows the move (you can relearn forgotten moves from its summary), then level it up once.' }
  if (h.includes('holding')) return { icon: '🎒', tip: 'Give it the item to hold, then level it up once (time of day matters if listed).' }
  if (h.includes('1,000 steps')) return { icon: '👣', tip: 'Send it out with the R button so it follows you, walk 1,000 steps, then level it up.' }
  if (/^lv \d+/.test(h)) return { icon: '⬆️', tip: null }
  return { icon: '⭐', tip: null }
}

/** Plain statement of how this Pokémon evolves and what it evolved from, shown near the top of its page. */
export function EvolutionInfo({ db, s, f }: { db: Db; s: Species; f: Form }) {
  const dlc = usePrefs((p) => p.dlc)
  // without the DLC, evolutions into DLC-only Pokémon (Dipplin, Hydrapple) don't exist
  const root = s.chain != null ? withoutDlcBranches(db, db.evolutions[s.chain], dlc || isDlcSpecies(s)) : null
  const hit = root ? findNode(root, s.slug) : null
  const branches = (hit?.node.to ?? []).filter((k) => applies(s.slug, k.s, f))
  const into: Edge[] = branches.filter((k) => !k.x).map((to) => ({ from: s.slug, to }))
  const outside = branches.filter((k) => k.x)
  const from = hit?.parent ? db.bySlug.get(hit.parent.s) ?? null : null
  const fromHow = hit?.node.how
  // the form that evolves into this one, when only one form of `from` does (Hisuian Qwilfish → Overqwil)
  const fromForm = from ? FORM_ONLY[`${from.slug}>${s.slug}`] : undefined
  // branches only another form of this species can take
  const otherForms = (hit?.node.to ?? []).filter((k) => !k.x && !applies(s.slug, k.s, f))
  const otherFormNote = otherForms.length > 0 && <OtherFormNote db={db} s={s} branches={otherForms} />

  const outsideNote = outside.length > 0 && (
    <p className="mt-2 text-[11px] muted">It can also become {outside.map((k) => titleCase(k.s)).join(' or ')} in other games, but not in Scarlet/Violet.</p>
  )

  if (!into.length && !from) {
    if (otherFormNote) {
      return <div className="card p-3 text-sm"><span className="font-semibold">This {s.name} doesn’t evolve.</span>{otherFormNote}</div>
    }
    return <div className="card p-3 text-sm"><span className="font-semibold">Doesn’t evolve.</span> <span className="muted">What you catch is what you get.</span></div>
  }

  return (
    <div className="space-y-2">
      {into.length > 0 ? (
        <div className="card p-3">
          <p className="text-sm font-bold">{into.length > 1 ? `Can evolve into ${into.length} different Pokémon:` : 'Evolves into:'}</p>
          <ul className="mt-2 space-y-2">
            {into.map(({ to }) => <EvoStep key={to.s} db={db} node={to} />)}
          </ul>
          {outsideNote}
          {otherFormNote}
        </div>
      ) : otherFormNote ? (
        <div className="card p-3 text-sm"><span className="font-semibold">This {s.name} doesn’t evolve any further.</span>{otherFormNote}</div>
      ) : (
        <div className="card p-3 text-sm"><span className="font-semibold text-emerald-600">Fully evolved.</span> <span className="muted">This is its final form.</span></div>
      )}
      {from && (
        <p className="px-1 text-xs muted">
          Evolves from <FromLink from={from} formSlug={fromForm} />{fromHow ? ` — ${lower(fromHow)}` : ''}.
        </p>
      )}
    </div>
  )
}

function FromLink({ from, formSlug }: { from: Species; formSlug?: string }) {
  const f = formSlug ? from.forms.find((x) => x.slug === formSlug) : undefined
  return <Link to={f ? formPath(from, f) : `/p/${from.slug}`} className="font-semibold underline">{f ? formName(from, f) : from.name}</Link>
}

/** "Only Hisuian Qwilfish evolves into Overqwil" on the page of a form that can't. */
function OtherFormNote({ db, s, branches }: { db: Db; s: Species; branches: EvoNode[] }) {
  const dlc = usePrefs((p) => p.dlc)
  return (
    <div className="mt-2 space-y-1.5">
      {branches.map((k) => {
        const form = s.forms.find((x) => x.slug === FORM_ONLY[`${s.slug}>${k.s}`])
        const target = db.bySlug.get(k.s)
        if (!form || !target) return null
        const name = formName(s, form)
        const needsDlc = !dlc && isDlcForm(s, form)
        return (
          <p key={k.s} className="rounded-xl bg-amber-500/15 p-2.5 text-sm text-amber-900 dark:text-amber-100">
            ⚠️ Only <Link to={formPath(s, form)} className="font-semibold underline">{name}</Link> evolves into{' '}
            <Link to={`/p/${target.slug}`} className="font-semibold underline">{target.name}</Link>{k.how ? ` (${lower(k.how).replace(/ \(.*\)$/, '')})` : ''}.{' '}
            This {s.name} can’t{k.how && /knowing/i.test(k.how) ? ', even if it knows the move' : ''}.
            {needsDlc && <span className="mt-1 block text-xs">{name.charAt(0).toUpperCase() + name.slice(1)} is only in {dlcPart(s, form)}.</span>}
          </p>
        )
      })}
    </div>
  )
}

/** The item named in an evolution condition ("Use a Thunder Stone", "Trade holding Metal Coat"). */
function itemIn(how: string): string | null {
  const m = how.match(/(?:Use an? |holding (?:an? |the )?)([A-Z][A-Za-z'’ -]+?)(?= during| at | or |\(|,|$)/)
  return m ? m[1].trim() : null
}

const lower = (s: string) => (/^Lv /.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
const titleCase = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

function EvoStep({ db, node }: { db: Db; node: EvoNode }) {
  const dlc = usePrefs((p) => p.dlc)
  const target = db.bySlug.get(node.s)
  const how = node.how ?? 'Special'
  const { icon, tip } = explain(how)
  const missing = !target || node.x
  const body = (
    <>
      {target && !node.x ? <Img src={thumb(mainForm(target), false)} alt="" size={48} className="h-12 w-12 shrink-0 object-contain" /> : <span className="grid h-12 w-12 shrink-0 place-items-center text-xl opacity-40">?</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{target?.name ?? titleCase(node.s)}{missing && <span className="ml-1 text-[10px] font-normal muted">(not in Scarlet/Violet)</span>}{!missing && !dlc && target && isDlcSpecies(target) && <span className="ml-1.5 align-middle"><DlcBadge title={`Needs ${dlcPart(target)}`} /></span>}</span>
        <span className="mt-0.5 flex items-start gap-1.5 text-sm"><span aria-hidden>{icon}</span><span className="font-semibold text-scarlet-700 dark:text-scarlet-400">{how}</span></span>
        {tip && !missing && <span className="mt-0.5 block text-[11px] leading-snug muted">{tip}</span>}
      </span>
    </>
  )
  return (
    <li>
      {missing ? <div className="flex items-start gap-2 rounded-xl p-1.5 opacity-60">{body}</div> : (
        <Link to={`/p/${target!.slug}`} className="flex items-start gap-2 rounded-xl p-1.5 active:scale-[0.99]" style={{ background: 'var(--surface-2)' }}>{body}</Link>
      )}
      {itemIn(how) && !missing && (
        <Link to={`/bag?q=${encodeURIComponent(itemIn(how)!)}`} className="ml-14 mt-0.5 inline-block text-[11px] font-semibold text-scarlet-600">🎒 {itemIn(how)}: where to get it ›</Link>
      )}
    </li>
  )
}
