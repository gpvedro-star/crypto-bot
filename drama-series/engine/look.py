"""The series 'look': one color grade, grain, vignette and effects for every image,
so pictures coming from different GPT generations feel like one show."""
import numpy as np
from PIL import Image, ImageFilter, ImageOps

W, H = 1080, 1920
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def grade(a):
    """Neo-noir grade: muted color, teal shadows, amber highlights, filmic contrast."""
    a = np.clip(a, 0, 1)
    lum = (a @ LUMA)[..., None]
    a = lum + (a - lum) * 0.74                       # desaturate
    s = a * a * (3 - 2 * a)                          # S-curve
    a = a * 0.5 + s * 0.5
    lum = (a @ LUMA)[..., None]
    a = a + (1 - lum) ** 2 * np.array([-0.025, 0.012, 0.04], np.float32) \
          + lum ** 2 * np.array([0.045, 0.012, -0.035], np.float32)
    a = 0.018 + a * 0.93                             # lifted, soft blacks
    a = 1 - (1 - a) ** 1.08                          # highlight roll-off
    return np.clip(a * 0.93, 0, 1).astype(np.float32)


def load_graded(path, overscan=1.25, cover_w=W, cover_h=H, focus=(0.5, 0.5)):
    """Load an image, cover-fit it to (cover_w, cover_h) * overscan, grade it. Returns PIL RGB."""
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    tw, th = int(cover_w * overscan), int(cover_h * overscan)
    k = max(tw / im.width, th / im.height)
    im = im.resize((max(tw, int(im.width * k + 0.5)), max(th, int(im.height * k + 0.5))), Image.LANCZOS)
    arr = grade(np.asarray(im, np.float32) / 255.0)
    return Image.fromarray((arr * 255 + 0.5).astype(np.uint8))


def to_float(im):
    return np.asarray(im, np.float32) * (1 / 255.0)


def _smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def make_vignette():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    nx, ny = (x / W - 0.5) * 2, (y / H - 0.5) * 2 * (H / W) * 0.62
    r = np.sqrt(nx ** 2 + ny ** 2)
    v = 1 - 0.62 * _smooth(0.45, 1.55, r)
    yy = y / H
    v *= 1 - 0.5 * _smooth(0.55, 0.98, yy)   # bottom: captions + app UI legibility
    v *= 1 - 0.38 * _smooth(0.22, 0.0, yy)   # top: stamps + app UI
    return v[..., None].astype(np.float32)


def make_grain(n=8, seed=4):
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        g = rng.standard_normal((H // 2, W // 2)).astype(np.float32)
        g = np.asarray(Image.fromarray(g).resize((W, H), Image.BILINEAR))
        fine = rng.standard_normal((H, W)).astype(np.float32) * 0.22
        out.append(((g + fine) / 1.02)[..., None])
    return out


def make_rain(seed=8):
    """Tall tileable rain-streak texture (alpha)."""
    rng = np.random.default_rng(seed)
    im = Image.new("L", (W, H * 2), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    for _ in range(1400):
        x, y = rng.uniform(-200, W), rng.uniform(0, H * 2)
        L = rng.uniform(40, 140)
        d.line([(x, y), (x + L * 0.12, y + L)], fill=int(rng.uniform(40, 150)), width=1 if rng.random() < 0.8 else 2)
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    return np.asarray(im, np.float32)[..., None] / 255.0


def glitch(f, seed, amt=1.0):
    rng = np.random.default_rng(seed)
    out = f.copy()
    dx = int(rng.integers(8, 34) * amt)
    out[..., 0] = np.roll(f[..., 0], dx, axis=1)
    out[..., 2] = np.roll(f[..., 2], -dx, axis=1)
    for _ in range(int(2 + 7 * amt)):
        y = int(rng.integers(0, H - 100))
        h = int(rng.integers(6, 110))
        s = int(rng.integers(-90, 90) * amt)
        out[y:y + h] = np.roll(out[y:y + h], s, axis=1)
        if rng.random() < 0.3:
            out[y:y + h] *= np.array([1.25, 0.8, 0.8], np.float32)
    return out


def flashback(f):
    lum = (f @ LUMA)[..., None]
    return lum * np.array([1.0, 0.94, 0.84], np.float32) * 0.95 + 0.02


def red_tint(f, k=1.0):
    lum = (f @ LUMA)[..., None]
    red = lum * np.array([1.35, 0.32, 0.32], np.float32)
    return f * (1 - 0.6 * k) + red * 0.6 * k


def grade_variant(a, kind="noir"):
    """Per-world looks. noir = series default; cool = Monte Carlo; warm = Netanya childhood;
    warm_clean = present-day warm interior; green = the abandoned house."""
    if kind in (None, "noir"):
        return grade(a)
    a = np.clip(a, 0, 1)
    lum = (a @ LUMA)[..., None]
    if kind == "cool":
        a = lum + (a - lum) * 0.9
        s = a * a * (3 - 2 * a)
        a = a * 0.62 + s * 0.38
        lum = (a @ LUMA)[..., None]
        a = a + (1 - lum) ** 2 * np.array([-0.02, 0.008, 0.035], np.float32) + lum ** 2 * np.array([0.0, 0.01, 0.02], np.float32)
        a = 0.01 + a * 0.97
    elif kind == "warm":
        a = lum + (a - lum) * 0.9
        s = a * a * (3 - 2 * a)
        a = a * 0.8 + s * 0.2
        a = a * np.array([1.04, 1.0, 0.9], np.float32) + np.array([0.012, 0.006, -0.006], np.float32)
        a = 0.035 + a * 0.94                       # dusty, lifted blacks
    elif kind == "warm_clean":
        a = lum + (a - lum) * 0.95
        s = a * a * (3 - 2 * a)
        a = a * 0.7 + s * 0.3
        a = a * np.array([1.03, 1.0, 0.93], np.float32)
        a = 0.015 + a * 0.97
    elif kind == "green":
        a = lum + (a - lum) * 0.72
        s = a * a * (3 - 2 * a)
        a = a * 0.6 + s * 0.4
        lum = (a @ LUMA)[..., None]
        a = a + (1 - lum) ** 2 * np.array([-0.025, 0.03, -0.005], np.float32) + np.array([-0.01, 0.012, -0.012], np.float32)
        a = (0.012 + a * 0.95) * 0.95
    return np.clip(a, 0, 1).astype(np.float32)


def load_source(path, scale=1.5, kind="noir", haze=0.0, exposure=1.0):
    """Cover-fit to (W, H) * scale, graded with a per-world look. Returns PIL RGB."""
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    tw, th = int(W * scale), int(H * scale)
    k = max(tw / im.width, th / im.height)
    im = im.resize((max(tw, int(im.width * k + 0.5)), max(th, int(im.height * k + 0.5))), Image.LANCZOS)
    arr = np.asarray(im, np.float32) / 255.0
    if exposure != 1.0:  # lift in linear light, roll off highlights
        lin = arr ** 2.2 * exposure
        arr = (lin / (1 + 0.15 * lin)) ** (1 / 2.2) * (1.15 ** (1 / 2.2))
        arr = np.clip(arr, 0, 1)
    if haze > 0:
        bl = np.asarray(im.filter(ImageFilter.GaussianBlur(28)), np.float32) / 255.0
        arr = arr * (1 - haze) + np.maximum(arr, bl) * haze
    arr = grade_variant(arr, kind)
    return Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
