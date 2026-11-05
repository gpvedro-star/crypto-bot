"""Original synthesized score: low-tension, a little bass, sections that follow the edit."""
import numpy as np

from sound import SR, _saw, fft_filter, norm, reverb, stereo

MIDI = lambda m: 440.0 * 2 ** ((m - 69) / 12)

PROGS = {
    "groove": [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])],   # Am F C G
    "tension": [(45, [57, 60, 64]), (45, [57, 60, 63]), (41, [56, 60, 65]), (40, [56, 59, 64])],  # Am Am(b) F E
    "warm": [(41, [57, 60, 64, 65]), (48, [55, 60, 64, 67])],                                     # Fmaj7 C
    "intro": [(45, [57, 59, 64])],                                                                 # Am(add9)
    "freeze": [(45, [57, 64])],
    "dark": [(33, [45, 46])],
}


def _env(n, a, d, s=0.0, r=0.05):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rr = int(r * SR)
    if rr and n > rr:
        e[-rr:] *= np.linspace(1, 0, rr)
    return e


def kick(gain=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 45 + 75 * np.exp(-t / 0.03)
    return gain * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def rim(rng, gain=1.0):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    x = fft_filter(rng.standard_normal(n), lo=900, hi=5000) * np.exp(-t / 0.025)
    x += 0.5 * np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.03)
    return gain * norm(x)


def hat(rng, gain=1.0):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return gain * norm(fft_filter(rng.standard_normal(n), lo=6500, hi=14000) * np.exp(-t / 0.012))


def bass_note(m, dur, gain=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = _saw(MIDI(m), t, 14) + 0.6 * np.sin(2 * np.pi * MIDI(m) * t)
    x = fft_filter(x, hi=380)
    return gain * norm(x) * _env(n, 0.006, 0.22, 0.45, 0.04)


def pluck(m, dur, gain=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = MIDI(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return gain * x * _env(n, 0.004, 0.35, 0.0, 0.05)


def pad(notes, dur, gain=1.0, bright=900):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in notes:
        for det in (-0.12, 0.0, 0.11):
            x += _saw(MIDI(m) * 2 ** (det / 12), t, 18)
    x = fft_filter(x, hi=bright)
    return gain * norm(x) * _env(n, min(0.6, dur / 3), 1e6, 1.0, min(0.5, dur / 3))


def _add(buf, i, x):
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


def section(style, t0, t1, grid0, bpm, seed=0):
    """Render one style for [t0, t1) on a beat grid starting at grid0. Returns stereo."""
    n = int((t1 - t0) * SR)
    L = np.zeros(n + SR * 3)
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    bar = beat * 4
    prog = PROGS.get(style)
    if style in ("groove", "tension"):
        k0 = int(np.floor((t0 - grid0) / (beat / 2))) - 1
        k1 = int(np.ceil((t1 - grid0) / (beat / 2))) + 1
        for k in range(k0, k1):
            tb = grid0 + k * beat / 2
            i = int((tb - t0) * SR)
            if i < -SR or tb >= t1:
                continue
            eighth = k % 8
            bar_i = int(np.floor((tb - grid0) / bar)) % len(prog)
            root, chord = prog[bar_i]
            if style == "groove":
                if eighth in (0, 5):
                    _add(L, i, kick(0.8))
                if eighth in (2, 6):
                    _add(L, i, rim(rng, 0.28))
                _add(L, i, hat(rng, 0.10 if k % 2 else 0.16))
                if eighth in (0, 3, 4, 7):
                    _add(L, i, bass_note(root + (12 if eighth == 7 else 0), beat * 0.9, 0.55))
                m = chord[[0, 1, 2, 1, 0, 2, 1, 2][eighth]] + 12
                _add(L, i, pluck(m, beat * 1.4, 0.16 * rng.uniform(0.8, 1)))
            else:
                if eighth % 2 == 0:
                    _add(L, i, kick(0.75))
                if eighth in (2, 6):
                    _add(L, i, rim(rng, 0.25))
                _add(L, i, hat(rng, 0.14))
                for s in (0, 1):
                    _add(L, i + int(s * beat / 4 * SR), bass_note(root, beat * 0.22, 0.5))
            if eighth == 0:
                _add(L, i, pad(chord, bar, 0.12 if style == "groove" else 0.16, 800))
    elif style in ("intro", "warm", "freeze", "dark"):
        chord_len = bar * (2 if style == "warm" else 4)
        k = 0
        t = t0
        while t < t1:
            root, chord = prog[k % len(prog)]
            d = min(chord_len, t1 - t) + 0.8
            i = int((t - t0) * SR)
            g = {"intro": 0.32, "warm": 0.26, "freeze": 0.22, "dark": 0.26}[style]
            br = {"intro": 700, "warm": 1100, "freeze": 600, "dark": 300}[style]
            _add(L, i, pad(chord, d, g, br))
            if style in ("intro", "dark"):
                _add(L, i, bass_note(root - (0 if style == "dark" else 12), d, 0.35) * 0.8)
            t += chord_len
            k += 1
    out = stereo(L[:n] if n > 0 else np.zeros(1))
    out = reverb(out, decay=1.8, wet=0.22)[:n]
    f = min(int(0.03 * SR), n // 4)
    if f > 0:
        out[:f] *= np.linspace(0, 1, f)[:, None]
        out[-f:] *= np.linspace(1, 0, f)[:, None]
    return out


def tapestop(x, i0, dur):
    """Slow the music to a halt starting at sample i0 (classic freeze-frame gag)."""
    n = int(dur * SR)
    tau = np.arange(n) / n
    pos = i0 + np.cumsum(1 - tau) * 1.0
    seg = np.stack([np.interp(pos, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
    seg *= np.linspace(1, 0.2, n)[:, None]
    x[i0:i0 + n] = seg[: len(x) - i0]
    x[i0 + n:] = 0


def score(total, sections, events, bpm=92):
    out = np.zeros((int(total * SR) + SR, 2))
    for k, s in enumerate(sections):
        if s["style"] == "none" or s["t1"] <= s["t0"]:
            continue
        seg = section(s["style"], s["t0"], s["t1"], s.get("grid0", s["t0"]), bpm, seed=k)
        if s.get("tapestop") is not None:  # slow this section to a halt (freeze-frame gag)
            tapestop(seg, int((s["tapestop"] - s["t0"]) * SR), s.get("tapestop_dur", 0.5))
        if s.get("highpass"):
            seg = fft_filter(seg, lo=s["highpass"], order=3)
        for key, ramp in (("fade_in", lambda n: np.linspace(0, 1, n)), ("fade_out", lambda n: np.linspace(1, 0, n))):
            n = min(int(s.get(key, 0) * SR), len(seg))
            if n > 1:
                if key == "fade_in":
                    seg[:n] *= ramp(n)[:, None]
                else:
                    seg[-n:] *= ramp(n)[:, None]
        i = int(s["t0"] * SR)
        out[i:i + len(seg)] += seg[: len(out) - i] * s.get("gain", 1.0)
    for e in sorted(events, key=lambda e: e["t"]):
        i = int(e["t"] * SR)
        if e["kind"] == "stop":
            j = int((e["t"] + e["dur"]) * SR)
            f = int(0.012 * SR)
            out[i - f:i] *= np.linspace(1, 0, f)[:, None]
            out[i:j] = 0
            out[j:j + f] *= np.linspace(0, 1, f)[:, None]
    return norm(out[: int(total * SR)], 1.0)
