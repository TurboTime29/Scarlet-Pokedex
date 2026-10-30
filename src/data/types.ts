export type DexId = 'paldea' | 'kitakami' | 'blueberry'
export const DEXES: { id: DexId; label: string; short: string }[] = [
  { id: 'paldea', label: 'Paldea', short: 'Paldea' },
  { id: 'kitakami', label: 'Kitakami (Teal Mask)', short: 'Kitakami' },
  { id: 'blueberry', label: 'Blueberry (Indigo Disk)', short: 'Blueberry' },
]

/** scarlet / violet = version exclusive; coop = Violet legendary obtainable in Scarlet via co-op. */
export type Version = 'scarlet' | 'violet' | 'coop' | null

export interface Form {
  slug: string
  pid: number
  label: string
  types: string[]
  /** HP, Atk, Def, SpA, SpD, Spe */
  stats: number[]
  /** [ability slug, hidden] */
  ab: [string, 0 | 1][]
  art: string | null
  artS: string | null
  spr: string | null
  sprS: string | null
  /** [level, move index]; level 0 = learned on evolution */
  lv: [number, number][]
  tm: number[]
  egg: number[]
  ver: Version
  note: string | null
  battleOnly: boolean
  default: boolean
}

export interface Species {
  id: number
  slug: string
  name: string
  genus: string
  flavor: string
  dex: Partial<Record<DexId, number>>
  dexForm: Partial<Record<DexId, string>>
  chain: number | null
  final: boolean
  legend: 'legendary' | 'mythical' | null
  paradox: boolean
  forms: Form[]
}

export interface Move {
  n: string
  t: string
  /** ph / sp / st */
  c: 'ph' | 'sp' | 'st'
  p: number | null
  a: number | null
  pp: number
  e: string
}

export interface EvoNode {
  s: string
  how?: string
  to?: EvoNode[]
  /** 1 = species not obtainable in Scarlet/Violet */
  x?: 1
}

export interface Db {
  species: Species[]
  bySlug: Map<string, Species>
  formBySlug: Map<string, { species: Species; form: Form }>
  moves: Move[]
  abilities: Record<string, { n: string; e: string }>
  evolutions: Record<string, EvoNode>
  dexes: Record<DexId, string[]>
  meta: { built: string; species: number; source: string }
}

export type Avail = 'both' | 'scarlet' | 'violet'

export interface WildSpawn {
  loc: string
  /** sub-area inside a big location (Area Zero's "Upper Field", a Terarium cave) */
  sub?: string
  r: DexId
  /** biome within the location */
  b: string
  lv: string
  /** % of spawns in this biome (morning, day, evening, night) */
  p: [number, number, number, number]
  v: Avail
  /** form slug when not the region's usual form */
  f?: string
  /** % chance it appears in a group */
  g?: number
  on?: ('land' | 'water' | 'sky')[]
  /** condition or spot note, e.g. "only after beating the main story", "only spawns in trees" */
  n?: string
  /** higher level range later on (Kitakami levels rise as the DLC story goes on) */
  ls?: string
}

export interface FixedSpawn { loc: string; r: DexId; where: string; lv: string; v: Avail; f?: string; note?: string }
export interface RaidSpawn { r: DexId; s: number; lv: string; v: Avail; f?: string }
export interface Encounters { wild: WildSpawn[]; fixed: FixedSpawn[]; raids: RaidSpawn[] }
