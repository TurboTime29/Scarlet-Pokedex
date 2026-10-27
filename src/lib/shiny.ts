import type { Form, Species } from '../data/types'

export const BASE_ODDS = 4096
/** Tera Raid shinies come from a 32-bit seed, so they're slightly rarer and can't be boosted. */
export const RAID_ODDS = 4103.05

export type Method = 'wild' | 'egg'

export interface ShinyBoosts {
  charm: boolean
  /** Sparkling Power sandwich level 0–3 */
  sparkling: 0 | 1 | 2 | 3
  /** Mass outbreak: 0 none, 1 = 30–59 cleared, 2 = 60+ cleared */
  outbreak: 0 | 1 | 2
  /** eggs only: parents from different-language games */
  masuda: boolean
}

/** Number of shiny rolls per encounter / egg in Scarlet & Violet. */
export function shinyRolls(method: Method, b: ShinyBoosts): number {
  const charm = b.charm ? 2 : 0
  if (method === 'egg') return 1 + charm + (b.masuda ? 5 : 0)
  return 1 + charm + b.sparkling + b.outbreak
}

/** Chance a single encounter is shiny. */
export const shinyChance = (rolls: number) => 1 - (1 - 1 / BASE_ODDS) ** rolls

/** Chance of seeing at least one shiny in n encounters. */
export const chanceWithin = (p: number, n: number) => 1 - (1 - p) ** n

// Static / gift encounters coded never to be shiny (Bulbapedia, "Shiny Pokémon" → Generation IX).
const LOCKED = new Set(['gimmighoul', 'gholdengo', 'gouging-fire', 'raging-bolt', 'iron-boulder', 'iron-crown', 'ogerpon', 'terapagos'])

export function shinyLock(s: Species, f: Form): string | null {
  if (s.legend || LOCKED.has(s.slug) || f.slug === 'ursaluna-bloodmoon') {
    if (s.slug === 'gholdengo') return 'Gimmighoul are always shiny-locked, so Gholdengo can’t be shiny in Scarlet either.'
    return 'Shiny-locked: this is a one-time story or special encounter that’s coded never to be shiny in Scarlet.'
  }
  return null
}
