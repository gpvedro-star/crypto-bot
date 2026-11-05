#!/usr/bin/env python3
"""Episode renderer for the series.

    python3 engine/render.py episodes/s01e01            # full episode -> output/S01E01.mp4 + cover
    python3 engine/render.py episodes/s01e01 --preview  # also writes a contact sheet of key frames
    python3 engine/render.py episodes/s01e01 --frames-only   # contact sheet only (fast design check)

Everything visual (grade, fonts, title card, captions, endings) and every sound
lives in this engine, so all episodes share one identical design language.
"""
import argparse
import math
import os
import shutil
import subprocess
import sys
import tempfile
import time
from multiprocessing import get_context

import numpy as np
import yaml
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import look   # noqa: E402
import sound  # noqa: E402
from typo import (Layer, TextBlock, blit, canvas_layer, ease_in_out, ease_out,  # noqa: E402
                  ease_out_back, font, text_layer)

W, H, FPS = 1080, 1920, 30
FADE = 0.45
CX = 540
CAPTION_Y = 1320          # visual center of captions (inside the safe zone of TikTok / Reels UI)
HEADER_RIGHT = 1012       # right edge of the badge / stamp column
MOVES = ["zoom_in", "pan_left", "zoom_out", "pan_right"]

DEFAULT_SERIES = {
    "name": "שם הסדרה",
    "tagline": "סדרת מתח · מבוסס על סיפור אמיתי",
    "accent": "#D7192A",
    "highlight": "#FF3B4A",
    "hook_stamp": "מבוסס על סיפור אמיתי",
    "continue_text": "המשך יבוא",
    "cta": "עקבו כדי לא לפספס את הפרק הבא",
    "badge": True,
    "disclaimer": {
        "label": "מבוסס על סיפור אמיתי",
        "lines": [
            "הסדרה מבוססת על אירועים שקרו באמת.",
            "השמות שונו כדי לא לפגוע באיש.",
            "לעלילה נוספו תוספות לצורכי בידור.",
        ],
    },
}


def hexcol(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def find_series(ep_dir):
    d = os.path.abspath(ep_dir)
    for _ in range(4):
        p = os.path.join(d, "series.yaml")
        if os.path.exists(p):
            return p, d
        d = os.path.dirname(d)
    return None, os.path.dirname(os.path.dirname(os.path.abspath(ep_dir)))


def centered(lay_tuple, cx, baseline):
    lay, pad, adv, asc = lay_tuple
    return lay, cx - adv / 2 - pad, baseline - asc - pad


def beat_env(t, bpm=72):
    period = 60 / bpm
    a = (t % period)
    b = ((t - 0.26) % period)
    return math.exp(-a / 0.07) + 0.6 * math.exp(-b / 0.07)


# =========================================================================== context

class Ctx:
    def __init__(self, ep_dir):
        self.ep_dir = os.path.abspath(ep_dir)
        with open(os.path.join(ep_dir, "episode.yaml"), encoding="utf-8") as f:
            self.ep = yaml.safe_load(f) or {}
        sp, self.root = find_series(ep_dir)
        series = dict(DEFAULT_SERIES)
        if sp:
            with open(sp, encoding="utf-8") as f:
                series.update(yaml.safe_load(f) or {})
        self.s = series
        self.accent = np.array(hexcol(series["accent"]), np.float32)
        self.hl = hexcol(series["highlight"])
        self.season = int(self.ep.get("season", 1))
        self.episode = int(self.ep.get("episode", 1))
        self.code = f"S{self.season:02d}E{self.episode:02d}"
        self.vignette = look.make_vignette()
        self.grain = look.make_grain()
        y, x = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((x / W - 0.5) * 2) ** 2 + ((y / H - 0.5) * 2 * 1.1) ** 2)
        self.edge = np.clip((r - 0.55) / 0.9, 0, 1)[..., None] ** 1.5
        self.glow = np.exp(-(((x - W / 2) / 520) ** 2 + ((y - H / 2) / 760) ** 2))[..., None].astype(np.float32)
        self._rain = None
        self.badge = None
        if series.get("badge", True):
            txt = f"{series['name']}  |  עונה {self.season} · פרק {self.episode}"
            f = font("sans", 30, 500)
            wtxt = f.getlength(txt, direction="rtl")
            cw = int(wtxt + 60)
            self.badge = canvas_layer((cw, 80), [
                ("rect", (cw - 26, 22, cw - 20, 58), tuple(self.accent) + (1,)),
                ("text", (cw - 38, 51), txt, f, (1, 1, 1, 0.85), "rs"),
            ], shadow=0.7, blur=6)

    def path(self, rel):
        for base in (self.ep_dir, self.root, os.path.join(self.root, "assets")):
            p = os.path.join(base, rel)
            if os.path.exists(p):
                return p
        raise FileNotFoundError(f"לא נמצא קובץ: {rel}  (חיפשתי ב-{self.ep_dir})")

    @property
    def rain(self):
        if self._rain is None:
            self._rain = look.make_rain()
        return self._rain


