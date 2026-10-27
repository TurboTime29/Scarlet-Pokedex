"""Build public/data/*.json for the Scarlet Pokédex from PokeAPI.

Every response is cached under scripts/raw/ so reruns are free and offline.
Usage:  python scripts/build_data.py [-j 8]
"""
import argparse
import hashlib
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from exclusives import SCARLET, VIOLET, VIOLET_COOP, NOTES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts" / "raw"
OUT = ROOT / "public" / "data"
API = "https://pokeapi.co/api/v2/"
VG = "scarlet-violet"
DEXES = [("paldea", 31), ("kitakami", 32), ("blueberry", 33)]
# Forms that have SV learnsets (HOME-transferable) but are never found or shown in the dex.
SKIP_FORM = re.compile(r"-(cap|original-cap|partner-cap|starter|totem|gmax|mega|primal|world-cap)\b|-cap$")
POOL = 8


def get(url: str) -> dict:
    if not url.startswith("http"):
        url = API + url.strip("/") + "/"
    key = hashlib.sha1(url.encode()).hexdigest()[:16]
    slug = re.sub(r"[^a-z0-9]+", "_", url.replace(API, ""))[:60]
    path = RAW / f"{slug}_{key}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "scarlet-pokedex-builder/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            path.write_text(json.dumps(data), encoding="utf-8")
            return data
        except Exception as e:  # noqa: BLE001
            if attempt == 4:
                raise RuntimeError(f"{url}: {e}") from e
            time.sleep(1.5 * (attempt + 1))
    raise AssertionError


def pmap(fn, items):
    with ThreadPoolExecutor(POOL) as ex:
        return list(ex.map(fn, items))


def en(entries, field="name"):
    for e in entries:
        if e["language"]["name"] == "en":
            return e[field]
    return None


def clean(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text.replace("\u000c", " ").replace("­", "")).strip()


def title(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.split("-"))


def sv_moves(pokemon: dict):
    lv, tm, egg = [], [], []
    for m in pokemon["moves"]:
        name = m["move"]["name"]
        for d in m["version_group_details"]:
            if d["version_group"]["name"] != VG:
                continue
            method = d["move_learn_method"]["name"]
            if method == "level-up":
                lv.append((d["level_learned_at"], d.get("order") or 0, name))
            elif method == "machine":
                tm.append(name)
            elif method == "egg":
                egg.append(name)
    lv.sort()
    return [(l, n) for l, _, n in lv], sorted(set(tm)), sorted(set(egg))


# ---------------------------------------------------------------- evolution text

EVO_OVERRIDES = {
    # SV-specific methods PokeAPI only records as "other" or old-game locations.
    "gholdengo": "Level up with 999 Gimmighoul Coins",
    "brambleghast": "Walk 1,000 steps with it in Let's Go mode, then level up",
    "pawmot": "Walk 1,000 steps with it in Let's Go mode, then level up",
    "rabsca": "Walk 1,000 steps with it in Let's Go mode, then level up",
    "palafin": "Lv 38 while in a Union Circle with another player",
    "annihilape": "Level up after using Rage Fist 20 times",
    "kingambit": "Defeat 3 Bisharp that lead Pawniard (holding Leader's Crest), then level up",
    "dudunsparce": "Level up knowing Hyper Drill",
    "farigiraf": "Level up knowing Twin Beam",
    "maushold": "Lv 25",
    "ursaluna": "Use a Peat Block during a full moon",
    "basculegion": "Level up after losing 294 HP from recoil without fainting",
    "hydrapple": "Level up knowing Dragon Cheer",
    "sinistcha": "Use a Masterpiece Teacup (or Unremarkable Teacup for its Counterfeit form)",
    "polteageist": "Use a Cracked Pot or Chipped Pot",
    "sneasler": "Level up holding a Razor Claw during the day",
    "leafeon": "Use a Leaf Stone",
    "glaceon": "Use an Ice Stone",
    "sylveon": "Level up with high friendship knowing a Fairy-type move",
    "magnezone": "Use a Thunder Stone",
    "probopass": "Use a Thunder Stone",
    "crabominable": "Use an Ice Stone",
    "overqwil": "Level up knowing Barb Barrage",
    "wyrdeer": "Use Psyshield Bash 20 times, then level up",
    "kleavor": "Use a Black Augurite",
    "lycanroc": "Lv 25 (day = Midday, night = Midnight, evening with Own Tempo = Dusk)",
    "toxtricity": "Lv 30 (Amped or Low Key depends on its Nature)",
    "alcremie": "Hold a Sweet and spin around",
    "runerigus": "Lose 49+ HP in one go, then walk under the stone arch",
    "sirfetchd": "Land 3 critical hits in one battle",
    "cofagrigus": "Lv 34",
    "wooper_clodsire": "Lv 20 (Paldean Wooper)",
    # Regional-form pairs PokeAPI merges into one node
    "dartrix_decidueye": "Lv 34",
    "cyndaquil_quilava": "Lv 14",
    "voltorb_electrode": "Lv 30 (Hisuian Voltorb: use a Leaf Stone)",
    "vulpix_ninetales": "Use a Fire Stone (Alolan Vulpix: Ice Stone)",
    "sandshrew_sandslash": "Lv 22 (Alolan Sandshrew: use an Ice Stone)",
    "meowth_persian": "Lv 28 (Alolan Meowth: level up with high friendship)",
    "slowpoke_slowbro": "Lv 37 (Galarian Slowpoke: use a Galarica Cuff)",
    "slowpoke_slowking": "Trade holding a King's Rock (Galarian Slowpoke: use a Galarica Wreath)",
    "feebas_milotic": "Trade holding a Prism Scale",
    "inkay_malamar": "Lv 30 while holding the Switch upside down",
}

