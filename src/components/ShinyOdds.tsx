import { useState } from 'react'
import type { Form, Species } from '../data/types'
import { RAID_ODDS, chanceWithin, shinyChance, shinyLock, shinyRolls, type Method } from '../lib/shiny'
import { usePrefs } from '../store/prefs'

const fmt = (n: number) => Math.round(n).toLocaleString()
const pct = (p: number) => `${p >= 0.995 ? '99+' : Math.round(p * 100)}%`

/** Shiny odds for this Pokémon with the player's current boosts (Shiny Charm, sandwich, outbreak, Masuda). */
export function ShinyOdds({ s, f }: { s: Species; f: Form }) {
  const boosts = usePrefs((p) => p.boosts)
  const setBoosts = usePrefs((p) => p.setBoosts)
  const [method, setMethod] = useState<Method>('wild')
  const lock = shinyLock(s, f)
  if (lock) return <div className="card p-3 text-sm">🔒 {lock}</div>

  const rolls = shinyRolls(method, boosts)
  const p = shinyChance(rolls)
  return (
    <div className="card space-y-3 p-3">
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={method === 'wild'} onClick={() => setMethod('wild')}>Wild / outbreak</button>
        <button role="tab" aria-selected={method === 'egg'} onClick={() => setMethod('egg')}>Breeding (eggs)</button>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-black tabular-nums">1 in {fmt(1 / p)}</div>
          <div className="text-xs muted">{rolls} shiny {rolls === 1 ? 'roll' : 'rolls'} per {method === 'egg' ? 'egg' : 'encounter'} · base is 1 in 4,096</div>
        </div>
        <div className="text-right text-[11px] leading-tight muted">
          Chance of at least one shiny after
          <div className="mt-0.5 font-semibold" style={{ color: 'var(--text)' }}>
            100: {pct(chanceWithin(p, 100))} · 500: {pct(chanceWithin(p, 500))} · 1,000: {pct(chanceWithin(p, 1000))}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <label className="flex items-center justify-between gap-2">
          <span>Shiny Charm <span className="text-xs muted">(complete the Paldea Pokédex)</span></span>
          <input type="checkbox" className="h-5 w-5 accent-scarlet-600" checked={boosts.charm} onChange={(e) => setBoosts({ charm: e.target.checked })} />
        </label>
        {method === 'wild' ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span>Sparkling Power <span className="text-xs muted">({/^[aeiou]/.test(f.types[0]) ? 'an' : 'a'} {f.types.map((t) => t[0].toUpperCase() + t.slice(1)).join(' or ')} sandwich)</span></span>
              <div className="seg w-36 shrink-0">
                {([0, 1, 2, 3] as const).map((l) => <button key={l} aria-selected={boosts.sparkling === l} onClick={() => setBoosts({ sparkling: l })}>{l === 0 ? 'Off' : `Lv${l}`}</button>)}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Mass outbreak cleared</span>
              <div className="seg w-36 shrink-0">
                {([0, 1, 2] as const).map((o) => <button key={o} aria-selected={boosts.outbreak === o} onClick={() => setBoosts({ outbreak: o })}>{o === 0 ? 'No' : o === 1 ? '30+' : '60+'}</button>)}
              </div>
            </div>
          </>
        ) : (
          <label className="flex items-center justify-between gap-2">
            <span>Masuda method <span className="text-xs muted">(parent from a different-language game)</span></span>
            <input type="checkbox" className="h-5 w-5 accent-scarlet-600" checked={boosts.masuda} onChange={(e) => setBoosts({ masuda: e.target.checked })} />
          </label>
        )}
      </div>

      <p className="text-[11px] leading-snug muted">
        {method === 'wild'
          ? 'Best possible: Shiny Charm + Sparkling Power Lv3 + 60 outbreak KOs = 1 in 512. Shinies show up shiny in the overworld, so look for the different colours (toggle ✨ above to see them). '
          : 'Sandwiches and outbreaks don’t affect eggs. Masuda + Shiny Charm = 1 in 512. '}
        Tera Raid shinies are always about 1 in {fmt(RAID_ODDS)} and can’t be boosted.
      </p>
    </div>
  )
}