# =========================================================================== segments

class Seg:
    trans_in = "fade"
    trans_out = "cut"
    bed = 1.0

    def __init__(self, ctx, dur):
        self.ctx, self.dur = ctx, float(dur)
        self.sfx = []      # (t_rel, kind, gain, extra)

    def render(self, t, fi):
        raise NotImplementedError

    def frame(self, t, fi):
        f = self.render(t, fi)
        d = self.dur
        if self.trans_in == "flash" and t < 0.4:
            f = f + (1 - f) * (0.92 * (1 - t / 0.4) ** 2)
        elif self.trans_in == "dip" and t < 0.4:
            f = f * ease_in_out(t / 0.4)
        elif self.trans_in == "glitch" and t < 0.3:
            f = look.glitch(f, fi, 1 - t / 0.3)
        if self.trans_out == "dip" and t > d - 0.35:
            f = f * ease_in_out((d - t) / 0.35)
        elif self.trans_out == "flash" and t > d - 0.1:
            f = f + (1 - f) * (0.6 * (t - (d - 0.1)) / 0.1)
        return f


class Stamp:
    """Typewriter location/time stamp in the header column."""

    def __init__(self, ctx, text, start=0.25, cps=17):
        self.ctx, self.text, self.start, self.cps = ctx, str(text), start, cps
        self.cache = {}
        self.sq = canvas_layer((40, 40), [("rect", (12, 12, 27, 27), tuple(ctx.accent) + (1,))], shadow=0.6, blur=4)

    def end(self):
        return self.start + len(self.text) / self.cps

    def ticks(self):
        out = []
        for i, ch in enumerate(self.text):
            if ch.strip():
                out.append((self.start + i / self.cps, "tick", 0.16, i))
        return out

    def draw(self, f, t, op):
        if t < self.start - 0.15 or op <= 0:
            return
        n = int(np.clip((t - self.start) * self.cps, 0, len(self.text)))
        base_y = 332
        blit(f, self.sq, HEADER_RIGHT - 34, base_y - 32, op * ease_out((t - self.start + 0.15) / 0.15))
        x_text_r = HEADER_RIGHT - 40
        left = x_text_r
        if n > 0:
            key = n
            if key not in self.cache:
                self.cache[key] = text_layer(self.text[:n], "sans", 500, 38, (0.94, 0.94, 0.94), shadow=0.8, blur=6)
            lay, pad, adv, asc = self.cache[key]
            blit(f, lay, x_text_r - adv - pad, base_y - asc - pad, op)
            left = x_text_r - adv
        typing = t < self.end() + 0.9
        if typing and int(t * 2.4) % 2 == 0:
            f[base_y - 30:base_y + 4, int(left) - 12:int(left) - 8] = f[base_y - 30:base_y + 4, int(left) - 12:int(left) - 8] * (1 - op) + 0.95 * op


class Message:
    """Incoming text-message bubble (generic, not any specific app)."""

    def __init__(self, ctx, m, at):
        if isinstance(m, str):
            m = {"text": m}
        self.at = float(m.get("at", at))
        sender = m.get("from", "מספר חסוי")
        when = m.get("time", "")
        body = TextBlock(m["text"], "sans", 500, 46, (1, 1, 1), ctx.hl, max_w=700, line_h=1.3, shadow=0, glow_hl=False)
        bw = 800
        bh = int(110 + body.height + (body.n_lines - 1) * 4 + 40)
        im_layer = canvas_layer((bw + 60, bh + 60), [
            ("rrect", (30, 30, 30 + bw, 30 + bh), 34, (0.07, 0.07, 0.085, 0.93), (1, 1, 1, 0.10)),
            ("rect", (bw - 2, 62, bw + 4, 94), tuple(ctx.accent) + (1,)),
            ("text", (bw - 14, 90), sender, font("sans", 31, 700), tuple(ctx.hl) + (1,), "rs"),
            ("text", (66, 90), when, font("sans", 28, 400), (0.6, 0.6, 0.62, 1), "ls"),
        ], shadow=0.75, blur=22)
        # bake the body text into the bubble layer
        tmp = Layer(im_layer.p.copy(), im_layer.a.copy())
        body.draw(tmp.p, (bw + 60) / 2, 30 + 118 + body.height / 2, 10, mode="none")
        self.layer = tmp

    def draw(self, f, t, op):
        u = (t - self.at) / 0.32
        if u <= 0 or op <= 0:
            return
        k = 0.86 + 0.14 * ease_out_back(u)
        lay = self.layer.scaled(k) if u < 1 else self.layer
        a = min(1.0, u * 2.2) * op
        blit(f, lay, CX - lay.w / 2, 700 - lay.h / 2 + (1 - min(u, 1)) * 30, a)


