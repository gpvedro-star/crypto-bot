/*
 * Nolela LINE — virtual try-on.
 *
 * Demo mode: a before/after comparison of the selected shade on a dark brown eye.
 * Photo mode: the visitor uploads a selfie and taps both eyes. The expected iris
 * size comes from the distance between the eyes (iris ≈ 9.4% of the
 * interpupillary distance), each circle is snapped to the iris edge with a
 * radial-gradient search (Daugman-style), and the printed lens texture is
 * blended per pixel, keeping the pupil, reflections, eyelid and sclera untouched.
 * Everything runs in the browser; the photo never leaves the device.
 */
(function (global) {
  'use strict';

  var Iris = global.NolelaIris;
  var opts = null;
  var lens = null;
  var S = {
    mode: 'demo', W: 0, H: 0, base: null, data: null, ctx: null,
    eyes: [], size: 1, strength: 0.85, lid: 0.14, holding: false, tex: {}, hintKey: null, raf: 0
  };

  function $(s) { return document.querySelector(s); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // ------------------------------------------------------------ demo compare
  function setPos(v) { $('#compare').style.setProperty('--pos', v + '%'); }
  function paintCompare() {
    if (!lens) return;
    opts.paint($('#compareBefore'), lens.id, { eye: 'dark', lensAmt: 0, max: 900 });
    opts.paint($('#compareAfter'), lens.id, { eye: 'dark', max: 900 });
    $('#compareAfter').setAttribute('aria-label', opts.t('tryon.compareAlt', { name: lens.name[document.documentElement.lang] || lens.name.he }));
  }

  // ------------------------------------------------------------ hints
  function hint(key) {
    S.hintKey = key;
    $('#tryonHint').textContent = opts.t(key);
  }

  // ------------------------------------------------------------ photo loading
  function onFile(e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    hint('tryon.loading');
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { setup(img); URL.revokeObjectURL(url); };
    img.onerror = function () { hint('tryon.error'); URL.revokeObjectURL(url); };
    img.src = url;
  }

  function setup(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) { hint('tryon.error'); return; }
    var scale = Math.min(1, 1600 / Math.max(w, h));
    S.W = Math.round(w * scale);
    S.H = Math.round(h * scale);
    S.base = document.createElement('canvas');
    S.base.width = S.W;
    S.base.height = S.H;
    var bctx = S.base.getContext('2d');
    bctx.drawImage(img, 0, 0, S.W, S.H);
    try {
      S.data = bctx.getImageData(0, 0, S.W, S.H).data;
    } catch (err) {
      hint('tryon.error');
      return;
    }
    var canvas = $('#photoCanvas');
    canvas.width = S.W;
    canvas.height = S.H;
    S.ctx = canvas.getContext('2d');
    S.mode = 'photo';
    S.eyes = [];
    $('#compare').hidden = true;
    $('#photo').hidden = false;
    $('#photo').classList.remove('has-eyes');
    $('#tryonTools').hidden = false;
    $('#toolSize').value = 100; S.size = 1;
    render();
    layoutMarkers();
    hint('tryon.tap1');
  }

  // ------------------------------------------------------------ iris detection
  function lumAt(x, y) {
    x = x | 0; y = y | 0;
    if (x < 0 || y < 0 || x >= S.W || y >= S.H) return 0.5;
    var i = (y * S.W + x) * 4, d = S.data;
    return (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
  }

  // Search around the tap for the circle whose lateral edges show the strongest
  // dark-to-light step (iris to sclera). Top and bottom are skipped: eyelids.
  function refine(cx, cy, r0) {
    var cs = [], sn = [];
    for (var a = -40; a <= 40; a += 5) {
      [a, 180 + a].forEach(function (deg) {
        cs.push(Math.cos(deg * Math.PI / 180));
        sn.push(Math.sin(deg * Math.PI / 180));
      });
    }
    var step = Math.max(1, r0 / 10);
    var span = r0 * 0.6;
    var rMin = r0 * 0.66, rMax = r0 * 1.6, rStep = Math.max(0.75, r0 / 24);
    var best = { s: -1e9, x: cx, y: cy, r: r0 };
    for (var y = cy - span; y <= cy + span; y += step) {
      for (var x = cx - span; x <= cx + span; x += step) {
        var prof = [];
        for (var r = rMin; r <= rMax; r += rStep) {
          var sum = 0;
          for (var k = 0; k < cs.length; k++) sum += lumAt(x + r * cs[k], y + r * sn[k]);
          prof.push(sum / cs.length);
        }
        for (var i = 2; i < prof.length - 2; i++) {
          var d = (prof[i + 1] + prof[i + 2]) - (prof[i - 1] + prof[i - 2]);
          var s = d - 0.15 * Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / r0;
          if (s > best.s) best = { s: s, x: x, y: y, r: rMin + i * rStep };
        }
      }
    }
    return { x: best.x, y: best.y, r: best.r };
  }

  function irisRef(e) {
    var vals = [];
    for (var a = -50; a <= 50; a += 10) {
      for (var side = 0; side < 2; side++) {
        var ang = (side ? 180 + a : a) * Math.PI / 180;
        for (var f = 0.5; f <= 0.86; f += 0.07) vals.push(lumAt(e.x + e.r * f * Math.cos(ang), e.y + e.r * f * Math.sin(ang)));
      }
    }
    vals.sort(function (p, q) { return p - q; });
    return vals[Math.floor(vals.length * 0.5)] || 0.2;
  }

  function detect() {
    var a = S.eyes[0], b = S.eyes[1];
    var ipd = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
    var r0 = ipd * 0.094;
    var found = S.eyes.map(function (e) { return refine(e.x, e.y, r0); });
    var avg = (found[0].r + found[1].r) / 2;
    found.forEach(function (e) {
      e.r = Math.abs(e.r - avg) / avg < 0.2 ? e.r * 0.5 + avg * 0.5 : avg;
      e.lref = irisRef(e);
    });
    S.eyes = found;
    $('#photo').classList.add('has-eyes');
    layoutMarkers();
    render();
    hint('tryon.ready');
  }

  function onTap(e) {
    if (S.mode !== 'photo' || S.eyes.length >= 2) return;
    var canvas = $('#photoCanvas');
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * S.W / rect.width;
    var y = (e.clientY - rect.top) * S.H / rect.height;
    if (S.eyes.length === 1) {
      var p = S.eyes[0];
      if (Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y)) < S.W * 0.04) return;
    }
    S.eyes.push({ x: x, y: y, r: 0, lref: 0.2 });
    if (S.eyes.length === 1) {
      layoutMarkers();
      hint('tryon.tap2');
    } else {
      detect();
    }
  }

  // ------------------------------------------------------------ rendering
  function texture(l) {
    if (!S.tex[l.id]) S.tex[l.id] = Iris.lensTexture(l, 256);
    return S.tex[l.id];
  }

  function overlayEye(ctx, e, tex) {
    var r = e.r * S.size;
    var x0 = Math.max(0, Math.floor(e.x - r - 2)), y0 = Math.max(0, Math.floor(e.y - r - 2));
    var x1 = Math.min(S.W, Math.ceil(e.x + r + 2)), y1 = Math.min(S.H, Math.ceil(e.y + r + 2));
    var w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    var img = ctx.getImageData(x0, y0, w, h), d = img.data;
    var T = tex.width, td = tex.data, half = T / 2, scale = 0.905 * 0.965 * half;
    var lref = Math.max(0.04, e.lref);
    var lidY = -1 + 2 * S.lid;
    var k = S.strength;
    for (var py = 0; py < h; py++) {
      var dy = (y0 + py + 0.5 - e.y) / r;
      for (var px = 0; px < w; px++) {
        var dx = (x0 + px + 0.5 - e.x) / r;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.03) continue;
        var tx = clamp((half + dx * scale) | 0, 0, T - 1), ty = clamp((half + dy * scale) | 0, 0, T - 1);
        var ti = (ty * T + tx) * 4;
        var ta = td[ti + 3] / 255;
        if (ta < 0.01) continue;
        var edge = 1 - smooth(0.94, 1.03, dist);
        var lidLine = lidY + 0.3 * dx * dx;
        var mLid = smooth(lidLine - 0.05, lidLine + 0.12, dy);
        var mLow = 1 - smooth(0.84, 0.99, dy);
        var i = (py * w + px) * 4;
        var R = d[i], G = d[i + 1], B = d[i + 2];
        var L = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
        var mBright = 1 - smooth(lref + 0.2, lref + 0.42, L);
        var a = ta * edge * mLid * mLow * mBright * k;
        if (a < 0.004) continue;
        var s = clamp(0.55 + 0.45 * L / lref, 0.45, 1.3);
        d[i] = R + (td[ti] * s - R) * a;
        d[i + 1] = G + (td[ti + 1] * s - G) * a;
        d[i + 2] = B + (td[ti + 2] * s - B) * a;
      }
    }
    ctx.putImageData(img, x0, y0);
  }

  function render() {
    if (S.mode !== 'photo' || !S.ctx) return;
    S.ctx.drawImage(S.base, 0, 0);
    $('#photo').classList.toggle('is-clean', S.holding);
    if (S.holding || S.eyes.length < 2 || !lens) return;
    var tex = texture(lens);
    S.eyes.forEach(function (e) { overlayEye(S.ctx, e, tex); });
  }
  function scheduleRender() {
    if (S.raf) return;
    S.raf = requestAnimationFrame(function () { S.raf = 0; render(); });
  }

  // ------------------------------------------------------------ markers
  function markers() { return [$('#marker0'), $('#marker1')]; }
  function layoutMarkers() {
    var canvas = $('#photoCanvas');
    var rect = canvas.getBoundingClientRect();
    var k = S.W ? rect.width / S.W : 1;
    markers().forEach(function (m, i) {
      var e = S.eyes[i];
      if (!e || S.mode !== 'photo') { m.hidden = true; return; }
      m.hidden = false;
      var size = e.r ? Math.max(28, 2 * e.r * S.size * k + 10) : 28;
      m.style.width = size + 'px';
      m.style.height = size + 'px';
      m.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
      m.style.left = (e.x / S.W * 100) + '%';
      m.style.top = (e.y / S.H * 100) + '%';
    });
  }
  function wireMarker(m, i) {
    var dragging = false;
    m.addEventListener('pointerdown', function (e) {
      if (!S.eyes[i]) return;
      dragging = true;
      try { m.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });
    m.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = $('#photoCanvas').getBoundingClientRect();
      S.eyes[i].x = clamp((e.clientX - rect.left) * S.W / rect.width, 0, S.W);
      S.eyes[i].y = clamp((e.clientY - rect.top) * S.H / rect.height, 0, S.H);
      layoutMarkers();
      scheduleRender();
    });
    var end = function () {
      if (!dragging) return;
      dragging = false;
      if (S.eyes[i] && S.eyes[i].r) S.eyes[i].lref = irisRef(S.eyes[i]);
      render();
    };
    m.addEventListener('pointerup', end);
    m.addEventListener('pointercancel', end);
    m.addEventListener('keydown', function (e) {
      if (!S.eyes[i]) return;
      var stepPx = Math.max(1, S.W * 0.003);
      var moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      var mv = moves[e.key];
      if (!mv) return;
      e.preventDefault();
      S.eyes[i].x = clamp(S.eyes[i].x + mv[0] * stepPx, 0, S.W);
      S.eyes[i].y = clamp(S.eyes[i].y + mv[1] * stepPx, 0, S.H);
      if (S.eyes[i].r) S.eyes[i].lref = irisRef(S.eyes[i]);
      layoutMarkers();
      render();
    });
  }

  // ------------------------------------------------------------ public
  function init(o) {
    opts = o;
    lens = o.lens;
    var range = $('#compareRange');
    range.addEventListener('input', function () { setPos(range.value); });
    setPos(range.value);
    paintCompare();

    $('#tryonFile').addEventListener('change', onFile);
    $('#photoCanvas').addEventListener('click', onTap);
    markers().forEach(wireMarker);

    $('#toolSize').addEventListener('input', function (e) { S.size = e.target.value / 100; layoutMarkers(); scheduleRender(); });
    $('#toolStrength').addEventListener('input', function (e) { S.strength = e.target.value / 100; scheduleRender(); });
    $('#toolLid').addEventListener('input', function (e) { S.lid = e.target.value / 100; scheduleRender(); });

    var hold = $('#holdBefore');
    var on = function (e) { if (e && e.preventDefault) e.preventDefault(); if (!S.holding) { S.holding = true; render(); } };
    var off = function () { if (S.holding) { S.holding = false; render(); } };
    hold.addEventListener('pointerdown', on);
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(function (ev) { hold.addEventListener(ev, off); });
    hold.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') on(e); });
    hold.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') off(); });
    hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    $('#replaceEyes').addEventListener('click', function () {
      S.eyes = [];
      $('#photo').classList.remove('has-eyes');
      layoutMarkers();
      render();
      hint('tryon.tap1');
    });
    window.addEventListener('resize', layoutMarkers);
  }

  function setShade(l) {
    if (!l) return;
    lens = l;
    paintCompare();
    render();
  }

  function refreshText() {
    if (S.hintKey) $('#tryonHint').textContent = opts.t(S.hintKey);
    paintCompareLabel();
  }
  function paintCompareLabel() {
    if (!lens) return;
    $('#compareAfter').setAttribute('aria-label', opts.t('tryon.compareAlt', { name: lens.name[document.documentElement.lang] || lens.name.he }));
  }

  global.NolelaTryOn = { init: init, setShade: setShade, refreshText: refreshText };
})(window);
