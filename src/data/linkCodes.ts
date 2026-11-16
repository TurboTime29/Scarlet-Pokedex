/**
 * Universal Link Codes: codes the community agrees to use for specific trades, so you can find a
 * stranger who wants the same swap. Source: r/PokemonVioletScarlet wiki, "Scarlet and Violet
 * Universal Link Codes" (guides/sv-universal-link-codes, revised by JKKM2445).
 *
 * In the game: Poké Portal → Link Trade → Set Link Code, enter the 8 digits, then offer the Pokémon.
 */

/** A Pokémon in a code entry: species slug, plus a form slug when only one form is meant. */
export interface CodeMon {
  s: string
  f?: string
  /** display name when it isn't just the species name ("Tauros (Aqua)") */
  label?: string
}

export type DlcPart = 1 | 2

/** Scarlet player offers `scarlet`, Violet player offers `violet`. */
export interface ExclusiveCode {
  code: string
  scarlet: CodeMon
  violet: CodeMon
  /** Violet-only evolutions you get by evolving the one you trade for */
  violetLine?: string[]
  dlc?: DlcPart
  note?: string
}

export interface StarterCode {
  code: string
  a: string
  b: string
  note?: string
}

/** Mirror trade: both players offer the same Pokémon (holding `item`) and both get the evolution back. */
export interface EvoCode {
  code: string
  from: CodeMon
  into: CodeMon
  item: string | null
  dlc?: DlcPart
  /** can also evolve in Pokémon Legends: Arceus without trading */
  pla?: true
}

export const SOURCE = {
  name: 'r/PokemonVioletScarlet wiki',
  url: 'https://www.reddit.com/r/PokemonVioletScarlet/wiki/guides/sv-universal-link-codes',
}

const m = (s: string, f?: string, label?: string): CodeMon => ({ s, ...(f ? { f } : {}), ...(label ? { label } : {}) })

export const EXCLUSIVE_CODES: ExclusiveCode[] = [
  { code: '0128 0128', scarlet: m('tauros', 'tauros-paldea-blaze-breed', 'Tauros (Blaze Breed)'), violet: m('tauros', 'tauros-paldea-aqua-breed', 'Tauros (Aqua Breed)') },
  { code: '0246 0371', scarlet: m('larvitar'), violet: m('bagon'), violetLine: ['shelgon', 'salamence'] },
  { code: '0425 0200', scarlet: m('drifloon'), violet: m('misdreavus'), violetLine: ['mismagius'] },
  { code: '0434 0316', scarlet: m('stunky'), violet: m('gulpin'), violetLine: ['swalot'] },
  { code: '0633 0885', scarlet: m('deino'), violet: m('dreepy'), violetLine: ['drakloak', 'dragapult'] },
  { code: '0690 0692', scarlet: m('skrelp'), violet: m('clauncher'), violetLine: ['clawitzer'] },
  { code: '0765 0766', scarlet: m('oranguru'), violet: m('passimian') },
  { code: '0874 0875', scarlet: m('stonjourner'), violet: m('eiscue') },
  { code: '0936 0937', scarlet: m('armarouge'), violet: m('ceruledge'), note: 'Or trade Auspicious Armor for Malicious Armor on the same code.' },
  { code: '0984 0990', scarlet: m('great-tusk'), violet: m('iron-treads') },
  { code: '0985 0991', scarlet: m('scream-tail'), violet: m('iron-bundle') },
  { code: '0986 0992', scarlet: m('brute-bonnet'), violet: m('iron-hands') },
  { code: '0987 0993', scarlet: m('flutter-mane'), violet: m('iron-jugulis') },
  { code: '0988 0994', scarlet: m('slither-wing'), violet: m('iron-moth') },
  { code: '0989 0995', scarlet: m('sandy-shocks'), violet: m('iron-thorns') },
  { code: '1005 1006', scarlet: m('roaring-moon'), violet: m('iron-valiant') },
  { code: '1007 1008', scarlet: m('koraidon'), violet: m('miraidon') },
  { code: '0207 0190', scarlet: m('gligar'), violet: m('aipom'), violetLine: ['ambipom'], dlc: 1 },
  { code: '0845 0877', scarlet: m('cramorant'), violet: m('morpeko'), dlc: 1 },
  { code: '0027 0037', scarlet: m('vulpix', 'vulpix-alola', 'Alolan Vulpix'), violet: m('sandshrew', 'sandshrew-alola', 'Alolan Sandshrew'), violetLine: ['sandslash'], dlc: 2 },
  { code: '0408 0410', scarlet: m('cranidos'), violet: m('shieldon'), violetLine: ['bastiodon'], dlc: 2 },
  { code: '1020 1022', scarlet: m('gouging-fire'), violet: m('iron-boulder'), dlc: 2 },
  { code: '1021 1023', scarlet: m('raging-bolt'), violet: m('iron-crown'), dlc: 2 },
]

