"""Foley / sound effects, all synthesized (no licensing issues)."""
import numpy as np

from sound import SR, _saw, _sine_sweep, _t, fft_filter, norm, reverb, stereo


def _rng(seed):
    return np.random.default_rng(seed)


def engine(d=7.0, rev_from=None, rev_len=1.0, seed=1):
    """Low V12 cruise rumble; optional rev up at the end (into a cut)."""
    t = _t(d)
    rng = _rng(seed)
    f0 = np.full(len(t), 62.0) + 1.5 * np.sin(2 * np.pi * 0.37 * t) + 0.8 * np.sin(2 * np.pi * 1.3 * t)
    g = np.ones(len(t)) * 0.6
    if rev_from is not None:
        p = np.clip((t - rev_from) / rev_len, 0, 1)
        f0 = f0 * (1 + 1.1 * p ** 1.6)
        g = g * (1 + 1.2 * p ** 1.2)
    phase = 2 * np.pi * np.cumsum(f0) / SR
    x = np.zeros(len(t))
    for k in range(1, 26):
        amp = 1 / k ** 0.75 * (1.4 if k % 6 == 0 else 1.0) * (1.5 if k == 3 else 1.0)
        x += amp * np.sin(k * phase + rng.uniform(0, 6.28))
    rough = 1 + 0.25 * fft_filter(rng.standard_normal(len(t)), hi=40)
    x = x * rough
    x = fft_filter(x, lo=30, hi=1600)
    rumble = fft_filter(rng.standard_normal(len(t)), lo=25, hi=220)
    y = norm(x) * 0.85 + norm(rumble) * 0.35
    y = np.tanh(1.8 * y) * g
    fade = int(0.4 * SR)
    y[:fade] *= np.linspace(0, 1, fade)
    return stereo(norm(y, 1.0))


def freewheel(d=2.2, seed=2):
    """Bicycle freewheel ticking + tyre roll."""
    rng = _rng(seed)
    out = np.zeros(int(d * SR))
    t, k = 0.0, 0
    while t < d - 0.02:
        rate = 24 - 12 * (t / d)
        n = int(0.012 * SR)
        tt = np.arange(n) / SR
        f = rng.uniform(2600, 3300)
        click = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.0025) + 0.4 * rng.standard_normal(n) * np.exp(-tt / 0.0012)
        i = int(t * SR)
        out[i:i + n] += click[: len(out) - i] * rng.uniform(0.6, 1.0) * (1 - 0.5 * t / d)
        t += 1 / rate
        k += 1
    roll = fft_filter(rng.standard_normal(len(out)), lo=60, hi=700) * np.linspace(1, 0.3, len(out))
    y = norm(fft_filter(out, lo=1200)) * 0.7 + norm(roll) * 0.35
    return stereo(norm(y, 1.0), pan=0.15)


def rustle(d=1.2, seed=3):
    rng = _rng(seed)
    n = int(d * SR)
    out = np.zeros(n)
    for _ in range(int(d * 45)):
        L = int(rng.uniform(0.01, 0.06) * SR)
        i = int(rng.uniform(0, n - L))
        out[i:i + L] += rng.standard_normal(L) * np.hanning(L) * rng.uniform(0.2, 1)
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7
    return stereo(norm(fft_filter(out * env, lo=1800, hi=8000), 1.0))


def crinkle(d=0.7, seed=4):
    rng = _rng(seed)
    n = int(d * SR)
    out = np.zeros(n)
    for _ in range(int(d * 140)):
        L = int(rng.uniform(0.001, 0.006) * SR)
        i = int(rng.uniform(0, n - L))
        out[i:i + L] += rng.standard_normal(L) * rng.uniform(0.1, 1) ** 2
    env = np.exp(-np.linspace(0, 3, n)) * (1 - np.exp(-np.linspace(0, 40, n)))
    return stereo(norm(fft_filter(out * env, lo=2500, hi=11000), 1.0), pan=-0.1)


def creak(d=1.1, seed=5):
    """Old door hinge creak."""
    rng = _rng(seed)
    t = _t(d)
    rate = 55 + 35 * np.sin(np.pi * t / d) + 12 * np.sin(2 * np.pi * 3.1 * t)
    ph = np.cumsum(rate) / SR
    pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float)
    pulses *= rng.uniform(0.6, 1.0, len(t))
    y = np.zeros(len(t))
    for f, bw, a in [(620, 60, 1.0), (1350, 90, 0.7), (2400, 140, 0.4)]:
        n = int(0.03 * SR)
        tt = np.arange(n) / SR
        ir = np.sin(2 * np.pi * f * tt) * np.exp(-np.pi * bw * tt)
        y += a * np.convolve(pulses, ir)[: len(t)]
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6
    return stereo(norm(reverb(norm(y * env), decay=0.8, wet=0.25), 1.0))


