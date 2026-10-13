#!/usr/bin/env python3
"""
Offline preview of a world set, drawn like the TV's Stage: depth planes
(translate = -camera x depth, zoom about the screen centre), the same
back-to-front order, the train at its state's position and light pools.
Iterating placement here takes seconds instead of a device rebuild; the
device remains the final check.

Usage:
  npx tsx apps/server/scripts/dump-world.ts > world.json
  python preview.py world.json <set-id|all> [--cam x,y,zoom] [--boxes] [--out dir]
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[4]
ART = REPO / 'apps/tv/src/assets/mysteries/the-last-train'
LAYERS = ['far', 'background', 'midground', 'interactive', 'character', 'foreground', 'effects']
W, H = 1920, 1080


def load(asset):
    if not asset['source']:
        return None
    return Image.open(ART / asset['source']).convert('RGBA')


def render(world, set_, cam, boxes=False, train_state=None):
    out = Image.new('RGBA', (W, H), (8, 10, 14, 255))
    assets = world['assets']
    nodes = [n for n in set_['nodes'] if n['assetId'] != world['train']['assetId']]
    nodes.sort(key=lambda n: (LAYERS.index(n['layer']), n['z']))
    train = world['train']
    tstate = train_state or (set_['train'] or {}).get('state')
    drawn_train = False

    def to_screen(x, y, depth):
        z = 1 + (cam[2] - 1) * depth
        sx = (x - cam[0] * depth - W / 2) * z + W / 2
        sy = (y - cam[1] * depth - H / 2) * z + H / 2
        return sx, sy, z

    def paste(asset_id, x, y, w, h, depth, opacity=1.0):
        a = assets[asset_id]
        im = load(a)
        sx, sy, z = to_screen(x, y, depth)
        if im is None:
            d = ImageDraw.Draw(out)
            d.rectangle((sx, sy, sx + w * z, sy + h * z), outline=(255, 0, 255), width=2)
            return
        im = im.resize((max(1, round(w * z)), max(1, round(h * z))))
        if opacity < 1:
            im.putalpha(im.getchannel('A').point(lambda v: int(v * opacity)))
        out.alpha_composite(im, (round(sx), round(sy))) if sx > -10000 else None
        ov = a.get('overlay') or []
        if ov:
            d = ImageDraw.Draw(out)
            k = w / a['size']['width'] * z
            for s in ov:
                if s.get('role', '').startswith('hand'):
                    import math
                    px_, py_ = s['pivot']['x'], s['pivot']['y']
                    ang = math.radians(s.get('rotate', 0))
                    ln = s['h'] - (s['h'] - (py_ - s['y']))
                    ex = px_ + (py_ - s['y']) * math.sin(ang)
                    ey = py_ - (py_ - s['y']) * math.cos(ang)
                    d.line((sx + px_ * k, sy + py_ * k, sx + ex * k, sy + ey * k), fill=(15, 12, 10), width=max(1, round(s['w'] * k)))

    def draw_train():
        if not set_['train'] or not tstate:
            return
        a = assets[train['assetId']]
        x = train['positions'][tstate]
        paste(train['assetId'], x, set_['train']['y'], a['size']['width'], a['size']['height'], train['depth'])

    for n in nodes:
        if not drawn_train and set_['train'] and (LAYERS.index(n['layer']) > LAYERS.index('midground') or (n['layer'] == 'midground' and n['z'] > 0)):
            draw_train()
            drawn_train = True
        if not n['visible']:
            if boxes:
                sx, sy, z = to_screen(n['x'], n['y'], n['depth'])
                ImageDraw.Draw(out).rectangle((sx, sy, sx + n['width'] * z, sy + n['height'] * z), outline=(0, 255, 255), width=2)
            continue
        paste(n['assetId'], n['x'], n['y'], n['width'], n['height'], n['depth'], n['opacity'])
    if not drawn_train:
        draw_train()
    # Lights
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for n in nodes:
        light = assets[n['assetId']].get('light')
        if not light:
            continue
        kx = n['width'] / assets[n['assetId']]['size']['width']
        sx, sy, z = to_screen(n['x'] + light['x'] * kx, n['y'] + light['y'] * kx, n['depth'])
        r = light['radius'] * z
        gd.ellipse((sx - r, sy - r, sx + r, sy + r), outline=(255, 200, 80, 255), width=3)
        gd.line((sx - 8, sy, sx + 8, sy), fill=(255, 0, 0, 255), width=3)
        gd.line((sx, sy - 8, sx, sy + 8), fill=(255, 0, 0, 255), width=3)
    out.alpha_composite(glow)
    if boxes:
        d = ImageDraw.Draw(out)
        ids = {o['nodeId']: o['name'] for o in set_['objects']}
        for n in nodes:
            if n['id'] in ids:
                sx, sy, z = to_screen(n['x'], n['y'], n['depth'])
                d.rectangle((sx, sy, sx + n['width'] * z, sy + n['height'] * z), outline=(0, 255, 0), width=2)
                d.text((sx + 3, sy + 3), ids[n['id']], fill=(0, 255, 0))
    return out.convert('RGB')


def main():
    world = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
    which = sys.argv[2]
    boxes = '--boxes' in sys.argv
    outdir = Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else Path('.')
    outdir.mkdir(parents=True, exist_ok=True)
    for s in world['sets']:
        if which not in ('all', s['id']):
            continue
        cam = [s['camera']['x'], s['camera']['y'], s['camera']['zoom']]
        if '--cam' in sys.argv:
            cam = [float(v) for v in sys.argv[sys.argv.index('--cam') + 1].split(',')]
        img = render(world, s, cam, boxes)
        p = outdir / f'preview-{s["id"]}.jpg'
        img.save(p, quality=85)
        print(p)


if __name__ == '__main__':
    main()
