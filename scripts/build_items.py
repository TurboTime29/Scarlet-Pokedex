"""Build public/data/items.json: every item that can be in the Scarlet/Violet bag, what it does and where to get it.

Sources (cached in scripts/raw/):
  - serebii.net/scarletviolet/items.shtml  — items by pocket, in-game description, where found / shops
  - serebii.net/scarletviolet/tm.shtml     — TMs with move, recipe and locations
  - public/data/evolutions.json + pokemon.json — which Pokémon each evolution item works on
Item sprites come from PokeAPI's sprite repo when it has one.
Run after build_data.py:  python scripts/build_items.py
"""
import hashlib
import html
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_data import title  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts" / "raw"
OUT = ROOT / "public" / "data"
SEREBII = "https://www.serebii.net/scarletviolet/"
SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{}.png"

# Serebii section title -> (pocket id, label shown in the app). Order = order in the app.
POCKETS = [
    ("Recovery Items", "medicine", "Medicine"),
    ("PokéBalls", "balls", "Poké Balls"),
    ("Battle Effect Items", "battle", "Battle Items"),
    ("Berries", "berries", "Berries"),
    ("Hold Items", "held", "Held Items"),
    ("Evolutionary Items", "evolution", "Evolution Items"),
    ("Vitamins", "training", "Training (vitamins, candies, mints)"),
    ("Miscellaneous Items", "other", "Other Items"),
    ("Ingredients", "picnic", "Picnic Ingredients"),
    ("Key Items", "key", "Key Items"),
]


# Items missing from Serebii's list (written by hand).
EXTRA_ITEMS = [
    {"name": "Peat Block", "pocket": "evolution",
     "desc": "A block of dried peat from Kitakami. Using it on Ursaring when the moon is full makes it evolve into Ursaluna.",
     "found": [{"label": "Found", "places": [], "text": "Kitakami (The Teal Mask DLC)"}], "dlc": True},
]


def fetch_text(url: str) -> str:
    path = RAW / ("page_" + hashlib.sha1(url.encode()).hexdigest()[:16] + ".html")
    if path.exists():
        return path.read_text(encoding="utf-8")
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (scarlet-pokedex builder)"})
            with urllib.request.urlopen(req, timeout=60) as r:
                text = r.read().decode("latin-1")
            path.write_text(text, encoding="utf-8")
            return text
        except Exception:  # noqa: BLE001
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))
    raise AssertionError


def exists(url: str) -> bool:
    cache = RAW / "sprite_exists.json"
    seen = json.loads(cache.read_text()) if cache.exists() else {}
    return seen.get(url, False)


