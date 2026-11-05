"""Hebrew (RTL) typography: fonts, rich text with *highlights*, animated blits."""
import math
import os
import re
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_FILES = {
    "serif": os.path.join(HERE, "fonts", "FrankRuhlLibre.ttf"),  # titles
    "sans": os.path.join(HERE, "fonts", "Heebo.ttf"),            # captions / UI
    "hand": os.path.join(HERE, "fonts", "AmaticSC-Bold.ttf"),    # hand-written notes
}
HEB = re.compile(r"[֐-׿]")
LAT = re.compile(r"[A-Za-z]")


@lru_cache(maxsize=None)
def font(family, size, weight):
    f = ImageFont.truetype(FONT_FILES[family], int(size))
    try:
        f.set_variation_by_axes([weight])
    except Exception:  # static font
        pass
    return f


def direction(text):
    return "ltr" if (LAT.search(text) and not HEB.search(text)) else "rtl"


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = min(max(x, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def ease_out_back(x, s=1.7):
    x = min(max(x, 0.0), 1.0) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


class Layer:
    """Premultiplied RGBA float layer ready to be blitted onto a frame."""

    def __init__(self, p, a):
        self.p, self.a = p, a
        self.h, self.w = a.shape[:2]

    @classmethod
    def from_pil(cls, im, shadow=0.0, blur=8, glow=None):
        """im: RGBA PIL. Adds a soft dark shadow (and optional colored glow) from its alpha."""
        arr = np.asarray(im, dtype=np.float32) / 255.0
        rgb, a = arr[..., :3], arr[..., 3:4]
        p = rgb * a
        if glow is not None:
            gcol, gstr, gblur = glow
            g = np.asarray(im.getchannel("A").filter(ImageFilter.GaussianBlur(gblur)), np.float32)[..., None] / 255 * gstr
            p = p + np.array(gcol, np.float32) * g * (1 - a)
            a = a + g * (1 - a)
        if shadow > 0:
            s = np.asarray(im.getchannel("A").filter(ImageFilter.GaussianBlur(blur)), np.float32)[..., None] / 255 * shadow
            a = a + s * (1 - a)
        return cls(np.ascontiguousarray(p), np.ascontiguousarray(a))

    def scaled(self, k):
        if abs(k - 1) < 1e-3:
            return self
        w, h = max(1, int(self.w * k)), max(1, int(self.h * k))
        rgba = np.concatenate([self.p, self.a], 2)
        out = [np.asarray(Image.fromarray(rgba[..., c]).resize((w, h), Image.BILINEAR)) for c in range(4)]
        out = np.stack(out, 2).astype(np.float32)
        return Layer(out[..., :3], out[..., 3:4])


def blit(frame, layer, x, y, op=1.0, colmask=None):
    """Composite layer onto frame (float HxWx3) with its top-left at (x, y)."""
    if op <= 0.003:
        return
    x, y = int(round(x)), int(round(y))
    H, W = frame.shape[:2]
    x0, y0 = max(x, 0), max(y, 0)
    x1, y1 = min(x + layer.w, W), min(y + layer.h, H)
    if x1 <= x0 or y1 <= y0:
        return
    sy, sx = slice(y0 - y, y1 - y), slice(x0 - x, x1 - x)
    a, p = layer.a[sy, sx], layer.p[sy, sx]
    k = op
    if colmask is not None:
        k = op * colmask[sx][None, :, None]
    reg = frame[y0:y1, x0:x1]
    reg *= 1 - a * k
    reg += p * k


def text_layer(text, family, weight, size, color, shadow=0.85, blur=None, glow=None):
    """Single run of text -> (Layer, pad, advance width, ascent)."""
    f = font(family, size, weight)
    d = direction(text)
    asc, desc = f.getmetrics()
    w = int(math.ceil(f.getlength(text, direction=d)))
    blur = blur if blur is not None else max(4, size // 7)
    pad = int(blur * 2.5 + 6)
    im = Image.new("RGBA", (w + 2 * pad, asc + desc + 2 * pad), (0, 0, 0, 0))
    col = tuple(int(c * 255) for c in color)
    ImageDraw.Draw(im).text((pad, pad + asc), text, font=f, fill=col + (255,), anchor="ls", direction=d)
    return Layer.from_pil(im, shadow=shadow, blur=blur, glow=glow), pad, w, asc


def parse_markup(text):
    """'*word*' marks a highlighted (accent-colored) span. Returns units (text, hl) and '\n' breaks."""
    units, hl = [], False
    for li, line in enumerate(str(text).strip().split("\n")):
        if li:
            units.append(("\n", False))
        for pi, part in enumerate(line.split("*")):
            if pi:
                hl = not hl
            for w in part.split():
                units.append((w, hl))
    # merge consecutive latin words (keep their LTR order inside an RTL line)
    merged = []
    for w, h in units:
        if (merged and w != "\n" and merged[-1][0] != "\n" and merged[-1][1] == h
                and direction(w) == "ltr" and direction(merged[-1][0]) == "ltr"):
            merged[-1] = (merged[-1][0] + " " + w, h)
        else:
            merged.append((w, h))
    return merged


class TextBlock:
    """Multi-line, centered, RTL rich text with per-line / per-word animation."""

    def __init__(self, text, family="sans", weight=800, size=60, color=(1, 1, 1),
                 hl_color=(1, 0.2, 0.25), max_w=820, line_h=1.32, shadow=0.85, glow_hl=True):
        f = font(family, size, weight)
        space = f.getlength(" ", direction="rtl")
        units = parse_markup(text)
        rendered = []
        for w, h in units:
            if w == "\n":
                rendered.append(None)
                continue
            glow = (hl_color, 0.35, size // 4) if (h and glow_hl) else None
            lay, pad, adv, asc = text_layer(w, family, weight, size, hl_color if h else color, shadow=shadow, glow=glow)
            rendered.append((lay, pad, adv, asc))
        lines, cur, cur_w = [], [], 0.0
        for r in rendered:
            if r is None:
                lines.append(cur)
                cur, cur_w = [], 0.0
                continue
            add = r[2] + (space if cur else 0)
            if cur and cur_w + add > max_w:
                lines.append(cur)
                cur, cur_w = [r], r[2]
            else:
                cur.append(r)
                cur_w += add
        if cur:
            lines.append(cur)
        lines = [l for l in lines if l]
        self.line_h = size * line_h
        self.size = size
        self.items = []  # (layer, dx, dy, line_idx, word_idx)
        wi = 0
        asc = f.getmetrics()[0]
        for li, line in enumerate(lines):
            lw = sum(r[2] for r in line) + space * (len(line) - 1)
            xr = lw / 2
            for lay, pad, adv, a in line:
                xl = xr - adv
                self.items.append((lay, xl - pad, li * self.line_h - pad, li, wi))
                xr = xl - space
                wi += 1
        self.n_lines = len(lines)
        self.n_words = wi
        # visual height: from the first line's cap-top to the last baseline
        self.cap = size * 0.72
        self.asc = asc
        self.height = (self.n_lines - 1) * self.line_h + self.cap

    def draw(self, frame, cx, cy, t, mode="lines", start=0.0, op=1.0, stagger=None, rise=18):
        """cy = visual vertical center of the block."""
        top = cy - self.height / 2 - (self.asc - self.cap)
        for lay, dx, dy, li, wi in self.items:
            if mode == "lines":
                ti = t - start - li * (stagger or 0.22)
                a = ease_out(ti / 0.4)
            elif mode == "words":
                ti = t - start - wi * (stagger or 0.16)
                a = ease_out(ti / 0.14)
            else:
                ti = t - start
                a = ease_out(ti / 0.45)
            if a <= 0:
                continue
            blit(frame, lay, cx + dx, top + dy + (1 - a) * rise, a * op)

    def words_end(self, start=0.0, stagger=0.16):
        return start + self.n_words * stagger + 0.14

    def lines_end(self, start=0.0, stagger=0.22):
        return start + self.n_lines * stagger + 0.4


def canvas_layer(size, ops, shadow=0.8, blur=10, glow=None):
    """Draw several elements on one transparent canvas -> Layer."""
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for op in ops:
        kind = op[0]
        if kind == "text":
            _, xy, text, fnt, col, anchor = op
            d.text(xy, text, font=fnt, fill=tuple(int(c * 255) for c in col[:3]) + (int(255 * (col[3] if len(col) > 3 else 1)),),
                   anchor=anchor, direction=direction(text))
        elif kind == "rect":
            _, box, col = op
            d.rectangle(box, fill=tuple(int(c * 255) for c in col[:3]) + (int(255 * (col[3] if len(col) > 3 else 1)),))
        elif kind == "rrect":
            _, box, r, col, outline = op
            d.rounded_rectangle(box, r, fill=tuple(int(c * 255) for c in col),
                                outline=tuple(int(c * 255) for c in outline) if outline else None, width=2)
    return Layer.from_pil(im, shadow=shadow, blur=blur, glow=glow)
