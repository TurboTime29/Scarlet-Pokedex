import type { Db, Form, Species } from '../data/types'
import { bst, isFinal } from '../data/db'
import { bestStab, effectiveness, type Type } from './types'

export interface Counter {
  species: Species
  form: Form
  /** best multiplier this Pokémon's STAB gets on the opponent */
  hits: number
  /** worst multiplier the opponent's STAB gets on this Pokémon */
  takes: number
  final: boolean
  bst: number
}

export interface CounterOptions {
  includeViolet?: boolean
  finalOnly?: boolean
  /** restrict to these species slugs (caught / team) */
  only?: Set<string>
}

/** Bucket for "how safely can it switch in": immune/resist, neutral, weak. */
const safety = (takes: number) => (takes < 1 ? 0 : takes === 1 ? 1 : 2)

/**
 * Pokémon whose own types hit the opponent typing super-effectively, best first:
 * those that also resist the opponent's STAB, then 4× before 2×, then higher base stat total.
 */
export function findCounters(db: Db, opponent: Type[], opts: CounterOptions = {}): Counter[] {
  if (!opponent.length) return []
  const best = new Map<string, Counter>()
  for (const s of db.species) {
    if (opts.only && !opts.only.has(s.slug)) continue
    const final = isFinal(db, s)
    if (opts.finalOnly && !final) continue
    for (const f of s.forms) {
      if (f.battleOnly) continue
      if (!opts.includeViolet && f.ver === 'violet') continue
      const hits = bestStab(f.types, opponent)
      if (hits < 2) continue
      const takes = Math.max(...opponent.map((t) => effectiveness(t, f.types)))
      const c: Counter = { species: s, form: f, hits, takes, final, bst: bst(f) }
      const prev = best.get(s.slug)
      if (!prev || compare(c, prev) < 0) best.set(s.slug, c)
    }
  }
  return [...best.values()].sort(compare)
}

function compare(a: Counter, b: Counter): number {
  return safety(a.takes) - safety(b.takes) || b.hits - a.hits || a.takes - b.takes || b.bst - a.bst
}
