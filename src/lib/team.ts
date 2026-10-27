import { TYPES, defensiveMultipliers, offensiveCoverage, type Type } from './types'

export interface TeamSummary {
  /** attacking type -> how many members take 2× or more */
  weak: Record<Type, number>
  /** attacking type -> how many members take ½× or less */
  resist: Record<Type, number>
  /** types that hit 2+ members super-effectively and that no member resists */
  threats: Type[]
  /** defending types none of the team's STAB hits super-effectively */
  gaps: Type[]
}

export function summarizeTeam(members: string[][]): TeamSummary {
  const weak = Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<Type, number>
  const resist = { ...weak }
  for (const types of members) {
    const m = defensiveMultipliers(types)
    for (const t of TYPES) {
      if (m[t] >= 2) weak[t]++
      if (m[t] <= 0.5) resist[t]++
    }
  }
  const covered = new Set(members.flatMap((types) => offensiveCoverage(types)))
  return {
    weak,
    resist,
    threats: TYPES.filter((t) => weak[t] >= 2 && resist[t] === 0).sort((a, b) => weak[b] - weak[a]),
    gaps: members.length ? TYPES.filter((t) => !covered.has(t)) : [],
  }
}
