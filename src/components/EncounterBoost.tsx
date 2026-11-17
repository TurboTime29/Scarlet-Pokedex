import { Link } from 'react-router-dom'
import { ENCOUNTER_FOOD } from '../data/encounterFood'
import type { FoodDish, FoodSandwich } from '../data/encounterFoodTypes'
import { typeName } from '../lib/types'
import { usePrefs } from '../store/prefs'
import { DlcBadge, TypeBadge } from './ui'

const PCT = ['', '50%', '75%', '100%']

const towns = (t: string[]) => (t.length > 4 ? `${t.slice(0, 4).join(', ')} +${t.length - 4} more` : t.join(', '))

/** The easiest restaurant dish and sandwich for each type (DLC-only stalls only when the DLC is on). */
export function boostFor(type: string, dlc: boolean): { dish?: FoodDish; dlcDish?: FoodDish; sandwich?: FoodSandwich } {
  const f = ENCOUNTER_FOOD[type]
  if (!f) return {}
  return {
    dish: f.dishes.find((d) => dlc || !d.dlc),
    dlcDish: dlc ? undefined : f.dishes.find((d) => d.dlc),
    sandwich: f.sandwiches.find((s) => !s.herba) ?? f.sandwiches[0],
  }
}

function Ingredients({ items }: { items: string[] }) {
  return (
    <>
      {items.map((x, i) => (
        <span key={x + i}>{i > 0 && ', '}<Link to={`/bag?q=${encodeURIComponent(x)}`} className="underline decoration-dotted">{x}</Link></span>
      ))}
    </>
  )
}

function TypeBoost({ type, compact }: { type: string; compact?: boolean }) {
  const dlc = usePrefs((p) => p.dlc)
  const { dish, dlcDish, sandwich } = boostFor(type, dlc)
  const others = (ENCOUNTER_FOOD[type]?.dishes ?? []).filter((d) => d !== dish && (dlc || !d.dlc))
  return (
    <div className="space-y-2">
      {!compact && <div className="flex items-center gap-1.5"><TypeBadge type={type} size="sm" /><span className="text-xs font-semibold muted">spawns</span></div>}
      {dish ? (
        <div className="rounded-xl p-2.5" style={{ background: 'var(--surface-2)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">🍽️ Easiest: eat out</p>
          <p className="text-sm">
            <b>{dish.name}</b> at <b>{dish.restaurant}</b>{dish.dlc && <> <DlcBadge title="Kitakami (The Teal Mask)" /></>}
          </p>
          <p className="text-xs muted">📍 {towns(dish.towns)} · ₽{dish.price.toLocaleString()} · Encounter Power Lv {dish.level} ({PCT[dish.level]})</p>
          {others.length > 0 && !compact && (
            <p className="mt-1 text-[11px] muted">Also: {others.map((d) => `${d.name} (${d.restaurant})`).join(' · ')}</p>
          )}
        </div>
      ) : (
        <p className="rounded-xl p-2.5 text-xs" style={{ background: 'var(--surface-2)' }}>
          🍽️ No restaurant in Paldea sells {typeName(type)} Encounter Power{dlcDish ? <> — only the {dlcDish.restaurant} at Kitakami Hall does ({dlcDish.name}, The Teal Mask DLC)</> : null}.
        </p>
      )}
      {sandwich && (
        <div className="rounded-xl p-2.5" style={{ background: 'var(--surface-2)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">🥪 {dish ? 'Or make a sandwich' : 'Make this sandwich'}{dish && sandwich.level > dish.level ? ' (stronger)' : ''}</p>
          <p className="text-sm"><b>{sandwich.name}</b> <span className="text-xs muted">· Encounter Power Lv {sandwich.level} ({PCT[sandwich.level]})</span></p>
          <p className="text-xs"><span className="muted">Fillings:</span> <Ingredients items={sandwich.ingredients} /></p>
          <p className="text-xs"><span className="muted">Condiments:</span> <Ingredients items={sandwich.seasonings} /></p>
          {!compact && <p className="mt-0.5 text-[11px] muted">Recipe: {sandwich.recipe}. Picnic → Make a sandwich → pick the recipe.</p>}
          {sandwich.herba && <p className="mt-0.5 text-[11px] muted">Needs a Herba Mystica (from 5★ / 6★ Tera Raids).</p>}
        </div>
      )}
    </div>
  )
}

const Footnote = () => (
  <p className="text-[11px] muted">
    Encounter Power lasts 30 minutes: at Lv 1, half the wild Pokémon that spawn are swapped for one of that type (Lv 2: three in four). Eating again replaces it. Tap an ingredient to see where to buy it.
  </p>
)

/** "Boost the odds" for a Pokémon page: what to eat to see more of its type(s). */
export function EncounterBoost({ types }: { types: string[] }) {
  const known = types.filter((t) => ENCOUNTER_FOOD[t])
  if (!known.length) return null
  return (
    <section>
      <h2 className="section-title">🍽️ Boost the odds</h2>
      <div className="card space-y-3 p-3">
        <p className="text-sm">Eat something with <b>Encounter Power</b> for {known.length > 1 ? 'either of its types' : 'its type'} to see it more often.</p>
        {known.map((t) => <TypeBoost key={t} type={t} />)}
        <Footnote />
      </div>
    </section>
  )
}

/** Compact version for the Hunt tab when a type filter is on. */
export function TypeBoostBanner({ type }: { type: string }) {
  if (!ENCOUNTER_FOOD[type]) return null
  return (
    <section className="card space-y-2 p-3">
      <h2 className="flex items-center gap-1.5 font-display text-base font-bold">🍽️ See more <TypeBadge type={type} size="sm" /> Pokémon</h2>
      <TypeBoost type={type} compact />
      <Footnote />
    </section>
  )
}