ITEM_ARTICLE = re.compile(r"^[aeiou]", re.I)


def evo_text(d: dict) -> str:
    t = d["trigger"]["name"]
    parts = []
    if t == "level-up":
        if d.get("min_level"):
            parts.append(f"Lv {d['min_level']}")
        else:
            parts.append("Level up")
    elif t == "use-item":
        item = title(d["item"]["name"]) if d.get("item") else "an item"
        parts.append(f"Use {'an' if ITEM_ARTICLE.match(item) else 'a'} {item}")
    elif t == "trade":
        parts.append("Trade")
    elif t == "three-critical-hits":
        parts.append("Land 3 critical hits in one battle")
    else:
        parts.append(title(t))
    if d.get("held_item"):
        parts.append(f"holding {title(d['held_item']['name'])}")
    if d.get("trade_species"):
        parts.append(f"for {title(d['trade_species']['name'])}")
    if d.get("min_happiness"):
        parts.append("with high friendship")
    if d.get("min_affection"):
        parts.append("with high affection")
    if d.get("known_move"):
        parts.append(f"knowing {title(d['known_move']['name'])}")
    if d.get("known_move_type"):
        parts.append(f"knowing a {title(d['known_move_type']['name'])}-type move")
    if d.get("party_species"):
        parts.append(f"with {title(d['party_species']['name'])} in the party")
    if d.get("party_type"):
        parts.append(f"with a {title(d['party_type']['name'])}-type in the party")
    if d.get("time_of_day"):
        parts.append({"day": "during the day", "night": "at night", "dusk": "at dusk"}.get(d["time_of_day"], d["time_of_day"]))
    if d.get("gender") is not None:
        parts.append("(female)" if d["gender"] == 1 else "(male)")
    if d.get("needs_overworld_rain"):
        parts.append("while raining")
    if d.get("turn_upside_down"):
        parts.append("holding the console upside down")
    rps = d.get("relative_physical_stats")
    if rps is not None:
        parts.append({1: "(Atk > Def)", -1: "(Atk < Def)", 0: "(Atk = Def)"}[rps])
    return " ".join(parts)


def evo_how(species: str, details: list[dict], parent: str) -> str:
    key = f"{parent}_{species}"
    if key in EVO_OVERRIDES:
        return EVO_OVERRIDES[key]
    if species in EVO_OVERRIDES:
        return EVO_OVERRIDES[species]
    usable = [d for d in details if not d.get("location")] or details
    texts = []
    for d in usable:
        s = evo_text(d)
        if s and s not in texts:
            texts.append(s)
    # Male/female variants with the same method (Meowstic, Oinkologne) read as one condition.
    bare = {re.sub(r" \((male|female)\)$", "", t) for t in texts}
    if len(texts) > 1 and len(bare) == 1:
        texts = list(bare)
    return " or ".join(texts).replace("Kings Rock", "King's Rock") or "Special"


