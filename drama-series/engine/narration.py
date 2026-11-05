"""Narration: phrase segmentation, word timing and the final voice-over track.

Each narration line is one audio file. The line text marks phrase boundaries with " / ".
Phrase boundaries are found automatically (the N-1 longest silences inside the line) or
taken from `splits:` (seconds, verified by hand). Word times inside a phrase are spread by
letter count and snapped to the nearest energy dip, which is accurate enough for
caption pops and picture cuts.
"""
import re

import numpy as np

import sound

SR = sound.SR
HOP = 0.01  # analysis hop (s)
PUNCT = "־.,!?…:;\"'״׳()-–—"


def clean_word(w):
    return re.sub(r"[*{}֑-ׇ]", "", w).strip(PUNCT + " ")


def _energy_db(x):
    n = int(HOP * SR)
    m = len(x) // n
    e = np.sqrt(np.mean(x[: m * n].reshape(m, n) ** 2, axis=1))
    return 20 * np.log10(e + 1e-9)


def _gaps(db, min_len=0.03, rel=38):
    thr = db.max() - rel
    act = db > thr
    out, k = [], 0
    while k < len(act):
        if not act[k]:
            j = k
            while j < len(act) and not act[j]:
                j += 1
            if (j - k) * HOP >= min_len:
                out.append((k * HOP, j * HOP))
            k = j
        else:
            k += 1
    return out, act


class Line:
    def __init__(self, cfg, path_fn, idx):
        self.id = cfg.get("id", f"L{idx + 1}")
        self.text = cfg["text"]
        self.phrase_texts = [p.strip() for p in self.text.split(" / ") if p.strip()]
        self.words_display = [w for p in self.phrase_texts for w in p.split()]
        self.audio_path = path_fn(cfg["audio"])
        a = sound.load_audio(self.audio_path).mean(1)
        a = sound.fft_filter(a, lo=70)  # clean rumble, keep the voice
        self.audio = a
        self.dur = len(a) / SR
        db = _energy_db(a)
        gaps, act = _gaps(db)
        idx_act = np.nonzero(act)[0]
        self.v0, self.v1 = idx_act[0] * HOP, (idx_act[-1] + 1) * HOP
        inner = [g for g in gaps if g[0] > self.v0 + 0.05 and g[1] < self.v1 - 0.05]
        n = len(self.phrase_texts)
        if cfg.get("splits"):
            splits = [float(s) for s in cfg["splits"]]
        else:
            best = sorted(inner, key=lambda g: g[1] - g[0], reverse=True)[: n - 1]
            splits = sorted((a_ + b_) / 2 for a_, b_ in best)
        if len(splits) != n - 1:
            raise SystemExit(f"{self.id}: expected {n - 1} phrase splits, found {len(splits)} — add 'splits:' by hand")
        self.splits = splits
        bounds = [0.0] + splits + [self.dur]
        self.phrases = []
        for k, ptxt in enumerate(self.phrase_texts):
            s0, s1 = bounds[k], bounds[k + 1]
            i0, i1 = int(s0 / HOP), int(s1 / HOP)
            seg = act[i0:i1]
            on = np.nonzero(seg)[0]
            p0 = s0 + (on[0] * HOP if len(on) else 0)
            p1 = s0 + ((on[-1] + 1) * HOP if len(on) else (s1 - s0))
            words = ptxt.split()
            weights = np.array([max(1, len(clean_word(w))) + 0.6 for w in words], float)
            edges = p0 + (p1 - p0) * np.concatenate([[0], np.cumsum(weights) / weights.sum()])
            # snap inner word edges to local energy minima (±0.09s)
            for j in range(1, len(edges) - 1):
                c = int(edges[j] / HOP)
                lo, hi = max(c - 9, int(p0 / HOP) + 1), min(c + 10, int(p1 / HOP) - 1)
                if hi > lo:
                    edges[j] = (lo + int(np.argmin(db[lo:hi]))) * HOP
            edges = np.maximum.accumulate(edges)
            ws = [(w, float(edges[j]), float(edges[j + 1])) for j, w in enumerate(words)]
            self.phrases.append({"text": ptxt, "cut0": s0, "cut1": s1, "v0": p0, "v1": p1, "words": ws})


class Narration:
    """Places the lines on the timeline and builds the voice-over track."""

    def __init__(self, cfg, path_fn):
        self.lines = [Line(c, path_fn, i) for i, c in enumerate(cfg["lines"])]
        self.cfg = cfg
        t = float(cfg.get("start", 0.6))
        self.place = []  # per line: list of phrase offsets (absolute time of line-audio t=0 for that phrase)
        prev_end = None
        for lc, line in zip(cfg["lines"], self.lines):
            gap = float(lc.get("gap", cfg.get("gap", 0.4)))
            if prev_end is not None:
                t = prev_end + gap - line.v0
            pauses = {clean_word(k): float(v) for k, v in (lc.get("pause_before") or {}).items()}
            offs, extra = [], 0.0
            for ph in line.phrases:
                first = clean_word(ph["words"][0][0])
                if first in pauses:
                    extra += pauses[first]
                offs.append(t + extra)
            self.place.append(offs)
            prev_end = offs[-1] + line.phrases[-1]["v1"]
        self.end = prev_end
        # absolute word list
        self.words = []  # dict(line, word, t0, t1, phrase)
        for li, (line, offs) in enumerate(zip(self.lines, self.place)):
            for pi, (ph, o) in enumerate(zip(line.phrases, offs)):
                for w, a, b in ph["words"]:
                    self.words.append({"line": li, "phrase": pi, "word": w, "t0": a + o, "t1": b + o})

    def line_words(self, li):
        return [w for w in self.words if w["line"] == li]

    def line_span(self, li):
        ws = self.line_words(li)
        return ws[0]["t0"], ws[-1]["t1"]

    def find(self, li, word, nth=1):
        target = clean_word(word)
        k = 0
        for w in self.line_words(li):
            if clean_word(w["word"]) == target or clean_word(w["word"]).endswith(target) and len(target) > 2:
                k += 1
                if k == nth:
                    return w
        raise SystemExit(f"word '{word}' not found in line {li + 1}")

    def track(self, total):
        out = np.zeros(int(total * SR) + SR)
        for line, offs in zip(self.lines, self.place):
            for ph, o in zip(line.phrases, offs):
                i0, i1 = int(ph["cut0"] * SR), int(ph["cut1"] * SR)
                seg = line.audio[i0:i1].copy()
                f = min(len(seg) // 4, int(0.012 * SR))
                if f > 0:
                    seg[:f] *= np.linspace(0, 1, f)
                    seg[-f:] *= np.linspace(1, 0, f)
                s = int(round((o + ph["cut0"]) * SR))
                out[s:s + len(seg)] += seg[: len(out) - s]
        return out[: int(total * SR)]
