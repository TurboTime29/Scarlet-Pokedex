import { placeKey } from '../data/db'
import type { Db, DexId, Encounters, FixedSpawn, Form, Species, WildSpawn } from '../data/types'

export interface WildRow { species: Species; form: Form; w: WildSpawn }
export interface FixedRow { species: Species; form: Form; x: FixedSpawn }
export interface Biome { name: string; rows: WildRow[] }
export interface SubArea { name: string | null; biomes: Biome[] }
export interface Place { key: string; name: string; r: DexId; subs: SubArea[]; fixed: FixedRow[] }

function formFor(s: Species, x: { f?: string; r: DexId }): Form {
  const slug = x.f ?? s.dexForm[x.r]
  return s.forms.find((f) => f.slug === slug) ?? s.forms.find((f) => f.default) ?? s.forms[0]
}

// Paldea's provinces in map order, then everything else alphabetically.
const PROVINCE = /^(South|East|West|North) Province \(Area (One|Two|Three|Four|Five|Six)\)$/
const DIR = ['South', 'East', 'West', 'North']
const NUM = ['One', 'Two', 'Three', 'Four', 'Five', 'Six']
function order(name: string): string {
  const m = name.match(PROVINCE)
  return m ? `0${DIR.indexOf(m[1])}${NUM.indexOf(m[2])}` : `1${name}`
}

let cache: { enc: Record<string, Encounters>; places: Place[] } | null = null

/** Every location with its sub-areas, biomes and the Pokémon in each (inverted from the per-species encounter data). */
export function buildPlaces(db: Db, enc: Record<string, Encounters>): Place[] {
  if (cache?.enc === enc) return cache.places
  const byKey = new Map<string, Place>()
  const place = (loc: string, r: DexId) => {
    const key = placeKey(loc)
    let p = byKey.get(key)
    if (!p) { p = { key, name: loc, r, subs: [], fixed: [] }; byKey.set(key, p) }
    return p
  }
  for (const [slug, e] of Object.entries(enc)) {
    const s = db.bySlug.get(slug)
    if (!s) continue
    for (const w of e.wild) {
      const p = place(w.loc, w.r)
      const subName = w.sub ?? null
      let sub = p.subs.find((x) => x.name === subName)
      if (!sub) { sub = { name: subName, biomes: [] }; p.subs.push(sub) }
      let biome = sub.biomes.find((b) => b.name === w.b)
      if (!biome) { biome = { name: w.b, rows: [] }; sub.biomes.push(biome) }
      biome.rows.push({ species: s, form: formFor(s, w), w })
    }
    for (const x of e.fixed) place(x.loc, x.r).fixed.push({ species: s, form: formFor(s, x), x })
  }
  const places = [...byKey.values()].sort((a, b) => order(a.name).localeCompare(order(b.name)))
  for (const p of places) {
    p.subs.sort((a, b) => (a.name === null ? -1 : b.name === null ? 1 : a.name.localeCompare(b.name)))
    for (const sub of p.subs) for (const b of sub.biomes) b.rows.sort((x, y) => Math.max(...y.w.p) - Math.max(...x.w.p))
    p.fixed.sort((a, b) => a.species.name.localeCompare(b.species.name))
  }
  cache = { enc, places }
  return places
}