class ImageScene(Seg):
    def __init__(self, ctx, sc, auto_move, hook=False, first=False):
        self.hook = hook
        self.sc = sc
        self.focus = sc.get("focus", [0.5, 0.5])
        self.src = look.load_graded(ctx.path(sc["image"]), overscan=1.25)
        self.move = sc.get("move", "push" if hook else auto_move)
        self.fx = set(as_list(sc.get("effect", sc.get("effects"))))
        self.trans_in = sc.get("transition", "glitch" if hook else ("dip" if first else "fade"))
        lead = FADE if self.trans_in == "fade" else 0.25
        self.lead = lead
        text = sc.get("text")
        self.caption = None
        if text and hook:
            self.caption = TextBlock(text, "sans", 900, 86, (1, 1, 1), ctx.hl, max_w=860, line_h=1.22)
        elif text:
            self.caption = TextBlock(text, "sans", 800, 60, (1, 1, 1), ctx.hl, max_w=800)
        stamp = sc.get("stamp")
        self.stamp = Stamp(ctx, stamp, start=lead + 0.05) if stamp else None
        self.message = Message(ctx, sc["message"], at=lead + 0.45) if sc.get("message") else None
        self.voice = sc.get("voice")
        # ---- duration
        d = 3.2
        if self.caption is not None:
            n = len(str(text).replace("*", "").replace(" ", ""))
            if hook:
                d = max(d, self.caption.words_end(0.35) + 1.4)
            else:
                d = max(d, lead + 1.5 + 0.065 * n)
        if self.message:
            n = len(str(self.message_text(sc["message"])))
            d = max(d, self.message.at + 1.6 + 0.05 * n)
        if self.stamp:
            d = max(d, self.stamp.end() + 1.6)
        d = min(d, 8.0) + FADE
        if self.voice:
            d = max(d, lead + 0.2 + sound.audio_length(ctx.path(self.voice)) + 0.5 + FADE)
        super().__init__(ctx, sc.get("duration", d))
        # ---- sound
        if self.stamp:
            self.sfx += self.stamp.ticks()
        if self.message:
            self.sfx.append((self.message.at - 0.05, "buzz", 0.5, None))
        if "heartbeat" in self.fx:
            self.sfx.append((0.0, "heartbeat", 0.4, self.dur))
        if self.trans_in == "flash":
            self.sfx.append((0.0, "hit", 0.75, None))
        if self.trans_in == "glitch" or "glitch" in self.fx:
            self.sfx.append((0.0, "glitch", 0.45, 0))
        if "glitch" in self.fx:
            for k, p in enumerate(self.glitch_times()):
                self.sfx.append((p, "glitch", 0.3, k + 1))
        if sc.get("hit"):
            self.sfx.append((0.0, "hit", 0.7, None))
        if self.voice:
            self.sfx.append((lead + 0.2, "voice", 1.0, ctx.path(self.voice)))
        if hook:
            self.sfx.append((0.0, "hit", 0.55, None))
            self.bed = 0.8

    @staticmethod
    def message_text(m):
        return m if isinstance(m, str) else m.get("text", "")

    def glitch_times(self):
        return [self.dur * 0.42, self.dur * 0.74]

    # ---- camera
    def window(self, t):
        sw, sh = self.src.size
        S = 1.25
        p = min(max(t / self.dur, 0), 1)
        fx, fy = self.focus
        mv = self.move
        ux, uy = None, None
        if mv == "zoom_in":
            z = 1.0 + 0.15 * p
        elif mv == "zoom_out":
            z = 1.15 - 0.15 * p
        elif mv == "push":
            z = 1.0 + 0.28 * p ** 1.3
        elif mv in ("pan_left", "pan_right"):
            z = 1.14 + 0.03 * p
            ux = 0.78 - 0.56 * p if mv == "pan_left" else 0.22 + 0.56 * p
        elif mv in ("pan_up", "pan_down"):
            z = 1.14 + 0.03 * p
            uy = 0.75 - 0.5 * p if mv == "pan_up" else 0.25 + 0.5 * p
        else:  # still
            z = 1.03 + 0.012 * p
        dx = dy = 0.0
        if "shake" in self.fx:
            z *= 1.05
            dx = 9 * S * (math.sin(2 * math.pi * 1.7 * t) + 0.6 * math.sin(2 * math.pi * 4.3 * t + 1.3))
            dy = 7 * S * (math.sin(2 * math.pi * 1.3 * t + 0.7) + 0.5 * math.sin(2 * math.pi * 3.9 * t + 2.1))
        if "heartbeat" in self.fx:
            z *= 1 + 0.018 * beat_env(t)
        ww, wh = W * S / z, H * S / z
        cx = ww / 2 + ux * (sw - ww) if ux is not None else fx * sw
        cy = wh / 2 + uy * (sh - wh) if uy is not None else fy * sh
        cx = min(max(cx + dx, ww / 2), sw - ww / 2)
        cy = min(max(cy + dy, wh / 2), sh - wh / 2)
        return (cx - ww / 2, cy - wh / 2, cx + ww / 2, cy + wh / 2)

    def text_opacity(self, t):
        if self.trans_out in ("cut", "flash"):
            return 1.0
        end = self.dur - (FADE if self.trans_out == "fade" else 0.35)
        return 1 - ease_in_out((t - (end - 0.3)) / 0.3)

    def render(self, t, fi):
        ctx = self.ctx
        im = self.src.resize((W, H), Image.BICUBIC, box=self.window(t))
        f = look.to_float(im)
        if "flashback" in self.fx:
            f = look.flashback(f)
        if "red" in self.fx:
            f = look.red_tint(f, 0.75 + 0.25 * math.sin(t * 5))
        if "flicker" in self.fx:
            rng = np.random.default_rng(fi * 7 + 3)
            f *= rng.uniform(0.35, 0.75) if rng.random() < 0.13 else 1 - 0.06 * rng.random()
        if "glitch" in self.fx:
            for g in [0.0] + self.glitch_times():
                if g <= t < g + 0.14:
                    f = look.glitch(f, fi, 0.8)
        f *= ctx.vignette
        if "rain" in self.fx:
            off = int(H - (t * 1700) % H)
            f += ctx.rain[off:off + H] * np.array([0.55, 0.6, 0.7], np.float32) * 0.5
        if "heartbeat" in self.fx:
            k = 0.5 * min(beat_env(t), 1.0)
            f = f * (1 - ctx.edge * k) + ctx.edge * k * ctx.accent * 0.55
        op = self.text_opacity(t)
        if ctx.badge is not None and not self.hook:
            blit(f, ctx.badge, HEADER_RIGHT - ctx.badge.w + 16, 200, 0.85)
        if self.stamp:
            self.stamp.draw(f, t, op)
        if self.message:
            self.message.draw(f, t, op)
        if self.caption is not None:
            if self.hook:
                self.caption.draw(f, CX, 930, t, mode="words", start=0.35, op=op, rise=12)
            else:
                self.caption.draw(f, CX, CAPTION_Y, t, mode="lines", start=self.lead + 0.05, op=op)
        return f


