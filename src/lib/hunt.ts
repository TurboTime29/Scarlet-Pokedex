import { bst, isFinal, mainForm } from '../data/db'
import type { Db, Encounters, EvoNode, FixedSpawn, Form, Species, WildSpawn } from '../data/types'
import { isDlcForm } from './dlc'

/** One place to catch a hunt target: a wild spawn (with odds) or a fixed spot. */
export type Spot =
  | { kind: 'wild'; w: WildSpawn }
  | { kind: 'fixed'; x: FixedSpawn }

export interface HuntEntry {
  species: Species
  form: Form
  bst: number
  /** highest BST it can reach by evolving in the base game (itself if final) */
  topBst: number
  topName: string | null
  final: boolean
  /** best first: wild by odds, fixed spots after */
  spots: Spot[]
  /** conditions every spot shares (e.g. "only after beating the main story"), so it can't be caught without them */
  conditions: string[]
  /** times of day it can be caught at all (0 morning … 3 night); fixed spots count as any time */
  times: boolean[]
}

export const STAT_KEYS = ['bst', 'hp', 'atk', 'def', 'spa', 'spd', 'spe', 'top', 'odds', 'dex'] as const
export type SortKey = (typeof STAT_KEYS)[number]

const formFor = (s: Species, x: { f?: string; r: string }) =>
  s.forms.find((f) => f.slug === (x.f ?? s.dexForm.paldea)) ?? mainForm(s)

const TITAN = /titan/i

/** Condition text for a single spot ('' when it can be caught any time after reaching it). */
export function spotCondition(sp: Spot): string {
  if (sp.kind === 'wild') return sp.w.n && /after|only (appears|spawns) after|main story|titan|league club/i.test(sp.w.n) ? sp.w.n : ''
  if (TITAN.test(sp.x.where)) return 'Only after you’ve beaten it as a Titan Pokémon.'
  return ''
}

const bestPct = (sp: Spot, time: number | null) => (sp.kind === 'wild' ? (time == null ? Math.max(...sp.w.p) : sp.w.p[time]) : -1)

/**
 * Everything you can catch yourself in base-game Scarlet (Paldea wild spawns + fixed spots; no gifts,
 * trades, raids, Violet-only or DLC forms), one entry per species form.
 */
export function buildHunt(db: Db, enc: Record<string, Encounters>): HuntEntry[] {
  const out: HuntEntry[] = []
  for (const [slug, e] of Object.entries(enc)) {
    const s = db.bySlug.get(slug)
    if (!s || s.dex.paldea == null) continue
    const byForm = new Map<string, Spot[]>()
    const add = (f: Form, sp: Spot) => { if (!isDlcForm(s, f)) byForm.set(f.slug, [...(byForm.get(f.slug) ?? []), sp]) }
    for (const w of e.wild) if (w.r === 'paldea' && w.v !== 'violet') add(formFor(s, w), { kind: 'wild', w })
    for (const x of e.fixed) if (x.r === 'paldea' && x.v !== 'violet' && x.where !== 'Gift' && x.where !== 'Trade') add(formFor(s, x), { kind: 'fixed', x })
    for (const [fslug, spots] of byForm) {
      const form = s.forms.find((f) => f.slug === fslug)!
      spots.sort((a, b) => bestPct(b, null) - bestPct(a, null))
      const conds = spots.map(spotCondition)
      const shared = conds.every((c) => c) ? [...new Set(conds)] : []
      const times = [0, 1, 2, 3].map((t) => spots.some((sp) => sp.kind === 'fixed' || sp.w.p[t] > 0))
      const top = topEvolution(db, s)
      out.push({ species: s, form, bst: bst(form), topBst: top ? bst(mainForm(top)) : bst(form), topName: top?.name ?? null, final: isFinal(db, s, true), spots, conditions: shared, times })
    }
  }
  return out
}

/** Highest-BST base-game evolution reachable from this species (null if it is already final). */
function topEvolution(db: Db, s: Species): Species | null {
  if (s.chain == null) return null
  const find = (n: EvoNode): EvoNode | null => (n.s === s.slug ? n : (n.to ?? []).map(find).find(Boolean) ?? null)
  const node = find(db.evolutions[s.chain])
  let best: Species | null = null
  const walk = (n: EvoNode) => {
    for (const k of n.to ?? []) {
      const sp = db.bySlug.get(k.s)
      if (k.x || !sp || sp.dex.paldea == null) continue
      if (!best || bst(mainForm(sp)) > bst(mainForm(best))) best = sp
      walk(k)
    }
  }
  if (node) walk(node)
  return best
}

const STAT_INDEX: Partial<Record<SortKey, number>> = { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 }

export function sortValue(h: HuntEntry, key: SortKey, time: number | null): number {
  if (key === 'bst') return h.bst
  if (key === 'top') return h.topBst
  if (key === 'odds') return Math.max(...h.spots.map((sp) => bestPct(sp, time)))
  if (key === 'dex') return -(h.species.dex.paldea ?? 999)
  return h.form.stats[STAT_INDEX[key]!]
}
