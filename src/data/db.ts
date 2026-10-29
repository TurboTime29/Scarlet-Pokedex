import { useSyncExternalStore } from 'react'
import type { Db, DexId, Encounters, EvoNode, Form, Species } from './types'

const base = import.meta.env.BASE_URL

let db: Db | null = null
let error: unknown = null
const listeners = new Set<() => void>()

async function load(): Promise<void> {
  const get = (name: string) => fetch(`${base}data/${name}.json`).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${name}.json (${r.status})`)
    return r.json()
  })
  try {
    const [species, moves, abilities, evolutions, dexes, meta] = await Promise.all(
      ['pokemon', 'moves', 'abilities', 'evolutions', 'dexes', 'meta'].map(get),
    ) as [Species[], Db['moves'], Db['abilities'], Db['evolutions'], Db['dexes'], Db['meta']]
    const bySlug = new Map(species.map((s) => [s.slug, s]))
    const formBySlug = new Map<string, { species: Species; form: Form }>()
    for (const s of species) for (const f of s.forms) formBySlug.set(f.slug, { species: s, form: f })
    db = { species, bySlug, formBySlug, moves, abilities, evolutions, dexes, meta }
  } catch (e) {
    error = e
  }
  listeners.forEach((l) => l())
}
const loading = load()

export function useDb(): { db: Db | null; error: unknown } {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => db, () => db)
  return { db, error }
}
export const dbReady = loading

/** The form a dex shows for this species (falls back to the first form). */
export function dexForm(s: Species, dex?: DexId): Form {
  const slug = dex ? s.dexForm[dex] : undefined
  return s.forms.find((f) => f.slug === slug) ?? s.forms[0]
}

/** Form a species "is" outside a specific dex: the Paldea one if listed there, else its first dex. */
export function mainForm(s: Species): Form {
  const dex = (['paldea', 'kitakami', 'blueberry'] as DexId[]).find((d) => s.dexForm[d])
  return dexForm(s, dex)
}

export const thumb = (f: Form, shiny: boolean) => `${base}thumbs/${f.pid}${shiny && f.artS ? 's' : ''}.webp`
export const artwork = (f: Form, shiny: boolean) => (shiny ? f.artS ?? f.art : f.art) ?? f.spr ?? ''

/** Fully evolved within Scarlet/Violet (or the base game): no further evolution that exists in it. */
export function isFinal(db: Db, s: Species, baseGameOnly = false): boolean {
  if (s.chain == null) return true
  const find = (n: EvoNode): EvoNode | null => n.s === s.slug ? n : (n.to ?? []).map(find).find(Boolean) ?? null
  const node = find(db.evolutions[s.chain])
  return !node?.to?.some((k) => !k.x && (!baseGameOnly || db.bySlug.get(k.s)?.dex.paldea != null))
}

export const bst = (f: Form) => f.stats.reduce((a, b) => a + b, 0)

/** Can this form be caught (or obtained without trading) in Scarlet? */
export const inScarlet = (f: Form) => f.ver !== 'violet'

export function formName(s: Species, f: Form): string {
  return f.label && !f.default ? `${s.name} (${formLabel(f)})` : s.name
}

export function formLabel(f: Form): string {
  return f.label.replace(/^Paldean Form \((.*)\)$/, 'Paldean $1').replace(/ (Form|Style|Mode)$/, '') || 'Normal'
}

export function pad(n: number) {
  return String(n).padStart(3, '0')
}

// Encounter data is ~500 KB, so it loads the first time a Pokémon page needs it.
let encounters: Record<string, Encounters> | null = null
let encountersPromise: Promise<void> | null = null
const encListeners = new Set<() => void>()

export function useEncounters(): Record<string, Encounters> | null {
  if (!encountersPromise) {
    encountersPromise = fetch(`${base}data/encounters.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((d) => { encounters = d; encListeners.forEach((l) => l()) })
  }
  return useSyncExternalStore((l) => { encListeners.add(l); return () => encListeners.delete(l) }, () => encounters, () => encounters)
}
