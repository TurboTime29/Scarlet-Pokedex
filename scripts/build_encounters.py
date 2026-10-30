"""Build public/data/encounters.json: where each Pokémon is found in Scarlet/Violet and how likely it is.

Source: Bulbapedia location pages (wikitext via the MediaWiki API, cached in scripts/raw/):
  - {{Catch/entry9|...}} wild spawns per biome, with datamined spawn weights per time of day
  - {{Catch/entry9/special|...}} fixed (always-there) encounters
  - "List of N★ Tera Raid Battles (Region)" pages: {{TeraRaidInfo|...}}

A wild entry's odds = its weight / total weight of every Pokémon that can spawn in the same biome of
that location at that time, i.e. "of the Pokémon spawning in this biome here, ~X% are this one".
Run after build_data.py:  python scripts/build_encounters.py
"""
import json
import re
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_data import get, norm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data"
WIKI = "https://bulbapedia.bulbagarden.net/w/api.php?format=json&"
TIMES = ("morning", "day", "evening", "night")

KITAKAMI = {"Kitakami Wilds", "Paradise Barrens", "Apple Hills", "Oni Mountain", "Crystal Pool", "Wistful Fields",
            "Fellhorn Gorge", "Mossfell Confluence", "Reveler's Road", "Oni's Maw", "Kitakami Road", "Infernal Pass",
            "Chilling Waterhead", "Mossui Town", "Kitakami Hall", "Timeless Woods"}
BLUEBERRY = {"Canyon Biome", "Savanna Biome", "Polar Biome", "Coastal Biome", "Chargestone Cavern", "Torchlit Labyrinth"}
SKIP_PAGES = re.compile(r"^(Template:|User:|Walkthrough:)")


def wiki(params: str) -> dict:
    return get(WIKI + params)


def embedded_in(template: str) -> list[str]:
    data = wiki(f"action=query&list=embeddedin&eilimit=500&eifilterredir=nonredirects&eititle={urllib.parse.quote(template)}")
    return [p["title"] for p in data["query"]["embeddedin"] if not SKIP_PAGES.match(p["title"])]


def wikitext(title: str) -> str:
    return wiki(f"action=parse&prop=wikitext&redirects=1&page={urllib.parse.quote(title)}")["parse"]["wikitext"]["*"]


def split_args(body: str) -> tuple[list[str], dict[str, str]]:
    """Template arguments -> (positional, named). Ignores pipes inside nested {{...}} / [[...]]."""
    parts, depth, cur = [], 0, ""
    i = 0
    while i < len(body):
        two = body[i:i + 2]
        if two in ("{{", "[["):
            depth += 1; cur += two; i += 2; continue
        if two in ("}}", "]]"):
            depth -= 1; cur += two; i += 2; continue
        if body[i] == "|" and depth == 0:
            parts.append(cur); cur = ""
        else:
            cur += body[i]
        i += 1
    parts.append(cur)
    pos, named = [], {}
    for p in parts:
        m = re.match(r"^\s*([a-zA-Z][\w ]*?)\s*=(.*)$", p, re.S)
        if m:
            named[m.group(1).strip()] = m.group(2).strip()
        else:
            pos.append(p.strip())
    return pos, named


def templates(text: str, name: str):
    """Yield the argument bodies of every {{name|...}} in text (balanced braces)."""
    pat = re.compile(r"\{\{" + re.escape(name) + r"\s*\|")
    m = pat.search(text)
    while m:
        i = m.start()
        depth, j = 0, i
        while j < len(text):
            if text.startswith("{{", j):
                depth += 1; j += 2; continue
            if text.startswith("}}", j):
                depth -= 1; j += 2
                if depth == 0:
                    break
                continue
            j += 1
        yield i, text[m.end():j - 2]
        m = pat.search(text, j)


def region_of(loc: str) -> str:
    return "kitakami" if loc in KITAKAMI else "blueberry" if loc in BLUEBERRY else "paldea"


