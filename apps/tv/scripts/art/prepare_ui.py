#!/usr/bin/env python3
"""
Prepare the shared UI key art for the TV app: Home and Library backgrounds and
the five case-card paintings, with the darkening baked in so text on top
stays readable without runtime gradients.

Usage: python prepare_ui.py <SRC art-inbox dir>
Writes apps/tv/src/assets/ui/. Requires Pillow and numpy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[4]
OUT = REPO / 'apps/tv/src/assets/ui'

CARDS = {
    'the-last-train': 'shared.card.last-train.png',
    'the-hollow-manor': 'shared.card.hollow-manor.png',
    'signal-lost': 'shared.card.signal-lost.png',
    'the-forgotten-temple': 'shared.card.forgotten-temple.png',
    'the-yakshas-questions': 'shared.card.yaksha.png',
}


def cover(im, w, h, focus_x=0.5):
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = int((im.width - w) * focus_x)
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def shade(im, f):
    """Multiply by a per-pixel brightness map f(xs, ys) in 0..1 (coordinates 0..1)."""
    a = np.asarray(im.convert('RGB')).astype(float)
    h, w = a.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]
    m = f(xs / (w - 1), ys / (h - 1))
    return Image.fromarray(np.clip(a * m[..., None], 0, 255).astype(np.uint8))


def main():
    src = Path(sys.argv[1]) / 'shared'
    (OUT / 'cards').mkdir(parents=True, exist_ok=True)

    # Home: the menu sits in the centre, so the middle is darkened most; the street stays visible at the edges.
    home = cover(Image.open(src / 'shared.home.bg.png').convert('RGB'), 1920, 1080)
    home = shade(home, lambda x, y: 0.42 + 0.5 * np.clip(np.abs(x - 0.5) * 2, 0, 1) ** 1.5 * (1 - 0.35 * y))
    home.save(OUT / 'home.jpg', quality=84, optimize=True)

    # Library: five cards across the middle; keep the desk lamp glow at the right edge.
    lib = cover(Image.open(src / 'shared.library.bg.png').convert('RGB'), 1920, 1080)
    lib = shade(lib, lambda x, y: 0.35 + 0.55 * np.clip((x - 0.55) / 0.45, 0, 1) * np.clip(1.2 - y, 0, 1))
    lib.save(OUT / 'library.jpg', quality=84, optimize=True)

    # Cards: a header painting (312 x 150 design px at 2x), the text sits below it on the card.
    for mystery_id, name in CARDS.items():
        im = Image.open(src / name).convert('RGB')
        # The subject sits in the upper middle of these portrait paintings.
        top = int(im.height * 0.12)
        im = im.crop((0, top, im.width, top + int(im.width * 150 / 312)))
        card = cover(im, 624, 300)
        card = shade(card, lambda x, y: 0.95 - 0.3 * np.clip((y - 0.7) / 0.3, 0, 1))
        card.save(OUT / 'cards' / f'{mystery_id}.jpg', quality=84, optimize=True)
    for p in sorted(OUT.rglob('*.jpg')):
        print(p.relative_to(OUT), round(p.stat().st_size / 1024), 'KB')


if __name__ == '__main__':
    main()
