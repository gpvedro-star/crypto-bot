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


def _atempo(x, tempo):
    import subprocess
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-af", f"atempo={tempo}", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"],
                       input=np.asarray(x, np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).astype(np.float64)


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
        self.placeholder = False
        try:
            self.audio_path = path_fn(cfg["audio"])
        except FileNotFoundError:
            if cfg.get("placeholder") is None:
                raise
            self._make_placeholder(cfg)   # no recording yet: time it from the text
            return
        a = sound.load_audio(self.audio_path).mean(1)
        tempo = float(cfg.get("tempo", 1.0))   # <1 = slower delivery (pitch kept)
        if abs(tempo - 1.0) > 1e-3:
            a = _atempo(a, tempo)
        a = sound.fft_filter(a, lo=70)  # clean rumble, keep the voice
        a = a * 10 ** (float(cfg.get("gain_db", 0.0)) / 20)
        if cfg.get("filter") == "phone":       # voice heard through a phone
            a = sound.fft_filter(a, lo=380, hi=3300, order=3)
            m = np.max(np.abs(a)) + 1e-9
            a = np.tanh(2.2 * a / m) * m * 0.8
        self.audio = a
        self.dur = len(a) / SR
        db = _energy_db(a)
        gaps, act = _gaps(db)
        idx_act = np.nonzero(act)[0]
        self.v0, self.v1 = idx_act[0] * HOP, (idx_act[-1] + 1) * HOP
        inner = [g for g in gaps if g[0] > self.v0 + 0.05 and g[1] < self.v1 - 0.05]
        n = len(self.phrase_texts)
        if cfg.get("splits"):  # given in seconds of the original take
            splits = [float(s) / tempo for s in cfg["splits"]]
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


def _placeholder(self, cfg):
    """Estimate phrase/word timing from the text (silent audio) so the edit can be built before recording."""
    ph = cfg.get("placeholder") or {}
    cps, pause, lead = float(ph.get("cps", 10)), float(ph.get("pause", 0.45)), 0.1
    self.placeholder, self.audio_path = True, None
    t, splits, self.phrases = lead, [], []
    for k, ptxt in enumerate(self.phrase_texts):
        words = ptxt.split()
        weights = np.array([max(1, len(clean_word(w))) for w in words], float)
        d = weights.sum() / cps
        if k:
            splits.append(t - pause / 2)
        w2 = weights + 0.6
        edges = t + d * np.concatenate([[0], np.cumsum(w2) / w2.sum()])
        ws = [(w, float(edges[j]), float(edges[j + 1])) for j, w in enumerate(words)]
        self.phrases.append({"text": ptxt, "cut0": 0.0, "cut1": 0.0, "v0": t, "v1": t + d, "words": ws})
        t += d + pause
    total = t - pause + lead
    bounds = [0.0] + splits + [total]
    for k, p_ in enumerate(self.phrases):
        p_["cut0"], p_["cut1"] = bounds[k], bounds[k + 1]
    self.splits, self.dur = splits, total
    self.audio = np.zeros(int(total * SR))
    self.v0, self.v1 = lead, total - lead


Line._make_placeholder = _placeholder


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
            # pause_before: {"word": secs} before every phrase starting with it, {"word#3": secs} only the 3rd
            pauses = {}
            for k, v in (lc.get("pause_before") or {}).items():
                w_, _, nth = str(k).partition("#")
                pauses[(clean_word(w_), int(nth) if nth else None)] = float(v)
            seen = {}
            offs, extra = [], 0.0
            for ph in line.phrases:
                first = clean_word(ph["words"][0][0])
                seen[first] = seen.get(first, 0) + 1
                for key in ((first, seen[first]), (first, None)):
                    if key in pauses:
                        extra += pauses[key]
                        break
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