def clean_note(s: str) -> str:
    """Spawn notes as plain sentences: no wiki markup, citation links or <ref>s."""
    s = re.sub(r"<ref[^>]*>.*?</ref>|<ref[^>]*/>", "", s, flags=re.S)
    s = re.sub(r"https?://\S+", "", strip_markup(s)).replace("&nbsp;", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("This Pokémon that only", "This Pokémon only").replace("can only spawns", "can only spawn").replace("can changed", "can be changed")
    return s if s.endswith((".", "!", ")")) else s + "."


def page_notes(text: str) -> dict[str, str]:
    """notename -> text: a note is written out once on the page and later entries refer to it by name."""
    notes = {}
    for _, args in templates(text, "Catch/entry9"):
        _, named = split_args(args)
        if named.get("notename") and named.get("note"):
            notes.setdefault(named["notename"], named["note"])
    for m in re.finditer(r'<ref name="?([^">/]+?)"?(?: group="?note"?)?\s*>(.*?)</ref>', text, flags=re.S):
        notes.setdefault(m.group(1).strip(), m.group(2))
    return notes


def strip_markup(s: str) -> str:
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{[^{}|]*\|([^{}|]*)(?:\|[^{}]*)?\}\}", r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"'{2,}", "", s).strip()


def biome_names() -> dict[str, str]:
    t = wikitext("Template:Catch/div/9")
    return {m.group(1): m.group(2) for m in re.finditer(r"\|(\w+)=style.*?\{\{color2\|\w+\|Biome\|([^}]+)\}\}", t)}


# ---------------------------------------------------------------- special (one-time) encounters

EVENT_PAGE = "List of in-game event Pokémon in Pokémon Scarlet and Violet"
PART_REGION = {"Base game": "paldea", "The Teal Mask": "kitakami", "The Indigo Disk": "blueberry", "Mochi Mayhem": "kitakami"}
# Exact steps for the treasures of ruin, from Bulbapedia's shrine pages (Grasswither/Icerend/Groundblight/Firescourge Shrine).
SHRINE_STEPS = {
    "wo-chien": ("Grasswither Shrine", "South Province (Area One)", "purple"),
    "chien-pao": ("Icerend Shrine", "West Province (Area One)", "yellow"),
    "ting-lu": ("Groundblight Shrine", "Socarrat Trail", "green"),
    "chi-yu": ("Firescourge Shrine", "North Province (Area Two)", "light-blue"),
}


def prose(block: str) -> str:
    """Wiki paragraphs under a heading as plain text (templates, files and tables dropped)."""
    block = re.sub(r"<ref[^>]*>.*?</ref>|<ref[^>]*/>", "", block, flags=re.S)
    # inline link templates ({{p|Koraidon}}, {{m|Icy Wind}}, {{color2|000|Text}}) keep their display text
    for _ in range(3):
        block = re.sub(r"\{\{(?!SVievent)[^{}|\n]+\|([^{}\n]*?)\}\}", lambda m: m.group(1).split("|")[-1], block)
    while True:  # drop the remaining (block) templates from the inside out
        nb = re.sub(r"\{\{[^{}]*\}\}", "", block)
        if nb == block:
            break
        block = nb
    block = re.sub(r"\[\[File:[^\]]*\]\]", "", block)
    lines = [ln for ln in block.split("\n") if ln.strip() and not ln.lstrip().startswith(("{", "|", "!", "<", "[[Category"))]
    text = re.sub(r"\s+", " ", strip_markup(" ".join(lines))).strip()
    # version-split wording: "KoraidonS/MiraidonV" -> "Koraidon (Scarlet) / Miraidon (Violet)"
    text = re.sub(r"(\w[\w.'’]*)S/(\w[\w.'’ ]*?)V\b", r"\1 (Scarlet) / \2 (Violet)", text)
    return text


def met_place(met: str) -> str:
    """{{color2|000|Socarrat Trail}} -> Socarrat Trail; version-split values keep both names."""
    names = re.findall(r"\{\{color2\|[^|}]*\|([^}]*)\}\}", met)
    return " / ".join(dict.fromkeys(strip_markup(n) for n in names)) if names else strip_markup(met)


