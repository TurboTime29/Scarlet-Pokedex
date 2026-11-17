import type { Db, DexId, EvoNode, Form, Species } from '../data/types'

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

/**
 * An evolution tree without the branches into DLC-only Pokémon (Applin → Dipplin → Hydrapple), for
 * when the DLC is off. A DLC Pokémon that leads to a base-game one stays. Pass `keep` to get the tree
 * back unchanged (the DLC is on, or the page is for a DLC Pokémon).
 */
export function withoutDlcBranches(db: Db, root: EvoNode, keep: boolean): EvoNode {
  if (keep) return root
  const isDlc = (n: EvoNode) => { const s = db.bySlug.get(n.s); return !!s && !n.x && isDlcSpecies(s) }
  const prune = (n: EvoNode): EvoNode | null => {
    const orig = n.to ?? []
    const to = orig.map(prune).filter((k): k is EvoNode => k !== null)
    if (isDlc(n) && !to.length) return null
    return to.length === orig.length && to.every((k, i) => k === orig[i]) ? n : { ...n, to }
  }
  return prune(root) ?? root
}
