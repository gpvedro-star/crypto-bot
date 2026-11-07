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


def logo_hit(d=3.4):
    """Low musical hit for the series logo (A minor, matches the score)."""
    t = _t(d)
    rng = _rng(21)
    sub = _sine_sweep(55 + 32 * np.exp(-t / 0.04)) * (1 - np.exp(-t / 0.003)) * np.exp(-t / 0.95)
    chord = sum(a * _saw(f, t, 20) for f, a in [(55.0, 1.0), (82.41, 0.6), (110.0, 0.45), (130.81, 0.22)])
    chord = fft_filter(chord, hi=420) * (1 - np.exp(-t / 0.01)) * np.exp(-t / 1.15)
    click = fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.01), lo=200, hi=3000)
    y = norm(sub) + 0.55 * norm(chord) + 0.12 * norm(click)
    return norm(reverb(np.tanh(1.3 * y), decay=2.4, wet=0.35), 1.0)


def street(d, seed=31):
    """Daytime street: traffic rumble, distant voices, a car passing now and then."""
    rng = _rng(seed)
    n = int(d * SR)
    t = _t(d)
    traffic = norm(fft_filter(np.cumsum(rng.standard_normal(n)), lo=40, hi=380)) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t))
    syl = np.clip(fft_filter(rng.standard_normal(n), hi=5), 0, None)
    voices = norm(fft_filter(rng.standard_normal(n), lo=350, hi=2200)) * norm(syl)
    cars = np.zeros(n)
    tt = rng.uniform(0.5, 3.0)
    while tt < d - 1:
        L = int(2.6 * SR)
        i = int(tt * SR)
        car = fft_filter(rng.standard_normal(L), lo=120, hi=1400) * np.hanning(L) ** 1.5
        cars[i:i + L] += car[: n - i] * rng.uniform(0.5, 1.0)
        tt += rng.uniform(3.5, 7.0)
    y = 0.6 * traffic + 0.22 * voices + 0.45 * norm(cars)
    return stereo(norm(y, 1.0))


def waves(d, seed=32):
    """Mediterranean surf + sea wind, stereo."""
    t = _t(d)
    out = []
    for ch in range(2):
        rng = _rng(seed + ch)
        surf = fft_filter(rng.standard_normal(len(t)), lo=70, hi=1700)
        ph = rng.uniform(0, 6.28)
        swell = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 6.8 + ph)) ** 2.2
        wash = fft_filter(rng.standard_normal(len(t)), lo=1500, hi=6000) * swell ** 3 * 0.35
        wind = fft_filter(rng.standard_normal(len(t)), lo=250, hi=1100) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * t + ph))
        out.append(norm(surf * swell) + norm(wash) * 0.4 + norm(wind) * 0.35)
    return norm(np.stack(out, 1), 1.0)


def breath(d, rate=1.7, seed=33):
    """Out-of-breath panting after a run."""
    rng = _rng(seed)
    n = int(d * SR)
    out = np.zeros(n)
    tt = 0.0
    while tt < d:
        for kind, L, g in (("in", 0.22, 0.6), ("out", 0.3, 1.0)):
            m = int(L * SR)
            env = np.sin(np.pi * np.linspace(0, 1, m)) ** 1.5
            x = fft_filter(rng.standard_normal(m), lo=500 if kind == "in" else 300, hi=3200 if kind == "in" else 2400)
            i = int(tt * SR)
            if i < n:
                seg = (x * env * g)[: n - i]
                out[i:i + len(seg)] += seg
            tt += L + 0.03
        tt += max(0.0, 1 / rate - 0.58) * rng.uniform(0.8, 1.2)
    return stereo(norm(out, 1.0))


def clink():
    """Glass bottle clink."""
    t = _t(0.9)
    y = np.zeros(len(t))
    for d0, amp in ((0.0, 1.0), (0.075, 0.45)):
        tt = np.maximum(t - d0, 0)
        on = (t >= d0).astype(float)
        for f, dec, a in ((2650, 0.32, 1.0), (4130, 0.22, 0.6), (5920, 0.14, 0.4), (7810, 0.09, 0.25)):
            y += on * amp * a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / dec)
    return stereo(norm(reverb(y, decay=0.7, wet=0.18), 1.0), pan=0.1)


def clock_click():
    t = _t(0.12)
    rng = _rng(41)
    y = fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.0015), lo=1500, hi=9000)
    y += 0.5 * np.sin(2 * np.pi * 1850 * t) * np.exp(-t / 0.012)
    return stereo(norm(y, 1.0))


