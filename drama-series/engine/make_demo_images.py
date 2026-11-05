#!/usr/bin/env python3
"""Draws placeholder noir 'stills' for the demo episode, so the template can be seen
before the real GPT images arrive. Not used for real episodes."""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

Wd, Hd = 1024, 1536
rng = np.random.default_rng(42)


def grad(h, w, top, bottom, power=1.0):
    t = (np.linspace(0, 1, h) ** power)[:, None, None]
    return np.broadcast_to(np.array(top) * (1 - t) + np.array(bottom) * t, (h, w, 3)).astype(np.float32)


def glow(arr, cx, cy, r, col, k=1.0):
    y, x = np.mgrid[0:arr.shape[0], 0:arr.shape[1]].astype(np.float32)
    g = np.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (r * r)))
    return arr + g[..., None] * np.array(col, np.float32) * k


def to_im(arr):
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))


def add_rain(im, n=900, alpha=70, region=None):
    lay = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(lay)
    for _ in range(n):
        x, y = rng.uniform(0, im.width), rng.uniform(0, im.height)
        L = rng.uniform(20, 70)
        d.line([(x, y), (x + L * 0.1, y + L)], fill=int(rng.uniform(alpha * 0.4, alpha)), width=1)
    lay = lay.filter(ImageFilter.GaussianBlur(0.6))
    if region is not None:
        lay = Image.fromarray((np.asarray(lay, np.float32) * region).astype(np.uint8))
    white = Image.new("RGB", im.size, (200, 210, 225))
    return Image.composite(white, im, lay)