class TextCard(Seg):
    """'72 hours earlier...' style intertitle."""
    trans_in = "dip"
    bed = 0.65

    def __init__(self, ctx, sc):
        self.trans_in = sc.get("transition", "dip")
        self.block = TextBlock(sc["card"], "serif", 800, 100, (1, 1, 1), ctx.hl, max_w=900, line_h=1.2)
        self.bg = None
        if sc.get("image"):
            im = look.load_graded(ctx.path(sc["image"]), overscan=1.1).filter(ImageFilter.GaussianBlur(14))
            self.bg = im
        n = len(str(sc["card"]))
        super().__init__(ctx, sc.get("duration", min(2.0 + 0.05 * n, 4.0)))
        self.sfx.append((0.05, "hit", 0.35, 0.8))

    def render(self, t, fi):
        if self.bg is not None:
            sw, sh = self.bg.size
            z = 1.0 + 0.05 * t / self.dur
            ww, wh = sw / z, sh / z
            f = look.to_float(self.bg.resize((W, H), Image.BILINEAR,
                                              box=((sw - ww) / 2, (sh - wh) / 2, (sw + ww) / 2, (sh + wh) / 2))) * 0.3
            f *= self.ctx.vignette
        else:
            f = np.zeros((H, W, 3), np.float32)
        self.block.draw(f, CX, 930, t, mode="fade", start=0.12, rise=10)
        w = int(240 * ease_out((t - 0.35) / 0.6))
        if w > 2:
            y = int(930 + self.block.height / 2 + 50)
            f[y:y + 4, CX - w // 2:CX + w // 2] = self.ctx.accent
        return f


class TitleCard(Seg):
    trans_in = "cut"
    bed = 0.0
    HIT = 0.42

    def __init__(self, ctx, bg_path):
        super().__init__(ctx, 3.9)
        s = ctx.s
        self.bg = None
        if bg_path:
            self.bg = look.load_graded(bg_path, overscan=1.12).filter(ImageFilter.GaussianBlur(20))
        white, grey = (1, 1, 1), (0.74, 0.74, 0.76)
        self.name = text_layer(s["name"], "serif", 900, 104, white, shadow=0.9)
        self.tag = text_layer(s["tagline"], "sans", 400, 34, grey, shadow=0.8)
        self.season = text_layer(f"עונה {ctx.season}", "sans", 700, 56, tuple(ctx.accent), shadow=0.9,
                                 glow=(tuple(ctx.accent), 0.25, 14))
        self.num = text_layer(f"פרק {ctx.episode}", "serif", 900, 210, white, shadow=0.9, blur=24)
        title = ctx.ep.get("title")
        self.title = TextBlock(title, "serif", 700, 72, white, ctx.hl, max_w=880, line_h=1.2) if title else None
        self.sfx.append((self.HIT, "braam", 1.0, None))

    def render(self, t, fi):
        ctx = self.ctx
        h = self.HIT
        f = np.zeros((H, W, 3), np.float32)
        if t < h:
            return f
        u = t - h
        if self.bg is not None:
            sw, sh = self.bg.size
            z = 1.0 + 0.06 * u / self.dur
            ww, wh = sw / z, sh / z
            bg = look.to_float(self.bg.resize((W, H), Image.BILINEAR,
                                              box=((sw - ww) / 2, (sh - wh) / 2, (sw + ww) / 2, (sh + wh) / 2)))
            f = bg * 0.3 * ease_out(u / 0.5) * ctx.vignette
        lay, x, y = centered(self.name, CX, 610)
        blit(f, lay, x, y - (1 - ease_out(u / 0.5)) * 14, ease_out(u / 0.35))
        lay, x, y = centered(self.tag, CX, 684)
        blit(f, lay, x, y, ease_out((u - 0.25) / 0.5))
        lay, x, y = centered(self.season, CX, 880)
        blit(f, lay, x, y + (1 - ease_out((u - 0.3) / 0.4)) * 20, ease_out((u - 0.3) / 0.35))
        un = u - 0.3
        if un > 0:
            k = 1 + 0.38 * (1 - ease_out(un / 0.24))
            lay0, x0, y0 = centered(self.num, CX, 1085)
            lay = lay0.scaled(k)
            cxl, cyl = x0 + lay0.w / 2, y0 + lay0.h / 2
            blit(f, lay, cxl - lay.w / 2, cyl - lay.h / 2, min(1, un / 0.07))
        w = int(460 * ease_out((u - 0.5) / 0.55))
        if w > 2:
            f[1138:1144, CX - w // 2:CX + w // 2] = ctx.accent
        if self.title is not None:
            self.title.draw(f, CX, 1238 + (self.title.n_lines - 1) * 40, u, mode="lines", start=0.75, rise=14)
        if u < 0.3:
            f = f + (1 - f) * (0.85 * (1 - u / 0.3) ** 2)
        if 0.3 <= u < 0.42 or u < 0.1:
            f = look.glitch(f, fi + 999, 0.6)
        return f


class ContinueCard(Seg):
    trans_in = "cut"
    bed = 0.0

    def __init__(self, ctx):
        super().__init__(ctx, 3.9)
        s = ctx.s
        self.main = text_layer(s["continue_text"], "serif", 800, 112, (1, 1, 1), shadow=0.9)
        self.dot = text_layer(".", "serif", 800, 112, (1, 1, 1), shadow=0.9)
        nxt = ctx.ep.get("next")
        self.next = text_layer(nxt, "sans", 700, 48, tuple(ctx.hl), shadow=0.8) if nxt else None
        cta = s.get("cta")
        self.cta = text_layer(cta, "sans", 400, 36, (0.75, 0.75, 0.78), shadow=0.8) if cta else None
        self.sfx.append((self.BEAT, "hit", 0.95, None))

    BEAT = 0.4  # silence + black after the cliffhanger cut

    def render(self, t, fi):
        ctx = self.ctx
        if t < self.BEAT:
            return np.zeros((H, W, 3), np.float32)
        t -= self.BEAT
        f = ctx.glow * ctx.accent * (0.05 + 0.03 * math.sin(t * 2.0))
        f = np.broadcast_to(f, (H, W, 3)).copy()
        lay, pad, adv, asc = self.main
        dadv = self.dot[2]
        total = adv + dadv * 3
        xr = CX + total / 2
        k = 1.06 - 0.06 * ease_out(t / 1.4)
        a = ease_out((t - 0.08) / 0.35)
        L = lay.scaled(k)
        bx, by = xr - adv - pad, 930 - asc - pad
        blit(f, L, bx + lay.w / 2 - L.w / 2, by + lay.h / 2 - L.h / 2, a)
        for i in range(3):
            if t > 0.55 + i * 0.28:
                dl, dp, da, das = self.dot
                blit(f, dl, xr - adv - (i + 1) * dadv - dp, 930 - das - dp, ease_out((t - 0.55 - i * 0.28) / 0.15))
        w = int(320 * ease_out((t - 0.4) / 0.6))
        if w > 2:
            f[985:990, CX - w // 2:CX + w // 2] = ctx.accent
        if self.next:
            lay, x, y = centered(self.next, CX, 1075)
            blit(f, lay, x, y + (1 - ease_out((t - 1.2) / 0.4)) * 12, ease_out((t - 1.2) / 0.4))
        if self.cta:
            lay, x, y = centered(self.cta, CX, 1150)
            blit(f, lay, x, y, ease_out((t - 1.7) / 0.5))
        return f


class DisclaimerCard(Seg):
    trans_in = "dip"
    bed = 0.45

    def __init__(self, ctx):
        d = ctx.s["disclaimer"]
        super().__init__(ctx, 6.2)
        acc = tuple(ctx.accent)
        lab_f = font("sans", 44, 800)
        label = d.get("label", "מבוסס על סיפור אמיתי")
        lw = lab_f.getlength(label, direction="rtl")
        cw = int(lw + 260)
        self.label = canvas_layer((cw, 100), [
            ("text", (cw / 2, 66), label, lab_f, tuple(ctx.hl) + (1,), "ms"),
            ("rect", (cw / 2 + lw / 2 + 26, 47, cw / 2 + lw / 2 + 96, 50), acc + (1,)),
            ("rect", (cw / 2 - lw / 2 - 96, 47, cw / 2 - lw / 2 - 26, 50), acc + (1,)),
        ], shadow=0.6, blur=8, glow=(tuple(ctx.hl), 0.35, 16))
        self.lines = []
        for line in d.get("lines", []):
            size = 42
            while font("sans", size, 400).getlength(line, direction="rtl") > 940 and size > 26:
                size -= 2
            self.lines.append(text_layer(line, "sans", 400, size, (0.9, 0.9, 0.92), shadow=0.7))
        self.logo = text_layer(ctx.s["name"], "serif", 900, 72, (1, 1, 1), shadow=0.9)
        self.ep_lab = text_layer(f"עונה {ctx.season} · פרק {ctx.episode}", "sans", 400, 30, (0.65, 0.65, 0.68))
        edge = Image.new("RGBA", (40, 80), (0, 0, 0, 0))
        g = np.exp(-((np.arange(40) - 20) / 6.0) ** 2)
        arr = np.zeros((80, 40, 4), np.uint8)
        arr[..., 0], arr[..., 1], arr[..., 2] = [int(c * 255) for c in ctx.hl]
        arr[..., 3] = (np.outer(np.hanning(80), g) * 255).astype(np.uint8)
        self.edge = Layer.from_pil(Image.fromarray(arr, "RGBA"))
        self.sfx.append((0.15, "hit", 0.35, 0.75))
        for i in range(len(self.lines)):
            self.sfx.append((1.0 + i * 0.75, "whoosh", 0.12, None))

    def render(self, t, fi):
        ctx = self.ctx
        f = np.broadcast_to(ctx.glow * ctx.accent * (0.06 + 0.025 * math.sin(t * 1.6)), (H, W, 3)).copy()
        # neon flicker for the label
        if t > 0.15:
            rng = np.random.default_rng(fi + 77)
            if t < 0.8:
                a = 1.0 if rng.random() < 0.55 else 0.15
            else:
                a = 1.0
            blit(f, self.label, CX - self.label.w / 2, 770 - 66, a)
        y0 = 925
        for i, (lay, pad, adv, asc) in enumerate(self.lines):
            p = (t - 1.0 - i * 0.75) / 0.75
            if p <= 0:
                continue
            p = ease_in_out(p)
            x = CX - adv / 2 - pad
            y = y0 + i * 74 - asc - pad
            soft = 50.0
            front = lay.w - p * (lay.w + soft)
            cols = np.clip((np.arange(lay.w) - front) / soft, 0, 1).astype(np.float32)
            blit(f, lay, x, y, 1.0, colmask=cols)
            if p < 1:
                blit(f, self.edge, x + front - 20, y + pad + asc - 52, (1 - p) ** 0.4)
        u = t - 3.5
        if u > 0:
            a = ease_out(u / 0.7)
            lay, x, y = centered(self.logo, CX, 1330)
            blit(f, lay, x, y + (1 - a) * 12, a)
            w = int(200 * ease_out((u - 0.2) / 0.6))
            if w > 2:
                f[1362:1366, CX - w // 2:CX + w // 2] = ctx.accent
            lay, x, y = centered(self.ep_lab, CX, 1420)
            blit(f, lay, x, y, ease_out((u - 0.4) / 0.6))
        return f


# =========================================================================== timeline

class Timeline:
    def __init__(self, ctx, include_disclaimer=True):
        ep = ctx.ep
        scenes = ep.get("scenes") or []
        if not scenes:
            raise SystemExit("episode.yaml: אין סצנות (scenes)")
        first_img = next((s["image"] for s in scenes if s.get("image")), None)
        hook_img = ep.get("hook_image") or first_img
        segs = []
        if ep.get("hook"):
            hk = {"image": hook_img, "text": ep["hook"], "effect": ep.get("hook_effect", ["shake"]),
                  "move": "push", "focus": ep.get("hook_focus", [0.5, 0.5])}
            if ctx.s.get("hook_stamp"):
                hk["stamp"] = ctx.s["hook_stamp"]
            segs.append(ImageScene(ctx, hk, "push", hook=True))
        segs.append(TitleCard(ctx, ctx.path(first_img) if first_img else None))
        mv = 0
        for i, sc in enumerate(scenes):
            if sc.get("card"):
                segs.append(TextCard(ctx, sc))
            else:
                segs.append(ImageScene(ctx, sc, MOVES[mv % len(MOVES)], first=(i == 0)))
                mv += 1
        last = segs[-1]
        if ep.get("riser", True):
            last.sfx.append((max(0.0, last.dur - 2.6), "riser", 0.55, None))
        segs.append(ContinueCard(ctx))
        if include_disclaimer and ep.get("disclaimer", True):
            segs.append(DisclaimerCard(ctx))
        for a, b in zip(segs, segs[1:]):
            a.trans_out = b.trans_in
        self.segs, self.starts = segs, []
        t = 0.0
        for i, s in enumerate(segs):
            if i and s.trans_in == "fade":
                t -= FADE
            self.starts.append(t)
            t += s.dur
        self.total = t
        self.n_frames = int(math.ceil(self.total * FPS))
        self.ctx = ctx

    def frame(self, fi, grain=True):
        T = fi / FPS
        act = [(i, T - s0) for i, s0 in enumerate(self.starts) if s0 <= T < s0 + self.segs[i].dur]
        if not act:
            f = np.zeros((H, W, 3), np.float32)
        elif len(act) == 1 or self.segs[act[-1][0]].trans_in != "fade":
            i, t = act[-1]
            f = self.segs[i].frame(t, fi)
        else:
            (i, ti), (j, tj) = act[-2], act[-1]
            a = ease_in_out(tj / FADE)
            f = self.segs[i].frame(ti, fi) * (1 - a) + self.segs[j].frame(tj, fi) * a
        if grain:
            f = f + self.ctx.grain[(fi // 2) % len(self.ctx.grain)] * 0.03
        return (np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)

    # ---------------------------------------------------------------- audio
    def audio(self, path):
        ctx = self.ctx
        mix = sound.Mixer(self.total)
        cache = {}

        def get(kind, extra):
            key = (kind, round(extra, 2) if kind == "heartbeat" else extra)
            if key not in cache:
                if kind == "braam":
                    cache[key] = sound.braam()
                elif kind == "hit":
                    cache[key] = sound.hit(pitch=extra or 1.0)
                elif kind == "riser":
                    cache[key] = sound.riser()
                elif kind == "buzz":
                    cache[key] = sound.buzz()
                elif kind == "tick":
                    cache[key] = sound.tick(extra or 0)
                elif kind == "glitch":
                    cache[key] = sound.glitch_sfx(extra or 0)
                elif kind == "whoosh":
                    cache[key] = sound.whoosh()
                elif kind == "heartbeat":
                    cache[key] = sound.heartbeat(extra)
            return cache[key]

        for s0, seg in zip(self.starts, self.segs):
            for t, kind, gain, extra in seg.sfx:
                if kind == "voice":
                    mix.add(s0 + t, sound.load_audio(extra), gain, voice=True)
                else:
                    mix.add(s0 + t, get(kind, extra), gain)
        if ctx.ep.get("voiceover"):  # one narration file for the whole episode, starts with the first scene
            first = next(i for i, s in enumerate(self.segs) if isinstance(s, TitleCard)) + 1
            mix.add(self.starts[first] + float(ctx.ep.get("voiceover_offset", 0.3)),
                    sound.load_audio(ctx.path(ctx.ep["voiceover"])), 1.0, voice=True)
        # ---- bed (music if given, otherwise the signature drone), gated per segment
        n = mix.n
        env = np.zeros(n)
        for s0, seg in zip(self.starts, self.segs):
            i0, i1 = int(s0 * sound.SR), int((s0 + seg.dur) * sound.SR)
            env[i0:i1] = seg.bed
        k = int(0.06 * sound.SR)
        env = np.convolve(env, np.ones(k) / k, mode="same")
        music = ctx.ep.get("music") or ctx.s.get("music")
        if music:
            m = sound.load_audio(ctx.path(music))
            reps = int(math.ceil(n / len(m)))
            bed = sound.norm(np.tile(m, (reps, 1))[:n], 0.55)
        else:
            bed = sound.drone(self.total) * 0.26
        mix.render(path, bed=bed * env[:, None])


# =========================================================================== cover

def render_cover(ctx, out_path):
    ep = ctx.ep
    scenes = ep.get("scenes") or []
    pick = next((s["image"] for s in scenes if s.get("cover")), None) or ep.get("cover") \
        or ep.get("hook_image") or next((s["image"] for s in scenes if s.get("image")), None)
    if pick:
        im = look.load_graded(ctx.path(pick), overscan=1.0)
        sw, sh = im.size
        im = im.crop(((sw - W) // 2, (sh - H) // 2, (sw - W) // 2 + W, (sh - H) // 2 + H))
        f = look.to_float(im) * 0.62 * ctx.vignette
    else:
        f = np.zeros((H, W, 3), np.float32)
    f = f * (1 - 0.45 * ctx.glow)  # darker center for the type
    white = (1, 1, 1)
    lay, x, y = centered(text_layer(ctx.s["name"], "serif", 900, 92, white, shadow=0.9), CX, 520)
    blit(f, lay, x, y)
    f[556:561, CX - 130:CX + 130] = ctx.accent
    lay, x, y = centered(text_layer(f"עונה {ctx.season}", "sans", 700, 58, tuple(ctx.accent), shadow=0.9,
                                    glow=(tuple(ctx.accent), 0.25, 14)), CX, 820)
    blit(f, lay, x, y)
    lay, x, y = centered(text_layer(f"פרק {ctx.episode}", "serif", 900, 250, white, shadow=0.95, blur=26), CX, 1065)
    blit(f, lay, x, y)
    if ep.get("title"):
        tb = TextBlock(ep["title"], "serif", 700, 76, white, ctx.hl, max_w=880, line_h=1.2)
        tb.draw(f, CX, 1210 + (tb.n_lines - 1) * 42, 10, mode="none")
    lay, x, y = centered(text_layer(ctx.s.get("hook_stamp") or ctx.s["tagline"], "sans", 500, 34,
                                    (0.78, 0.78, 0.8), shadow=0.8), CX, 1440)
    blit(f, lay, x, y)
    f = f + ctx.grain[0] * 0.035
    Image.fromarray((np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out_path, quality=93)


# =========================================================================== main

_TL = None


def _work(job):
    a, b, part = job
    tl = _TL
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-c:v", "libx264", "-preset", "medium",
           "-crf", "20", "-maxrate", "14M", "-bufsize", "28M", "-pix_fmt", "yuv420p", "-profile:v", "high", "-g", "60",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", part]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fi in range(a, b):
        p.stdin.write(tl.frame(fi).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("ffmpeg failed on " + part)
    return part


def contact_sheet(tl, out_path, n=12):
    times = np.linspace(0.6, tl.total - 0.4, n)
    tw, th = 270, 480
    sheet = Image.new("RGB", (tw * 6, th * ((n + 5) // 6)), (0, 0, 0))
    for k, T in enumerate(times):
        im = Image.fromarray(tl.frame(int(T * FPS))).resize((tw, th), Image.LANCZOS)
        sheet.paste(im, ((k % 6) * tw, (k // 6) * th))
    sheet.save(out_path, quality=90)


def main():
    global _TL
    ap = argparse.ArgumentParser()
    ap.add_argument("episode_dir")
    ap.add_argument("--out", default=None)
    ap.add_argument("--workers", type=int, default=min(4, os.cpu_count() or 2))
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--frames-only", action="store_true")
    ap.add_argument("--frame", type=float, action="append", help="dump a single frame at this second")
    args = ap.parse_args()

    t0 = time.time()
    ctx = Ctx(args.episode_dir)
    out_dir = args.out or os.path.join(ctx.root, "output")
    os.makedirs(out_dir, exist_ok=True)
    tl = Timeline(ctx)
    _TL = tl
    print(f"{ctx.code}: {len(tl.segs)} segments, {tl.total:.1f}s, {tl.n_frames} frames")

    if args.frame:
        for T in args.frame:
            p = os.path.join(out_dir, f"{ctx.code}_t{T:05.2f}.png")
            Image.fromarray(tl.frame(int(T * FPS))).save(p)
            print("frame ->", p)
        return
    if args.preview or args.frames_only:
        p = os.path.join(out_dir, f"{ctx.code}_preview.jpg")
        contact_sheet(tl, p)
        print("preview ->", p)
    cover = os.path.join(out_dir, f"{ctx.code}_cover.jpg")
    render_cover(ctx, cover)
    print("cover ->", cover)
    if args.frames_only:
        return

    tmp = tempfile.mkdtemp(prefix="ep_")
    try:
        wav = os.path.join(tmp, "audio.wav")
        tl.audio(wav)
        print(f"audio ready ({time.time() - t0:.0f}s)")
        n = tl.n_frames
        k = max(1, args.workers)
        bounds = [round(n * i / k) for i in range(k + 1)]
        jobs = [(bounds[i], bounds[i + 1], os.path.join(tmp, f"part{i}.mp4")) for i in range(k)]
        if k == 1:
            parts = [_work(jobs[0])]
        else:
            with get_context("fork").Pool(k) as pool:
                parts = pool.map(_work, jobs)
        lst = os.path.join(tmp, "list.txt")
        with open(lst, "w") as fh:
            fh.writelines(f"file '{p}'\n" for p in parts)
        out = os.path.join(out_dir, f"{ctx.code}.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav,
                        "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                        "-ar", "48000", "-shortest", "-movflags", "+faststart", out], check=True)
        print(f"done -> {out}  ({time.time() - t0:.0f}s)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