def handle():
    """Door handle pressed down + latch release, quietly."""
    t = _t(0.7)
    rng = _rng(42)
    y = np.zeros(len(t))
    for d0, amp, f in ((0.0, 0.7, 2300), (0.16, 1.0, 3100), (0.42, 0.5, 1700)):
        tt = np.maximum(t - d0, 0)
        on = (t >= d0).astype(float)
        y += on * amp * (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.018) + 0.5 * rng.standard_normal(len(t)) * np.exp(-tt / 0.004))
    y += 0.4 * np.sin(2 * np.pi * 110 * t) * np.exp(-np.maximum(t - 0.16, 0) / 0.05) * (t >= 0.16)
    return stereo(norm(reverb(fft_filter(y, lo=90), decay=0.6, wet=0.2), 1.0))


def scooter_start():
    """Small two-stroke delivery scooter: kick/starter, then idle."""
    t = _t(2.6)
    rng = _rng(51)
    starter = np.sin(2 * np.pi * np.cumsum(170 + 90 * (t / 0.45)) / SR) * (t < 0.45) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
    f0 = np.where(t < 0.5, 30, 46 + 14 * np.exp(-(t - 0.5) / 0.35))
    ph = np.cumsum(f0) / SR
    pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float)
    n = int(0.02 * SR)
    tt = np.arange(n) / SR
    pop = np.exp(-tt / 0.006) * np.sin(2 * np.pi * 140 * tt)
    idle = np.convolve(pulses, pop)[: len(t)] + 0.35 * fft_filter(rng.standard_normal(len(t)), lo=200, hi=2500) * pulses.cumsum().clip(0, 1)
    idle = fft_filter(idle, lo=40, hi=3000) * (t > 0.42)
    env = np.clip((2.6 - t) / 0.8, 0, 1)
    y = 0.5 * norm(fft_filter(starter, hi=1500)) + norm(idle)
    return stereo(norm(np.tanh(1.5 * y) * env, 1.0), pan=-0.1)


def register():
    """Mechanical cash register: key, bell, drawer slides out, coins."""
    t = _t(1.1)
    rng = _rng(52)
    y = np.zeros(len(t))
    def at(d0):
        tt = np.maximum(t - d0, 0)
        return tt, (t >= d0).astype(float)
    tt, on = at(0.0)
    y += on * fft_filter(rng.standard_normal(len(t)) * np.exp(-tt / 0.004), lo=800, hi=6000) * 0.5
    tt, on = at(0.08)
    y += on * (np.sin(2 * np.pi * 2093 * tt) + 0.5 * np.sin(2 * np.pi * 4186 * tt) + 0.25 * np.sin(2 * np.pi * 5274 * tt)) * np.exp(-tt / 0.35)
    tt, on = at(0.12)
    slide = fft_filter(rng.standard_normal(len(t)), lo=300, hi=2500) * on * np.exp(-tt / 0.12) * (tt < 0.3)
    y += 0.5 * slide
    for d0 in (0.32, 0.36, 0.41, 0.47):
        tt, on = at(d0)
        y += 0.25 * on * np.sin(2 * np.pi * rng.uniform(3500, 6000) * tt) * np.exp(-tt / 0.03)
    return stereo(norm(reverb(y, decay=0.5, wet=0.15), 1.0), pan=0.15)


def clank():
    """Muffled metallic knock from the dark side of the room."""
    t = _t(1.6)
    rng = _rng(53)
    y = np.zeros(len(t))
    for f, dec, a in ((310, 0.25, 1.0), (743, 0.18, 0.6), (1290, 0.12, 0.35), (2110, 0.08, 0.2)):
        y += a * np.sin(2 * np.pi * f * t) * np.exp(-t / dec)
    y += 0.6 * fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.01), lo=100, hi=2000)
    y = fft_filter(y, hi=1400)
    return stereo(norm(reverb(y, decay=1.6, wet=0.45), 1.0), pan=0.35)


def keys():
    """Car keys jingle."""
    t = _t(0.8)
    rng = _rng(54)
    y = np.zeros(len(t))
    for _ in range(14):
        d0 = rng.uniform(0, 0.45)
        tt = np.maximum(t - d0, 0)
        on = (t >= d0).astype(float)
        for f in (rng.uniform(3000, 4200), rng.uniform(5200, 7400)):
            y += on * rng.uniform(0.2, 1.0) * np.sin(2 * np.pi * f * tt) * np.exp(-tt / rng.uniform(0.02, 0.07))
    return stereo(norm(fft_filter(y, lo=1500), 1.0), pan=0.2)


def ringtone(reps=2):
    """Generic keypad-phone ringtone (original arpeggio), through a tiny speaker."""
    notes = [81, 88, 81, 88, 85, 88, 93]
    nd, gap = 0.085, 0.025
    out = []
    for _ in range(reps):
        for m in notes:
            t = _t(nd)
            f = 440 * 2 ** ((m - 69) / 12)
            sq = 0.6 * np.sign(np.sin(2 * np.pi * f * t)) + 0.4 * np.sign(np.sin(4 * np.pi * f * t))
            env = np.minimum(1, t / 0.004) * np.minimum(1, (nd - t) / 0.01)
            out += [sq * env, np.zeros(int(gap * SR))]
        out.append(np.zeros(int(0.32 * SR)))
    y = fft_filter(np.concatenate(out), lo=500, hi=4200)
    return stereo(norm(reverb(y, decay=0.4, wet=0.12), 1.0), pan=0.1)


