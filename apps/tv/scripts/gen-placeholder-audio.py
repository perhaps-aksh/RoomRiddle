"""
Placeholder audio for RoomRiddle (Phase 7).

Synthesises every placeholder sound (ambience, music beds, effects, UI) with
numpy, encodes them with ffmpeg, and voices the detective's lines with
edge-tts. Writes the files to apps/tv/src/assets/audio/<pack>/ and the TV's
id -> require() map to apps/tv/src/audio/bundled.ts.

These are PLACEHOLDERS, labelled as such in the manifests. Final audio
replaces a file (same id, same name) without code changes.

Usage (Windows or Linux, from the repo root):
    python apps/tv/scripts/gen-placeholder-audio.py            # everything
    python apps/tv/scripts/gen-placeholder-audio.py --no-voice # skip TTS (offline)
Needs: python 3 + numpy, ffmpeg on PATH, edge-tts (pip) for the voice lines.
"""
import argparse
import asyncio
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'src', 'assets', 'audio')
MAP = os.path.join(ROOT, 'src', 'audio', 'bundled.ts')
SR = 32000
rng = np.random.default_rng(1147)  # fixed seed: regenerating gives the same files


# ── building blocks ────────────────────────────────────────────────────
def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def lowpass(x, hz):
    """Brick-ish lowpass in the frequency domain (circular, so loops stay seamless)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / hz) ** 4)
    return np.fft.irfft(X, len(x))


def highpass(x, hz):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / max(hz, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def brown(sec):
    b = np.cumsum(noise(sec))
    b -= np.linspace(b[0], b[-1], len(b))  # remove drift so the loop closes
    return highpass(b, 20)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def reverb(x, sec=1.8, mix=0.35, circular=True):
    n = int(sec * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * sec / 5))
    ir = lowpass(ir, 4000)
    ir /= np.sqrt(np.sum(ir ** 2))
    if circular:
        L = len(x)
        wet = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, L), L) if n <= L else x
    else:
        L = len(x) + n
        wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)
        x = np.pad(x, (0, n))
    return x * (1 - mix) + norm(wet, np.max(np.abs(x)) or 1) * mix


def env(sec, a=0.01, d=None, curve=4.0):
    """Attack then exponential decay over the whole length."""
    t = t_axis(sec)
    e = np.minimum(1, t / max(a, 1e-4))
    return e * np.exp(-curve * t / (d or sec))


def fade(x, fin=0.02, fout=0.05):
    n_in, n_out = int(fin * SR), int(fout * SR)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)
    return x


def tone(freq, sec, kind='sine', phase=0.0):
    t = t_axis(sec)
    p = 2 * np.pi * freq * t + phase
    if kind == 'sine':
        return np.sin(p)
    if kind == 'soft':  # warm: fundamental + a little 2nd/3rd
        return np.sin(p) + 0.3 * np.sin(2 * p) + 0.12 * np.sin(3 * p)
    if kind == 'bell':
        return np.sin(p) + 0.5 * np.sin(2.76 * p) + 0.25 * np.sin(5.4 * p)
    raise ValueError(kind)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def snap(freq, loop_sec):
    """Nearest frequency with a whole number of cycles in the loop (no click at the seam)."""
    return max(1, round(freq * loop_sec)) / loop_sec


def place(buf, x, at):
    i = int(at * SR)
    j = min(len(buf), i + len(x))
    if i < len(buf):
        buf[i:j] += x[: j - i]


def place_wrap(buf, x, at):
    """Add x at `at`, wrapping past the end (for loops)."""
    i = int(at * SR) % len(buf)
    for k in range(0, len(x), len(buf)):
        seg = x[k:k + len(buf)]
        first = min(len(seg), len(buf) - i)
        buf[i:i + first] += seg[:first]
        if first < len(seg):
            buf[: len(seg) - first] += seg[first:]


# ── ambience (seamless loops) ──────────────────────────────────────────
LOOP = 24.0


def amb_rain():
    x = highpass(lowpass(noise(LOOP), 5200), 500) * 0.5
    buf = np.zeros_like(x)
    for _ in range(900):  # drops
        d = highpass(noise(0.03), 2500) * env(0.03, 0.001, curve=8) * rng.uniform(0.2, 1.0)
        place_wrap(buf, d, rng.uniform(0, LOOP))
    t = t_axis(LOOP)
    swell = 0.8 + 0.2 * np.sin(2 * np.pi * (2 / LOOP) * t)
    return norm((x + buf * 0.6) * swell, 0.7)


def amb_rain_muffled():
    return norm(lowpass(amb_rain(), 700), 0.6)


def amb_wind():
    t = t_axis(LOOP)
    x = lowpass(brown(LOOP), 500)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * (3 / LOOP) * t) ** 2
    whistle = lowpass(highpass(noise(LOOP), 700), 1100) * 0.08 * gust
    return norm(x * gust + whistle, 0.6)


def amb_hum():
    t = t_axis(LOOP)
    f = snap(50, LOOP)
    x = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in [(1, 1), (2, 0.5), (3, 0.3), (4, 0.12)])
    buzz = highpass(noise(LOOP), 3000) * 0.02 * (0.5 + 0.5 * np.sin(2 * np.pi * f * 2 * t))
    wob = 0.85 + 0.15 * np.sin(2 * np.pi * (4 / LOOP) * t)
    return norm((x + buzz) * wob, 0.4)


def amb_station():
    """Distant station: low room tone with far-off metal and a faint tannoy-ish drone."""
    base = lowpass(brown(LOOP), 250) * 0.6
    buf = np.zeros(int(LOOP * SR))
    for at in (3.1, 9.7, 15.2, 20.4):  # distant clanks
        f = rng.uniform(500, 1100)
        c = (tone(f, 1.6, 'bell') * env(1.6, 0.002, curve=6)) * 0.15
        place_wrap(buf, lowpass(c, 1500), at)
    return norm(reverb(base + buf, 2.5, 0.5), 0.5)


def amb_railway():
    """Distant railway: slow rumble swells, a far whistle once per loop."""
    t = t_axis(LOOP)
    rum = lowpass(brown(LOOP), 120) * (0.6 + 0.4 * np.sin(2 * np.pi * (1 / LOOP) * t) ** 2)
    buf = np.zeros_like(rum)
    w = (tone(midi(76), 1.4) + 0.7 * tone(midi(79), 1.4)) * env(1.4, 0.15, curve=3) * 0.05
    place_wrap(buf, lowpass(w, 2000), 11.0)
    return norm(reverb(rum + buf, 3.0, 0.5), 0.55)


def amb_carriage():
    """A train standing at the platform: engine idle, a slow compressor pulse, creaks."""
    t = t_axis(LOOP)
    idle = lowpass(brown(LOOP), 90) * (0.8 + 0.2 * np.sin(2 * np.pi * snap(1.5, LOOP) * t))
    hum = 0.15 * np.sin(2 * np.pi * snap(60, LOOP) * t)
    buf = np.zeros_like(idle)
    for at in (2.0, 8.5, 13.0, 19.5):
        cr = lowpass(highpass(noise(0.5), 300), 1200) * env(0.5, 0.05, curve=5) * 0.15
        place_wrap(buf, cr, at)
    return norm(idle + hum + buf, 0.5)


# ── music beds (seamless loops, 4 chords × 8 s) ────────────────────────
MLOOP = 32.0


def pad(chords, sec_each, kind='soft', bright=1800, pulse=None, arp=None, bass=True, bell=None):
    total = sec_each * len(chords)
    out = np.zeros(int(total * SR))
    for i, ch in enumerate(chords):
        seg = np.zeros(int(sec_each * SR))
        for n in ch:
            seg += tone(midi(n), sec_each, kind, phase=rng.uniform(0, 6.28)) * 0.18
        if bass:
            seg += tone(midi(ch[0] - 12), sec_each, 'soft') * 0.25
        a = int(1.2 * SR)  # crossfade chords
        e = np.ones(len(seg))
        e[:a] = np.linspace(0, 1, a)
        e[-a:] = np.linspace(1, 0, a)
        place_wrap(out, np.concatenate([seg * e, np.zeros(0)]), i * sec_each - 0.6)
        if arp:
            step = arp
            for k in range(int(sec_each / step)):
                n = ch[k % len(ch)] + 12
                note = tone(midi(n), 0.9, 'bell') * env(0.9, 0.005, curve=7) * 0.08
                place_wrap(out, note, i * sec_each + k * step)
        if bell:
            note = tone(midi(ch[-1] + 12), 3.0, 'bell') * env(3.0, 0.01, curve=4) * 0.07
            place_wrap(out, note, i * sec_each + bell)
    t = t_axis(total)
    if pulse:  # soft low heartbeat
        beat = np.zeros_like(out)
        for k in range(int(total / pulse)):
            th = tone(55, 0.35) * env(0.35, 0.005, curve=9) * 0.35
            place_wrap(beat, th, k * pulse)
            place_wrap(beat, th * 0.6, k * pulse + 0.28)
        out += lowpass(beat, 200)
    out = lowpass(out, bright)
    out *= 0.9 + 0.1 * np.sin(2 * np.pi * (2 / total) * t)
    return norm(reverb(out, 3.0, 0.45), 0.6)


# MIDI chords: low register, minor and noir-ish.
def mus_menu():
    return pad([[50, 57, 60, 64], [46, 53, 57, 62], [43, 50, 53, 58], [45, 52, 57, 61]], 8, bright=1600, bell=2.0)


def mus_investigation():
    return pad([[45, 52, 55, 60], [41, 48, 52, 57], [38, 45, 48, 53], [40, 47, 52, 56]], 8, bright=1400, pulse=2.0)


def mus_puzzle():
    return pad([[45, 52, 57, 60], [43, 50, 55, 59], [41, 48, 53, 57], [40, 47, 52, 55]], 8, bright=2200, arp=0.5)


def mus_tension():
    return pad([[40, 46, 51, 55], [41, 47, 52, 56], [40, 46, 51, 55], [39, 45, 50, 54]], 8, bright=1300, pulse=1.0)


def mus_reveal():
    return pad([[38, 45, 50, 53], [41, 48, 53, 57], [43, 50, 55, 58], [45, 52, 57, 61]], 8, bright=2600, pulse=2.0, bell=1.0)


def mus_ending():
    return pad([[38, 45, 50, 54], [43, 50, 55, 59], [40, 47, 52, 55], [45, 52, 57, 61]], 8, bright=2000, bell=3.0)


# ── effects (one-shots) ────────────────────────────────────────────────
def sfx_train_approach():
    sec = 7.0
    t = t_axis(sec)
    swell = (t / sec) ** 2
    rum = lowpass(brown(sec), 160) * swell
    clack = np.zeros_like(rum)
    k = 0.0
    while k < sec:  # rail joints, speeding up as it nears
        c = highpass(noise(0.05), 800) * env(0.05, 0.001, curve=9) * (k / sec) * 0.6
        place(clack, lowpass(c, 2500), k)
        place(clack, lowpass(c, 2500) * 0.8, k + 0.12)
        k += 0.9 - 0.4 * (k / sec)
    whistle = (tone(midi(74), 1.6, 'soft') + 0.8 * tone(midi(78), 1.6, 'soft')) * env(1.6, 0.2, curve=2) * 0.15
    w = np.zeros_like(rum)
    place(w, lowpass(whistle, 2500), 0.4)
    return fade(norm(reverb(rum + clack + w, 2.0, 0.3, circular=False), 0.85), 0.3, 0.6)


def sfx_train_brake():
    sec = 3.2
    t = t_axis(sec)
    f = 2600 - 500 * (t / sec)
    squeal = np.sin(2 * np.pi * np.cumsum(f + 40 * np.sin(2 * np.pi * 7 * t)) / SR)
    squeal *= np.minimum(1, t / 0.3) * np.exp(-1.2 * t / sec) * 0.25
    grind = lowpass(highpass(noise(sec), 300), 3000) * np.exp(-1.5 * t / sec) * 0.35
    rum = lowpass(brown(sec), 120) * np.exp(-2 * t / sec)
    return fade(norm(squeal + grind + rum, 0.85), 0.05, 0.4)


def sfx_train_stop():
    sec = 1.6
    thud = lowpass(brown(sec), 140) * env(sec, 0.005, curve=7)
    clank = tone(180, sec, 'bell') * env(sec, 0.002, curve=10) * 0.4
    return norm(reverb(thud + clank, 1.2, 0.25, circular=False), 0.9)


def sfx_steam():
    sec = 2.4
    t = t_axis(sec)
    hiss = highpass(lowpass(noise(sec), 7000), 1500)
    e = np.minimum(1, t / 0.05) * np.exp(-2.2 * t / sec)
    return fade(norm(hiss * e, 0.7), 0.01, 0.3)


def sfx_doors():
    sec = 1.8
    t = t_axis(sec)
    hiss = highpass(noise(sec), 2000) * np.minimum(1, t / 0.02) * np.exp(-4 * t / sec) * 0.6
    slide = lowpass(brown(sec), 400) * np.clip((t - 0.15) / 0.2, 0, 1) * np.exp(-3 * np.clip(t - 0.35, 0, None)) * 0.6
    clunk = np.zeros_like(hiss)
    place(clunk, lowpass(brown(0.4), 300) * env(0.4, 0.003, curve=8), 1.05)
    return fade(norm(hiss + slide + clunk, 0.85), 0.005, 0.2)


def sfx_thunder():
    sec = 5.0
    t = t_axis(sec)
    crack = highpass(noise(sec), 1200) * np.exp(-30 * t) * 0.6
    roll = lowpass(brown(sec), 180) * np.minimum(1, t / 0.2) * np.exp(-1.0 * t)
    roll *= 0.7 + 0.3 * np.abs(np.sin(2 * np.pi * 1.3 * t))
    return fade(norm(reverb(crack + roll, 2.5, 0.4, circular=False), 0.9), 0.002, 0.8)


def sfx_clock():
    sec = 1.4
    out = np.zeros(int(sec * SR))
    for k, f in enumerate((3200, 2600, 3200)):
        place(out, highpass(noise(0.02), 1500) * env(0.02, 0.0005, curve=10), 0.05 + k * 0.5)
        place(out, tone(f, 0.04) * env(0.04, 0.0005, curve=12) * 0.3, 0.05 + k * 0.5)
    return norm(reverb(out, 0.6, 0.2, circular=False), 0.6)


def sfx_paper():
    sec = 0.7
    out = np.zeros(int(sec * SR))
    for k in range(7):
        b = highpass(lowpass(noise(0.06), 6000), 1200) * env(0.06, 0.003, curve=6) * rng.uniform(0.4, 1)
        place(out, b, k * 0.07 + rng.uniform(0, 0.03))
    return norm(out, 0.5)


def sfx_latch():
    sec = 0.35
    c1 = tone(1800, 0.05, 'bell') * env(0.05, 0.0005, curve=10)
    out = np.zeros(int(sec * SR))
    place(out, c1, 0.0)
    place(out, c1 * 0.8, 0.12)
    place(out, lowpass(brown(0.15), 400) * env(0.15, 0.002, curve=8) * 0.5, 0.12)
    return norm(out, 0.6)


def sfx_lever():
    sec = 1.2
    t = t_axis(sec)
    ratchet = np.zeros(int(sec * SR))
    for k in range(6):
        place(ratchet, highpass(noise(0.015), 2000) * env(0.015, 0.0005, curve=10) * 0.5, 0.05 + k * 0.06)
    clank = tone(140, sec, 'bell') * env(sec, 0.003, curve=7)
    out = ratchet
    place(out, clank, 0.45)
    return norm(reverb(out, 1.0, 0.25, circular=False), 0.8)


def chime(notes, gap=0.11, sec=1.6, vol=0.5, kind='bell'):
    out = np.zeros(int((sec + gap * len(notes)) * SR))
    for k, n in enumerate(notes):
        place(out, tone(midi(n), sec, kind) * env(sec, 0.004, curve=5), k * gap)
    return norm(reverb(out, 1.4, 0.3, circular=False), vol)


def sfx_discovery():
    return chime([69, 76, 81, 84], 0.09, 2.0, 0.6)


def sfx_unlock():
    return chime([64, 71, 76], 0.14, 1.8, 0.55)


def ui_click(freq, sec=0.06, vol=0.3):
    x = tone(freq, sec) * env(sec, 0.001, curve=12) + highpass(noise(sec), 3000) * env(sec, 0.0005, curve=20) * 0.2
    return norm(x, vol)


def ui_focus():
    return ui_click(1900, 0.04, 0.18)


def ui_select():
    return ui_click(1300, 0.08, 0.35)


def ui_back():
    return ui_click(800, 0.08, 0.3)


def ui_success():
    return chime([72, 79], 0.1, 1.0, 0.5)


def ui_failure():
    return chime([55, 51], 0.16, 0.9, 0.45, kind='soft')


def ui_hint():
    return chime([79, 83, 86], 0.06, 1.0, 0.35)


def ui_joined():
    return chime([67, 74], 0.08, 0.6, 0.4)


def ui_left():
    return chime([74, 67], 0.08, 0.6, 0.35)


def ui_error():
    sec = 0.35
    t = t_axis(sec)
    x = np.sign(np.sin(2 * np.pi * 140 * t)) * env(sec, 0.005, curve=4) * 0.3
    return norm(lowpass(x, 1500), 0.4)


def ui_transition():
    sec = 0.7
    t = t_axis(sec)
    x = lowpass(noise(sec), 600 + 2400 * np.sin(np.pi * t / sec).mean()) * np.sin(np.pi * t / sec) ** 2
    return norm(x, 0.3)


# ── catalogue: (pack, file, fn) ────────────────────────────────────────
SOUNDS = [
    ('last-train', 'ambient-rain', amb_rain),
    ('last-train', 'ambient-rain-muffled', amb_rain_muffled),
    ('last-train', 'ambient-wind', amb_wind),
    ('last-train', 'ambient-hum', amb_hum),
    ('last-train', 'ambient-station', amb_station),
    ('last-train', 'ambient-railway', amb_railway),
    ('last-train', 'ambient-carriage', amb_carriage),
    ('last-train', 'music-investigation', mus_investigation),
    ('last-train', 'music-tension', mus_tension),
    ('last-train', 'music-reveal', mus_reveal),
    ('last-train', 'sfx-train-approach', sfx_train_approach),
    ('last-train', 'sfx-train-brake', sfx_train_brake),
    ('last-train', 'sfx-train-stop', sfx_train_stop),
    ('last-train', 'sfx-steam', sfx_steam),
    ('last-train', 'sfx-doors', sfx_doors),
    ('last-train', 'sfx-thunder', sfx_thunder),
    ('last-train', 'sfx-clock', sfx_clock),
    ('last-train', 'sfx-paper', sfx_paper),
    ('last-train', 'sfx-latch', sfx_latch),
    ('last-train', 'sfx-lever', sfx_lever),
    ('core', 'music-menu', mus_menu),
    ('core', 'music-puzzle', mus_puzzle),
    ('core', 'music-ending', mus_ending),
    ('core', 'sfx-discovery', sfx_discovery),
    ('core', 'sfx-unlock', sfx_unlock),
    ('core', 'ui-focus', ui_focus),
    ('core', 'ui-select', ui_select),
    ('core', 'ui-back', ui_back),
    ('core', 'ui-success', ui_success),
    ('core', 'ui-failure', ui_failure),
    ('core', 'ui-hint', ui_hint),
    ('core', 'ui-joined', ui_joined),
    ('core', 'ui-left', ui_left),
    ('core', 'ui-error', ui_error),
    ('core', 'ui-transition', ui_transition),
]

# Detective lines (text must match packages/mystery-data dialogue; checked by a TV test).
VOICE = 'en-GB-RyanNeural'
LINES = {
    'arrival-1': 'The Northern Star. Held at Harrow Cross, and nobody will say why.',
    'arrival-2': 'The conductor was last seen on this platform. We start out there.',
    'react-clock': 'Stopped dead when the lightning hit. Eleven fifty-nine, if this clock can be trusted.',
    'react-notice': 'Twelve minutes fast. The tower has been lying to everyone on this platform.',
    'react-station-puzzle': 'Now we can work out when it really happened.',
    'train-1': 'Every blind drawn. Someone aboard knows where Caldwell went.',
    'react-ticket': 'His punch, his initials. Torn in a hurry.',
    'carriage-1': 'Compartment seven. The window is open to the storm.',
    'react-brake': "Wired shut. Somebody didn't want this train stopping.",
    'signal-1': 'Two minutes to midnight. Whatever happens next happens here.',
}


def encode(samples, path, kbps):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = (np.clip(samples, -1, 1) * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', path], check=True)
    os.remove(tmp)


async def voice_lines(names):
    import edge_tts

    for name in names:
        path = os.path.join(OUT, 'last-train', f'vo-{name}.mp3')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        await edge_tts.Communicate(LINES[name], VOICE, rate='-6%', pitch='-4Hz').save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-voice', action='store_true')
    ap.add_argument('--only', nargs='*', help='file names to (re)generate')
    a = ap.parse_args()
    for pack, name, fn in SOUNDS:
        if a.only and name not in a.only:
            continue
        kbps = 80 if name.startswith('music') else 64
        encode(fn(), os.path.join(OUT, pack, f'{name}.mp3'), kbps)
        print('wrote', pack, name)
    if not a.no_voice:
        names = [n for n in LINES if not a.only or f'vo-{n}' in a.only]
        asyncio.run(voice_lines(names))
        print('voiced', len(names), 'lines')
    # The TV's bundle map: every file that exists, keyed by its manifest id.
    rows = []
    for pack in sorted(os.listdir(OUT)):
        for f in sorted(os.listdir(os.path.join(OUT, pack))):
            if f.endswith('.mp3'):
                stem = f[:-4]
                kind, _, rest = stem.partition('-')
                channel = {'ambient': 'ambient', 'music': 'music', 'sfx': 'sfx', 'ui': 'ui', 'vo': 'vo'}[kind]
                rows.append(f"  '{pack}.{channel}.{rest}': require('../assets/audio/{pack}/{f}'),")
    with open(MAP, 'w', encoding='utf-8', newline='\n') as m:
        m.write('/**\n * GENERATED by apps/tv/scripts/gen-placeholder-audio.py: every bundled sound file by\n'
                ' * manifest id. Final audio: replace the file (same name) and set the manifest\n'
                " * entry's status to 'final'. Nothing else changes.\n */\n"
                'export const bundledAudio: Readonly<Record<string, number>> = {\n' + '\n'.join(rows) + '\n};\n')
    print('map', len(rows), 'sounds ->', os.path.relpath(MAP))


if __name__ == '__main__':
    sys.exit(main())