def walk_chain(node: dict, parent: str | None = None) -> dict:
    sp = node["species"]["name"]
    out = {"s": sp}
    if parent:
        out["how"] = evo_how(sp, node["evolution_details"], parent)
    kids = [walk_chain(k, sp) for k in node["evolves_to"]]
    if kids:
        out["to"] = kids
    return out



# ---------------------------------------------------------------- Bulbapedia dex forms
# PokeAPI lists every HOME-transferable form; Bulbapedia's regional dex pages say which form
# each in-game dex entry actually shows (e.g. Paldean Wooper in Paldea, Johto Wooper in Kitakami).

BULBA = "https://bulbapedia.bulbagarden.net/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=List_of_Pok%C3%A9mon_by_{}_Pok%C3%A9dex_number"
REGIONAL = re.compile(r"Alolan|Galarian|Hisuian|Paldean|Bloodmoon|White-Striped|Ash-Greninja|Own Tempo")


def norm(label: str) -> str:
    return re.sub(r"[^a-z]", "", label.lower().replace("form", ""))


def bulba_dex(region: str) -> dict[int, list[str]]:
    """Dex number -> form labels Bulbapedia shows for that entry ('' = the species' default form)."""
    text = get(BULBA.format(region))["parse"]["wikitext"]["*"]
    rows: dict[int, list[str]] = {}
    for m in re.finditer(r"\{\{rdex/\w+\|(\d+)\|[^{}]*?\}\}", text):
        fm = re.search(r"formname=([^|}]+)", m.group(0))
        rows[int(m.group(1))] = [fm.group(1).strip() if fm else ""]
    # Multi-form entries are plain table rows: a regional-number cell, a national-number cell, then one
    # <small>label</small> per form row.
    cell = r'\| rowspan="(\d+)" style="font-family:monospace,monospace" \| #(\d+)\n'
    for m in re.finditer(cell + cell.replace("(", "(?:"), text):
        n, num = int(m.group(1)), int(m.group(2))
        smalls = re.findall(r"<small>(.*?)</small>", text[m.end():m.end() + 600 * n])[:n]
        rows[num] = [re.sub(r"<br\s*/?>", " ", x).strip() for x in smalls]
    return rows


# ---------------------------------------------------------------- main


