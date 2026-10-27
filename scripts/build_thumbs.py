"""Make small WebP list thumbnails (normal + shiny) from the Pokémon HOME renders in pokemon.json.

The HOME PNGs are ~190 KB each; the list shows hundreds at once, so it uses 128 px WebPs served
with the app (public/thumbs/{pid}.webp and {pid}s.webp). Detail pages still load the full render.
Needs Pillow:  scripts/.venv/Scripts/python scripts/build_thumbs.py
"""
import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts" / "raw" / "home"
OUT = ROOT / "public" / "thumbs"
SIZE = 128


def fetch(url: str) -> bytes:
    path = RAW / url.rsplit("/sprites/pokemon/", 1)[1].replace("/", "_")
    if path.exists():
        return path.read_bytes()
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "scarlet-pokedex-builder/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            path.write_bytes(data)
            return data
        except Exception:  # noqa: BLE001
            if attempt == 4:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise AssertionError


def thumb(job: tuple[str, Path]) -> None:
    url, dest = job
    if dest.exists():
        return
    img = Image.open(BytesIO(fetch(url))).convert("RGBA")
    bbox = img.getbbox()  # trim transparent padding so small Pokémon fill the slot
    if bbox:
        img = img.crop(bbox)
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.paste(img, ((SIZE - img.width) // 2, (SIZE - img.height) // 2))
    canvas.save(dest, "WEBP", quality=82, method=6)


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    pokemon = json.loads((ROOT / "public" / "data" / "pokemon.json").read_text(encoding="utf-8"))
    jobs = []
    for p in pokemon:
        for f in p["forms"]:
            if f["art"]:
                jobs.append((f["art"], OUT / f"{f['pid']}.webp"))
            if f["artS"]:
                jobs.append((f["artS"], OUT / f"{f['pid']}s.webp"))
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(thumb, jobs))
    total = sum(p.stat().st_size for p in OUT.glob("*.webp"))
    print(f"{len(jobs)} thumbnails, {total // 1024} KB total")


if __name__ == "__main__":
    main()