def special_encounters(resolve) -> dict[str, list[dict]]:
    text = wikitext(EVENT_PAGE)
    out: dict[str, list[dict]] = {}
    part, group, group_text = "Base game", None, ""
    heads = list(re.finditer(r"\n(==+)[ \t]*(.*?)[ \t]*\1[ \t]*(?=\n)", text))
    for i, h in enumerate(heads):
        level, name = len(h.group(1)), strip_markup(h.group(2))
        body = text[h.end(): heads[i + 1].start() if i + 1 < len(heads) else len(text)]
        if level == 2:
            part, group, group_text = name, None, prose(body.split("{{SVievent")[0])
        elif level == 3:
            group, group_text = name, prose(body.split("{{SVievent")[0])
        note = prose(body.split("{{SVievent")[0]) if level == 4 else ""
        for _, args in templates(body, "SVievent"):
            _, named = split_args(args)
            if "ndex" not in named:
                continue
            slug, form = resolve(named["ndex"], named.get("form"))
            if not slug:
                continue
            if (named.get("form") or "-" in named["ndex"]) and form is None:
                continue  # a regional form that isn't in Scarlet/Violet's dexes (e.g. Hisuian Growlithe)
            steps = [t for t in (group_text if level >= 3 else "", note) if len(t) > 30]
            if slug in SHRINE_STEPS:
                shrine, loc, colour = SHRINE_STEPS[slug]
                steps = [
                    f"Go to the {shrine} in {loc} — a small cave sealed by a {colour} door with four chains.",
                    f"Find and pull out the eight {colour} stakes around the area (they glow with a dark aura). Each one removes part of the seal.",
                    f"Once all eight are pulled, go back to the shrine: the door opens and {named.get('pokemon', slug)} is inside. Save before you battle it — if it's defeated it retreats and comes back later, and it can't be shiny.",
                ] + steps
            rec = {
                "group": group or name, "part": part, "r": PART_REGION.get(part, "paldea"),
                "loc": met_place(named.get("met", "")), "lv": named.get("level", ""),
                "steps": list(dict.fromkeys(steps)),
            }
            if named.get("game") in ("s", "v"):
                rec["v"] = "scarlet" if named["game"] == "s" else "violet"
            if form:
                rec["f"] = form
            lst = out.setdefault(slug, [])
            if not any(x["loc"] == rec["loc"] and x["group"] == rec["group"] for x in lst):
                lst.append(rec)
    return out


