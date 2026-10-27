# Scarlet Pokédex

A phone-friendly Pokédex for **Pokémon Scarlet** (Paldea, Kitakami and Blueberry dexes) to help decide which Pokémon are worth raising.

- In-game dex numbers, search by name / number / type
- Pokémon HOME artwork with a shiny toggle
- Base stats with a "worth raising?" verdict, evolution lines (tap to jump), level-up / TM / egg moves
- **Where to find it**: every spawn area per region with the biome, levels, time of day and odds (the Pokémon's share of spawns in that biome, from datamined spawn weights), plus fixed spots, gifts and Tera Raids
- Shiny odds calculator (Shiny Charm, Sparkling Power, outbreaks, Masuda)
- "Weak against" / "Strong against" type matchups
- **Beat a type**: pick an opponent type (or two) and get the best counters, optionally only from Pokémon you've caught
- Mark Pokémon as caught, build a team of 6 and see its shared weaknesses and coverage gaps
- Violet-only Pokémon are clearly flagged as not catchable in Scarlet

Live: https://turbotime29.github.io/Scarlet-Pokedex/

## Data

```
python scripts/build_data.py                              # PokeAPI + Bulbapedia → public/data/*.json (cached in scripts/raw/)
python scripts/build_encounters.py                        # Bulbapedia location + Tera Raid pages → encounters.json
python scripts/check_data.py                              # spot checks
scripts/.venv/Scripts/python scripts/build_thumbs.py      # 128px WebP list thumbnails (needs Pillow)
```

Version exclusives live in `scripts/exclusives.py` (Bulbapedia + Serebii). Pokémon © Nintendo / Game Freak; fan-made, not affiliated.

## Dev

```
npm install
npm run dev     # VITE_BASE=/ for local
npm test
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