export const STARTER_CODES: StarterCode[] = [
  { code: '0906 0909', a: 'sprigatito', b: 'fuecoco' },
  { code: '0906 0912', a: 'sprigatito', b: 'quaxly' },
  { code: '0909 0912', a: 'fuecoco', b: 'quaxly' },
  { code: '0001 0004', a: 'bulbasaur', b: 'charmander' },
  { code: '0001 0009', a: 'bulbasaur', b: 'squirtle' },
  { code: '0004 0009', a: 'charmander', b: 'squirtle' },
  { code: '0152 0155', a: 'chikorita', b: 'cyndaquil' },
  { code: '0152 0158', a: 'chikorita', b: 'totodile' },
  { code: '0155 0158', a: 'cyndaquil', b: 'totodile' },
  { code: '0252 0255', a: 'treecko', b: 'torchic' },
  { code: '0252 0258', a: 'treecko', b: 'mudkip' },
  { code: '0255 0258', a: 'torchic', b: 'mudkip' },
  { code: '0387 0390', a: 'turtwig', b: 'chimchar' },
  { code: '0387 0393', a: 'turtwig', b: 'piplup' },
  { code: '0390 0393', a: 'chimchar', b: 'piplup' },
  { code: '0495 0498', a: 'snivy', b: 'tepig' },
  // The wiki swaps these two labels (0498 – 0501 as Snivy – Oshawott). Every other code is the two
  // national dex numbers, which puts Snivy (#495) – Oshawott (#501) on 0495 0501.
  { code: '0495 0501', a: 'snivy', b: 'oshawott', note: 'The wiki lists this pair as 0498 0501; try both.' },
  { code: '0498 0501', a: 'tepig', b: 'oshawott', note: 'The wiki lists this pair as 0495 0501; try both.' },
  { code: '0650 0653', a: 'chespin', b: 'fennekin' },
  { code: '0650 0656', a: 'chespin', b: 'froakie' },
  { code: '0653 0656', a: 'fennekin', b: 'froakie' },
  { code: '0722 0725', a: 'rowlet', b: 'litten' },
  { code: '0722 0728', a: 'rowlet', b: 'popplio' },
  { code: '0725 0728', a: 'litten', b: 'popplio' },
  { code: '0810 0813', a: 'grookey', b: 'scorbunny' },
  { code: '0810 0816', a: 'grookey', b: 'sobble' },
  { code: '0813 0816', a: 'scorbunny', b: 'sobble' },
]

export const EVO_CODES: EvoCode[] = [
  { code: '0093 0093', from: m('haunter'), into: m('gengar'), item: null, pla: true },
  { code: '0260 0260', from: m('scyther'), into: m('scizor'), item: 'Metal Coat', pla: true },
  { code: '0324 0324', from: m('slowpoke', 'slowpoke'), into: m('slowking', 'slowking'), item: 'King’s Rock' },
  { code: '0061 0061', from: m('poliwhirl'), into: m('politoed'), item: 'King’s Rock', dlc: 1 },
  { code: '0075 0075', from: m('graveler', 'graveler', 'Graveler (Kantonian)'), into: m('golem', 'golem'), item: null, dlc: 1, pla: true },
  { code: '0075 0075', from: m('graveler', 'graveler-alola', 'Alolan Graveler'), into: m('golem', 'golem-alola', 'Alolan Golem'), item: null, dlc: 2 },
  { code: '0349 0349', from: m('feebas'), into: m('milotic'), item: 'Prism Scale', dlc: 1 },
  { code: '0356 0356', from: m('dusclops'), into: m('dusknoir'), item: 'Reaper Cloth', dlc: 1, pla: true },
  { code: '0533 0533', from: m('gurdurr'), into: m('conkeldurr'), item: null, dlc: 1 },
  { code: '0708 0708', from: m('phantump'), into: m('trevenant'), item: null, dlc: 1 },
  { code: '0112 0112', from: m('rhydon'), into: m('rhyperior'), item: 'Protector', dlc: 2, pla: true },
  { code: '0117 0117', from: m('seadra'), into: m('kingdra'), item: 'Dragon Scale', dlc: 2 },
  { code: '0125 0125', from: m('electabuzz'), into: m('electivire'), item: 'Electirizer', dlc: 2, pla: true },
  { code: '0137 0137', from: m('magmar'), into: m('magmortar'), item: 'Magmarizer', dlc: 2, pla: true },
  { code: '0126 0126', from: m('porygon'), into: m('porygon2'), item: 'Upgrade', dlc: 2, pla: true },
  { code: '0233 0233', from: m('porygon2'), into: m('porygon-z'), item: 'Dubious Disc', dlc: 2, pla: true },
]

/** Foreign-language Ditto for the Masuda method (check the language before trading). */
export const DITTO_CODE = '4448 4448'

const matches = (c: CodeMon, s: string, f: string) => c.s === s && (!c.f || c.f === f)

/**
 * What a Scarlet player trades away (and on which code) to get this Violet-only form, or the
 * pre-evolution to trade for and evolve. Only meant for forms marked Violet-only.
 */
export function violetTrade(s: string, f: string): { entry: ExclusiveCode; evolveFrom: string | null } | null {
  for (const e of EXCLUSIVE_CODES) {
    if (matches(e.violet, s, f)) return { entry: e, evolveFrom: null }
    if (e.violetLine?.includes(s)) return { entry: e, evolveFrom: e.violet.s }
  }
  return null
}

/** Every code that mentions this Pokémon form, for its page. */
export function codesFor(s: string, f: string) {
  return {
    exclusive: EXCLUSIVE_CODES.filter((e) => matches(e.scarlet, s, f) || matches(e.violet, s, f)),
    starter: STARTER_CODES.filter((e) => e.a === s || e.b === s),
    evo: EVO_CODES.filter((e) => matches(e.from, s, f) || matches(e.into, s, f)),
  }
}