def check_sprites(urls: list[str]) -> dict[str, bool]:
    cache = RAW / "sprite_exists.json"
    seen: dict[str, bool] = json.loads(cache.read_text()) if cache.exists() else {}

    def head(u: str) -> tuple[str, bool]:
        if u in seen:
            return u, seen[u]
        try:
            req = urllib.request.Request(u, method="HEAD", headers={"User-Agent": "scarlet-pokedex-builder/1.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return u, r.status == 200
        except Exception:  # noqa: BLE001
            return u, False

    with ThreadPoolExecutor(8) as ex:
        seen.update(dict(ex.map(head, urls)))
    cache.write_text(json.dumps(seen))
    return seen


def text_of(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def places(fragment: str) -> list[dict]:
    """Links to Serebii location pages -> [{n: name, r: paldea|kitakami|blueberry}]."""
    out = []
    for m in re.finditer(r'<a href="/pokearth/(\w+)/[^"]*">(.*?)</a>', fragment):
        region = {"paldea": "paldea", "kitakami": "kitakami", "blueberry": "blueberry", "terarium": "blueberry"}.get(m.group(1), m.group(1))
        out.append({"n": text_of(m.group(2)), "r": region})
    return out


def where(fragment: str) -> list[dict]:
    """The location cell, split on its bold labels: [{label, places, text}]. The first block is field pick-ups."""
    blocks = re.split(r"<b>(.*?)</b>", fragment)
    out = []
    for i in range(0, len(blocks), 2):
        label = "Found" if i == 0 else text_of(blocks[i - 1])
        body = blocks[i]
        ps = places(body)
        txt = text_of(re.sub(r'<a href="/pokearth/[^"]*">.*?</a>', "", body)).strip(" ,")
        if ps or txt:
            out.append({"label": label, "places": ps, **({"text": txt} if txt else {})})
    return out


def is_dlc(found: list[dict]) -> bool:
    regions = {p["r"] for f in found for p in f["places"]}
    return bool(regions) and regions <= {"kitakami", "blueberry"}


# Serebii spells a few names differently from PokeAPI's sprite files.
SPRITE_ALIAS = {"Thunderstone": "thunder-stone", "Upgrade": "up-grade", "PokÃ© Ball": "poke-ball"}


def sprite_slug(name: str) -> str:
    if name in SPRITE_ALIAS:
        return SPRITE_ALIAS[name]
    s = name.lower().replace("é", "e").replace("'", "").replace("’", "").replace(".", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def norm(s: str) -> str:
    return re.sub(r"[^a-z]", "", s.lower().replace("é", "e"))


# ---------------------------------------------------------------- items


def parse_items() -> list[dict]:
    page = fetch_text(SEREBII + "items.shtml")
    starts = [(m.start(), m.group(1)) for m in re.finditer(r"<u>\s*(" + "|".join(re.escape(p[0]) for p in POCKETS) + r")\s*</u>", page)]
    # keep the last mention of each section title before its table (the heading, not menu links)
    tables = [m.start() for m in re.finditer(r">Picture<", page)]
    sections = []
    for t in tables:
        name = max(((pos, n) for pos, n in starts if pos < t), default=(0, None))[1]
        sections.append((t, name))
    row = re.compile(
        r'<td class="cen"><a href="/itemdex/([\w-]+)\.shtml"><img[^>]*></a></td>\s*'
        r'<td class="fooinfo"><a[^>]*>(.*?)</a></td>\s*'
        r'<td class="fooinfo">(.*?)</td>\s*<td class="fooinfo">(.*?)</td>\s*</tr>', re.S)
    items, seen = [], set()
    for i, (start, section) in enumerate(sections):
        end = sections[i + 1][0] if i + 1 < len(sections) else len(page)
        pocket = next((p for p in POCKETS if p[0] == section), None)
        if not pocket:
            continue
        for m in row.finditer(page, start, end):
            name = text_of(m.group(2))
            if name in seen:
                continue
            seen.add(name)
            found = where(m.group(4))
            items.append({"name": name, "pocket": pocket[1], "desc": text_of(m.group(3)), "found": found, "dlc": is_dlc(found)})
    return items


def parse_tms() -> list[dict]:
    page = fetch_text(SEREBII + "tm.shtml")
    tms = []
    for m in re.finditer(r'<td class="fooinfo" rowspan="3">\s*TM(\d{3})\s*</td>(.*?)(?=<td class="fooinfo" rowspan="3">\s*TM\d{3}|</table>\s*</td>\s*</tr>\s*</table>|\Z)', page, re.S):
        num, body = int(m.group(1)), m.group(2)
        cells = re.findall(r'<td class="(?:fooinfo|cen)"[^>]*>(.*?)</td>', body, re.S)
        move = text_of(cells[0]) if cells else ""
        typ = re.search(r"/type/(\w+)\.gif", body)
        cat = re.search(r"/type/(physical|special|other)\.png", body)
        stats = [text_of(c) for c in cells[3:6]]
        recipe = [text_of(x) for x in re.findall(r"<tr><td >(.*?)</td></tr>", body, re.S)]
        desc_m = re.search(r'colspan="6">\s*(.*?)\s*</td>', body, re.S)
        loc_m = re.search(r"Location:(.*?)</td>", body, re.S)
        found = [{"label": "Found", "places": places(loc_m.group(1))}] if loc_m and places(loc_m.group(1)) else []
        tms.append({
            "num": num, "move": move, "type": typ.group(1) if typ else "normal",
            "cat": {"physical": "ph", "special": "sp"}.get(cat.group(1) if cat else "", "st"),
            "pp": stats[0] if stats else "", "power": stats[1] if len(stats) > 1 else "", "acc": stats[2] if len(stats) > 2 else "",
            "recipe": recipe, "desc": text_of(desc_m.group(1)) if desc_m else "", "found": found,
            # DLC TMs (TM172 onwards) or ones only found in Kitakami / Blueberry
            "dlc": is_dlc(found) or (not found and num >= 172),
        })
    return tms


# ---------------------------------------------------------------- evolution uses


def evolution_uses(item_names: list[str]) -> dict[str, list[dict]]:
    """item name -> [{from, to, how, form?}] from the evolution conditions text."""
    pokemon = json.loads((OUT / "pokemon.json").read_text(encoding="utf-8"))
    by_slug = {p["slug"]: p for p in pokemon}
    evolutions = json.loads((OUT / "evolutions.json").read_text(encoding="utf-8"))
    keys = sorted(((norm(n), n) for n in item_names if len(norm(n)) >= 4), key=lambda x: -len(x[0]))
    uses: dict[str, list[dict]] = {}

    def regional_form(species: str, adjective: str) -> str | None:
        p = by_slug.get(species)
        if not p:
            return None
        f = next((f for f in p["forms"] if adjective.lower() in f["label"].lower()), None)
        return f["slug"] if f else None

    def walk(node: dict, parent: str | None):
        if parent and node.get("how") and not node.get("x") and parent in by_slug and node["s"] in by_slug:
            how = node["how"]
            regional = re.search(r"\((Alolan|Galarian|Hisuian|Paldean) [\w ]+?: ([^)]*)\)", how)
            main = how[:regional.start()] if regional else how
            for part, form in ((main, None), (regional.group(2) if regional else "", regional_form(parent, regional.group(1)) if regional else None)):
                if not part:
                    continue
                if regional and form is None and part is not main:
                    continue  # regional form that isn't in Scarlet/Violet
                text = norm(part)
                matched = set()
                for k, name in keys:
                    if k in text and not any(k in m for m in matched):
                        matched.add(k)
                        entry = {"from": parent, "to": node["s"], "how": how}
                        if form:
                            entry["form"] = form
                        uses.setdefault(name, []).append(entry)
        for k in node.get("to", []):
            walk(k, node["s"])

    for tree in evolutions.values():
        walk(tree, None)
    # "Hold a Sweet and spin around": any of the Sweets works (the Sweet picks Alcremie's decoration)
    for name in item_names:
        if name.endswith(" Sweet") and "milcery" in by_slug:
            uses.setdefault(name, []).append({"from": "milcery", "to": "alcremie", "how": f"Hold the {name} and spin around (the Sweet decides its decoration)"})
    return uses


def main() -> None:
    items = parse_items()
    items += [dict(x) for x in EXTRA_ITEMS if x["name"] not in {i["name"] for i in items}]
    tms = parse_tms()
    uses = evolution_uses([i["name"] for i in items])
    for it in items:
        if it["name"] in uses:
            it["evo"] = uses[it["name"]]
    urls = {it["name"]: SPRITE.format(sprite_slug(it["name"])) for it in items}
    ok = check_sprites(list(urls.values()))
    for it in items:
        if ok.get(urls[it["name"]]):
            it["spr"] = urls[it["name"]]
    pockets = [{"id": pid, "label": label, "items": [i for i in items if i["pocket"] == pid]} for _, pid, label in POCKETS]
    for p in pockets:
        for i in p["items"]:
            i.pop("pocket")
    data = {"pockets": pockets, "tms": tms}
    path = OUT / "items.json"
    path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(" ".join(f"{p['id']}={len(p['items'])}" for p in pockets), f"tms={len(tms)}")
    print(f"evolution items with uses: {sum(1 for i in items if i.get('evo'))}; sprites: {sum(1 for i in items if i.get('spr'))}/{len(items)}; "
          f"DLC items: {sum(i['dlc'] for i in items)}; DLC TMs: {sum(t['dlc'] for t in tms)}")
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
