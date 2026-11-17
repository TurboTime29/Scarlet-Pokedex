/** A restaurant or stall dish that gives Encounter Power for a type. */
export interface FoodDish {
  /** Encounter Power level: 1 = 50%, 2 = 75%, 3 = 100% chance a spawn is swapped for this type */
  level: number
  name: string
  restaurant: string
  towns: string[]
  price: number
  /** only sold in Kitakami (The Teal Mask) */
  dlc: boolean
  /** the dish's other Meal Powers */
  others: string[]
}

/** A sandwich recipe that gives Encounter Power for a type. */
export interface FoodSandwich {
  level: number
  name: string
  ingredients: string[]
  seasonings: string[]
  /** where the recipe comes from */
  recipe: string
  /** needs a Herba Mystica (from 5★ / 6★ Tera Raids) */
  herba: boolean
  others: string[]
}

/** Per type: dishes sorted base game first, then strongest; sandwiches easiest first. */
export interface EncounterFood {
  dishes: FoodDish[]
  sandwiches: FoodSandwich[]
}
