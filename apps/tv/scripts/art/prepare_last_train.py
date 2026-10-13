#!/usr/bin/env python3
"""
Prepare The Last Train's painted art for the TV app.

Reads the raw art (PNG, transparent where needed) from SRC and writes files
sized exactly to each asset's manifest box into
apps/tv/src/assets/mysteries/the-last-train/, so the TV can draw them with
resizeMode "stretch" without distortion:

  cover   fill the box, crop the overflow (backgrounds)
  contain fit inside the box, pad with transparency (objects, characters)
  tile    repeat horizontally, mirroring every other copy to hide seams

Objects are stored at 2x their box (they are zoomed into when inspected);
backgrounds at 1x. Opaque layers are JPEG, anything with alpha is PNG.

It also records where the procedural clock hands go on each painted dial
(measured by eye, see SPEC) (the hands show the clue times, so they stay procedural).

Usage: python prepare_last_train.py <SRC art-inbox dir> [--only id,id]
Requires Pillow, numpy, scipy.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

REPO = Path(__file__).resolve().parents[4]
OUT = REPO / 'apps/tv/src/assets/mysteries/the-last-train'

# id: (source relative to SRC, box w, box h, mode, options)
SPEC = {
    'sky': ('last-train/last-train.sky.png', 2600, 1200, 'cover', {}),
    'city': ('last-train/last-train.city.png', 3400, 360, 'band', {'from': 0.52, 'fade': 0.45}),
    'station.background': ('last-train/last-train.station.background.png', 1700, 760, 'cover', {'fade': 0.22}),
    'station.platform': ('last-train/last-train.station.platform.png', 5600, 320, 'tile', {}),
    'tracks': ('last-train/last-train.tracks.png', 5600, 90, 'tile', {}),
    'station.lights': ('last-train/last-train.station.lights.png', 90, 560, 'contain', {'align': 'bottom'}),
    'foreground.pole': ('last-train/last-train.foreground.pole.png', 110, 1200, 'contain', {'align': 'bottom', 'stretch': True}),
    'bench': ('last-train/last-train.bench.png', 320, 120, 'contain', {'align': 'bottom'}),
    'train': ('last-train/last-train.train.png', 2600, 380, 'contain', {'align': 'bottom', 'stretch': True}),
    'train.interior': ('last-train/last-train.train.interior.png', 2400, 1180, 'cover', {}),
    'train.vestibule': ('last-train/last-train.train.vestibule.png', 2200, 1080, 'cover', {}),
    'signal-box.interior': ('last-train/last-train.signal-box.interior.png', 2300, 1180, 'cover', {}),
    'detective': ('shared/shared.grace.full.png', 240, 560, 'contain', {'align': 'bottom', 'scale': 2}),
    'clock': ('last-train/last-train.clock.png', 200, 200, 'contain', {'scale': 2, 'face': {'cx': 101, 'cy': 101, 'd': 118}}),
    'notice': ('last-train/last-train.notice.png', 180, 120, 'contain', {'scale': 2}),
    'waiting-room-clock': ('last-train/last-train.waiting-room-clock.png', 90, 90, 'disc', {'scale': 3, 'at': (0.502, 0.445, 0.27), 'face': {'cx': 45, 'cy': 45, 'd': 62}}),
    'suitcase': ('last-train/last-train.suitcase.png', 170, 120, 'contain', {'align': 'bottom', 'scale': 2}),
    'newspaper': ('last-train/last-train.newspaper.png', 150, 60, 'contain', {'align': 'bottom', 'scale': 2}),
    'ticket': ('last-train/closeups/last-train.ticket.closeup.png', 150, 80, 'contain', {'scale': 2}),
    'departure-board': ('last-train/last-train.departure-board.png', 420, 200, 'contain', {'scale': 2}),
    'carriage-plan': ('last-train/last-train.carriage-plan.png', 120, 150, 'contain', {'scale': 2}),
    'carriage.props': ('last-train/last-train.carriage.props.png', 420, 300, 'contain', {'align': 'bottom'}),
    'ledger': ('last-train/closeups/last-train.ledger.closeup.png', 170, 110, 'contain', {'scale': 2}),
    'pocket-watch': ('last-train/closeups/last-train.pocket-watch.closeup.png', 160, 90, 'contain', {'scale': 2, 'face': {'cx': 72.8, 'cy': 53.3, 'd': 44}}),
    'seat-card': ('last-train/last-train.seat-card.png', 110, 70, 'contain', {'scale': 2}),
    'brake': ('last-train/last-train.brake.png', 140, 337, 'contain', {'scale': 2}),
    'lever-frame': ('last-train/last-train.lever-frame.png', 900, 360, 'contain', {'align': 'bottom'}),
    'lamp-room-door': ('last-train/last-train.lamp-room-door.png', 240, 440, 'contain', {'align': 'bottom'}),
}


def trim(im: Image.Image) -> Image.Image:
    """Crop to the visible pixels."""
    if im.mode != 'RGBA':
        return im
    box = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    return im.crop(box) if box else im


def cover(im, w, h):
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def contain(im, w, h, align='center', stretch=False):
    im = trim(im.convert('RGBA'))
    if stretch:
        # Tall or long thin things (a pole, a train) fill their box exactly.
        return im.resize((w, h), Image.LANCZOS), (0, 0, w, h)
    s = min(w / im.width, h / im.height)
    nw, nh = max(1, round(im.width * s)), max(1, round(im.height * s))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    x = (w - nw) // 2
    y = h - nh if align == 'bottom' else (h - nh) // 2
    canvas.alpha_composite(im, (x, y))
    return canvas, (x, y, nw, nh)


def fade_top(im, frac):
    im = im.convert('RGBA')
    a = np.array(im)
    n = int(im.height * frac)
    ramp = np.clip(np.linspace(0, 1, n) ** 1.6, 0, 1)
    a[:n, :, 3] = (a[:n, :, 3] * ramp[:, None]).astype(np.uint8)
    return Image.fromarray(a)


def tile(im, w, h):
    im = im.convert('RGB')
    s = h / im.height
    t = im.resize((round(im.width * s), h), Image.LANCZOS)
    out = Image.new('RGB', (w, h))
    x, i = 0, 0
    while x < w:
        out.paste(t if i % 2 == 0 else t.transpose(Image.FLIP_LEFT_RIGHT), (x, 0))
        x += t.width
        i += 1
    return out


def disc(im, w, h, at):
    """Cut the round clock out of an opaque square painting. `at` = (cx, cy, r) as fractions of the width, measured by eye."""
    im = im.convert('RGBA')
    cx, cy, r = at[0] * im.width, at[1] * im.width, at[2] * im.width
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    im.putalpha(mask.filter(ImageFilter.GaussianBlur(1.5)))
    im = im.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r)))
    return im.resize((w, h), Image.LANCZOS)


def face_of(im, box_w):
    """Centre and diameter of the light clock face, in box px."""
    a = np.array(im.convert('RGBA')).astype(float)
    lum = a[..., :3].mean(axis=2)
    light = (lum > 140) & (a[..., 3] > 200)
    lab, n = ndimage.label(ndimage.binary_closing(light, iterations=3))
    if n == 0:
        return None
    sizes = ndimage.sum(light, lab, range(n + 1))
    k = int(np.argmax(sizes[1:]) + 1)
    ys, xs = np.where(lab == k)
    scale = box_w / im.width
    d = ((xs.max() - xs.min()) + (ys.max() - ys.min())) / 2
    return {'cx': round(float((xs.min() + xs.max()) / 2 * scale), 1), 'cy': round(float((ys.min() + ys.max()) / 2 * scale), 1), 'd': round(float(d * scale), 1)}


def save(im, path_stem):
    has_alpha = im.mode == 'RGBA' and np.array(im.getchannel('A')).min() < 250
    if has_alpha:
        p = path_stem.parent / (path_stem.name + '.png')
        im.save(p, optimize=True)
    else:
        p = path_stem.parent / (path_stem.name + '.jpg')
        im.convert('RGB').save(p, quality=86, optimize=True, progressive=False)
    return p


def extras(src: Path):
    """Clue close-ups (shown on evidence cards) and speech-bubble portraits."""
    closeups = {
        'platform-clock': 'clock', 'company-notice': 'notice', 'waiting-room-clock': 'waiting-room-clock',
        'torn-ticket': 'ticket', 'departure-board': 'departure-board', 'carriage-plan': 'carriage-plan',
        'pocket-watch': 'pocket-watch', 'conductors-ledger': 'ledger', 'seat-eight-card': 'seat-card',
        'wired-brake': 'brake', 'blackwater-lever': 'lever-frame', 'lamp-room-door': 'lamp-room-door',
    }
    d = OUT / 'closeups'
    d.mkdir(exist_ok=True)
    for clue, name in closeups.items():
        im = trim(Image.open(src / f'last-train/closeups/last-train.{name}.closeup.png').convert('RGBA'))
        im.thumbnail((560, 400), Image.LANCZOS)
        im.save(d / f'{clue}.png', optimize=True)
        print(f'closeup {clue:20s} {im.size}')
    # Portraits: the head and shoulders of each expression, square.
    portraits = {
        'voss': ('last-train/characters/last-train.voss.neutral.png', 'last-train/characters/last-train.voss.revealing.png'),
        'driver': ('last-train/characters/last-train.driver.neutral.png', 'last-train/characters/last-train.driver.uneasy.png'),
        'signalman': ('last-train/characters/last-train.signalman.nervous.png', 'last-train/characters/last-train.signalman.worried.png'),
        'caldwell': ('last-train/characters/last-train.caldwell.neutral.png', 'last-train/characters/last-train.caldwell.shaken.png'),
        'detective': ('shared/shared.grace.neutral.png', 'shared/shared.grace.thinking.png'),
    }
    d = OUT / 'portraits'
    d.mkdir(exist_ok=True)
    for who, files in portraits.items():
        for mood, rel in zip(('calm', 'pressed'), files):
            im = trim(Image.open(src / rel).convert('RGBA'))
            a = np.array(im.getchannel('A')) > 40
            top = int(np.argmax(a.any(axis=1)))
            # Head: the opaque columns in the first 12% of the figure's height.
            band = a[top:top + max(8, int(im.height * 0.12))]
            cols = np.where(band.any(axis=0))[0]
            cx = int((cols.min() + cols.max()) / 2)
            # Grace's sources are half-length portraits; the others are full figures.
            side = int(im.height * (0.5 if who == 'detective' else 0.27))
            x0 = max(0, min(im.width - side, cx - side // 2)) if side <= im.width else cx - side // 2
            box = (x0, max(0, top - int(side * 0.06)), x0 + side, max(0, top - int(side * 0.06)) + side)
            sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            sq.alpha_composite(im.crop(box))
            sq = sq.resize((264, 264), Image.LANCZOS)
            sq.save(d / f'{who}.{mood}.png', optimize=True)
            print(f'portrait {who}.{mood}')


def main():
    src = Path(sys.argv[1])
    if '--extras' in sys.argv:
        extras(src)
        return
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    OUT.mkdir(parents=True, exist_ok=True)
    report_file = OUT / 'art-report.json'
    report = json.loads(report_file.read_text()) if report_file.exists() else {}
    for key, (rel, w, h, mode, o) in SPEC.items():
        if only and key not in only:
            continue
        im = Image.open(src / rel)
        k = o.get('scale', 1)
        W, H = w * k, h * k
        if mode == 'cover':
            out = cover(im.convert('RGB'), W, H)
            if o.get('fade'):
                out = fade_top(out, o['fade'])
        elif mode == 'band':
            im = im.convert('RGB')
            band = im.crop((0, int(im.height * o['from']), im.width, im.height))
            out = fade_top(tile(band, W, H), o['fade'])
        elif mode == 'tile':
            out = tile(im, W, H)
        elif mode == 'disc':
            out = disc(im, W, H, o['at'])
        else:
            out, _ = contain(im, W, H, o.get('align', 'center'), o.get('stretch', False))
        for ext in ('.png', '.jpg'):
            (OUT / (key + ext)).unlink(missing_ok=True)
        p = save(out, OUT / key)
        entry = {'file': p.name, 'px': list(out.size), 'kb': round(p.stat().st_size / 1024)}
        if o.get('face'):
            # Where the procedural hands go (box px). Measured by eye on the
            # painted dials; face_of() is the automatic first guess.
            entry['face'] = o['face'] if isinstance(o['face'], dict) else face_of(out, w)
        report[key] = entry
        print(f'{key:22s} {p.name:28s} {out.size[0]}x{out.size[1]} {entry["kb"]:>5} KB {entry.get("face", "")}')
    report_file.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
