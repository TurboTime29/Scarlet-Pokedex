"""Version-exclusive Pokémon in Scarlet/Violet (base game + Teal Mask + Indigo Disk).

Source: Bulbapedia "Version-exclusive Pokémon" (Generation IX section, fetched 2026-10-27),
cross-checked against serebii.net/scarletviolet/exclusives.shtml.

Keys are PokeAPI pokemon (variety) names; a species name covers every form of that species.
Each value is (version, note) where version is "scarlet" or "violet".

Status shown in the app:
  - "violet"  -> cannot be caught in Scarlet (needs a trade)
  - "coop"    -> Violet-side legendary from Snacksworth; Scarlet players can still get it by
                 doing Blueberry Quests with a Violet player
"""

SCARLET = [
    # Paldea
    "tauros-paldea-blaze-breed", "larvitar", "pupitar", "tyranitar", "drifloon", "drifblim",
    "stunky", "skuntank", "deino", "zweilous", "hydreigon", "skrelp", "dragalge", "oranguru",
    "stonjourner", "armarouge", "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane",
    "slither-wing", "sandy-shocks", "roaring-moon", "koraidon", "walking-wake",
    # Teal Mask
    "gligar", "gliscor", "cramorant",
    # Indigo Disk
    "vulpix-alola", "ninetales-alola", "cranidos", "rampardos", "gouging-fire", "raging-bolt",
]

VIOLET = [
    # Paldea
    "tauros-paldea-aqua-breed", "misdreavus", "mismagius", "bagon", "shelgon", "salamence",
    "clauncher", "clawitzer", "passimian", "eiscue", "dreepy", "drakloak", "dragapult",
    "ceruledge", "iron-treads", "iron-bundle", "iron-hands", "iron-jugulis", "iron-moth",
    "iron-thorns", "iron-valiant", "miraidon", "iron-leaves", "gulpin", "swalot",
    # Teal Mask
    "aipom", "ambipom", "morpeko",
    # Indigo Disk
    "sandshrew-alola", "sandslash-alola", "shieldon", "bastiodon", "iron-boulder", "iron-crown",
]

# Snacksworth legendaries on the Violet side: obtainable in Scarlet via co-op Blueberry Quests.
VIOLET_COOP = [
    "palkia", "lugia", "latias", "kyogre", "cobalion", "terrakion", "virizion", "zekrom",
    "kyurem-black", "lunala", "necrozma-dawn", "spectrier",
]

NOTES = {
    "gulpin": "Violet-only in the wild. With The Indigo Disk, Scarlet players can trade for one with Jacq.",
    "swalot": "Violet-only in the wild. Evolve a Gulpin traded from Jacq (Indigo Disk).",
    "ceruledge": "Malicious Armor is Violet-only, but Ceruledge can appear in 5★/6★ raids hosted by a Violet player.",
    "armarouge": "Auspicious Armor is Scarlet-only.",
}
