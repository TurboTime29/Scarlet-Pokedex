import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Db, Form, Species } from '../data/types'
import { defensiveMatchups, effectiveness, offensiveCoverage } from './types'
import { findCounters } from './counters'
import { summarizeTeam } from './team'
import { shinyChance, shinyRolls } from './shiny'
import { mergeProgress, type ProgressDoc } from '../store/prefs'
import { isDlcForm, isDlcSpecies } from './dlc'
import { buildHunt, methodOf, sortValue, spotCondition } from './hunt'
import { EVO_CODES, EXCLUSIVE_CODES, STARTER_CODES, codesFor, violetTrade } from '../data/linkCodes'

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

describe('sync merge', () => {
  const doc = (marks: Record<string, number>, team: string[] = [], teamAt = 0): ProgressDoc =>
    ({ version: 2, marks, team, teamAt, boosts: { charm: false, sparkling: 0, outbreak: 0, masuda: false }, boostsAt: 0, updatedAt: 1 })
  it('keeps the newest caught / un-caught change per Pokémon from either device', () => {
    const phone = doc({ pikachu: 100, eevee: -300 }) // eevee un-marked later on the phone
    const pc = doc({ eevee: 200, sprigatito: 150 })
    const m = mergeProgress(phone, pc)
    expect(m.marks).toEqual({ pikachu: 100, eevee: -300, sprigatito: 150 })
    expect(mergeProgress(pc, phone).marks).toEqual(m.marks)
  })
  it('takes the team from whichever device changed it last', () => {
    expect(mergeProgress(doc({}, ['a'], 5), doc({}, ['b', 'c'], 9)).team).toEqual(['b', 'c'])
  })
})

describe('DLC filter', () => {
  const db = loadDb()
  const form = (sp: string, slug: string) => { const s = db.bySlug.get(sp)!; return [s, s.forms.find((f) => f.slug === slug)!] as const }
  it('treats Kitakami/Blueberry-only species and forms as DLC', () => {
    expect(isDlcForm(...form('wooper', 'wooper-paldea'))).toBe(false)
    expect(isDlcForm(...form('wooper', 'wooper'))).toBe(true)
    expect(isDlcForm(...form('tauros', 'tauros-paldea-blaze-breed'))).toBe(false)
    expect(isDlcForm(...form('tauros', 'tauros'))).toBe(true)
    expect(isDlcForm(...form('diglett', 'diglett-alola'))).toBe(true)
    expect(isDlcForm(...form('basculin', 'basculin-white-striped'))).toBe(true)
    expect(isDlcForm(...form('basculin', 'basculin-blue-striped'))).toBe(false)
    expect(isDlcSpecies(db.bySlug.get('ogerpon')!)).toBe(true)
    expect(isDlcSpecies(db.bySlug.get('pikachu')!)).toBe(false)
  })
  it('keeps DLC Pokémon out of base-game counters', () => {
    const slugs = (base: boolean) => findCounters(db, ['dragon'], { baseGameOnly: base }).map((c) => c.species.slug)
    expect(slugs(false)).toContain('fezandipiti')
    expect(slugs(true)).not.toContain('fezandipiti')
    expect(slugs(true)).toContain('tinkaton')
    expect(findCounters(db, ['dragon'], { baseGameOnly: true }).every((c) => !isDlcForm(c.species, c.form))).toBe(true)
  })
})

describe('DLC filter across Beat a type', () => {
  const db = loadDb()
  const all = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'] as const
  it('never suggests a DLC Pokémon or form for any type, in any scope', () => {
    const caughtWithDlc = new Set(['ogerpon', 'fezandipiti', 'archaludon', 'wooper', 'tinkaton', 'garchomp'])
    for (const t of all) {
      for (const only of [undefined, caughtWithDlc]) {
        const res = findCounters(db, [t], { baseGameOnly: true, includeViolet: true, only })
        expect(res.filter((c) => isDlcForm(c.species, c.form)).map((c) => c.form.slug)).toEqual([])
      }
    }
  })
})