def main() -> None:
    global POOL
    ap = argparse.ArgumentParser()
    ap.add_argument("-j", type=int, default=8)
    POOL = ap.parse_args().j
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    dex_numbers: dict[str, dict[str, int]] = {}
    dex_order: dict[str, list[str]] = {}
    for dex, did in DEXES:
        data = get(f"pokedex/{did}")
        dex_order[dex] = []
        for e in data["pokemon_entries"]:
            sp = e["pokemon_species"]["name"]
            dex_numbers.setdefault(sp, {})[dex] = e["entry_number"]
            dex_order[dex].append(sp)
    species_names = list(dex_numbers)
    bulba = {dex: bulba_dex(dex.capitalize()) for dex, _ in DEXES}
    for dex, _ in DEXES:
        missing = [n for n in range(1, len(dex_order[dex]) + 1) if n not in bulba[dex]]
        if missing:
            raise SystemExit(f"Bulbapedia {dex} dex rows not parsed: {missing}")
    print(f"{len(species_names)} species across {len(DEXES)} dexes")

    species = dict(zip(species_names, pmap(lambda s: get(f"pokemon-species/{s}"), species_names)))
    variety_names = sorted({v["pokemon"]["name"] for s in species.values() for v in s["varieties"]})
    variety_names = [v for v in variety_names if not SKIP_FORM.search(v)]
    pokemon = dict(zip(variety_names, pmap(lambda v: get(f"pokemon/{v}"), variety_names)))

    # Forms present in SV = varieties with a scarlet-violet learnset.
    sv_forms = {n: p for n, p in pokemon.items() if any(
        d["version_group"]["name"] == VG for m in p["moves"] for d in m["version_group_details"])}
    print(f"{len(sv_forms)} forms with SV learnsets (of {len(pokemon)} varieties)")

    form_urls = [p["forms"][0]["url"] for n, p in sv_forms.items()]
    form_data = dict(zip(sv_forms, pmap(get, form_urls)))

    chain_urls = sorted({s["evolution_chain"]["url"] for s in species.values() if s.get("evolution_chain")})
    chains = dict(zip(chain_urls, pmap(get, chain_urls)))

    # ---- moves and abilities used by the kept forms
    learn = {n: sv_moves(p) for n, p in sv_forms.items()}
    move_names = sorted({m for lv, tm, egg in learn.values() for m in [x[1] for x in lv] + tm + egg})
    move_data = dict(zip(move_names, pmap(lambda m: get(f"move/{m}"), move_names)))
    ability_names = sorted({a["ability"]["name"] for p in sv_forms.values() for a in p["abilities"]})
    ability_data = dict(zip(ability_names, pmap(lambda a: get(f"ability/{a}"), ability_names)))
    print(f"{len(move_names)} moves, {len(ability_names)} abilities, {len(chains)} chains")

    moves_out, move_index = [], {}
    for i, m in enumerate(move_names):
        d = move_data[m]
        flavor = next((f["flavor_text"] for f in d["flavor_text_entries"]
                       if f["language"]["name"] == "en" and f["version_group"]["name"] == VG), None)
        if not flavor:
            eff = en(d["effect_entries"], "short_effect") or ""
            flavor = eff.replace("$effect_chance", str(d.get("effect_chance") or ""))
        move_index[m] = i
        moves_out.append({
            "n": en(d["names"]) or title(m),
            "t": d["type"]["name"],
            "c": d["damage_class"]["name"][:2],  # ph / sp / st
            "p": d["power"],
            "a": d["accuracy"],
            "pp": d["pp"],
            "e": clean(flavor),
        })

    abilities_out = {}
    for a, d in ability_data.items():
        flavor = next((f["flavor_text"] for f in d["flavor_text_entries"]
                       if f["language"]["name"] == "en" and f["version_group"]["name"] == VG), None)
        abilities_out[a] = {"n": en(d["names"]) or title(a),
                            "e": clean(flavor or en(d["effect_entries"], "short_effect"))}

    # ---- exclusives
    excl: dict[str, tuple[str, str | None]] = {}
    for n in SCARLET:
        excl[n] = ("scarlet", NOTES.get(n))
    for n in VIOLET:
        excl[n] = ("violet", NOTES.get(n))
    for n in VIOLET_COOP:
        excl[n] = ("coop", "Violet-side legendary from Snacksworth (Indigo Disk). In Scarlet you get it by doing Blueberry Quests with a Violet player.")
    # Snacksworth legendaries sit outside all three regional dexes, so only the strict lists must match.
    unknown = [n for n in SCARLET + VIOLET if n not in pokemon and n not in species]
    if unknown:
        raise SystemExit(f"exclusives.py names not found in PokeAPI data: {unknown}")

    # ---- evolution trees
    chain_ids, evolutions = {}, {}
    for url, c in chains.items():
        cid = c["id"]
        evolutions[cid] = walk_chain(c["chain"])
        chain_ids[url] = cid

    def has_kids(node, sp):
        if node["s"] == sp:
            return bool(node.get("to"))
        return any(has_kids(k, sp) for k in node.get("to", []))

    # ---- pokemon entries
    out = []
    for sp in species_names:
        s = species[sp]
        forms = []
        for v in s["varieties"]:
            vn = v["pokemon"]["name"]
            if vn not in sv_forms:
                continue
            p = sv_forms[vn]
            fd = form_data[vn]
            lv, tm, egg = learn[vn]
            sprites = p["sprites"]
            home = sprites["other"]["home"]
            art = sprites["other"]["official-artwork"]
            label = en(fd.get("form_names", [])) or ("" if v["is_default"] else title(vn.replace(sp + "-", "")))
            version, note = excl.get(vn) or excl.get(sp) or (None, None)
            # Tauros: the species key must not mark all breeds; only breed keys exist above.
            forms.append({
                "slug": vn,
                "pid": p["id"],
                "label": label,
                "types": [t["type"]["name"] for t in sorted(p["types"], key=lambda t: t["slot"])],
                "stats": [st["base_stat"] for st in p["stats"]],
                "ab": [[a["ability"]["name"], 1 if a["is_hidden"] else 0] for a in sorted(p["abilities"], key=lambda a: a["slot"])],
                "art": home["front_default"] or art["front_default"],
                "artS": home["front_shiny"] or art.get("front_shiny"),
                "spr": sprites["front_default"] or home["front_default"] or art["front_default"],
                "sprS": sprites["front_shiny"] or home["front_shiny"] or art.get("front_shiny"),
                "lv": [[l, move_index[m]] for l, m in lv],
                "tm": [move_index[m] for m in tm],
                "egg": [move_index[m] for m in egg],
                "ver": version,
                "note": note,
                "battleOnly": bool(fd.get("is_battle_only")),
                "default": bool(v["is_default"]),
            })
        if not forms:
            print(f"  WARNING: {sp} has no SV form")
            continue
        # Which forms each dex entry shows, matched by label against Bulbapedia.
        dex_form = {}
        for dex, num in dex_numbers[sp].items():
            labels = bulba[dex][num]
            picked = []
            for lab in labels:
                hit = next((f for f in forms if f["default"]), None) if lab == "" else                     next((f for f in forms if norm(f["label"]) == norm(lab)), None)
                if hit is None and lab:
                    hit = next((f for f in forms if norm(lab) in norm(f["label"]) or norm(f["label"]) in norm(lab)), None)
                if hit is None and len(forms) == 1:
                    hit = forms[0]  # cosmetic-only forms (Vivillon patterns, Alcremie) share one PokeAPI variety
                if hit is None:
                    raise SystemExit(f"{sp}: no PokeAPI form matches Bulbapedia {dex} #{num} label {lab!r}")
                picked.append(hit["slug"])
            dex_form[dex] = picked[0]
            for slug in picked:
                next(f for f in forms if f["slug"] == slug)["inDex"] = True
        default_in_dex = any(f.get("inDex") and f["default"] for f in forms)
        # Keep dex-listed forms, plus non-regional variants (Rotom appliances, Ogerpon masks, battle forms)
        # of a species whose standard form is in the dex.
        forms = [f for f in forms if f.get("inDex") or (default_in_dex and not REGIONAL.search(f["label"]))]
        # Koraidon/Miraidon ride builds are not battle forms (and have no artwork).
        forms = [f for f in forms if not re.match(r"(koraidon|miraidon)-", f["slug"])]
        if sp == "minior":
            forms = [f for f in forms if f["slug"] in ("minior-red-meteor", "minior-red")]
        for f in forms:
            f.pop("inDex", None)
        forms.sort(key=lambda f: (f["battleOnly"], not f["default"]))
        flavor = [f for f in s["flavor_text_entries"] if f["language"]["name"] == "en"]
        sv_flavor = [f for f in flavor if f["version"]["name"] in ("scarlet", "violet")]
        chain_url = s["evolution_chain"]["url"] if s.get("evolution_chain") else None
        cid = chain_ids.get(chain_url)
        out.append({
            "id": s["id"],
            "slug": sp,
            "name": en(s["names"]) or title(sp),
            "genus": en(s["genera"], "genus") or "",
            "flavor": clean((sv_flavor or flavor[-1:] or [{"flavor_text": ""}])[-1]["flavor_text"]),
            "dex": dex_numbers[sp],
            "dexForm": dex_form,
            "chain": cid,
            "final": not has_kids(evolutions[cid], sp) if cid else True,
            "legend": "legendary" if s["is_legendary"] else "mythical" if s["is_mythical"] else None,
            "paradox": sp in PARADOX,
            "forms": forms,
        })

    in_sv = {p["slug"] for p in out}
    for cid, tree in evolutions.items():
        mark_missing(tree, in_sv)
    used_chains = {p["chain"] for p in out if p["chain"]}
    evolutions = {cid: t for cid, t in evolutions.items() if cid in used_chains}

    write("pokemon.json", out)
    write("moves.json", moves_out)
    write("abilities.json", abilities_out)
    write("evolutions.json", evolutions)
    write("dexes.json", {d: dex_order[d] for d, _ in DEXES})
    write("meta.json", {"built": time.strftime("%Y-%m-%d"), "species": len(out),
                        "source": "PokeAPI (pokeapi.co); exclusives from Bulbapedia + Serebii"})


PARADOX = {
    "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane", "slither-wing", "sandy-shocks",
    "roaring-moon", "walking-wake", "gouging-fire", "raging-bolt", "iron-treads", "iron-bundle",
    "iron-hands", "iron-jugulis", "iron-moth", "iron-thorns", "iron-valiant", "iron-leaves",
    "iron-boulder", "iron-crown",
}


def mark_missing(node: dict, in_sv: set[str]) -> None:
    if node["s"] not in in_sv:
        node["x"] = 1  # not obtainable in Scarlet/Violet
    for k in node.get("to", []):
        mark_missing(k, in_sv)


def write(name: str, data) -> None:
    path = OUT / name
    path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
