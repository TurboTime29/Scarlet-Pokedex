import Fuse from 'fuse.js'
import type { DexId, Species } from '../data/types'
import { TYPES } from './types'

let fuse: Fuse<Species> | null = null
let fuseFor: Species[] | null = null

/**
 * Filter species by a search query: a dex number ("25", "#025"), a type name ("fire",
 * "fire water" = both types), or a fuzzy name match ("pika", "garchmop").
 */
export function searchSpecies(all: Species[], list: Species[], query: string, dex: DexId, typesOf: (s: Species) => string[]): Species[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const num = q.match(/^#?0*(\d{1,4})$/)
  if (num) {
    const n = Number(num[1])
    return list.filter((s) => s.dex[dex] === n || s.id === n)
  }
  const words = q.split(/\s+/)
  if (words.every((w) => (TYPES as readonly string[]).includes(w))) {
    return list.filter((s) => words.every((w) => typesOf(s).includes(w)))
  }
  // Plain substring matches win ("pika" → Pikachu); fuzzy matching is only a fallback for typos.
  const plain = q.replace(/[^a-z0-9]/g, '')
  const direct = list.filter((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(plain))
  if (direct.length) return direct.sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
  if (fuseFor !== all) {
    fuse = new Fuse(all, { keys: ['name', 'slug'], threshold: 0.34, ignoreLocation: true })
    fuseFor = all
  }
  const inList = new Set(list)
  return fuse!.search(q).map((r) => r.item).filter((s) => inList.has(s))
}
