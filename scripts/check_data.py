"""Spot-check public/data/*.json after build_data.py. Exits non-zero on the first failed check."""
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "public" / "data"
P = json.loads((DATA / "pokemon.json").read_text(encoding="utf-8"))
M = json.loads((DATA / "moves.json").read_text(encoding="utf-8"))
E = {int(k): v for k, v in json.loads((DATA / "evolutions.json").read_text(encoding="utf-8")).items()}
D = json.loads((DATA / "dexes.json").read_text(encoding="utf-8"))
by = {p["slug"]: p for p in P}
fails = 0


def check(cond, msg):
    global fails
    print(("ok   " if cond else "FAIL ") + msg)
    fails += not cond


def form(sp, slug=None):
    p = by[sp]
    return next(f for f in p["forms"] if f["slug"] == (slug or p["forms"][0]["slug"]))


def chain_species(cid):
    out, stack = [], [E[cid]]
    while stack:
        n = stack.pop()
        out.append(n["s"])
        stack += n.get("to", [])
    return out


check(len(D["paldea"]) == 400 and D["paldea"][0] == "sprigatito", "Paldea dex has 400 entries starting with Sprigatito")
check(len(D["kitakami"]) == 200 and len(D["blueberry"]) == 243, "Kitakami 200 / Blueberry 243 entries")
check(by["sprigatito"]["dex"]["paldea"] == 1, "Sprigatito is Paldea #001")
check(by["pikachu"]["dex"]["paldea"] == 74, "Pikachu is Paldea #074")
check("raichu" in chain_species(by["pikachu"]["chain"]), "Pikachu's chain contains Raichu")
check(form("deino")["ver"] == "scarlet", "Deino is Scarlet-only")
check(form("dreepy")["ver"] == "violet", "Dreepy is Violet-only")
check(form("tauros", "tauros-paldea-blaze-breed")["ver"] == "scarlet", "Blaze Breed Tauros is Scarlet-only")
check(form("tauros", "tauros-paldea-aqua-breed")["ver"] == "violet", "Aqua Breed Tauros is Violet-only")
check(form("tauros", "tauros-paldea-combat-breed")["ver"] is None, "Combat Breed Tauros is in both")
check(by["wooper"]["dexForm"]["paldea"] == "wooper-paldea", "Paldea dex shows Paldean Wooper")
check(by["vulpix"]["dexForm"]["blueberry"] == "vulpix-alola", "Blueberry dex shows Alolan Vulpix")
check(form("vulpix", "vulpix-alola")["ver"] == "scarlet" and form("vulpix", "vulpix")["ver"] is None, "Only Alolan Vulpix is Scarlet-only")
check(not any(f["slug"] == "typhlosion-hisui" for f in by["typhlosion"]["forms"]), "HOME-only Hisuian Typhlosion is dropped")
check(len(chain_species(by["eevee"]["chain"])) == 9, "Eevee's chain has all 8 Eeveelutions")
check("Gimmighoul Coins" in json.dumps(E[by["gimmighoul"]["chain"]]), "Gholdengo evolution text mentions coins")
check(by["ogerpon"]["dex"].get("kitakami") == 200, "Ogerpon is Kitakami #200")
charizard = form("charizard")
check(charizard["types"] == ["fire", "flying"], "Charizard is Fire/Flying")
check(form("gholdengo")["types"] == ["steel", "ghost"], "Gholdengo is Steel/Ghost")
pika_lv = [(lv, M[i]["n"]) for lv, i in form("pikachu")["lv"]]
check(any(n == "Thunder Shock" for _, n in pika_lv), "Pikachu learns Thunder Shock by level")
check(by["raichu"]["final"] and not by["pikachu"]["final"], "Raichu is final, Pikachu is not")

missing = [f["slug"] for p in P for f in p["forms"] if not (f["types"] and f["lv"] and (f["art"] or f["spr"]))]
check(not missing, f"every form has types, a level-up learnset and art (missing: {missing[:8]})")

sys.exit(1 if fails else 0)
