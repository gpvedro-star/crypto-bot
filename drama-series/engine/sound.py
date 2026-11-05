"""Signature sound design for the series.

Every sound is synthesized here, so every episode carries exactly the same
"audio identity" (the same BRAAM, the same drone, the same heartbeat).
Only numpy + ffmpeg are needed.
"""
import subprocess
import wave

import numpy as np

SR = 48000


def _t(d):
    return np.arange(int(d * SR)) / SR


def _npow2(n):
    return 1 << int(np.ceil(np.log2(max(int(n), 2))))


def fft_filter(x, lo=None, hi=None, order=2):
    """Zero-phase Butterworth-like low/high pass in the frequency domain."""
    x = np.asarray(x, dtype=np.float64)
    n = x.shape[0]
    N = _npow2(n + 8192)
    f = np.fft.rfftfreq(N, 1 / SR)
    H = np.ones_like(f)
    if hi:
        H /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        H /= np.sqrt(1 + (lo / np.maximum(f, 1e-6)) ** (2 * order))
    if x.ndim == 1:
        return np.fft.irfft(np.fft.rfft(x, N) * H, N)[:n]
    return np.fft.irfft(np.fft.rfft(x, N, axis=0) * H[:, None], N, axis=0)[:n]


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    l = np.sqrt(0.5 * (1 - pan))
    r = np.sqrt(0.5 * (1 + pan))
    return np.stack([x * l * 1.414, x * r * 1.414], 1)


def reverb(x, decay=2.5, wet=0.35, lp=4500, seed=3):
    rng = np.random.default_rng(seed)
    x = stereo(x)
    n_ir = int(decay * SR)
    t = np.arange(n_ir) / SR
    n = len(x) + n_ir
    N = _npow2(n)
    out = np.zeros((n, 2))
    for ch in range(2):
        ir = rng.standard_normal(n_ir) * np.exp(-t * 6.9 / decay)
        ir = fft_filter(ir, lo=60, hi=lp)
        ramp = int(0.015 * SR)
        ir[:ramp] *= np.linspace(0, 1, ramp)
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], N) * np.fft.rfft(ir, N), N)[:n]
    dry = np.zeros((n, 2))
    dry[: len(x)] = x
    return dry * (1 - wet * 0.5) + out * wet


def norm(x, peak=1.0):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def _saw(freq, t, kmax=40):
    """Band-limited saw via additive synthesis (freq may be an array)."""
    phase = 2 * np.pi * (np.cumsum(np.broadcast_to(freq, t.shape)) / SR)
    fmax = float(np.max(freq))
    out = np.zeros_like(t)
    for k in range(1, kmax + 1):
        if k * fmax > SR * 0.45:
            break
        out += np.sin(k * phase) / k
    return out


def _sine_sweep(f_of_t):
    return np.sin(2 * np.pi * np.cumsum(f_of_t) / SR)


# ---------------------------------------------------------------- one-shots

def braam(d=5.0):
    """The series' signature cinematic impact (title card)."""
    t = _t(d)
    f0 = 43.65  # F1
    voices = [(f0, 1.0), (f0 * 1.004, 0.8), (f0 * 0.996, 0.8), (f0 * 1.5, 0.55),
              (f0 * 2, 0.45), (f0 * 2.006, 0.3), (f0 * 3, 0.12)]
    x = sum(a * _saw(f, t, 30) for f, a in voices)
    bright, dark = fft_filter(x, hi=1500), fft_filter(x, hi=240)
    eb = np.exp(-t / 0.5)
    x = bright * eb + dark * (1 - eb)
    env = (1 - np.exp(-t / 0.01)) * np.exp(-t / 1.7)
    x = np.tanh(2.4 * norm(x) * env)
    sub = _sine_sweep(40 + 34 * np.exp(-t / 0.09)) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 1.5)
    rng = np.random.default_rng(11)
    crack = fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.05), lo=90, hi=3500)
    mix = 0.65 * x + 1.0 * sub + 0.55 * norm(crack)
    return norm(reverb(mix, decay=3.2, wet=0.4), 1.0)


def hit(d=3.0, pitch=1.0):
    """Shorter deep boom (transitions, 'to be continued')."""
    t = _t(d)
    sub = _sine_sweep((36 + 60 * np.exp(-t / 0.06)) * pitch) * (1 - np.exp(-t / 0.003)) * np.exp(-t / 0.8)
    rng = np.random.default_rng(5)
    crack = fft_filter(rng.standard_normal(len(t)) * np.exp(-t / 0.035), lo=120, hi=5000)
    body = fft_filter(_saw(55 * pitch, t, 20) * np.exp(-t / 0.4), hi=400)
    mix = 1.0 * sub + 0.45 * norm(crack) + 0.35 * norm(body)
    return norm(reverb(np.tanh(1.6 * mix), decay=2.6, wet=0.38), 1.0)


def riser(d=2.6):
    """Tension riser that ends abruptly (cliffhanger cut)."""
    t = _t(d)
    p = t / d
    rng = np.random.default_rng(9)
    noise = fft_filter(rng.standard_normal(len(t)), lo=400, hi=9000) * p ** 3
    sweep = _sine_sweep(140 * (10 ** (1.0 * p))) * p ** 2.2
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(4 + 18 * p ** 2) / SR)
    low = _saw(55 * (1 + p * 0.5), t, 12) * p ** 1.5
    x = 0.5 * norm(noise) + 0.45 * sweep * trem + 0.25 * norm(fft_filter(low, hi=600))
    x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    st = stereo(x)
    return norm(st, 1.0)


