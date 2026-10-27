import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Db, Form, Species } from '../data/types'
import { defensiveMatchups, effectiveness, offensiveCoverage } from './types'
import { findCounters } from './counters'
import { summarizeTeam } from './team'
import { shinyChance, shinyRolls } from './shiny'

function loadDb(): Db {
  const read = (n: string) => JSON.parse(readFileSync(new URL(`../../public/data/${n}.json`, import.meta.url), 'utf-8'))
  const species: Species[] = read('pokemon')
  const formBySlug = new Map<string, { species: Species; form: Form }>()
  for (const s of species) for (const f of s.forms) formBySlug.set(f.slug, { species: s, form: f })
  return {
    species, formBySlug, bySlug: new Map(species.map((s) => [s.slug, s])),
    moves: read('moves'), abilities: read('abilities'), evolutions: read('evolutions'), dexes: read('dexes'), meta: read('meta'),
  }
}

describe('type chart', () => {
  it('Charizard takes 4× from Rock and is immune to Ground', () => {
    const m = defensiveMatchups(['fire', 'flying'])
    expect(m.x4).toEqual(['rock'])
    expect(m.immune).toEqual(['ground'])
    expect(m.x2.sort()).toEqual(['electric', 'water'])
  })

  it('Gholdengo is immune to Normal/Fighting and weak to Ground, Fire, Ghost, Dark', () => {
    const m = defensiveMatchups(['steel', 'ghost'])
    expect(m.immune.sort()).toEqual(['fighting', 'normal', 'poison'])
    expect(m.x2.sort()).toEqual(['dark', 'fire', 'ghost', 'ground'])
  })

  it('handles Fairy and modern Steel', () => {
    expect(effectiveness('dragon', ['fairy'])).toBe(0)
    expect(effectiveness('ghost', ['steel'])).toBe(1)
    expect(effectiveness('dark', ['steel'])).toBe(1)
    expect(offensiveCoverage(['fairy']).sort()).toEqual(['dark', 'dragon', 'fighting'])
  })
})

describe('counter finder', () => {
  const db = loadDb()

  it('puts Ground-types at the top against Fire/Steel', () => {
    const top = findCounters(db, ['fire', 'steel'], { finalOnly: true }).slice(0, 10)
    expect(top.length).toBe(10)
    expect(top.every((c) => c.hits >= 2)).toBe(true)
    expect(top.slice(0, 5).every((c) => c.form.types.includes('ground') && c.hits === 4 && c.takes < 1)).toBe(true)
    expect(top[0].species.slug).toBe('swampert')
  })

  it('excludes Violet exclusives unless asked', () => {
    const slugs = (v: boolean) => findCounters(db, ['dragon'], { includeViolet: v }).map((c) => c.species.slug)
    expect(slugs(false)).not.toContain('dreepy')
    expect(slugs(true)).toContain('dragapult')
    expect(slugs(false)).toContain('hydreigon')
  })

  it('can be limited to caught Pokémon', () => {
    const only = new Set(['quaquaval', 'pikachu', 'sprigatito'])
    const r = findCounters(db, ['fire'], { only })
    expect(r.map((c) => c.species.slug)).toEqual(['quaquaval'])
  })
})

describe('team summary', () => {
  it('flags shared weaknesses with no resist and coverage gaps', () => {
    const s = summarizeTeam([['fire'], ['fire', 'flying'], ['normal']])
    expect(s.weak.water).toBe(2)
    expect(s.threats).toContain('water')
    expect(s.gaps).toContain('water')
  })
})

describe('shiny odds', () => {
  const none = { charm: false, sparkling: 0, outbreak: 0, masuda: false } as const
  const odds = (rolls: number) => Math.round(100 / shinyChance(rolls)) / 100
  it('matches the known Scarlet/Violet rates', () => {
    expect(odds(shinyRolls('wild', none))).toBe(4096)
    expect(odds(shinyRolls('wild', { ...none, charm: true }))).toBe(1365.67)
    expect(odds(shinyRolls('wild', { ...none, sparkling: 3 }))).toBe(1024.38)
    expect(odds(shinyRolls('wild', { charm: true, sparkling: 3, outbreak: 2, masuda: false }))).toBe(512.44)
    expect(odds(shinyRolls('egg', { ...none, charm: true, masuda: true }))).toBe(512.44)
  })
})
