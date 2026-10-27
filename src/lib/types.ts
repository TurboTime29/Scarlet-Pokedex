export const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const
export type Type = (typeof TYPES)[number]

// Gen 6+ chart: attacking type -> { defending type: multiplier } (only non-1× entries).
const CHART: Record<Type, Partial<Record<Type, number>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

export function effectiveness(attack: Type, defenders: readonly string[]): number {
  return defenders.reduce((m, d) => m * (CHART[attack][d as Type] ?? 1), 1)
}

/** How hard each attacking type hits a Pokémon with these types. */
export function defensiveMultipliers(defenders: readonly string[]): Record<Type, number> {
  return Object.fromEntries(TYPES.map((t) => [t, effectiveness(t, defenders)])) as Record<Type, number>
}

export interface Matchups {
  x4: Type[]
  x2: Type[]
  half: Type[]
  quarter: Type[]
  immune: Type[]
}

export function defensiveMatchups(defenders: readonly string[]): Matchups {
  const m = defensiveMultipliers(defenders)
  const pick = (f: (v: number) => boolean) => TYPES.filter((t) => f(m[t]))
  return {
    x4: pick((v) => v >= 4),
    x2: pick((v) => v === 2),
    half: pick((v) => v === 0.5),
    quarter: pick((v) => v > 0 && v <= 0.25),
    immune: pick((v) => v === 0),
  }
}

/** Single types that at least one of these (STAB) types hits for 2×. */
export function offensiveCoverage(attackers: readonly string[]): Type[] {
  return TYPES.filter((d) => attackers.some((a) => (CHART[a as Type][d] ?? 1) >= 2))
}

/** Best multiplier any of the attacker's own types gets against the defending typing. */
export function bestStab(attackers: readonly string[], defenders: readonly string[]): number {
  return Math.max(...attackers.map((a) => effectiveness(a as Type, defenders)))
}

export const TYPE_COLORS: Record<Type, string> = {
  normal: '#9fa19f', fire: '#e62829', water: '#2980ef', electric: '#fac000', grass: '#3fa129',
  ice: '#3dcef3', fighting: '#ff8000', poison: '#9141cb', ground: '#915121', flying: '#81b9ef',
  psychic: '#ef4179', bug: '#91a119', rock: '#afa981', ghost: '#704170', dragon: '#5060e1',
  dark: '#624d4e', steel: '#60a1b8', fairy: '#ef70ef',
}

export const typeName = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
