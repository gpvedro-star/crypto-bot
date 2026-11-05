#!/usr/bin/env python3
"""Narration-driven episode renderer (the series format from episode 1 on).

    python3 engine/reel.py episodes/s01e01                 # mp4 + srt + narration + timing + cover
    python3 engine/reel.py episodes/s01e01 --preview       # + contact sheet
    python3 engine/reel.py episodes/s01e01 --timing-only   # just print / write the timing (fast)
    python3 engine/reel.py episodes/s01e01 --frame 12.5    # dump one frame

Everything is anchored to the narration: "L3:נתלים" = the moment the word is spoken,
"L1:end+0.6" = 0.6s after line 1 ends, "S02" = start of shot S02, marks by name.
"""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from multiprocessing import get_context

import numpy as np
import yaml
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import look      # noqa: E402
import music     # noqa: E402
import sfx       # noqa: E402
import sound     # noqa: E402
from narration import Narration, clean_word  # noqa: E402
from typo import (Layer, blit, canvas_layer, ease_in_out, ease_out, font,  # noqa: E402
                  text_layer)

W, H, FPS = 1080, 1920, 30
SCALE = 1.5   # source oversampling for sharp zooms
SR = sound.SR


def hexcol(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def ease(u, kind="inout"):
    u = min(max(u, 0.0), 1.0)
    if kind == "in":
        return u ** 2.2
    if kind == "out":
        return 1 - (1 - u) ** 2.2
    if kind == "linear":
        return u
    return 0.5 - 0.5 * math.cos(math.pi * u)


# =========================================================================== anchors

class Anchors:
    RX = re.compile(r"^\s*([^+\-]+?)\s*(([+\-]\s*[\d.]+)*)\s*$")

    def __init__(self, nar, marks):
        self.nar = nar
        self.marks = dict(marks or {})
        self.shots = {}
        self.cache = {}

    def __call__(self, v):
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        s = str(v)
        if s in self.cache:
            return self.cache[s]
        m = self.RX.match(s)
        if not m:
            raise SystemExit(f"bad time anchor: {s}")
        base, offs = m.group(1).strip(), m.group(2) or ""
        off = sum(float(x.replace(" ", "")) for x in re.findall(r"[+\-]\s*[\d.]+", offs))
        t = self._base(base) + off
        self.cache[s] = t
        return t

    def _base(self, b):
        try:
            return float(b)
        except ValueError:
            pass
        if b in self.shots:
            return self.shots[b]
        if b in self.marks:
            return self(self.marks[b])
        mm = re.match(r"^L(\d+):(.+)$", b)
        if mm:
            li = int(mm.group(1)) - 1
            what = mm.group(2)
            if what == "start":
                return self.nar.line_span(li)[0]
            if what == "end":
                return self.nar.line_span(li)[1]
            end = what.endswith(".end")
            what = what[:-4] if end else what
            nth = 1
            if "#" in what:
                what, n = what.split("#")
                nth = int(n)
            w = self.nar.find(li, what, nth)
            return w["t1"] if end else w["t0"]
        raise SystemExit(f"unknown anchor: {b}")


# =========================================================================== shots

_SRC_CACHE = {}


class Shot:
    def __init__(self, ep, cfg, A):
        self.cfg, self.id = cfg, cfg["id"]
        self.start = A(cfg["at"])
        key = (ep.path(cfg["image"]), cfg.get("grade", "noir"), cfg.get("haze", 0.0), cfg.get("exposure", 1.0))
        if key not in _SRC_CACHE:
            _SRC_CACHE[key] = look.load_source(key[0], SCALE, key[1], key[2], key[3])
        self.src = _SRC_CACHE[key]
        self.trans = cfg.get("transition", "cut")  # cut | fade:0.25 | dip:0.3
        self.fx = set(cfg.get("effects", []) or [])
        self.caption_y = cfg.get("caption_y")
        self.end = None
        self.A = A

    def resolve(self):
        A = self.A
        self.keys = []
        for k in self.cfg.get("cam", [{"t": self.id, "c": [0.5, 0.5], "z": 1.0}]):
            self.keys.append((A(k["t"]), k["c"][0], k["c"][1], float(k["z"]), k.get("ease", "inout"), float(k.get("r", 0.0))))
        self.keys.sort(key=lambda k: k[0])
        fz = self.cfg.get("freeze")
        self.freeze = None
        if fz:
            self.freeze = {"t": A(fz["at"]), "target": fz["target"], "label": fz.get("label"),
                           "label_t": A(fz.get("label_at", fz["at"])), "arrow_from": fz.get("arrow_from", [300, -330])}
        nt = self.cfg.get("note")
        self.note = None
        if nt:
            self.note = {"text": nt["text"], "t": A(nt.get("at", self.id + "+0.15")), "y": float(nt.get("y", 330)),
                         "size": int(nt.get("size", 92))}
        st = self.cfg.get("stamp")
        self.stamp = None
        if st:
            self.stamp = {"text": st["text"], "t": A(st["at"]), "until": A(st.get("until", self.id + "+99"))}

    def cam(self, T):
        ks = self.keys
        r = 0.0
        if T <= ks[0][0]:
            _, cx, cy, z, _, r = ks[0]
        elif T >= ks[-1][0]:
            _, cx, cy, z, _, r = ks[-1]
        else:
            for a, b in zip(ks, ks[1:]):
                if a[0] <= T <= b[0]:
                    u = ease((T - a[0]) / max(b[0] - a[0], 1e-6), b[4])
                    cx = a[1] + (b[1] - a[1]) * u
                    cy = a[2] + (b[2] - a[2]) * u
                    z = math.exp(math.log(a[3]) + (math.log(b[3]) - math.log(a[3])) * u)
                    r = a[5] + (b[5] - a[5]) * u
                    break
        return cx, cy, z, r

    def window(self, T, zmul=1.0):
        sw, sh = self.src.size
        Tc = T
        extra_z, pull = 1.0, 0.0
        if self.freeze and T >= self.freeze["t"]:
            Tc = self.freeze["t"]
            u = ease((T - Tc) / 3.5, "out")
            extra_z, pull = 1 + 0.06 * u, 0.25 * u
        cx, cy, z, _ = self.cam(Tc)
        if self.freeze and T >= self.freeze["t"]:
            tx, ty = self.freeze["target"]
            cx, cy = cx + (tx - cx) * pull, cy + (ty - cy) * pull
        z *= extra_z
        dx = dy = 0.0
        if "handheld" in self.fx:
            Th = min(T, self.freeze["t"]) if self.freeze else T
            z *= 1.04
            dx = 7 * SCALE * (math.sin(2 * math.pi * 1.9 * Th) + 0.6 * math.sin(2 * math.pi * 4.7 * Th + 1.3))
            dy = 6 * SCALE * (math.sin(2 * math.pi * 2.3 * Th + 0.7) + 0.5 * math.sin(2 * math.pi * 5.3 * Th + 2.1))
        z *= zmul
        ww, wh = W * SCALE / z, H * SCALE / z
        x = min(max(cx * sw + dx, ww / 2), sw - ww / 2)
        y = min(max(cy * sh + dy, wh / 2), sh - wh / 2)
        return (x - ww / 2, y - wh / 2, x + ww / 2, y + wh / 2)

    def to_screen(self, T, p):
        x0, y0, x1, y1 = self.window(T)
        sw, sh = self.src.size
        return ((p[0] * sw - x0) / (x1 - x0) * W, (p[1] * sh - y0) / (y1 - y0) * H)

    def render(self, T, ep, fi):
        Tr = min(T, self.freeze["t"]) if self.freeze else T
        rot = self.cam(Tr)[3]
        if abs(rot) > 0.01:  # tilted frame: render a larger window, rotate, crop the centre
            th = math.radians(abs(rot))
            m = math.cos(th) + (H / W) * math.sin(th)
            big = self.src.resize((round(W * m), round(H * m)), Image.BICUBIC, box=self.window(T, 1 / m))
            big = big.rotate(rot, resample=Image.BICUBIC)
            l, t = (big.width - W) // 2, (big.height - H) // 2
            f = look.to_float(big.crop((l, t, l + W, t + H)))
        else:
            f = look.to_float(self.src.resize((W, H), Image.BICUBIC, box=self.window(T)))
        f *= ep.vignette
        fz = self.freeze
        if fz and T >= fz["t"]:
            u = T - fz["t"]
            lum = (f @ look.LUMA)[..., None]
            k = 0.55 * ease_out(u / 0.25)
            f = f * (1 - k) + lum * np.array([1.0, 0.97, 0.9], np.float32) * k
            if fz.get("mask") is None:
                hx, hy = self.to_screen(fz["t"], fz["target"])
                yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
                r = np.sqrt((xx - hx) ** 2 + (yy - hy) ** 2)
                fz["mask"] = (0.42 + 0.58 * np.exp(-(r / 300) ** 2))[..., None].astype(np.float32)
                fz["head"] = (hx, hy)
            f *= 1 - (1 - fz["mask"]) * ease_out(u / 0.3)
            if u < 0.14:
                f = f + (1 - f) * 0.65 * (1 - u / 0.14)
            ep.draw_arrow(f, fz, u, T)
        if self.note and self.note["t"] <= T < self.end:
            ep.draw_note(f, self.note, T, self.end)
        if self.stamp and self.stamp["t"] <= T < self.stamp["until"]:
            ep.draw_stamp(f, self.stamp, T)
        return f


# =========================================================================== captions

class Group:
    def __init__(self, ep, words, emph, y_default):
        self.words = words  # list of dict(word, t0, t1, display)
        self.emph = emph    # index into words or None
        self.t0 = words[0]["t0"] - 0.06
        self.t1 = words[-1]["t1"] + 0.6
        size, weight = ep.cap["size"], ep.cap["weight"]
        f = font("sans", size, weight)
        space = f.getlength(" ", direction="rtl")
        self.items = []
        for i, w in enumerate(words):
            col = ep.word_color(w["display"], emphasized=(i == emph))
            wt = weight + (100 if i == emph else 0)
            lay = text_layer(w["display"], "sans", min(900, wt), size, tuple(col), shadow=0.9, blur=11)
            self.items.append(lay)
        # wrap into <= 2 lines inside the safe width
        maxw = ep.cap["max_w"]
        lines, cur, cw = [], [], 0.0
        self.emph_room = 1.13  # the emphasised word gets room to "pop" without touching its neighbours
        for i, (lay, pad, adv, asc) in enumerate(self.items):
            adv = self.slot(i)
            add = adv + (space if cur else 0)
            if cur and cw + add > maxw:
                lines.append(cur)
                cur, cw = [i], adv
            else:
                cur.append(i)
                cw += add
        lines.append(cur)
        if len(lines) > 2:  # rebalance into two lines
            n = len(self.items)
            lines = [list(range(0, (n + 1) // 2)), list(range((n + 1) // 2, n))]
        self.lines = lines
        self.space = space
        self.line_h = size * 1.24
        self.size = size

    def slot(self, i):
        adv = self.items[i][2]
        return adv * self.emph_room if i == self.emph else adv

    def text_lines(self):
        return [" ".join(self.words[i]["display"] for i in l) for l in self.lines]

    def draw(self, f, T, cx, cy, end):
        u = T - self.t0
        a_in = ease_out(u / 0.12)
        a_out = 1.0 if T < end - 0.15 else max(0.0, (end - T) / 0.15)
        a = a_in * a_out
        if a <= 0:
            return
        nl = len(self.lines)
        top_base = cy - (nl - 1) * self.line_h / 2
        rise = (1 - a_in) * 10
        for li, idxs in enumerate(self.lines):
            lw = sum(self.slot(i) for i in idxs) + self.space * (len(idxs) - 1)
            xr = cx + lw / 2
            base = top_base + li * self.line_h + self.size * 0.36
            for i in idxs:
                lay, pad, adv, asc = self.items[i]
                sl = self.slot(i)
                xl = xr - sl
                x, y = xl + (sl - adv) / 2 - pad, base - asc - pad + rise
                if i == self.emph:
                    te = self.words[i]["t0"]
                    v = (T - te) / 0.28
                    k = 1 + 0.12 * math.sin(math.pi * v) if 0 <= v <= 1 else 1.0
                    if k != 1.0:
                        L = lay.scaled(k)
                        x, y = x + lay.w / 2 - L.w / 2, y + lay.h / 2 - L.h / 2
                        lay = L
                blit(f, lay, x, y, a)
                xr = xl - self.space


# =========================================================================== episode

class Episode:
    def __init__(self, ep_dir):
        self.dir = os.path.abspath(ep_dir)
        with open(os.path.join(self.dir, "episode.yaml"), encoding="utf-8") as fh:
            self.cfg = yaml.safe_load(fh)
        c = self.cfg
        sp = os.path.join(os.path.dirname(os.path.dirname(self.dir)), "series.yaml")
        ser = {}
        if os.path.exists(sp):
            with open(sp, encoding="utf-8") as fh:
                ser = yaml.safe_load(fh) or {}
        self.series = c.get("series") or ser.get("name", "")
        self.season, self.number = int(c.get("season", 1)), int(c.get("episode", 1))
        self.code = c.get("output_name", f"episode-{self.number:02d}")
        st = dict(ser.get("style") or {})
        ep_st = c.get("style") or {}
        wc = dict(st.get("word_colors") or {})
        wc.update(ep_st.get("word_colors") or {})
        st.update(ep_st)
        st["word_colors"] = wc
        ec_ser = ser.get("endcard") or {}
        ec_ep = dict(c.get("endcard") or {})
        for key in ("lines", "footer", "dur"):
            if key not in ec_ep and key in ec_ser:
                v = ec_ser[key]
                ec_ep[key] = v.format(name=self.series, episode=self.number, season=self.season) if isinstance(v, str) else v
        c["endcard"] = ec_ep
        self.green = hexcol(st.get("accent", "#33C761"))
        self.cream = hexcol(st.get("text", "#F3E9D2"))
        self.white = np.array([1.0, 0.99, 0.96], np.float32)
        self.colors = {clean_word(k): hexcol(v) for k, v in (st.get("word_colors") or {}).items()}
        self.cap = {"size": st.get("caption_size", 66), "weight": st.get("caption_weight", 800),
                    "max_w": st.get("caption_max_w", 830), "cx": st.get("caption_cx", 525),
                    "cy": st.get("caption_y", 1470)}
        t0 = time.time()
        self.nar = Narration(c["narration"], self.path)
        self.A = A = Anchors(self.nar, c.get("marks"))
        self.shots = []
        for sc in c["shots"]:
            s = Shot(self, sc, A)
            A.shots[s.id] = s.start
            self.shots.append(s)
        for s in self.shots:
            s.resolve()
        self.blackout = A(c.get("blackout", self.nar.end + 0.05))
        self.blackout_fade = float(c.get("blackout_fade", 0.0))  # 0 = hard cut to black
        for a, b in zip(self.shots, self.shots[1:]):
            a.end = b.start
        self.shots[-1].end = self.blackout
        ec = c.get("endcard", {})
        self.end_t = A(ec.get("at", self.blackout + 0.6))
        self.end_dur = float(ec.get("dur", 5.6))
        self.total = self.end_t + self.end_dur
        # ---- outro logo: centred on black after the end card
        lg = c.get("outro_logo") or ser.get("outro_logo")
        self.logo = None
        if lg:
            im = Image.open(self.path(lg["image"])).convert("RGB")
            wpx = int(lg.get("width", 900))
            im = im.resize((wpx, round(wpx * im.height / im.width)), Image.LANCZOS)
            a = np.asarray(im, np.float32) / 255.0
            fe = int(lg.get("feather", 40))  # melt the (near-black) image edge into the black frame
            yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(np.float32)
            d = np.minimum(np.minimum(xx, a.shape[1] - 1 - xx), np.minimum(yy, a.shape[0] - 1 - yy))
            a = a * np.clip(d / max(fe, 1), 0, 1)[..., None]
            self.logo = {"img": Image.fromarray((a * 255 + 0.5).astype(np.uint8)), "t": self.total,
                         "dur": float(lg.get("dur", 3.0)), "cy": float(lg.get("cy", 930)),
                         "push": float(lg.get("push", 0.02)), "hit": float(lg.get("hit_gain", 0.55)),
                         "fade": float(lg.get("fade_out", 0.6))}
            self.total += self.logo["dur"]
        self.n_frames = int(math.ceil(self.total * FPS))
        self.vignette = look.make_vignette()
        self.grain = look.make_grain()
        self._build_captions()
        self._build_overlays(ec)
        print(f"{self.code}: narration {self.nar.end:.2f}s, blackout {self.blackout:.2f}s, total {self.total:.2f}s "
              f"({time.time() - t0:.1f}s setup)")

    def path(self, rel):
        for base in (self.dir, os.path.dirname(self.dir), os.path.dirname(os.path.dirname(self.dir))):
            p = os.path.join(base, rel)
            if os.path.exists(p):
                return p
        raise FileNotFoundError(rel)

    def word_color(self, display, emphasized=False):
        key = clean_word(display)
        if key in self.colors:
            return self.colors[key]
        return self.white if emphasized else self.cream

    # ---------------------------------------------------------------- captions
    def _build_captions(self):
        self.groups = []
        for li, lc in enumerate(self.cfg["narration"]["lines"]):
            words = self.nar.line_words(li)
            cap = lc.get("captions") or lc["text"].replace(" / ", " | ")
            chunks = [c.strip() for c in cap.split("|") if c.strip()]
            k = 0
            for ch in chunks:
                toks = ch.split()
                ws, emph = [], None
                for j, tok in enumerate(toks):
                    if "*" in tok:
                        emph = j
                    disp = tok.replace("*", "")
                    if k >= len(words) or clean_word(words[k]["word"]) != clean_word(disp):
                        raise SystemExit(f"captions of line {li + 1} do not match its text at '{disp}'")
                    ws.append(dict(words[k], display=disp))
                    k += 1
                self.groups.append(Group(self, ws, emph, self.cap["cy"]))
            if k != len(words):
                raise SystemExit(f"captions of line {li + 1} are missing words")
        for a, b in zip(self.groups, self.groups[1:]):
            a.t1 = min(a.t1, b.t0)
        self.groups[-1].t1 = min(self.groups[-1].t1, self.blackout)

    # ---------------------------------------------------------------- overlays
    def _build_overlays(self, ec):
        c = self.cfg
        cream, green = tuple(self.cream), tuple(self.green)
        ti = c.get("title_card", {})
        self.title = None
        if ti is not None:
            self.title = {
                "t0": self.A(ti.get("at", 0.25)), "t1": self.A(ti.get("until", "L1:end-1.2")),
                "name": text_layer(self.series, "serif", 900, 124, green, shadow=0.85, blur=16, glow=(green, 0.3, 18)),
                "ep": text_layer(f"עונה {self.season} · פרק {self.number:02d}", "sans", 500, 38, cream, shadow=0.85),
                "sub": text_layer(c.get("title", ""), "serif", 700, 58, cream, shadow=0.9) if c.get("title") else None,
            }
        lines = ec.get("lines", [])
        self.end_lines = []
        for i, ln in enumerate(lines):
            size, weight = (64, 700) if i == 0 else (50, 400)
            col = cream if i == 0 else tuple(self.cream * 0.9)
            self.end_lines.append(text_layer(ln, "sans", weight, size, col, shadow=0.6))
        self.end_footer = text_layer(ec.get("footer", ""), "sans", 600, 40, green, shadow=0.5) if ec.get("footer") else None
        self.stamp_cache = {}
        self.stamp_sq = canvas_layer((40, 40), [("rect", (12, 12, 27, 27), green + (1,))], shadow=0.6, blur=4)

    def draw_title(self, f, T):
        ti = self.title
        if not ti or not (ti["t0"] - 0.1 <= T <= ti["t1"] + 0.6):
            return
        u = T - ti["t0"]
        out = 1 - ease_in_out((T - ti["t1"]) / 0.5)
        # darken the sky behind the title
        k = 0.45 * min(ease_out(u / 0.4), out)
        f[:700] *= 1 - k * np.linspace(1, 0, 700)[:, None, None] ** 1.2
        lay, pad, adv, asc = ti["name"]
        a = ease_out(u / 0.6) * out
        blit(f, lay, W / 2 - adv / 2 - pad, 360 - asc - pad + (1 - ease_out(u / 0.6)) * 16, a)
        w = int(320 * ease_out((u - 0.25) / 0.6) * out)
        if w > 2:
            f[398:402, W // 2 - w // 2:W // 2 + w // 2] = f[398:402, W // 2 - w // 2:W // 2 + w // 2] * (1 - out) + self.green * out
        lay, pad, adv, asc = ti["ep"]
        blit(f, lay, W / 2 - adv / 2 - pad, 458 - asc - pad, ease_out((u - 0.35) / 0.5) * out)
        if ti["sub"]:
            lay, pad, adv, asc = ti["sub"]
            blit(f, lay, W / 2 - adv / 2 - pad, 532 - asc - pad, ease_out((u - 0.55) / 0.5) * out)

    def draw_stamp(self, f, st, T):
        text = st["text"]
        cps = 16
        n = int(np.clip((T - st["t"]) * cps, 0, len(text)))
        out = 1 - ease_in_out((T - (st["until"] - 0.4)) / 0.4)
        base_y, right = 300, 960
        blit(f, self.stamp_sq, right - 34, base_y - 32, out * ease_out((T - st["t"] + 0.1) / 0.15))
        left = right - 40
        if n:
            if n not in self.stamp_cache:
                self.stamp_cache[n] = text_layer(text[:n], "sans", 500, 40, tuple(self.cream), shadow=0.85, blur=7)
            lay, pad, adv, asc = self.stamp_cache[n]
            blit(f, lay, right - 40 - adv - pad, base_y - asc - pad, out)
            left = right - 40 - adv
        if T < st["t"] + len(text) / cps + 0.8 and int(T * 2.4) % 2 == 0 and out > 0.5:
            f[base_y - 32:base_y + 4, int(left) - 12:int(left) - 8] = 0.95

    def draw_arrow(self, f, fz, u, T):
        hx, hy = fz["head"]
        ax, ay = fz["arrow_from"]
        p0 = np.array([hx + ax, hy + ay], float)
        p2 = np.array([hx + 0.16 * ax, hy + 0.16 * ay], float)  # stop short of the head
        p1 = np.array([p0[0] + 0.05 * ax, p2[1] - 0.15 * ay * -1], float)
        p1 = (p0 + p2) / 2 + np.array([0.28 * abs(ay), -0.18 * abs(ax)])
        prog = ease_out((u - 0.25) / 0.45)
        if prog <= 0:
            return
        ts = np.linspace(0, prog, 40)
        pts = [(1 - s) ** 2 * p0 + 2 * (1 - s) * s * p1 + s * s * p2 for s in ts]
        x0 = int(min(p[0] for p in pts)) - 80
        y0 = int(min(p[1] for p in pts)) - 80
        x1 = int(max(p[0] for p in pts)) + 80
        y1 = int(max(p[1] for p in pts)) + 80
        im = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        col = tuple(int(c * 255) for c in self.cream) + (255,)
        d.line([(p[0] - x0, p[1] - y0) for p in pts], fill=col, width=9, joint="curve")
        if prog >= 0.98:
            tip = pts[-1]
            dirv = pts[-1] - pts[-4]
            dirv = dirv / (np.linalg.norm(dirv) + 1e-6)
            nrm = np.array([-dirv[1], dirv[0]])
            for sgn in (1, -1):
                q = tip - dirv * 38 + nrm * 24 * sgn
                d.line([(tip[0] - x0, tip[1] - y0), (q[0] - x0, q[1] - y0)], fill=col, width=9)
        lay = Layer.from_pil(im, shadow=0.75, blur=8)
        blit(f, lay, x0, y0)
        if fz.get("label") and T >= fz["label_t"]:
            if "label_lay" not in fz:
                fz["label_lay"] = text_layer(fz["label"], "hand", 700, 120, tuple(self.cream), shadow=0.85, blur=10)
            lay, pad, adv, asc = fz["label_lay"]
            v = (T - fz["label_t"]) / 0.3
            k = 0.7 + 0.3 * ease_out(v) + 0.12 * math.sin(math.pi * min(v, 1))
            L = lay.scaled(k)
            cx, cy = p0[0] + 10, p0[1] - 70
            blit(f, L, cx - L.w / 2, cy - L.h / 2, min(1, v * 3))

    def draw_logo(self, f, T):
        lg = self.logo
        u = T - lg["t"]
        a = ease_out(u / 0.22) * (1 - ease_in_out((u - (lg["dur"] - lg["fade"])) / lg["fade"]))
        k = 1 + lg["push"] * min(u / lg["dur"], 1)
        im = lg["img"]
        if k != 1:
            im = im.resize((round(im.width * k), round(im.height * k)), Image.BICUBIC)
        arr = np.asarray(im, np.float32) / 255.0
        x0, y0 = round(W / 2 - im.width / 2), round(lg["cy"] - im.height / 2)
        sx0, sy0 = max(0, -x0), max(0, -y0)
        x0c, y0c = max(0, x0), max(0, y0)
        x1c, y1c = min(W, x0 + im.width), min(H, y0 + im.height)
        f[y0c:y1c, x0c:x1c] = arr[sy0:sy0 + (y1c - y0c), sx0:sx0 + (x1c - x0c)] * a

    def draw_note(self, f, nt, T, end):
        if "lay" not in nt:
            nt["lay"] = text_layer(nt["text"], "hand", 700, nt["size"], tuple(self.cream), shadow=0.9, blur=10)
        lay, pad, adv, asc = nt["lay"]
        a = ease_out((T - nt["t"]) / 0.3) * (1 - ease_in_out((T - (end - 0.2)) / 0.2))
        blit(f, lay, W / 2 - adv / 2 - pad, nt["y"] - asc - pad + (1 - ease_out((T - nt["t"]) / 0.3)) * 8, a)

    def draw_endcard(self, f, T):
        u = T - self.end_t
        y = [860, 972, 1062]
        last = 0.0
        for i, (lay, pad, adv, asc) in enumerate(self.end_lines):
            ti = 0.25 + i * 0.5
            v = ease_out((u - ti) / 0.38)
            if v <= 0:
                continue
            x = W / 2 - adv / 2 - pad + (1 - v) * 70   # slides in from the right
            blit(f, lay, x, y[i] - asc - pad, v)
            last = ti
        if self.end_footer:
            tf = last + 0.65
            v = ease_out((u - tf) / 0.5)
            w = int(140 * v)
            if w > 2:
                f[1166:1170, W // 2 - w // 2:W // 2 + w // 2] = self.green
            lay, pad, adv, asc = self.end_footer
            blit(f, lay, W / 2 - adv / 2 - pad, 1238 - asc - pad, v)
        fo = 1 - ease_in_out((u - (self.end_dur - 0.45)) / 0.45)
        f *= fo

    # ---------------------------------------------------------------- frame
    def shot_at(self, T):
        for s in self.shots:
            if s.start <= T < s.end:
                return s
        return None

    def frame(self, fi):
        T = fi / FPS
        f = np.zeros((H, W, 3), np.float32)
        if T < self.blackout:
            s = self.shot_at(T)
            i = self.shots.index(s)
            f = s.render(T, self, fi)
            # transition into the next shot
            if i + 1 < len(self.shots):
                nx = self.shots[i + 1]
                kind, _, d = (nx.trans + ":0.3").partition(":")
                d = float(d.split(":")[0])
                if kind == "fade" and T > nx.start - d:
                    a = ease_in_out((T - (nx.start - d)) / d)
                    f = f * (1 - a) + nx.render(T, self, fi) * a
                elif kind == "dip" and T > nx.start - d / 2:
                    f = f * ease_in_out((nx.start - T) / (d / 2))
            kind, _, d = (s.trans + ":0.3").partition(":")
            d = float(d.split(":")[0])
            if kind == "dip" and T < s.start + d / 2:
                f = f * ease_in_out((T - s.start) / (d / 2))
            if s is self.shots[0]:
                self.draw_title(f, T)
            g = self.group_at(T)
            if g is not None:
                cy = s.caption_y or self.cap["cy"]
                g.draw(f, T, self.cap["cx"], cy, g.t1)
            bf = self.blackout_fade
            if bf > 0 and T > self.blackout - bf:
                f = f * ease_in_out((self.blackout - T) / bf)
        elif self.logo and T >= self.logo["t"]:
            self.draw_logo(f, T)
            return (np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)  # logo shown as is (no grain)
        elif T >= self.end_t:
            self.draw_endcard(f, T)
        f = f + self.grain[(fi // 2) % len(self.grain)] * 0.026
        return (np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)

    def group_at(self, T):
        for g in self.groups:
            if g.t0 <= T < g.t1:
                return g
        return None

    # ---------------------------------------------------------------- audio
    def audio(self, out_wav, vo_wav):
        A = self.A
        n = int(self.total * SR)
        vo = self.nar.track(self.total)
        vo = sound.norm(vo, 0.9)
        vo_st = np.stack([vo, vo], 1)
        # --- music
        mc = self.cfg.get("music", {})
        secs = []
        for s in mc.get("sections", []):
            d = {"style": s["style"], "t0": A(s["from"]), "t1": A(s["to"]), "gain": s.get("gain", 1.0)}
            if "grid" in s:
                d["grid0"] = A(s["grid"])
            for key in ("fade_in", "fade_out", "highpass"):
                if key in s:
                    d[key] = float(s[key])
            if "tapestop" in s:
                d["tapestop"], d["tapestop_dur"] = A(s["tapestop"]), s.get("tapestop_dur", 0.5)
            secs.append(d)
        evs = [{"kind": e["kind"], "t": A(e["at"]), "dur": A(e["until"]) - A(e["at"]) if "until" in e else e.get("dur", 0.3)}
               for e in mc.get("events", [])]
        mus = music.score(self.total, secs, evs, bpm=mc.get("bpm", 92))[:n]
        # --- ambience + one-shots
        amb = np.zeros((n, 2))
        hits = np.zeros((n, 2))

        def put(buf, t, x, g):
            x = sound.stereo(np.asarray(x, float))
            i = int(t * SR)
            if i >= n:
                return
            j = min(n, i + len(x))
            buf[i:j] += x[: j - i] * g

        for e in self.cfg.get("sfx", []):
            k, t, g = e["kind"], A(e["at"]), float(e.get("gain", 0.4))
            until = A(e["until"]) if "until" in e else None
            if k == "engine":
                d = until - t
                rev = A(e["rev_from"]) - t if "rev_from" in e else None
                x = sfx.engine(d + 0.02, rev_from=rev, rev_len=d - rev if rev else 1.0)
                x[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))[:, None]
                put(amb, t, x, g)
            elif k == "freewheel":
                put(hits, t, sfx.freewheel(e.get("dur", 2.4)), g)
            elif k == "rustle":
                put(hits, t, sfx.rustle(e.get("dur", 1.2)), g)
            elif k == "crinkle":
                put(hits, t, sfx.crinkle(e.get("dur", 0.7)), g)
            elif k == "creak":
                put(hits, t, sfx.creak(e.get("dur", 1.1)), g)
            elif k == "steps_light":
                put(hits, t, sfx.footsteps(until - t, 6.5, seed=3, pan=0.1), g)
            elif k == "steps_heavy":
                put(hits, t, sfx.footsteps(until - t, 2.6, heavy=True, grow=True, seed=4), g)
            elif k == "boom":
                put(hits, t, sfx.low_boom(), g)
            elif k == "shutter":
                put(hits, t, sfx.shutter(), g)
            elif k == "whoosh":
                put(hits, t, sound.whoosh(e.get("dur", 0.7)), g)
            elif k == "room_tone":
                put(amb, t, sfx.room_tone(until - t), g)
            elif k == "drips":
                tt, j = t, 0
                while tt < until:
                    put(amb, tt, sfx.drip(j), g * (0.6 + 0.4 * ((j * 37) % 10) / 10))
                    tt += float(e.get("every", 1.6)) * (0.8 + 0.4 * ((j * 53) % 10) / 10)
                    j += 1
            elif k == "lighter":
                put(hits, t, sfx.lighter(), g)
            elif k == "bubbles":
                put(hits, t, sfx.bubbles(e.get("dur", 1.8)), g)
            elif k in ("street", "waves", "breath", "steps_run"):
                d = until - t
                x = {"street": lambda: sfx.street(d), "waves": lambda: sfx.waves(d),
                     "breath": lambda: sfx.breath(d, float(e.get("rate", 1.7))),
                     "steps_run": lambda: sfx.footsteps(d, float(e.get("rate", 3.2)), seed=7, pan=0.05)}[k]()
                x = sound.stereo(np.asarray(x, float))[: int(d * SR)]
                fi, fo = int(float(e.get("fade_in", 0.05)) * SR), int(float(e.get("fade_out", 0.05)) * SR)
                if fi:
                    x[:fi] *= np.linspace(0, 1, fi)[:, None]
                if fo:
                    x[-fo:] *= np.linspace(1, 0, fo)[:, None]
                put(amb if k in ("street", "waves") else hits, t, x, g)
            elif k == "clink":
                put(hits, t, sfx.clink(), g)
            elif k == "clock_click":
                put(hits, t, sfx.clock_click(), g)
            elif k == "handle":
                put(hits, t, sfx.handle(), g)
            elif k == "tick":
                put(hits, t, sfx.soft_tick(), g)
        # typewriter ticks for stamps + end-card ticks
        for s in self.shots:
            if s.stamp:
                for i, ch in enumerate(s.stamp["text"]):
                    if ch.strip():
                        put(hits, s.stamp["t"] + i / 16, sound.tick(i), 0.07)
        for i in range(len(self.end_lines)):
            put(hits, self.end_t + 0.25 + i * 0.5, sfx.soft_tick(i), 0.12)
        # --- ducking: music under the voice, plus special ducks
        env = np.abs(vo)
        k = int(0.18 * SR)
        env = np.convolve(env, np.ones(k) / k, mode="same")
        env = np.clip(env / (env.max() * 0.3 + 1e-9), 0, 1)
        duck_m = 1 - 0.72 * env
        duck_a = 1 - 0.7 * env
        duck_h = 1 - 0.45 * env
        extra = np.ones(n)
        for dk in self.cfg.get("duck", []):
            t0, t1 = A(dk["from"]), A(dk["to"])
            i0, i1 = int(t0 * SR), int(t1 * SR)
            extra[i0:i1] = min(extra[i0:i1].min(), float(dk.get("level", 0.2)))
        sm = int(0.08 * SR)
        extra = np.convolve(extra, np.ones(sm) / sm, mode="same")
        bed = mus * (float(mc.get("gain", 0.3)) * duck_m * extra)[:, None] + amb * (duck_a * extra)[:, None]
        # hard silence between the blackout and the end card
        b0, b1 = int(self.blackout * SR), int(self.end_t * SR)
        f = int(max(0.01, self.blackout_fade) * SR)
        for buf in (bed, hits):
            buf[b0 - f:b0] *= np.linspace(1, 0, f)[:, None] ** 1.6
            buf[b0:b1] = 0
        # end card: a quiet warm pad under the reading time
        pad_end = self.logo["t"] if self.logo else self.total
        pad = music.section("freeze", self.end_t, pad_end, self.end_t, 92)
        put(bed, self.end_t, pad, 0.09)
        if self.logo:  # low musical hit as the logo lands
            put(hits, self.logo["t"] + 0.02, sfx.logo_hit(), self.logo["hit"])
        mix = vo_st + bed + hits * duck_h[:, None]
        if self.logo:  # fade the tail with the picture
            fo = int(self.logo["fade"] * SR)
            mix[n - fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
        mix = sound.norm(mix, 0.95)
        sound_write(out_wav, mix)
        sound_write(vo_wav, vo_st * 0.95)
        loudnorm(out_wav, -14.0, -1.5)


def sound_write(path, x):
    import wave
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def loudnorm(path, I, TP):
    """Two-pass EBU R128 normalisation in place."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", f"loudnorm=I={I}:TP={TP}:LRA=11:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rfind("{"):r.stderr.rfind("}") + 1])
    tmp = path + ".tmp.wav"
    af = (f"loudnorm=I={I}:TP={TP}:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-af", af, "-ar", str(SR), tmp], check=True)
    os.replace(tmp, path)


# =========================================================================== exports

def fmt_ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(ep, path):
    RLM = "‏"
    with open(path, "w", encoding="utf-8") as fh:
        for i, g in enumerate(ep.groups, 1):
            text = "\n".join(RLM + l + RLM for l in g.text_lines())
            fh.write(f"{i}\n{fmt_ts(g.t0)} --> {fmt_ts(g.t1)}\n{text}\n\n")


def write_timing(ep, path):
    data = {
        "episode": ep.code, "total": round(ep.total, 3), "blackout": round(ep.blackout, 3), "endcard": round(ep.end_t, 3),
        "outro_logo": round(ep.logo["t"], 3) if ep.logo else None,
        "shots": [{"id": s.id, "image": s.cfg["image"], "start": round(s.start, 3), "end": round(s.end, 3),
                   "transition": s.trans} for s in ep.shots],
        "words": [{"line": w["line"] + 1, "word": w["word"], "start": round(w["t0"], 3), "end": round(w["t1"], 3)}
                  for w in ep.nar.words],
        "captions": [{"start": round(g.t0, 3), "end": round(g.t1, 3), "text": " ".join(g.text_lines()),
                      "emphasis": g.words[g.emph]["display"] if g.emph is not None else None} for g in ep.groups],
        "phrase_splits": {ln.id: [round(s, 3) for s in ln.splits] for ln in ep.nar.lines},
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)


def render_cover(ep, path):
    c = ep.cfg.get("cover", {})
    s = next((x for x in ep.shots if x.id == c.get("shot", ep.shots[0].id)), ep.shots[0])
    T = ep.A(c.get("time", s.start + 0.5))
    f = look.to_float(s.src.resize((W, H), Image.BICUBIC, box=s.window(T))) * ep.vignette
    f[:820] *= 1 - 0.55 * np.linspace(1, 0, 820)[:, None, None]
    green, cream = tuple(ep.green), tuple(ep.cream)
    for lay_t, y in [(text_layer(ep.series, "serif", 900, 150, green, shadow=0.9, blur=18, glow=(green, 0.3, 20)), 420),
                     (text_layer(f"פרק {ep.number:02d}", "serif", 900, 96, cream, shadow=0.9), 560),
                     (text_layer(ep.cfg.get("title", ""), "sans", 700, 52, cream, shadow=0.9), 650)]:
        lay, pad, adv, asc = lay_t
        blit(f, lay, W / 2 - adv / 2 - pad, y - asc - pad)
    f[470:475, W // 2 - 150:W // 2 + 150] = ep.green
    f = f + ep.grain[0] * 0.02
    Image.fromarray((np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path, quality=93)


_EP = None


def _work(job):
    a, b, part = job
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-c:v", "libx264", "-preset", "medium",
           "-crf", "20", "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p", "-profile:v", "high", "-g", "60",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", part]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fi in range(a, b):
        p.stdin.write(_EP.frame(fi).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("ffmpeg failed: " + part)
    return part


def contact_sheet(ep, path, times):
    tw, th = 270, 480
    cols = 6
    sheet = Image.new("RGB", (tw * cols, th * ((len(times) + cols - 1) // cols)), (0, 0, 0))
    for k, T in enumerate(times):
        im = Image.fromarray(ep.frame(int(T * FPS))).resize((tw, th), Image.LANCZOS)
        sheet.paste(im, ((k % cols) * tw, (k // cols) * th))
    sheet.save(path, quality=90)


def main():
    global _EP
    ap = argparse.ArgumentParser()
    ap.add_argument("episode_dir")
    ap.add_argument("--out", default=None)
    ap.add_argument("--workers", type=int, default=min(4, os.cpu_count() or 2))
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--timing-only", action="store_true")
    ap.add_argument("--frame", type=float, action="append")
    ap.add_argument("--remix", action="store_true", help="redo only the sound, reuse the rendered picture")
    args = ap.parse_args()
    t0 = time.time()
    ep = Episode(args.episode_dir)
    _EP = ep
    out = args.out or os.path.join(os.path.dirname(os.path.dirname(ep.dir)), "output")
    os.makedirs(out, exist_ok=True)
    base = os.path.join(out, ep.code)
    write_srt(ep, base + ".srt")
    write_timing(ep, base + "_timing.json")
    # keep a copy of the timing next to the episode (versioned with the project)
    shutil.copy(base + ".srt", os.path.join(ep.dir, ep.code + ".srt"))
    shutil.copy(base + "_timing.json", os.path.join(ep.dir, ep.code + "_timing.json"))
    for s in ep.shots:
        print(f"  {s.id}  {s.start:6.2f} → {s.end:6.2f}  {s.cfg['image']}")
    if args.timing_only:
        for g in ep.groups:
            print(f"  [{g.t0:6.2f}-{g.t1:6.2f}] {' / '.join(g.text_lines())}")
        return
    if args.frame:
        for T in args.frame:
            p = f"{base}_t{T:05.2f}.png"
            Image.fromarray(ep.frame(int(round(T * FPS)))).save(p)
            print("frame ->", p)
        return
    if args.remix:
        tmp = tempfile.mkdtemp(prefix="reel_")
        try:
            wav = os.path.join(tmp, "mix.wav")
            ep.audio(wav, base + "_narration.wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", base + ".mp4", "-i", wav, "-map", "0:v", "-map", "1:a",
                            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{ep.n_frames / FPS:.3f}",
                            "-movflags", "+faststart", os.path.join(tmp, "out.mp4")], check=True)
            shutil.move(os.path.join(tmp, "out.mp4"), base + ".mp4")
            print(f"remixed -> {base}.mp4 ({time.time() - t0:.0f}s)")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        return
    render_cover(ep, base + "_cover.jpg")
    if args.preview:
        times = [s.start + min(1.0, (s.end - s.start) * 0.6) for s in ep.shots]
        times += [ep.shots[5].freeze["t"] + 1.5] if len(ep.shots) > 5 and ep.shots[5].freeze else []
        times += [ep.end_t + 3.0]
        contact_sheet(ep, base + "_preview.jpg", sorted(times))
        print("preview ->", base + "_preview.jpg")
    tmp = tempfile.mkdtemp(prefix="reel_")
    try:
        wav = os.path.join(tmp, "mix.wav")
        ep.audio(wav, base + "_narration.wav")
        print(f"audio ready ({time.time() - t0:.0f}s)")
        n, k = ep.n_frames, max(1, args.workers)
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
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav,
                        "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                        "-t", f"{ep.n_frames / FPS:.3f}", "-movflags", "+faststart", base + ".mp4"], check=True)
        print(f"done -> {base}.mp4 ({time.time() - t0:.0f}s)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
