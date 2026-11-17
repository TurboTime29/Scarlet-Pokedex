"""Build src/data/encounterFood.ts: restaurant dishes and sandwich recipes that give Encounter Power,
which makes Pokémon of one type more likely to appear for 30 minutes.

Sources (cached in scripts/raw/):
  - serebii.net/scarletviolet/restaurantmeals.shtml — every restaurant / stall dish, price, Meal Powers, towns
  - serebii.net/scarletviolet/sandwich.shtml        — the 151 sandwich recipes, ingredients, Meal Powers, recipe source
Run:  python scripts/build_meals.py
"""
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_items import RAW, fetch_text, SEREBII  # noqa: E402

RAW.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "encounterFood.ts"
ENCOUNTER = re.compile(r"Encounter Power: (\w+)\s+Lv\. (\d)")
# recipe names -> the item names in the bag (items.json), so ingredients can link to where to buy them
INGREDIENT_NAMES = {"Sliced Green Pepper": "Green Bell Pepper"}


def clean(s: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


def restaurant_dishes() -> list[dict]:
    page = fetch_text(SEREBII + "restaurantmeals.shtml")
    table = page[page.find("<h2>List of Meals</h2>"):]
    table = table[: table.find("</table>")]
    out = []
    for row in re.findall(r"<tr>(.*?)</tr>", table, re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if len(tds) < 6 or "fooevo" in row:
            continue
        powers = [clean(p) for p in re.split(r"<br\s*/?>", tds[4]) if clean(p)]
        enc = [ENCOUNTER.match(p) for p in powers]
        enc = [m for m in enc if m]
        if not enc:
            continue
        loc = tds[5]
        restaurant = clean(re.search(r"<b>(.*?)</b>", loc, re.S).group(1))
        # Serebii lists Montenevera's own Sushi High Roller menu as "Sushi High Roller Sp"
        restaurant = re.sub(r" Sp$", "", restaurant)
        links = re.findall(r'<a href="/pokearth/(\w+)/[^"]*">(.*?)</a>', loc)
        towns = [clean(name) for _, name in links if clean(name)]
        dlc = any(region != "paldea" for region, _ in links)
        for m in enc:
            out.append({
                "type": m.group(1).lower(), "level": int(m.group(2)),
                "name": clean(tds[1]), "restaurant": restaurant, "towns": towns,
                "price": int(clean(tds[3]) or 0), "dlc": dlc,
                "others": [p for p in powers if not p.startswith("Encounter Power")],
            })
    return out


def recipe_source(text: str, seasonings: list[str]) -> str:
    text = text.replace("Herba Mystic ", "Herba Mystica ").replace("Bitty Herba", "Bitter Herba")
    text = re.sub(r"Herba Mystic$", "Herba Mystica", text)
    herba = next((s for s in seasonings if s.endswith("Herba Mystica")), None)
    if herba:  # Serebii mixes up which Herba Mystica unlocks a few recipes; the recipe's own seasoning is right
        text = re.sub(r"\w+ Herba Mystica", herba, text)
    text = re.sub(r"^From man in Sandwich [Ss]hop", "From the man in the sandwich shop in Mesagoza", text)
    return "You start with this recipe" if text == "Start" else text


def sandwiches() -> list[dict]:
    page = fetch_text(SEREBII + "sandwich.shtml")
    page = page[page.find("<h2>Sandwich Recipes</h2>"):]
    page = page[: page.find("</main>")]
    out = []
    for part in re.split(r'<td class="cen" rowspan="2"><img', page)[1:]:
        name = clean(re.search(r'<td class="cen" rowspan="2">(.*?)</td>', part, re.S).group(1))
        tables = re.findall(r'<td class="fooinfo" rowspan="2"><table>(.*?)</table>', part, re.S)
        items = [[clean(x) for x in re.findall(r"<td><a [^>]*>([^<]+)</a></td>", t)] for t in tables[:2]]
        ingredients, seasonings = ([INGREDIENT_NAMES.get(x, x) for x in xs] for xs in (items + [[], []])[:2])
        pw = re.search(r'<td class="fooinfo" rowspan="2">([^<]*(?:<br />[^<]*)*)</td></tr>', part)
        powers = [clean(x) for x in re.split(r"<br\s*/?>", pw.group(1))] if pw else []
        powers = [p for p in powers if p]
        loc = re.search(r"Recipe Location:(.*?)</td>", part, re.S)
        for p in powers:
            m = ENCOUNTER.match(p)
            if m:
                out.append({
                    "type": m.group(1).lower(), "level": int(m.group(2)), "name": name,
                    "ingredients": ingredients, "seasonings": seasonings,
                    "recipe": recipe_source(clean(loc.group(1)) if loc else "", seasonings),
                    "herba": any(s.endswith("Herba Mystica") for s in seasonings),
                    "others": [x for x in powers if not x.startswith("Encounter Power")],
                })
    return out


def main() -> None:
    dishes, sands = restaurant_dishes(), sandwiches()
    types = sorted({d["type"] for d in dishes} | {s["type"] for s in sands})
    data = {}
    for t in types:
        ds = [d for d in dishes if d["type"] == t]
        ds.sort(key=lambda d: (d["dlc"], -d["level"], -len(d["towns"]), d["price"]))
        ss = [s for s in sands if s["type"] == t]
        # easiest first: no Herba Mystica, then strongest, then fewest ingredients
        ss.sort(key=lambda s: (s["herba"], -s["level"], len(s["ingredients"]) + len(s["seasonings"])))
        strip = lambda x: {k: v for k, v in x.items() if k != "type"}  # noqa: E731
        data[t] = {"dishes": [strip(d) for d in ds], "sandwiches": [strip(s) for s in ss]}
    body = json.dumps(data, ensure_ascii=False, indent=1)
    OUT.write_text(
        "// Generated by scripts/build_meals.py from Serebii's restaurant and sandwich pages. Do not edit by hand.\n"
        "import type { EncounterFood } from './encounterFoodTypes'\n\n"
        f"export const ENCOUNTER_FOOD: Record<string, EncounterFood> = {body}\n",
        encoding="utf-8",
    )
    print(f"{len(dishes)} restaurant dishes and {len(sands)} sandwiches with Encounter Power across {len(types)} types -> {OUT}")


if __name__ == "__main__":
    main()
