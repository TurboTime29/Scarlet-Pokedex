/**
 * How to get forms the spawn data can't tell apart (they change with an item, or are decided when
 * the Pokémon evolves). Keyed by form slug. Shops and spots are from the app's item data.
 */
const NECTAR = 'Nectars are sold in the shops in Mesagoza, Cascarrafa and Levincia.'
const CATALOG = (device: string) => `Use the Rotom Catalog (from Porto Marinada) on any Rotom and pick the ${device}.`

export const FORM_NOTES: Record<string, string> = {
  'oricorio-baile': `Give any Oricorio a Red Nectar to switch it to this style. ${NECTAR}`,
  'oricorio-pom-pom': `Give any Oricorio a Yellow Nectar. ${NECTAR}`,
  'oricorio-pau': `Give any Oricorio a Pink Nectar. ${NECTAR}`,
  'oricorio-sensu': `Give any Oricorio a Purple Nectar. ${NECTAR}`,
  rotom: 'Use the Rotom Catalog and pick the light bulb to turn an appliance Rotom back into this form.',
  'rotom-heat': CATALOG('microwave oven'),
  'rotom-wash': CATALOG('washing machine'),
  'rotom-frost': CATALOG('refrigerator'),
  'rotom-fan': CATALOG('electric fan'),
  'rotom-mow': CATALOG('lawn mower'),
  'maushold-family-of-four': 'Most Tandemaus (about 99 in 100) evolve into this form.',
  'maushold-family-of-three': 'About 1 in 100 Tandemaus evolve into this form; the rest become a Family of Four. Which one is fixed per Tandemaus.',
  'dudunsparce-two-segment': 'Most Dunsparce (about 99 in 100) evolve into this form.',
  'dudunsparce-three-segment': 'About 1 in 100 Dunsparce evolve into this form; the rest become Two-Segment. Which one is fixed per Dunsparce.',
  'gimmighoul-roaming': 'Wanders all over Paldea but can’t be caught in Scarlet. It only comes from Pokémon GO, through Pokémon HOME.',
}
