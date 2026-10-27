import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DexId } from '../data/types'
import type { ShinyBoosts } from '../lib/shiny'

export type CaughtFilter = 'all' | 'caught' | 'missing' | 'team'
export const TEAM_SIZE = 6

/**
 * What syncs between devices. Each caught mark carries the time it was set: positive = caught,
 * negative = un-marked, so a merge keeps whichever change is newest per Pokémon (un-marking survives).
 */
export interface ProgressDoc {
  version: 2
  marks: Record<string, number>
  team: string[]
  teamAt: number
  boosts: ShinyBoosts
  boostsAt: number
  updatedAt: number
}

interface Prefs extends Omit<ProgressDoc, 'version'> {
  shiny: boolean
  hideViolet: boolean
  dex: DexId
  filter: CaughtFilter
  /** species slugs marked as caught (derived from marks) */
  caught: string[]
  setBoosts: (b: Partial<ShinyBoosts>) => void
  setShiny: (v: boolean) => void
  setHideViolet: (v: boolean) => void
  setDex: (d: DexId) => void
  setFilter: (f: CaughtFilter) => void
  toggleCaught: (species: string) => void
  /** returns false when the team is full */
  toggleTeam: (form: string, species: string) => boolean
  moveTeam: (form: string, by: -1 | 1) => void
  importBackup: (data: unknown) => void
  replaceProgress: (doc: ProgressDoc) => void
}

const caughtOf = (marks: Record<string, number>) => Object.keys(marks).filter((k) => marks[k] > 0)
const now = () => Date.now()

export const usePrefs = create<Prefs>()(
  persist(
    (set, get) => {
      const setMarks = (marks: Record<string, number>, extra: Partial<Prefs> = {}) =>
        set({ marks, caught: caughtOf(marks), updatedAt: now(), ...extra })
      return {
        shiny: false,
        hideViolet: false,
        dex: 'paldea',
        filter: 'all',
        marks: {},
        caught: [],
        team: [],
        teamAt: 0,
        boosts: { charm: false, sparkling: 0, outbreak: 0, masuda: false },
        boostsAt: 0,
        updatedAt: 0,
        setBoosts: (b) => set((s) => ({ boosts: { ...s.boosts, ...b }, boostsAt: now(), updatedAt: now() })),
        setShiny: (shiny) => set({ shiny }),
        setHideViolet: (hideViolet) => set({ hideViolet }),
        setDex: (dex) => set({ dex }),
        setFilter: (filter) => set({ filter }),
        toggleCaught: (sp) => {
          const { marks } = get()
          setMarks({ ...marks, [sp]: (marks[sp] ?? 0) > 0 ? -now() : now() })
        },
        toggleTeam: (form, sp) => {
          const { team, marks } = get()
          if (team.includes(form)) { set({ team: team.filter((x) => x !== form), teamAt: now(), updatedAt: now() }); return true }
          if (team.length >= TEAM_SIZE) return false
          // being on the team implies it was caught
          setMarks((marks[sp] ?? 0) > 0 ? marks : { ...marks, [sp]: now() }, { team: [...team, form], teamAt: now() })
          return true
        },
        moveTeam: (form, by) => set((s) => {
          const i = s.team.indexOf(form), j = i + by
          if (i < 0 || j < 0 || j >= s.team.length) return {}
          const team = [...s.team];
          [team[i], team[j]] = [team[j], team[i]]
          return { team, teamAt: now(), updatedAt: now() }
        }),
        importBackup: (data) => {
          const d = data as { app?: string; caught?: unknown; team?: unknown }
          if (d?.app !== 'scarlet-pokedex' || !Array.isArray(d.caught) || !Array.isArray(d.team)) throw new Error('This is not a Scarlet Pokédex backup file.')
          // the backup replaces the caught list: everything else becomes un-marked (newer than any synced mark)
          const t = now()
          const caught = new Set(d.caught.filter((x): x is string => typeof x === 'string'))
          const marks: Record<string, number> = {}
          for (const k of Object.keys(get().marks)) marks[k] = -t
          for (const k of caught) marks[k] = t
          setMarks(marks, { team: d.team.filter((x): x is string => typeof x === 'string').slice(0, TEAM_SIZE), teamAt: t })
        },
        replaceProgress: (doc) => set({
          marks: doc.marks, caught: caughtOf(doc.marks), team: doc.team, teamAt: doc.teamAt,
          boosts: doc.boosts, boostsAt: doc.boostsAt, updatedAt: doc.updatedAt,
        }),
      }
    },
    {
      name: 'scarlet-dex',
      version: 2,
      partialize: (s) => ({
        shiny: s.shiny, hideViolet: s.hideViolet, dex: s.dex, filter: s.filter,
        marks: s.marks, team: s.team, teamAt: s.teamAt, boosts: s.boosts, boostsAt: s.boostsAt, updatedAt: s.updatedAt,
      }),
      // v1 stored a plain caught list: give those marks an old timestamp so any cloud change wins over them
      migrate: (old, version) => {
        const o = (old ?? {}) as Record<string, unknown>
        if (version < 2) {
          const caught = Array.isArray(o.caught) ? (o.caught as string[]) : []
          const team = Array.isArray(o.team) ? (o.team as string[]) : []
          return { ...o, marks: Object.fromEntries(caught.map((s) => [s, 1])), teamAt: team.length ? 1 : 0, boostsAt: 0, updatedAt: caught.length || team.length ? 1 : 0 }
        }
        return o
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Prefs>
        return { ...current, ...p, caught: caughtOf(p.marks ?? {}) }
      },
    },
  ),
)

export function exportProgress(s: Omit<ProgressDoc, 'version'>): ProgressDoc {
  return { version: 2, marks: s.marks, team: s.team, teamAt: s.teamAt, boosts: s.boosts, boostsAt: s.boostsAt, updatedAt: s.updatedAt }
}

export function isEmptyProgress(d: ProgressDoc): boolean {
  return Object.keys(d.marks).length === 0 && d.team.length === 0 && d.boostsAt === 0
}

/** Merge two devices: per-Pokémon newest caught/un-caught wins; team and shiny settings come from whichever changed last. */
export function mergeProgress(a: ProgressDoc, b: ProgressDoc): ProgressDoc {
  const marks: Record<string, number> = { ...a.marks }
  for (const [k, v] of Object.entries(b.marks)) if (!(k in marks) || Math.abs(v) > Math.abs(marks[k])) marks[k] = v
  const team = a.teamAt >= b.teamAt ? a : b
  const boosts = a.boostsAt >= b.boostsAt ? a : b
  return {
    version: 2, marks, team: team.team, teamAt: team.teamAt, boosts: boosts.boosts, boostsAt: boosts.boostsAt,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  }
}

export function backupJson(): string {
  const { caught, team } = usePrefs.getState()
  return JSON.stringify({ app: 'scarlet-pokedex', version: 1, exported: new Date().toISOString(), caught, team }, null, 2)
}