def step(heavy=False, seed=0):
    rng = _rng(seed)
    if heavy:
        t = _t(0.35)
        thump = _sine_sweep(55 + 70 * np.exp(-t / 0.02)) * np.exp(-t / 0.07)
        grit = fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.03), lo=80, hi=1500)
        y = norm(thump) + 0.5 * norm(grit)
    else:
        t = _t(0.12)
        y = fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.018), lo=400, hi=5000)
        y += 0.3 * np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.02)
    return norm(y, 1.0)


def footsteps(d, rate, heavy=False, grow=False, seed=0, pan=0.0):
    rng = _rng(seed)
    out = np.zeros(int(d * SR) + SR)
    t, k = 0.0, 0
    while t < d:
        s = step(heavy, seed * 100 + k)
        amp = (0.25 + 0.75 * (t / d) ** 1.3) if grow else rng.uniform(0.7, 1.0)
        i = int(t * SR)
        out[i:i + len(s)] += s[: len(out) - i] * amp
        t += (1 / rate) * rng.uniform(0.92, 1.08)
        k += 1
    y = out[: int(d * SR)]
    if heavy:
        y = reverb(y, decay=0.9, wet=0.3)
        return norm(y, 1.0)
    return stereo(norm(y, 1.0), pan=pan)


def shutter():
    rng = _rng(7)
    t = _t(0.12)
    c = lambda d0: (t >= d0) * rng.standard_normal(len(t)) * np.exp(-np.maximum(t - d0, 0) / 0.004)
    y = fft_filter(c(0) + 0.7 * c(0.045), lo=1500, hi=9000)
    return stereo(norm(y, 1.0))


def drip(seed=0):
    rng = _rng(seed)
    t = _t(0.25)
    f = 700 * rng.uniform(0.85, 1.2) * (1 + 1.4 * (1 - np.exp(-t / 0.012)))
    y = _sine_sweep(f) * np.exp(-t / 0.035)
    return norm(reverb(y, decay=1.6, wet=0.5), 1.0)


def room_tone(d, seed=9):
    rng = _rng(seed)
    y = fft_filter(np.cumsum(rng.standard_normal(int(d * SR))), lo=30, hi=260)
    y = norm(y) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * _t(d)))
    return stereo(norm(y, 1.0))


def lighter(seed=11):
    rng = _rng(seed)
    t = _t(0.9)
    flick = fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.006), lo=2000, hi=10000)
    whoosh = fft_filter(rng.standard_normal(len(t)), lo=300, hi=2500) * (1 - np.exp(-t / 0.03)) * np.exp(-t / 0.35)
    return stereo(norm(norm(flick) + 0.55 * norm(whoosh), 1.0))


def bubbles(d=2.0, seed=12):
    rng = _rng(seed)
    n = int(d * SR)
    out = np.zeros(n)
    for _ in range(int(d * 22)):
        L = int(rng.uniform(0.015, 0.045) * SR)
        tt = np.arange(L) / SR
        f0 = rng.uniform(250, 520)
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.2 * tt / tt[-1])) / SR) * np.exp(-tt / (L / SR / 3))
        i = int(rng.uniform(0, n - L))
        out[i:i + L] += b * rng.uniform(0.3, 1)
    env = np.clip(np.linspace(0, 4, n), 0, 1) * np.clip(np.linspace(4, 0, n), 0, 1)
    return stereo(norm(fft_filter(out * env, lo=150, hi=2500), 1.0))


def soft_tick(seed=0):
    rng = _rng(seed)
    t = _t(0.08)
    y = np.sin(2 * np.pi * rng.uniform(1100, 1300) * t) * np.exp(-t / 0.01)
    return stereo(norm(fft_filter(y, lo=500), 1.0))


def low_boom(d=2.2):
    t = _t(d)
    y = _sine_sweep(38 + 40 * np.exp(-t / 0.05)) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.6)
    return norm(reverb(y, decay=2.0, wet=0.3), 1.0)
