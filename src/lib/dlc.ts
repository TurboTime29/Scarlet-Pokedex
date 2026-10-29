import type { DexId, Form, Species } from '../data/types'

/**
 * Base game = the 400 Pokémon of the Paldea dex. Everything only in the Kitakami / Blueberry dexes needs
 * The Hidden Treasure of Area Zero DLC (The Teal Mask / The Indigo Disk).
 */
export const isDlcSpecies = (s: Species) => s.dex.paldea == null

/**
 * A form is DLC-only when the species is, or when it's the form a DLC dex shows but Paldea doesn't
 * (Johto Wooper in Kitakami, Kanto Tauros and Alolan Diglett in Blueberry, White-Striped Basculin).
 */
export function isDlcForm(s: Species, f: Form): boolean {
  if (isDlcSpecies(s)) return true
  if (f.slug === s.dexForm.paldea) return false
  return (Object.entries(s.dexForm) as [DexId, string][]).some(([d, slug]) => d !== 'paldea' && slug === f.slug)
}

export const DLC_REGION: Record<Exclude<DexId, 'paldea'>, string> = {
  kitakami: 'The Teal Mask',
  blueberry: 'The Indigo Disk',
}

/** Which DLC part a species or form comes from, for labels. */
export function dlcPart(s: Species, f?: Form): string {
  const regions = (['kitakami', 'blueberry'] as const).filter((d) => (f ? s.dexForm[d] === f.slug : s.dex[d] != null))
  return regions.length === 1 ? DLC_REGION[regions[0]] : 'the DLC'
}
