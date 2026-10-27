import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DexId } from '../data/types'
import type { ShinyBoosts } from '../lib/shiny'

export type CaughtFilter = 'all' | 'caught' | 'missing' | 'team'
export const TEAM_SIZE = 6

interface Prefs {
  shiny: boolean
  hideViolet: boolean
  dex: DexId
  filter: CaughtFilter
  /** species slugs marked as caught */
  caught: string[]
  /** form slugs on the team, in order */
  team: string[]
  boosts: ShinyBoosts
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
}

export const usePrefs = create<Prefs>()(
  persist(
    (set, get) => ({
      shiny: false,
      hideViolet: false,
      dex: 'paldea',
      filter: 'all',
      caught: [],
      team: [],
      boosts: { charm: false, sparkling: 0, outbreak: 0, masuda: false },
      setBoosts: (b) => set((s) => ({ boosts: { ...s.boosts, ...b } })),
      setShiny: (shiny) => set({ shiny }),
      setHideViolet: (hideViolet) => set({ hideViolet }),
      setDex: (dex) => set({ dex }),
      setFilter: (filter) => set({ filter }),
      toggleCaught: (sp) => set((s) => ({ caught: s.caught.includes(sp) ? s.caught.filter((x) => x !== sp) : [...s.caught, sp] })),
      toggleTeam: (form, sp) => {
        const { team, caught } = get()
        if (team.includes(form)) { set({ team: team.filter((x) => x !== form) }); return true }
        if (team.length >= TEAM_SIZE) return false
        // being on the team implies it was caught
        set({ team: [...team, form], caught: caught.includes(sp) ? caught : [...caught, sp] })
        return true
      },
      moveTeam: (form, by) => set((s) => {
        const i = s.team.indexOf(form), j = i + by
        if (i < 0 || j < 0 || j >= s.team.length) return {}
        const team = [...s.team];
        [team[i], team[j]] = [team[j], team[i]]
        return { team }
      }),
      importBackup: (data) => {
        const d = data as { app?: string; caught?: unknown; team?: unknown }
        if (d?.app !== 'scarlet-pokedex' || !Array.isArray(d.caught) || !Array.isArray(d.team)) throw new Error('This is not a Scarlet Pokédex backup file.')
        set({ caught: d.caught.filter((x) => typeof x === 'string'), team: d.team.filter((x) => typeof x === 'string').slice(0, TEAM_SIZE) })
      },
    }),
    { name: 'scarlet-dex', version: 1 },
  ),
)

export function backupJson(): string {
  const { caught, team } = usePrefs.getState()
  return JSON.stringify({ app: 'scarlet-pokedex', version: 1, exported: new Date().toISOString(), caught, team }, null, 2)
}