describe('hunt list', () => {
  const db = loadDb()
  const enc = JSON.parse(readFileSync(new URL('../../public/data/encounters.json', import.meta.url), 'utf-8'))
  const hunt = buildHunt(db, enc)
  const get = (slug: string) => hunt.find((h) => h.form.slug === slug)
  it('covers every Paldea dex entry, with a way to get it in base-game Scarlet', () => {
    const paldea = db.species.filter((s) => s.dex.paldea != null)
    expect(paldea).toHaveLength(400)
    const inHunt = new Set(hunt.map((h) => h.species.slug))
    expect(paldea.filter((s) => !inHunt.has(s.slug)).map((s) => s.slug)).toEqual([])
    expect(hunt.every((h) => !isDlcForm(h.species, h.form))).toBe(true)
    expect(hunt.every((h) => (h.spots.length > 0) === !h.via)).toBe(true)
    // each dex entry has exactly one way to get it, so the per-method counts add up to the dex
    const methods = new Map<string, Set<string>>()
    for (const h of hunt) methods.set(h.species.slug, (methods.get(h.species.slug) ?? new Set()).add(methodOf(h)))
    expect([...methods].filter(([, m]) => m.size > 1).map(([s]) => s)).toEqual([])
    expect(hunt.filter((h) => h.form.ver === 'violet').every((h) => h.via?.kind === 'trade')).toBe(true)
    expect(get('sprigatito')?.via).toMatchObject({ kind: 'special', gift: true })
    const sprig = get('sprigatito')!.via
    expect(sprig?.kind === 'special' && sprig.codes.map((c) => c.code)).toEqual(['0906 0909', '0906 0912'])
    expect(get('wo-chien')?.via).toMatchObject({ kind: 'special', gift: false })
    expect(get('koraidon')?.via).toMatchObject({ kind: 'special', gift: true })
    expect(get('okidogi')).toBeUndefined() // DLC
  })
  it('knows evolutions, time limits and conditions', () => {
    expect(get('larvitar')?.topName).toBe('Tyranitar')
    expect(get('murkrow')?.times).toEqual([false, false, true, true])
    const klawfTitan = get('klawf')!.spots.find((sp) => sp.kind === 'fixed' && /titan/i.test(sp.x.where))!
    expect(spotCondition(klawfTitan)).toMatch(/Titan/)
    expect(get('klawf')!.conditions).toEqual([]) // it also spawns normally
    expect(get('scream-tail')!.spots.some((sp) => /main story/.test(spotCondition(sp)))).toBe(true)
    expect(get('wooper-paldea')).toBeDefined()
  })
  it('sorts by BST', () => {
    const top = [...hunt].sort((a, b) => sortValue(b, 'bst', null) - sortValue(a, 'bst', null))[0]
    expect(top.bst).toBeGreaterThanOrEqual(600)
  })
  it('lists every base-game Violet-only Pokémon with the code to trade for it', () => {
    const violet = db.species.filter((s) => s.dex.paldea != null && s.slug !== 'tauros').flatMap((s) => s.forms.filter((f) => f.ver === 'violet' && !f.battleOnly && !isDlcForm(s, f)))
    expect(violet.length).toBeGreaterThan(20)
    const trade = (slug: string) => { const v = get(slug)?.via; return v?.kind === 'trade' ? v : undefined }
    for (const f of violet) expect(trade(f.slug), f.slug).toBeDefined()
    expect(trade('dreepy')!.entry.code).toBe('0633 0885')
    expect(trade('dreepy')!.entry.scarlet.s).toBe('deino')
    expect(trade('salamence')!.evolveFrom).toBe('bagon')
    expect(get('tauros-paldea-aqua-breed')).toBeUndefined() // one Tauros is enough for the dex, and Combat Breed is catchable
  })
  it('has one entry per species, listing each form of multi-form species and how to get it', () => {
    expect(new Set(hunt.map((h) => h.species.slug)).size).toBe(hunt.length)
    const forms = (sp: string) => hunt.find((h) => h.species.slug === sp)!.forms!
    const tauros = forms('tauros')
    expect(tauros.map((x) => x.form.slug)).toEqual(['tauros-paldea-combat-breed', 'tauros-paldea-blaze-breed', 'tauros-paldea-aqua-breed'])
    expect(tauros[1].spots.length).toBeGreaterThan(0)
    expect(tauros[2].via?.kind).toBe('trade')
    expect(forms('lycanroc').every((x) => x.spots.length > 0)).toBe(true)
    expect(forms('maushold').every((x) => x.note)).toBe(true)
    expect(forms('rotom')).toHaveLength(6)
    expect(forms('gimmighoul').find((x) => x.form.slug === 'gimmighoul-roaming')?.note).toMatch(/Pokémon GO/)
    expect(hunt.find((h) => h.species.slug === 'lechonk')!.forms).toBeUndefined()
    // every form with nothing to catch has a trade or a note
    for (const h of hunt) for (const x of h.forms ?? []) expect(x.spots.length > 0 || !!x.via || !!x.note, x.form.slug).toBe(true)
  })
  it('says what to evolve for entries with nothing to catch', () => {
    const evolve = (slug: string) => { const v = get(slug)?.via; return v?.kind === 'evolve' ? v : undefined }
    expect(evolve('kingambit')?.from.slug).toBe('bisharp')
    expect(evolve('meowscarada')?.from.slug).toBe('floragato')
    expect(evolve('scizor')?.code?.code).toBe('0260 0260')
    expect(evolve('gholdengo')?.from.slug).toBe('gimmighoul')
    expect(evolve('tyranitar')?.raids.length).toBeGreaterThan(0)
  })
  it('sorts catchable first, then evolve, trade, special', () => {
    const v = (slug: string) => sortValue(get(slug)!, 'odds', null)
    expect(v('lechonk')).toBeGreaterThan(v('kingambit'))
    expect(v('kingambit')).toBeGreaterThan(v('dreepy'))
    expect(v('dreepy')).toBeGreaterThan(v('wo-chien'))
  })
})