def crowd(d, muffled=False, seed=61):
    """Friends talking and laughing around a table (or heard through a wall when muffled)."""
    rng = _rng(seed)
    n = int(d * SR)
    out = np.zeros(n)
    for _ in range(7):
        f1, f2 = rng.uniform(450, 800), rng.uniform(1100, 1900)
        voice = fft_filter(rng.standard_normal(n), lo=f1 * 0.6, hi=f2 * 1.3)
        syl = np.clip(fft_filter(rng.standard_normal(n), hi=rng.uniform(3, 6)), 0, None)
        turn = np.clip(fft_filter(rng.standard_normal(n), hi=0.3), 0, None)
        out += norm(voice) * norm(syl) * (0.3 + norm(turn))
    for _ in range(max(1, int(d / 4))):
        i = int(rng.uniform(0, max(0.1, d - 1.5)) * SR)
        L, f0 = int(rng.integers(4, 7)), rng.uniform(170, 260)
        for j in range(L):
            m = int(0.09 * SR)
            tt = np.arange(m) / SR
            burst = fft_filter(_saw(np.full(m, f0 * (1 - 0.04 * j)), tt, 20) * np.sin(np.pi * tt / tt[-1]) ** 2, lo=300, hi=2500)
            s0 = i + int(j * 0.15 * SR)
            if s0 + m < n:
                out[s0:s0 + m] += norm(burst) * 0.5 * (1 - j / L)
    if muffled:
        out = fft_filter(out, hi=550)
    return stereo(norm(out, 1.0))


def crickets(d, seed=62):
    rng = _rng(seed)
    n = int(d * SR)
    L, R = np.zeros(n), np.zeros(n)
    for _ in range(3):
        f, pan, per = rng.uniform(4200, 5200), rng.uniform(-0.7, 0.7), rng.uniform(0.45, 0.8)
        t0 = rng.uniform(0, per)
        while t0 < d:
            for p in range(3):
                m = int(0.014 * SR)
                tt = np.arange(m) / SR
                ch = np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / tt[-1])
                s0 = int((t0 + p * 0.028) * SR)
                if s0 + m < n:
                    g = rng.uniform(0.5, 1.0)
                    L[s0:s0 + m] += ch * g * np.sqrt(0.5 * (1 - pan))
                    R[s0:s0 + m] += ch * g * np.sqrt(0.5 * (1 + pan))
            t0 += per * rng.uniform(0.9, 1.1)
    return norm(np.stack([L, R], 1), 1.0)


def taxi(d, seed=63):
    """Inside an old taxi: engine hum + road rumble."""
    rng = _rng(seed)
    road = stereo(norm(fft_filter(rng.standard_normal(int(d * SR)), lo=60, hi=500)))
    y = engine(d, seed=seed)[: len(road)] * 0.6 + road * 0.5
    return norm(fft_filter(y, hi=2500), 1.0)


def steps_echo(d, rate=2.8, seed=64):
    """Hurried steps down a marble hotel corridor."""
    x = footsteps(d, rate, seed=seed)
    return norm(reverb(x, decay=1.5, wet=0.55), 1.0)


def step_stop():
    """A last step, then standing still."""
    return stereo(norm(reverb(step(False, 3), decay=0.6, wet=0.25), 1.0))


def hum(d, seed=71):
    """Fluorescent tube hum for an interrogation room: 100 Hz buzz + harmonics, faint and steady."""
    rng = _rng(seed)
    t = _t(d)
    y = np.zeros(len(t))
    for k, a in ((1, 1.0), (2, 0.55), (3, 0.3), (4, 0.18), (6, 0.08)):
        y += a * np.sin(2 * np.pi * 100 * k * t + rng.uniform(0, 6.28))
    y *= 1 + 0.12 * np.sin(2 * np.pi * 0.23 * t)
    y += 0.25 * fft_filter(rng.standard_normal(len(t)), lo=2000, hi=6000) * 0.2
    return stereo(norm(fft_filter(y, lo=60, hi=1400), 1.0))


def ticking(d, every=1.0):
    """A wall clock: one quiet tick a second, alternating tick/tock."""
    n = int(d * SR)
    y = np.zeros((n + SR, 2))
    c = clock_click()
    k = 0
    while k * every < d:
        i = int(k * every * SR)
        g = 1.0 if k % 2 == 0 else 0.72
        y[i:i + len(c)] += c[: len(y) - i] * g
        k += 1
    return y[:n]