def main() -> None:
    species = json.loads((OUT / "pokemon.json").read_text(encoding="utf-8"))
    by_id = {s["id"]: s for s in species}

    def resolve(ndex: str, form_label: str | None):
        """'0194-Paldea' + 'Paldean Form' -> (species slug, form slug or None for the dex default)."""
        num = int(re.match(r"\d+", ndex).group(0))
        s = by_id.get(num)
        if not s:
            return None, None
        label = form_label or ""
        suffix = ndex.split("-", 1)[1] if "-" in ndex else ""
        if not label and not suffix:
            return s["slug"], None
        want = norm(label or suffix)
        for f in s["forms"]:
            if want and (norm(f["label"]) == want or want in norm(f["label"]) or want in norm(f["slug"])):
                return s["slug"], f["slug"]
        return s["slug"], None

    biomes = biome_names()
    out: dict[str, dict] = {}
    unknown = set()

    def bucket(slug):
        return out.setdefault(slug, {"wild": [], "fixed": [], "raids": []})

    # ---- wild spawns with weights
    pages = embedded_in("Template:Catch/entry9")
    token = re.compile(r"\{\{Catch/div/9\|([^}|]+)\}\}|\n(==+)\s*([^=\n]+?)\s*==+|\{\{Catch/entry9\s*\|")
    for title in pages:
        text = wikitext(title)
        notes = page_notes(text)
        # Walk the page in order. Big areas (Area Zero, the Terarium biomes) split into sub-areas with "===X==="
        # headings, each with its own table; inside a table {{Catch/div/9|code}} starts a biome.
        groups: dict[tuple[str | None, str], list[dict]] = {}
        sub, biome = None, "Wild"
        for m in token.finditer(text):
            if m.group(1):
                biome = biomes.get(m.group(1), m.group(1)); continue
            if m.group(2):
                sub = strip_markup(m.group(3)) if len(m.group(2)) == 3 else None
                if sub and re.search(r"wild|pokémon|encounter|scarlet|violet", sub, re.I):
                    sub = None  # generic headings, not a place
                biome = "Wild"; continue
            body = next(templates(text[m.start():], "Catch/entry9"))[1]
            pos, named = split_args(body)
            pos = [x for x in pos if x != ""]
            if len(pos) < 5:
                continue
            ndex, name, sc, vi, lv = pos[:5]
            num = lambda s: float(re.sub(r"[^\d.]", "", s) or 0)  # noqa: E731
            base = num(pos[5]) if len(pos) > 5 else num(named.get("all", "0"))
            if "all" in named:
                weights = [num(named["all"])] * 4
            else:  # a time left out uses the base weight; "night=0" means never at night
                weights = [num(named[t]) if named.get(t, "") != "" else base for t in TIMES]
            groups.setdefault((sub, biome), []).append({
                "ndex": ndex, "name": name, "form": named.get("form"), "S": sc == "yes", "V": vi == "yes",
                "lv": strip_markup(lv), "w": weights, "group": named.get("group"),
                "note": named.get("note") or notes.get(named.get("notename", ""), ""),
                "ls": strip_markup(named.get("levelscaled", "")),
                "water": named.get("watersurface") == "yes" or named.get("underwater") == "yes",
                "land": named.get("land") == "yes", "sky": named.get("sky") == "yes" or named.get("overland") == "yes"})
        for (sub, biome), entries in groups.items():
            for ver in ("S", "V"):
                totals = [sum(e["w"][t] for e in entries if e[ver]) for t in range(4)]
                for e in entries:
                    e["pct" + ver] = [round(100 * e["w"][t] / totals[t], 1) if totals[t] and e[ver] else 0 for t in range(4)]
            for e in entries:
                slug, form = resolve(e["ndex"], e["form"])
                if not slug:
                    unknown.add(e["name"]); continue
                rec = {"loc": title, "r": region_of(title), "b": biome, "lv": e["lv"],
                       **({"sub": sub} if sub else {}),
                       "p": e["pctS"] if e["S"] else e["pctV"], "v": "both" if e["S"] and e["V"] else "scarlet" if e["S"] else "violet"}
                if not any(rec["p"]):
                    continue  # listed with zero weight: never actually spawns
                if form:
                    rec["f"] = form
                if e["group"]:
                    rec["g"] = int(re.sub(r"\D", "", e["group"]) or 0)
                if e["note"]:
                    rec["n"] = clean_note(e["note"])
                if e["ls"]:
                    rec["ls"] = e["ls"]
                how = [k for k in ("land", "water", "sky") if e[k]]
                if how and how != ["land"]:
                    rec["on"] = how
                bucket(slug)["wild"].append(rec)

    # ---- fixed encounters
    for title in embedded_in("Template:Catch/entry9/special"):
        text = wikitext(title)
        for _, args in templates(text, "Catch/entry9/special"):
            pos, named = split_args(args)
            if len(pos) < 6:
                continue
            ndex, name, sc, vi, where, lv = pos[:6]
            slug, form = resolve(ndex, named.get("form"))
            if not slug:
                unknown.add(name); continue
            rec = {"loc": title, "r": region_of(title), "where": strip_markup(where), "lv": strip_markup(lv),
                   "v": "both" if sc == "yes" and vi == "yes" else "scarlet" if sc == "yes" else "violet"}
            if form:
                rec["f"] = form
            if len(pos) > 6 and pos[6] and pos[6].lower() != "respawns":
                rec["note"] = strip_markup(pos[6])
            bucket(slug)["fixed"].append(rec)

    # ---- Tera Raid Battles
    for region, page_region in (("paldea", "Paldea"), ("kitakami", "Kitakami"), ("blueberry", "Blueberry Academy")):
        for stars in range(1, 7):
            title = f"List of {stars}★ Tera Raid Battles ({page_region})"
            try:
                text = wikitext(title)
            except Exception:  # noqa: BLE001 - not every region has every star level
                continue
            for _, args in templates(text, "TeraRaidInfo"):
                _, named = split_args(args)
                if "ndex" not in named:
                    continue
                slug, form = resolve(named["ndex"], named.get("form"))
                if not slug:
                    unknown.add(named.get("pokemon", "?")); continue
                ver = named.get("version", "Both").lower()
                rec = {"r": region, "s": stars, "lv": named.get("levelcatch", ""), "v": "both" if ver == "both" else ver}
                if form:
                    rec["f"] = form
                raids = bucket(slug)["raids"]
                if rec not in raids:
                    raids.append(rec)

    for slug, specials in special_encounters(resolve).items():
        bucket(slug)["special"] = specials
    for e in out.values():
        e.setdefault("special", [])
        e["wild"].sort(key=lambda r: -max(r["p"]))
        e["raids"].sort(key=lambda r: (r["s"], r["r"]))
    path = OUT / "encounters.json"
    path.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    n_wild = sum(1 for e in out.values() if e["wild"])
    print(f"{len(pages)} location pages; {len(out)} species with encounters ({n_wild} wild); "
          f"wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")
    if unknown:
        print(f"  not in our dexes (skipped): {sorted(unknown)[:30]}{' …' if len(unknown) > 30 else ''}")


if __name__ == "__main__":
    main()