describe('link codes', () => {
  const db = loadDb()
  it('every Pokémon and form in the code list exists', () => {
    const mons = [
      ...EXCLUSIVE_CODES.flatMap((e) => [e.scarlet, e.violet, ...(e.violetLine ?? []).map((s) => ({ s }))]),
      ...EVO_CODES.flatMap((e) => [e.from, e.into]),
      ...STARTER_CODES.flatMap((e) => [{ s: e.a }, { s: e.b }]),
    ] as { s: string; f?: string }[]
    for (const m of mons) {
      const s = db.bySlug.get(m.s)
      expect(s, m.s).toBeDefined()
      if (m.f) expect(s!.forms.some((f) => f.slug === m.f), m.f).toBe(true)
    }
  })
  it('codes are 8 digits', () => {
    for (const e of [...EXCLUSIVE_CODES, ...EVO_CODES, ...STARTER_CODES]) expect(e.code).toMatch(/^\d{4} \d{4}$/)
  })
  it('the Violet side is Violet-only and the Scarlet side is not', () => {
    const form = (m: { s: string; f?: string }) => db.bySlug.get(m.s)!.forms.find((f) => (m.f ? f.slug === m.f : f.default))!
    for (const e of EXCLUSIVE_CODES) {
      const vf = form(e.violet)
      const sf = form(e.scarlet)
      expect(vf.ver, e.violet.s).toBe('violet')
      expect(sf.ver, e.scarlet.s).not.toBe('violet')
    }
  })
  it('finds codes for a Pokémon page', () => {
    expect(codesFor('larvitar', 'larvitar').exclusive[0].violet.s).toBe('bagon')
    expect(codesFor('scizor', 'scizor').evo[0].item).toBe('Metal Coat')
    expect(codesFor('graveler', 'graveler-alola').evo.map((e) => e.into.f)).toEqual(['golem-alola'])
    expect(codesFor('sprigatito', 'sprigatito').starter).toHaveLength(2)
    expect(violetTrade('tauros', 'tauros-paldea-combat-breed')).toBeNull()
  })
})

describe('hunt targets sync', () => {
  const base: ProgressDoc = { version: 2, marks: {}, team: [], teamAt: 0, boosts: { charm: false, sparkling: 0, outbreak: 0, masuda: false }, boostsAt: 0, updatedAt: 1 }
  it('keeps the newest star / un-star per form and handles older documents without targets', () => {
    const phone = { ...base, targets: { larvitar: 100, 'tauros-paldea-blaze-breed': -300 } }
    const pc = { ...base, targets: { 'tauros-paldea-blaze-breed': 200, gible: 50 } }
    expect(mergeProgress(phone, pc).targets).toEqual({ larvitar: 100, 'tauros-paldea-blaze-breed': -300, gible: 50 })
    expect(mergeProgress(base, phone).targets).toEqual(phone.targets)
  })
})