def heartbeat_beat():
    t = _t(0.5)
    def thump(delay, amp):
        tt = np.maximum(t - delay, 0)
        on = (t >= delay).astype(float)
        return on * amp * _sine_sweep(42 + 55 * np.exp(-tt / 0.03)) * np.exp(-tt / 0.09) * (1 - np.exp(-tt / 0.002))
    x = thump(0.0, 1.0) + thump(0.26, 0.7)
    return norm(fft_filter(np.tanh(2 * x), hi=180), 1.0)


def heartbeat(d, bpm=72):
    out = np.zeros(int(d * SR) + SR)
    beat = heartbeat_beat()
    period = 60 / bpm
    k = 0
    while k * period < d:
        i = int(k * period * SR)
        out[i:i + len(beat)] += beat[: len(out) - i]
        k += 1
    return stereo(out[: int(d * SR)])


def buzz():
    """Phone vibration (two pulses)."""
    t = _t(0.9)
    x = np.tanh(3 * np.sin(2 * np.pi * 165 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * t))
    gate = ((t < 0.32) | ((t > 0.46) & (t < 0.78))).astype(float)
    gate = np.convolve(gate, np.ones(240) / 240, mode="same")
    return stereo(norm(fft_filter(x * gate, lo=80, hi=1400), 1.0))


def tick(seed=0):
    rng = np.random.default_rng(seed)
    t = _t(0.06)
    f = 1700 + rng.uniform(-250, 250)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + 0.6 * rng.standard_normal(len(t)) * np.exp(-t / 0.003)
    return stereo(norm(fft_filter(x, lo=900, hi=9000), 1.0), pan=rng.uniform(-0.2, 0.2))


def glitch_sfx(seed=0, d=0.35):
    rng = np.random.default_rng(seed + 100)
    t = _t(d)
    out = np.zeros(len(t))
    i = 0
    while i < len(t):
        n = int(rng.uniform(0.015, 0.06) * SR)
        f = rng.choice([180, 330, 720, 1400, 2900])
        seg = np.sign(np.sin(2 * np.pi * f * t[:n])) * rng.uniform(0.3, 1)
        if rng.random() < 0.4:
            seg = rng.standard_normal(n) * 0.8
        out[i:i + n] = seg[: len(out) - i]
        i += n + int(rng.uniform(0, 0.03) * SR)
    out = np.round(out * 6) / 6  # bit-crush
    return stereo(norm(fft_filter(out, lo=150, hi=7000), 1.0))


def whoosh(d=0.9):
    t = _t(d)
    rng = np.random.default_rng(21)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    x = rng.standard_normal(len(t))
    lo_band = fft_filter(x, lo=200, hi=900)
    hi_band = fft_filter(x, lo=1200, hi=6000)
    p = t / d
    y = lo_band * (1 - p) + hi_band * p
    return stereo(norm(y * env, 1.0))


def drone(d, seed=1):
    """Dark ambient bed — the 'room tone' of the whole series."""
    t = _t(d)
    rng = np.random.default_rng(seed)
    lfo = lambda f, ph=0: 0.5 + 0.5 * np.sin(2 * np.pi * f * t + ph)
    pad = (_saw(36.71, t, 10) + _saw(36.85, t, 10) * 0.8 + _saw(55.0, t, 8) * 0.6 * lfo(0.05, 1.0)
           + _saw(43.65, t, 8) * 0.35 * lfo(0.031, 2.0))
    pad = fft_filter(pad, hi=210) * (0.75 + 0.25 * lfo(0.07))
    wind = fft_filter(rng.standard_normal(len(t)), lo=180, hi=700) * (0.4 + 0.6 * lfo(0.043, 0.5))
    shimmer = (np.sin(2 * np.pi * 587.33 * t) + 0.6 * np.sin(2 * np.pi * 880.0 * t + 1)) * lfo(0.021, 3.5) ** 3
    x = 0.8 * norm(pad) + 0.35 * norm(wind) + 0.05 * shimmer
    L = x
    R = np.roll(x, int(0.011 * SR))  # widen
    st = np.stack([L, R], 1)
    fade = int(min(1.0, d / 4) * SR)
    st[:fade] *= np.linspace(0, 1, fade)[:, None]
    return norm(st, 1.0)


# ---------------------------------------------------------------- I/O + mixer

def load_audio(path):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def audio_length(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


class Mixer:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.buf = np.zeros((self.n, 2))
        self.vo = np.zeros((self.n, 2))

    def add(self, t, x, gain=1.0, pan=0.0, voice=False):
        x = stereo(np.asarray(x, dtype=np.float64), pan)
        i = int(round(t * SR))
        if i >= self.n:
            return
        if i < 0:
            x = x[-i:]
            i = 0
        j = min(self.n, i + len(x))
        (self.vo if voice else self.buf)[i:j] += x[: j - i] * gain

    def render(self, path, bed=None):
        mix = self.buf.copy()
        if bed is not None:
            bed = bed[: self.n]
            if np.any(self.vo):
                env = np.abs(self.vo).max(1)
                k = int(0.25 * SR)
                env = np.convolve(env, np.ones(k) / k, mode="same")
                duck = 1 - 0.65 * np.clip(env / (np.max(env) * 0.25 + 1e-9), 0, 1)
                bed = bed * duck[:, None]
            mix[: len(bed)] += bed
        mix += self.vo
        mix = norm(mix, 1.0)
        mix = np.tanh(1.5 * mix) / np.tanh(1.5)
        mix = norm(mix, 0.84)  # headroom for AAC / true-peak
        pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
        with wave.open(path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