def city(path):
    a = grad(Hd, Wd, (0.01, 0.015, 0.04), (0.16, 0.09, 0.08), 1.6)
    a = glow(a, Wd * 0.72, Hd * 0.16, 40, (0.9, 0.9, 0.85), 1.0)
    a = glow(a, Wd * 0.72, Hd * 0.16, 180, (0.25, 0.28, 0.35), 0.5)
    a = glow(a, Wd * 0.5, Hd * 0.66, 520, (0.5, 0.22, 0.08), 0.35)
    im = to_im(a)
    d = ImageDraw.Draw(im)
    horizon = int(Hd * 0.70)
    for layer, (col, hmin, hmax, wl) in enumerate([((22, 20, 30), 200, 520, 0.08), ((10, 10, 16), 260, 760, 0.16),
                                                   ((4, 4, 7), 120, 420, 0.22)]):
        x = -20
        while x < Wd:
            bw = int(rng.uniform(60, 170))
            bh = int(rng.uniform(hmin, hmax))
            top = horizon - bh
            d.rectangle([x, top, x + bw, horizon], fill=col)
            if layer == 1 and rng.random() < 0.3:
                d.rectangle([x + bw // 2 - 3, top - 60, x + bw // 2 + 3, top], fill=col)
            for wy in range(top + 14, horizon - 10, 22):
                for wx in range(x + 8, x + bw - 10, 16):
                    if rng.random() < wl:
                        c = (255, 190, 110) if rng.random() < 0.75 else (150, 200, 255)
                        k = rng.uniform(0.35, 1.0)
                        d.rectangle([wx, wy, wx + 7, wy + 11], fill=tuple(int(v * k) for v in c))
            x += bw + int(rng.uniform(0, 12))
    arr = np.asarray(im, np.float32) / 255
    top_part = arr[:horizon]
    refl = np.asarray(Image.fromarray((top_part[::-1][: Hd - horizon] * 255).astype(np.uint8))
                      .resize((Wd, Hd - horizon)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
    streak = np.asarray(Image.fromarray((refl * 255).astype(np.uint8)).resize((Wd, 40)).resize((Wd, Hd - horizon), Image.BILINEAR), np.float32) / 255
    arr[horizon:] = (refl * 0.25 + streak * 0.35) * np.linspace(1, 0.35, Hd - horizon)[:, None, None] + 0.01
    im = to_im(arr).filter(ImageFilter.GaussianBlur(0.7))
    fog = rng.standard_normal((Hd // 64, Wd // 64)).astype(np.float32)
    fog = np.asarray(Image.fromarray(fog).resize((Wd, Hd), Image.BICUBIC), np.float32)
    arr = np.asarray(im, np.float32) / 255 + np.clip(fog, 0, None)[..., None] * 0.035
    im = add_rain(to_im(arr), 1100, 60)
    im.save(path)


def phone(path):
    base = rng.standard_normal((Hd // 4, Wd // 64)).astype(np.float32)
    wood = np.asarray(Image.fromarray(base).resize((Wd, Hd), Image.BICUBIC), np.float32)
    a = np.stack([0.05 + 0.02 * wood, 0.035 + 0.014 * wood, 0.03 + 0.01 * wood], 2)
    a = np.clip(a, 0, 1)
    a = glow(a, Wd * 0.5, Hd * 0.5, 420, (0.15, 0.25, 0.45), 0.6)
    a = glow(a, Wd * 0.85, Hd * 0.1, 300, (0.4, 0.2, 0.08), 0.25)
    im = to_im(a)
    pw, ph = 420, 860
    x0, y0 = (Wd - pw) // 2 + 30, (Hd - ph) // 2 + 40
    sh = Image.new("L", im.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle([x0 + 20, y0 + 30, x0 + pw + 20, y0 + ph + 30], 60, fill=200)
    sh = sh.filter(ImageFilter.GaussianBlur(30))
    im = Image.composite(Image.new("RGB", im.size, (0, 0, 0)), im, sh)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], 60, fill=(12, 12, 14), outline=(60, 60, 66), width=3)
    scr = grad(ph - 40, pw - 30, (0.10, 0.16, 0.30), (0.04, 0.05, 0.10))
    scr = glow(scr, (pw - 30) / 2, (ph - 40) * 0.35, 200, (0.25, 0.3, 0.45), 0.6)
    s_im = to_im(scr)
    m = Image.new("L", s_im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, s_im.width - 1, s_im.height - 1], 46, fill=255)
    im.paste(s_im, (x0 + 15, y0 + 20), m)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x0 + pw // 2 - 60, y0 + 34, x0 + pw // 2 + 60, y0 + 62], 14, fill=(5, 5, 6))
    for i, w in enumerate([200, 140]):
        d.rounded_rectangle([x0 + pw // 2 - w // 2, y0 + 200 + i * 60, x0 + pw // 2 + w // 2, y0 + 230 + i * 60], 8,
                            fill=(170, 185, 215) if i == 0 else (110, 120, 150))
    a = np.asarray(im, np.float32) / 255
    a = glow(a, x0 + pw / 2, y0 + ph / 2, 560, (0.08, 0.12, 0.25), 0.35)
    to_im(a).save(path)


def alley(path):
    a = grad(Hd, Wd, (0.02, 0.02, 0.03), (0.04, 0.035, 0.04))
    lx, ly = Wd * 0.66, Hd * 0.2
    y, x = np.mgrid[0:Hd, 0:Wd].astype(np.float32)
    dy = np.clip(y - ly, 0, None)
    spread = 40 + dy * 0.42
    cone = np.exp(-((x - lx) / spread) ** 2) * (y > ly) * np.exp(-dy / 1400)
    a = a + cone[..., None] * np.array([1.0, 0.62, 0.28], np.float32) * 0.55
    a = glow(a, lx, ly, 60, (1.0, 0.8, 0.5), 1.2)
    a = glow(a, lx, Hd * 0.86, 260, (0.6, 0.35, 0.15), 0.45)
    im = to_im(a)
    d = ImageDraw.Draw(im)
    d.rectangle([lx + 140, ly - 30, lx + 152, Hd * 0.86], fill=(6, 6, 7))
    d.line([(lx + 146, ly - 30), (lx + 20, ly - 30)], fill=(6, 6, 7), width=10)
    d.polygon([(lx - 50, ly - 10), (lx + 50, ly - 10), (lx + 30, ly - 40), (lx - 30, ly - 40)], fill=(8, 8, 9))
    fx, fy = Wd * 0.45, Hd * 0.84
    sil = (5, 5, 6)
    d.polygon([(fx - 70, fy), (fx + 70, fy), (fx + 52, fy - 360), (fx - 52, fy - 360)], fill=sil)
    d.polygon([(fx - 52, fy - 360), (fx + 52, fy - 360), (fx + 40, fy - 400), (fx - 40, fy - 400)], fill=sil)
    d.ellipse([fx - 30, fy - 470, fx + 30, fy - 395], fill=sil)
    d.ellipse([fx - 62, fy - 470, fx + 62, fy - 448], fill=sil)
    d.rectangle([fx - 36, fy - 520, fx + 36, fy - 458], fill=sil)
    d.rectangle([fx - 50, fy, fx - 14, fy + 120], fill=sil)
    d.rectangle([fx + 14, fy, fx + 50, fy + 120], fill=sil)
    rim = Image.new("L", im.size, 0)
    ImageDraw.Draw(rim).line([(fx + 50, fy - 360), (fx + 68, fy)], fill=140, width=4)
    rim = rim.filter(ImageFilter.GaussianBlur(3))
    im = Image.composite(Image.new("RGB", im.size, (255, 170, 90)), im, rim)
    arr = np.asarray(im, np.float32) / 255
    ground = int(Hd * 0.9)
    arr[ground:] = arr[ground:] * 0.6 + arr[ground - 1:2 * ground - Hd - 1:-1][: Hd - ground] * 0.25
    im = to_im(arr)
    im = add_rain(im, 1600, 150, region=np.clip(cone * 1.6, 0, 1))
    im = add_rain(im, 500, 40)
    im.save(path)


def corridor(path):
    a = np.zeros((Hd, Wd, 3), np.float32)
    im = to_im(a)
    d = ImageDraw.Draw(im)
    vx, vy = Wd / 2, Hd * 0.47
    dw, dh = 150, 300
    d.polygon([(0, 0), (vx - dw / 2, vy - dh / 2), (vx - dw / 2, vy + dh / 2), (0, Hd)], fill=(18, 20, 24))
    d.polygon([(Wd, 0), (vx + dw / 2, vy - dh / 2), (vx + dw / 2, vy + dh / 2), (Wd, Hd)], fill=(15, 17, 21))
    d.polygon([(0, 0), (Wd, 0), (vx + dw / 2, vy - dh / 2), (vx - dw / 2, vy - dh / 2)], fill=(9, 10, 12))
    d.polygon([(0, Hd), (Wd, Hd), (vx + dw / 2, vy + dh / 2), (vx - dw / 2, vy + dh / 2)], fill=(12, 12, 14))
    d.rectangle([vx - dw / 2, vy - dh / 2, vx + dw / 2, vy + dh / 2], fill=(26, 22, 22))
    d.rectangle([vx - dw / 2 + 10, vy - dh / 2 + 10, vx + dw / 2 - 10, vy + dh / 2], fill=(34, 28, 27))
    d.ellipse([vx + 40, vy + 10, vx + 52, vy + 22], fill=(120, 110, 90))
    for k in range(1, 6):
        s = 1 / (1 + k * 0.9)
        y = vy - (vy - 0) * s * 0.92
        w = Wd * s * 0.22
        d.rectangle([vx - w, y, vx + w, y + 14 * s], fill=(int(190 * s + 40),) * 3)
    arr = np.asarray(im, np.float32) / 255
    y, x = np.mgrid[0:Hd, 0:Wd].astype(np.float32)
    under = np.exp(-((x - vx) / (dw * 0.55)) ** 6) * np.exp(-np.clip(y - (vy + dh / 2), 0, None) / 160) * (y > vy + dh / 2 - 3)
    arr += under[..., None] * np.array([1.0, 0.08, 0.06], np.float32) * 0.9
    arr = glow(arr, vx, vy + dh / 2, 120, (0.8, 0.05, 0.04), 0.5)
    arr = glow(arr, vx, Hd * 0.1, 400, (0.2, 0.22, 0.25), 0.35)
    to_im(arr).filter(ImageFilter.GaussianBlur(0.8)).save(path)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for fn, f in [("01_city.png", city), ("02_phone.png", phone), ("03_alley.png", alley), ("04_corridor.png", corridor)]:
        f(os.path.join(out, fn))
        print("wrote", fn)
