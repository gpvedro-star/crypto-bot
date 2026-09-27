/*
 * Nolela LINE — site behaviour.
 * Vanilla JS, no build step. Depends on config.js, products.js, i18n.js,
 * legal.js, iris.js and tryon.js being loaded first.
 */
(function () {
  'use strict';

  var CFG = window.NOLELA_CONFIG;
  var CAT = window.NOLELA_CATALOG;
  var I18N = window.NolelaI18n;
  var Iris = window.NolelaIris;
  var TryOn = window.NolelaTryOn;
  var Legal = window.NolelaLegal;

  // ------------------------------------------------------------ helpers
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('nolela.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('nolela.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
    }
  };
  var LRI = '⁦', PDI = '⁩', LRM = I18N.LRM;
  var reducedMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var lensById = {};
  CAT.lenses.forEach(function (l) { lensById[l.id] = l; });
  var accById = {};
  CAT.accessories.forEach(function (a) { accById[a.id] = a; });

  var state = {
    lang: 'he',
    shade: lensById[store.get('shade', CFG.defaultShade)] ? store.get('shade', CFG.defaultShade) : CFG.defaultShade,
    family: 'all',
    effect: 'all',
    cart: sanitizeCart(store.get('cart', [])),
    view: 'cart',
    orderId: null,
    a11y: Object.assign({ size: 0, contrast: false, links: false, still: false, readable: false }, store.get('a11y', {}))
  };

  function t(key, vars) {
    var d = I18N.DICT[state.lang] || I18N.DICT.he;
    var s = d[key];
    if (s == null) s = I18N.DICT.he[key];
    if (s == null) s = key;
    return I18N.fmt(s, vars);
  }
  function nameOf(item) { return item.name[state.lang] || item.name.he; }
  function money(n) { return '₪' + n; }
  function powerStr(v) { return Number(v).toFixed(2); }
  function isoPower(v) { return LRI + powerStr(v) + PDI; }
  function motionOff() { return reducedMQ.matches || state.a11y.still; }

  // ------------------------------------------------------------ colors
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(c) {
    return '#' + c.map(function (v) { var x = Math.round(Math.max(0, Math.min(255, v))).toString(16); return x.length < 2 ? '0' + x : x; }).join('');
  }
  function lum(c) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function contrast(a, b) { var la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function towards(c, target, bg, minRatio) {
    var out = c;
    for (var i = 0; i < 60 && contrast(out, bg) < minRatio; i++) out = mix(out, target, 0.06);
    return out;
  }
  function saturation(c) {
    var mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]);
    return mx === 0 ? 0 : (mx - mn) / mx;
  }
  function accentTokens(shade) {
    var mid = hexToRgb(shade.colors.mid);
    var white = [255, 255, 255], night = [15, 14, 17];
    // near-neutral shades (greys) get a deeper ink so buttons don't read as disabled
    var inkTarget = saturation(mid) < 0.18 ? 11 : 5.4;
    return {
      '--iris': shade.colors.mid,
      '--iris-hi': shade.colors.inner,
      '--iris-deep': shade.colors.ring,
      '--iris-ink': rgbToHex(towards(mid, [12, 10, 14], white, inkTarget)),
      '--iris-ink-d': rgbToHex(towards(mid, white, night, 7.5)),
      '--iris-soft': rgbToHex(mix(mid, white, 0.86)),
      '--iris-soft-d': rgbToHex(mix(mid, night, 0.84))
    };
  }
  function applyAccent(shade, instant) {
    var root = document.documentElement;
    if (instant) root.style.transition = 'none';
    var tok = accentTokens(shade);
    for (var k in tok) root.style.setProperty(k, tok[k]);
    if (instant) requestAnimationFrame(function () { requestAnimationFrame(function () { root.style.transition = ''; }); });
  }

  // ------------------------------------------------------------ painting queue
  var queue = [];
  var draining = false;
  function paint(canvas, shadeId, opts, urgent) {
    var job = { canvas: canvas, shadeId: shadeId, opts: opts || {} };
    canvas.__job = job;
    if (urgent) queue.unshift(job); else queue.push(job);
    if (!draining) { draining = true; requestAnimationFrame(drain); }
  }
  function drain() {
    var start = performance.now();
    while (queue.length && performance.now() - start < 12) {
      var job = queue.shift();
      if (job.canvas.__job !== job || !job.canvas.isConnected) continue;
      if (!job.opts.size && job.canvas.getBoundingClientRect().width === 0) { job.canvas.__dirty = job; continue; }
      Iris.paint(job.canvas, lensById[job.shadeId], job.opts);
      job.canvas.__dirty = null;
    }
    if (queue.length) requestAnimationFrame(drain); else draining = false;
  }
  function repaintDirty(root) {
    $$('canvas', root).forEach(function (c) { if (c.__dirty) paint(c, c.__dirty.shadeId, c.__dirty.opts, true); });
  }

  // ------------------------------------------------------------ language
  var arFontsLoaded = false;
  function loadArabicFonts() {
    if (arFontsLoaded) return;
    arFontsLoaded = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
  }
  function templateVars() {
    return {
      days: CFG.shipping.days,
      pct: CFG.fbRecommendPercent,
      reviews: CFG.fbReviews,
      city: CFG.city[state.lang] || CFG.city.he
    };
  }
  function applyStatic() {
    var vars = templateVars();
    $$('[data-i18n]').forEach(function (node) {
      var key = node.getAttribute('data-i18n');
      if (node.__he == null) node.__he = node.innerHTML;
      var tpl = I18N.TEMPLATES[key];
      var html;
      if (tpl) html = I18N.fmt(tpl[state.lang] || tpl.he, vars);
      else if (state.lang === 'ar') html = I18N.STATIC_AR[key] != null ? I18N.STATIC_AR[key] : node.__he;
      else html = node.__he;
      if (node.innerHTML !== html) node.innerHTML = html;
    });
    $$('[data-i18n-attr]').forEach(function (node) {
      node.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
        var parts = pair.split(':');
        var attr = parts[0], key = parts[1];
        var slot = '__he_' + attr;
        if (node[slot] == null) node[slot] = node.getAttribute(attr) || '';
        var v = state.lang === 'ar' && I18N.STATIC_AR[key] != null ? I18N.STATIC_AR[key] : node[slot];
        node.setAttribute(attr, v);
      });
    });
  }
  function setLang(lang, initial) {
    state.lang = lang === 'ar' ? 'ar' : 'he';
    var root = document.documentElement;
    root.lang = state.lang;
    root.dir = 'rtl';
    if (state.lang === 'ar') loadArabicFonts();
    applyStatic();
    var btn = $('#langBtn');
    btn.textContent = state.lang === 'ar' ? 'עב' : 'ع';
    btn.setAttribute('lang', state.lang === 'ar' ? 'he' : 'ar');
    btn.setAttribute('aria-label', t('lang.other'));
    store.set('lang', state.lang);
    if (!initial) {
      renderFilters();
      updateCardTexts();
      renderAccessories();
      updateHeroText();
      renderQuiz();
      renderCart();
      updateContactLinks();
      updateCalc();
      updateAnatomy();
      renderRibbonLabels();
      if (TryOn) TryOn.refreshText();
      if (openProductId) fillProduct(openProductId);
    }
  }

  // ------------------------------------------------------------ hero
  var hero = null;
  function buildDial() {
    var g = $('#dialTicks');
    if (!g) return;
    var s = '';
    for (var i = 0; i < 120; i++) {
      var a = (i * 3 - 90) * Math.PI / 180;
      var major = i % 10 === 0;
      var r1 = 178, r2 = major ? 167 : 172;
      s += '<line class="dial-tick' + (major ? ' major' : '') + '" x1="' + (200 + r1 * Math.cos(a)).toFixed(2) + '" y1="' + (200 + r1 * Math.sin(a)).toFixed(2) +
        '" x2="' + (200 + r2 * Math.cos(a)).toFixed(2) + '" y2="' + (200 + r2 * Math.sin(a)).toFixed(2) + '"/>';
    }
    g.innerHTML = s;
  }

  function buildSwatches(container, name, current, onPick) {
    $$('.swatch', container).forEach(function (n) { n.remove(); });
    CAT.lenses.forEach(function (l) {
      var label = el('label', { class: 'swatch', title: nameOf(l) });
      var input = el('input', { type: 'radio', name: name, value: l.id, 'aria-label': nameOf(l) });
      if (l.id === current) input.checked = true;
      var c = el('canvas', { 'aria-hidden': 'true', width: '88', height: '88' });
      label.appendChild(input);
      label.appendChild(c);
      container.appendChild(label);
      paint(c, l.id, { eye: 'dark', size: 88, gloss: 0.7 });
      input.addEventListener('change', function () { if (input.checked) onPick(l.id); });
    });
  }
  function relabelSwatches(container) {
    $$('.swatch', container).forEach(function (lab) {
      var input = $('input', lab);
      var l = lensById[input.value];
      lab.title = nameOf(l);
      input.setAttribute('aria-label', nameOf(l));
    });
  }

  function effectLabel(l) { return t('effect.' + l.effect); }
  function meterHtml(level) { return '<span class="meter" data-level="' + level + '" aria-hidden="true"><i></i><i></i><i></i></span>'; }

  function updateHeroText() {
    var l = lensById[state.shade];
    $('#heroShadeName').textContent = nameOf(l);
    $('#heroShadeEn').textContent = l.name.en;
    $('#heroEffect').innerHTML = meterHtml(l.effect) + '<span>' + esc(effectLabel(l)) + '</span>';
    $('#heroPrice').textContent = money(l.price);
    $('#heroIris').setAttribute('aria-label', t('aria.iris', { name: nameOf(l), view: t('view.dark') }));
    relabelSwatches($('#heroSwatches'));
    relabelSwatches($('#tryonSwatches'));
  }

  function setShade(id, opts) {
    opts = opts || {};
    if (!lensById[id]) return;
    state.shade = id;
    store.set('shade', id);
    var l = lensById[id];
    applyAccent(l, opts.instant);
    if (hero) hero.setShade(l, 'dark', !opts.instant);
    var idx = CAT.lenses.indexOf(l);
    var rot = $('#dialRot');
    if (rot) rot.style.transform = 'rotate(' + (-idx * 30) + 'deg)';
    var input = $('#heroSwatches input[value="' + id + '"]');
    if (input && !input.checked) input.checked = true;
    updateHeroText();
    updateAnatomy();
    var fb = $('#heroFallback');
    if (fb && !(hero && hero.ok())) fb.style.opacity = '1';
  }

  function initHero() {
    buildDial();
    var canvas = $('#heroIris');
    hero = new Iris.HeroIris(canvas, { reducedMotion: motionOff() });
    if (hero.ok()) {
      hero.onFrame = function () {
        if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
        hero.onFrame = null;
      };
    }
    buildSwatches($('#heroSwatches'), 'heroShade', state.shade, function (id) { setShade(id); });
    setShade(state.shade, { instant: true });

    var stage = $('#heroStage');
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      hero.pointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    });
    stage.addEventListener('pointerleave', function () { hero.pointer(0, 0); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { heroInView = en.isIntersecting; syncHeroVisibility(); });
      }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) hero.start(); });
    $('#heroBuy').addEventListener('click', function () { openProduct(state.shade); });
  }

  // ------------------------------------------------------------ collection
  function renderFilters() {
    var fam = $('#familyFilter');
    var eff = $('#effectFilter');
    $$('.chip', fam).forEach(function (n) { n.remove(); });
    $$('.chip', eff).forEach(function (n) { n.remove(); });
    var dots = { honey: '#c08133', brown: '#6a4228', grey: '#9ea5aa', green: '#3a9a63', blue: '#4b8cc0' };
    ['all'].concat(CAT.families).forEach(function (f) {
      var lab = el('label', { class: 'chip' });
      var inp = el('input', { type: 'radio', name: 'family', value: f });
      if (state.family === f) inp.checked = true;
      var span = el('span', null, (f === 'all' ? '' : '<i style="--dot:' + dots[f] + '"></i>') + esc(t('family.' + f)));
      lab.appendChild(inp); lab.appendChild(span); fam.appendChild(lab);
      inp.addEventListener('change', function () { state.family = f; applyFilters(); });
    });
    ['all', '1', '2', '3'].forEach(function (v) {
      var lab = el('label', { class: 'chip' });
      var inp = el('input', { type: 'radio', name: 'effect', value: v });
      if (state.effect === v) inp.checked = true;
      var span = el('span', null, v === 'all' ? esc(t('effect.all')) : meterHtml(+v) + esc(t('effect.' + v)));
      lab.appendChild(inp); lab.appendChild(span); eff.appendChild(lab);
      inp.addEventListener('change', function () { state.effect = v; applyFilters(); });
    });
    applyFilters(true);
  }

  function resultText(n) {
    if (state.lang === 'ar') {
      if (n === 1) return t('results.one');
      if (n === 2) return t('results.two');
      if (n >= 3 && n <= 10) return t('results.few', { n: n });
      return t('results.many', { n: n });
    }
    return n === 1 ? t('results.one') : t('results.many', { n: n });
  }

  function applyFilters(skipPaint) {
    var n = 0;
    $$('#productGrid .card').forEach(function (card) {
      var l = lensById[card.getAttribute('data-id')];
      var show = (state.family === 'all' || l.family === state.family) && (state.effect === 'all' || String(l.effect) === state.effect);
      card.hidden = !show;
      if (show) n++;
    });
    $('#resultCount').textContent = resultText(n);
    var empty = $('#productGrid .empty-grid');
    if (!n) {
      if (!empty) {
        empty = el('li', { class: 'empty-grid' });
        $('#productGrid').appendChild(empty);
      }
      empty.innerHTML = '<p>' + esc(t('noResults')) + '</p><button class="btn btn-ghost btn-small" type="button">' + esc(t('clearFilters')) + '</button>';
      $('button', empty).addEventListener('click', function () {
        state.family = 'all'; state.effect = 'all'; renderFilters();
      });
    } else if (empty) {
      empty.remove();
    }
    if (!skipPaint) repaintDirty($('#productGrid'));
  }

  function renderCards() {
    var grid = $('#productGrid');
    grid.innerHTML = '';
    CAT.lenses.forEach(function (l) {
      var li = el('li', { class: 'card', 'data-id': l.id });
      var btn = el('button', { class: 'card-btn', type: 'button' });
      btn.innerHTML =
        '<span class="card-iris" style="--c:' + l.colors.mid + '">' +
          '<canvas class="card-eye" aria-hidden="true"></canvas>' +
          '<canvas class="card-lens" aria-hidden="true"></canvas>' +
        '</span>' +
        '<span class="card-body">' +
          '<span class="card-row"><span class="card-name"></span><span class="card-price"></span></span>' +
          '<span class="card-en" lang="en" dir="ltr">' + esc(l.name.en) + '</span>' +
          '<span class="card-meta">' + meterHtml(l.effect) + '<span class="card-effect"></span></span>' +
        '</span>';
      li.appendChild(btn);
      grid.appendChild(li);
      btn.addEventListener('click', function () { openProduct(l.id); });
      var lensCanvas = $('.card-lens', btn);
      var paintLens = function () {
        if (lensCanvas.__done) return;
        lensCanvas.__done = true;
        paint(lensCanvas, l.id, { mode: 'lens', gloss: 0.8 }, true);
      };
      btn.addEventListener('pointerenter', paintLens);
      btn.addEventListener('focus', paintLens);
    });
    updateCardTexts();
    $$('#productGrid .card').forEach(function (card) {
      paint($('.card-eye', card), card.getAttribute('data-id'), { eye: 'dark' });
    });
  }

  function updateCardTexts() {
    $$('#productGrid .card').forEach(function (card) {
      var l = lensById[card.getAttribute('data-id')];
      $('.card-name', card).textContent = nameOf(l);
      $('.card-price', card).textContent = money(l.price);
      $('.card-effect', card).textContent = effectLabel(l);
      $('.card-btn', card).setAttribute('aria-label', t('cardLabel', { name: nameOf(l), effect: effectLabel(l), price: money(l.price) }));
    });
  }

  function renderAccessories() {
    var list = $('#accGrid');
    list.innerHTML = '';
    CAT.accessories.forEach(function (a) {
      var li = el('li', { class: 'acc-item' });
      li.innerHTML =
        '<span class="acc-icon" aria-hidden="true"><svg class="icon"><use href="#i-' + a.icon + '"/></svg></span>' +
        '<span><span class="acc-name">' + esc(nameOf(a)) + '</span><br><span class="acc-note">' + esc(a.note[state.lang] || a.note.he) + '</span></span>' +
        '<span class="acc-buy"><span class="acc-price">' + money(a.price) + '</span>' +
        '<button class="add-btn" type="button" aria-label="' + esc(t('addNamed', { name: nameOf(a) })) + '"><svg class="icon"><use href="#i-plus"/></svg></button></span>';
      $('.add-btn', li).addEventListener('click', function () { addToCart({ id: a.id, type: 'acc', qty: 1 }); });
      list.appendChild(li);
    });
  }

  // ------------------------------------------------------------ dialogs
  var lastFocus = null;
  var heroInView = true;
  function anyDialogOpen() { return $$('dialog.dlg').some(function (d) { return d.open; }); }
  function syncHeroVisibility() { if (hero) hero.setVisible(heroInView && !anyDialogOpen()); }
  function openDialog(dlg) {
    if (dlg.open) return;
    lastFocus = document.activeElement;
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    document.documentElement.classList.add('dlg-lock');
    syncHeroVisibility();
  }
  function closeDialog(dlg) {
    if (!dlg.open) return;
    dlg.close();
    if (!anyDialogOpen()) document.documentElement.classList.remove('dlg-lock');
    syncHeroVisibility();
  }
  function wireDialogs() {
    $$('dialog.dlg').forEach(function (dlg) {
      dlg.addEventListener('close', function () {
        if (!anyDialogOpen()) document.documentElement.classList.remove('dlg-lock');
        syncHeroVisibility();
        if (dlg.id === 'productDlg') openProductId = null;
        if (lastFocus && document.contains(lastFocus) && !$$('dialog.dlg').some(function (d) { return d.open; })) {
          try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        }
      });
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) { closeDialog(dlg); return; }
        var closer = e.target.closest('[data-close]');
        if (closer && dlg.contains(closer)) closeDialog(dlg);
      });
    });
  }

  // ------------------------------------------------------------ product dialog
  var openProductId = null;
  var pd = { qty: 1, view: 'dark' };

  function powerOptions(select, placeholder) {
    var opts = placeholder ? '<option value="" disabled selected>—</option>' : '';
    for (var v = CAT.specs.powerMin; v >= CAT.specs.powerMax - 0.001; v -= (v > -6 ? 0.25 : 0.5)) {
      var val = powerStr(Math.round(v * 100) / 100);
      opts += '<option value="' + val + '">' + val + '</option>';
    }
    select.innerHTML = opts;
  }

  function paintProduct() {
    var l = lensById[openProductId];
    var c = $('#pdCanvas');
    var view = pd.view;
    $('.pd-iris').classList.toggle('is-lens', view === 'lens');
    var opts = view === 'lens' ? { mode: 'lens', max: 900 } : { eye: view === 'light' ? 'light' : 'dark', max: 900 };
    paint(c, l.id, opts, true);
    var viewName = t(view === 'lens' ? 'view.lens' : view === 'light' ? 'view.light' : 'view.dark');
    c.setAttribute('aria-label', t('aria.iris', { name: nameOf(l), view: viewName }));
  }

  function fillProduct(id) {
    var l = lensById[id];
    $('#pdFamily').innerHTML = '<span dir="ltr">' + l.family.toUpperCase() + ' · DIA ' + CAT.specs.dia + ' · BC ' + CAT.specs.bc + '</span>';
    $('#pdName').textContent = nameOf(l);
    $('#pdEn').textContent = l.name.en;
    $('#pdPrice').textContent = money(l.price);
    $('#pdEffect').innerHTML = meterHtml(l.effect) + '<span>' + esc(effectLabel(l)) + '</span>';
    $('#pdDesc').textContent = l.desc[state.lang] || l.desc.he;
    var S = CAT.specs;
    var specs = [
      ['spec.dia', S.dia + ' ' + t('mm')],
      ['spec.bc', S.bc + ' ' + t('mm')],
      ['spec.gdia', l.gdia + ' ' + t('mm')],
      ['spec.water', S.water],
      ['spec.material', S.material],
      ['spec.replace', t('spec.months')],
      ['spec.range', l.power ? LRI + '0.00 → ' + powerStr(S.powerMax) + PDI : t('noPower')]
    ];
    $('#pdSpecs').innerHTML = specs.map(function (s) {
      return '<div><dt>' + esc(t(s[0])) + '</dt><dd>' + esc(s[1]) + '</dd></div>';
    }).join('');
    $('#pwrRx').disabled = !l.power;
    updateAddLabel();
    paintProduct();
  }

  function updateAddLabel() {
    var l = lensById[openProductId];
    if (!l) return;
    $('#pdAdd').innerHTML = '<span>' + esc(t('addToCart')) + '</span><span class="btn-price">' + money(l.price * pd.qty) + '</span>';
    $('#pdQty').textContent = pd.qty;
  }

  function openProduct(id) {
    if (!lensById[id]) return;
    openProductId = id;
    pd.qty = 1;
    pd.view = 'dark';
    $('#pdViewDark').checked = true;
    $('#pwrNone').checked = true;
    $('#pdRx').hidden = true;
    $('#pdSame').checked = true;
    $('#pdLField').hidden = true;
    $('#pdBothLabel').hidden = false;
    $('#pdRLabel').hidden = true;
    powerOptions($('#pdR'), true);
    powerOptions($('#pdL'), true);
    clearRxError();
    var dlg = $('#productDlg');
    var tok = accentTokens(lensById[id]);
    for (var k in tok) dlg.style.setProperty(k, tok[k]);
    openDialog(dlg);
    dlg.scrollTop = 0;
    fillProduct(id);
  }

  function clearRxError() {
    var e = $('#pdRxErr');
    if (e) e.remove();
    $('#pdR').removeAttribute('aria-invalid');
    $('#pdL').removeAttribute('aria-invalid');
  }

  function wireProduct() {
    $$('input[name="pdView"]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) { pd.view = r.value; paintProduct(); } });
    });
    $$('input[name="pwrMode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        $('#pdRx').hidden = !$('#pwrRx').checked;
        clearRxError();
      });
    });
    $('#pdSame').addEventListener('change', function () {
      var same = $('#pdSame').checked;
      $('#pdLField').hidden = same;
      $('#pdBothLabel').hidden = !same;
      $('#pdRLabel').hidden = same;
      if (!same && !$('#pdL').value && $('#pdR').value) $('#pdL').value = $('#pdR').value;
      clearRxError();
    });
    $('#pdR').addEventListener('change', clearRxError);
    $('#pdL').addEventListener('change', clearRxError);
    $('#pdMinus').addEventListener('click', function () { pd.qty = Math.max(1, pd.qty - 1); updateAddLabel(); });
    $('#pdPlus').addEventListener('click', function () { pd.qty = Math.min(9, pd.qty + 1); updateAddLabel(); });
    $('#pdForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var l = lensById[openProductId];
      var power = { mode: 'none' };
      if ($('#pwrRx').checked) {
        var same = $('#pdSame').checked;
        var r = $('#pdR').value, lv = $('#pdL').value;
        var missing = !r ? $('#pdR') : (!same && !lv ? $('#pdL') : null);
        if (missing) {
          clearRxError();
          missing.setAttribute('aria-invalid', 'true');
          var msg = el('p', { class: 'field-error', id: 'pdRxErr', role: 'alert' });
          msg.textContent = t('err.power');
          $('#pdRx .rx-grid').after(msg);
          missing.focus();
          return;
        }
        power = same ? { mode: 'same', r: r } : { mode: 'split', r: r, l: lv };
      }
      addToCart({ id: l.id, type: 'lens', power: power, qty: pd.qty });
      closeDialog($('#productDlg'));
    });
  }

  // ------------------------------------------------------------ cart
  function sanitizeCart(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (it) {
      return it && ((it.type === 'lens' && lensById[it.id]) || (it.type === 'acc' && accById[it.id])) && it.qty > 0;
    }).map(function (it) {
      return { id: it.id, type: it.type, power: it.power || { mode: 'none' }, qty: Math.min(9, Math.max(1, it.qty | 0)) };
    });
  }
  function itemKey(it) {
    var p = it.power || { mode: 'none' };
    return it.type + ':' + it.id + ':' + p.mode + ':' + (p.r || '') + ':' + (p.l || '');
  }
  function itemData(it) { return it.type === 'lens' ? lensById[it.id] : accById[it.id]; }
  function powerText(it, plain) {
    if (it.type !== 'lens') { var a = accById[it.id]; return a.note[state.lang] || a.note.he; }
    var p = it.power || { mode: 'none' };
    var wrap = plain ? function (v) { return LRM + powerStr(v); } : isoPower;
    if (p.mode === 'same') return t('powerSame', { p: wrap(p.r) });
    if (p.mode === 'split') return t('powerSplit', { r: wrap(p.r), l: wrap(p.l) });
    return t('noPower');
  }
  function cartCount() { return state.cart.reduce(function (s, it) { return s + it.qty; }, 0); }
  function cartTotal() { return state.cart.reduce(function (s, it) { return s + itemData(it).price * it.qty; }, 0); }
  function saveCart() { store.set('cart', state.cart); }

  function addToCart(item) {
    var key = itemKey(item);
    var found = state.cart.filter(function (it) { return itemKey(it) === key; })[0];
    if (found) found.qty = Math.min(9, found.qty + item.qty);
    else state.cart.push({ id: item.id, type: item.type, power: item.power || { mode: 'none' }, qty: item.qty });
    saveCart();
    renderCart();
    var badge = $('#cartCount');
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
    toast(t('added', { name: nameOf(itemData(item)) }), t('viewCart'), openCart);
  }

  function renderCart() {
    var n = cartCount();
    var badge = $('#cartCount');
    badge.textContent = n;
    badge.hidden = n === 0;
    $('#cartBtn').setAttribute('aria-label', t('aria.cart', { n: n }));
    var list = $('#cartList');
    list.innerHTML = '';
    state.cart.forEach(function (it, i) {
      var d = itemData(it);
      var li = el('li', { class: 'cart-item' });
      var thumb = el('span', { class: 'cart-thumb', 'aria-hidden': 'true' });
      if (it.type === 'lens') {
        var c = el('canvas');
        thumb.appendChild(c);
        paint(c, it.id, { eye: 'dark', size: 128, gloss: 0.8 });
      } else {
        thumb.innerHTML = '<svg class="icon"><use href="#i-' + d.icon + '"/></svg>';
      }
      li.appendChild(thumb);
      var info = el('div');
      info.innerHTML = '<p class="cart-name">' + esc(nameOf(d)) + (it.type === 'lens' ? ' <span class="card-en" lang="en" dir="ltr">' + esc(d.name.en) + '</span>' : '') + '</p>' +
        '<p class="cart-sub">' + esc(powerText(it)) + '</p>';
      li.appendChild(info);
      var side = el('div', { class: 'cart-side' });
      side.innerHTML =
        '<span class="cart-price">' + money(d.price * it.qty) + '</span>' +
        '<span class="cart-qty">' +
          '<button type="button" data-act="minus" aria-label="' + esc(t('qtyLess', { name: nameOf(d) })) + '"><svg class="icon"><use href="#i-minus"/></svg></button>' +
          '<span aria-live="polite">' + it.qty + '</span>' +
          '<button type="button" data-act="plus" aria-label="' + esc(t('qtyMore', { name: nameOf(d) })) + '"><svg class="icon"><use href="#i-plus"/></svg></button>' +
        '</span>' +
        '<button type="button" class="cart-remove" data-act="remove">' + esc(t('removeShort')) + '</button>';
      $('.cart-remove', side).setAttribute('aria-label', t('remove', { name: nameOf(d) }));
      side.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        var act = b.getAttribute('data-act');
        if (act === 'minus') { if (it.qty > 1) it.qty--; else state.cart.splice(i, 1); }
        if (act === 'plus') it.qty = Math.min(9, it.qty + 1);
        if (act === 'remove') state.cart.splice(i, 1);
        saveCart();
        renderCart();
        var again = $('#cartList .cart-item:nth-child(' + (i + 1) + ') button[data-act="' + act + '"]') || $('#cartList button') || $('#cartDlg .dlg-close');
        if (again) again.focus();
      });
      li.appendChild(side);
      list.appendChild(li);
    });
    var empty = state.cart.length === 0;
    $('#cartEmpty').hidden = !empty;
    var hasLens = state.cart.some(function (it) { return it.type === 'lens'; });
    var hasCare = state.cart.some(function (it) { return it.id === 'solution' || it.id === 'kit'; });
    var up = $('#cartUpsell');
    up.hidden = !(hasLens && !hasCare) || state.view !== 'cart';
    if (!up.hidden) {
      var sol = accById.solution;
      up.innerHTML = '<span class="acc-icon" aria-hidden="true"><svg class="icon"><use href="#i-bottle"/></svg></span>' +
        '<p>' + esc(t('upsell')) + '<small>' + esc(nameOf(sol)) + ' · ' + money(sol.price) + '</small></p>' +
        '<button class="add-btn" type="button" aria-label="' + esc(t('addNamed', { name: nameOf(sol) })) + '"><svg class="icon"><use href="#i-plus"/></svg></button>';
      $('.add-btn', up).addEventListener('click', function () { addToCart({ id: 'solution', type: 'acc', qty: 1 }); });
    }
    $('#cartSubtotal').textContent = money(cartTotal());
    $('#cartTotal').textContent = money(cartTotal());
    if (empty && state.view !== 'cart') setView('cart');
    updateViewUi();
    updateSendLink();
  }

  function setView(v) {
    state.view = v;
    if (v === 'checkout' && !state.orderId) state.orderId = 'NL' + Date.now().toString(36).slice(-5).toUpperCase();
    updateViewUi();
    renderCartUpsellVisibility();
    var body = $('#cartDlg .drawer-body');
    if (body) body.scrollTop = 0;
  }
  function renderCartUpsellVisibility() {
    var up = $('#cartUpsell');
    if (state.view !== 'cart') up.hidden = true;
  }
  function updateViewUi() {
    var v = state.view, empty = state.cart.length === 0;
    $('#cartView').hidden = v !== 'cart';
    $('#checkoutForm').hidden = v !== 'checkout';
    $('#orderDone').hidden = v !== 'done';
    $('#toCheckout').hidden = v !== 'cart' || empty;
    $('#sendOrder').hidden = v !== 'checkout';
    $('#backToCart').hidden = v === 'cart';
    $('#drawerFoot').hidden = empty && v === 'cart';
    $('#sendOrderLabel').textContent = t(CFG.whatsapp ? 'sendWA' : 'sendIG');
  }
  function openCart() {
    if (state.view === 'done') setView('cart');
    renderCart();
    openDialog($('#cartDlg'));
  }

  // checkout
  var fields = ['coName', 'coPhone', 'coCity', 'coStreet', 'coNotes'];
  function readForm() {
    return {
      name: $('#coName').value.trim(),
      phone: $('#coPhone').value.trim(),
      city: $('#coCity').value.trim(),
      street: $('#coStreet').value.trim(),
      notes: $('#coNotes').value.trim(),
      terms: $('#coTerms').checked,
      news: $('#coNews').checked
    };
  }
  function validPhone(p) {
    var d = p.replace(/[\s\-().]/g, '');
    return /^(?:\+?972|0)5\d{8}$/.test(d);
  }
  function setErr(id, msg) {
    var input = $('#' + id);
    var err = $('#' + id + 'Err');
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', id + 'Err');
      err.textContent = msg;
      err.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      err.hidden = true;
    }
  }
  function validate(showErrors) {
    var f = readForm();
    var errs = {
      coName: f.name.length < 2 ? t('err.name') : '',
      coPhone: !validPhone(f.phone) ? t('err.phone') : '',
      coCity: f.city.length < 2 ? t('err.city') : '',
      coStreet: f.street.length < 2 ? t('err.street') : '',
      coTerms: !f.terms ? t('err.terms') : ''
    };
    if (showErrors) Object.keys(errs).forEach(function (k) { setErr(k, errs[k]); });
    var firstBad = Object.keys(errs).filter(function (k) { return errs[k]; })[0];
    return { ok: !firstBad, first: firstBad, data: f };
  }
  function buildMessage(f) {
    var lines = [t('msg.hello'), t('msg.order') + ': ' + state.orderId, ''];
    state.cart.forEach(function (it, i) {
      var d = itemData(it);
      lines.push((i + 1) + '. ' + nameOf(d) + (it.type === 'lens' ? ' (' + d.name.en + ')' : ''));
      if (it.type === 'lens') lines.push('    ' + powerText(it, true));
      lines.push('    ' + t('msg.qty') + ': ' + it.qty + ' · ₪' + d.price * it.qty);
    });
    lines.push('', t('msg.total') + ': ₪' + cartTotal() + ' (' + t('msg.freeShip') + ')', '');
    lines.push(t('msg.name') + ': ' + f.name);
    lines.push(t('msg.phone') + ': ' + LRM + f.phone);
    lines.push(t('msg.address') + ': ' + f.street + ', ' + f.city);
    if (f.notes) lines.push(t('msg.notes') + ': ' + f.notes);
    if (f.news) lines.push(t('msg.news'));
    return lines.join('\n');
  }
  function contactHref() {
    return CFG.whatsapp ? 'https://wa.me/' + CFG.whatsapp : 'https://ig.me/m/' + CFG.instagram;
  }
  function updateSendLink() {
    var a = $('#sendOrder');
    if (!a) return;
    if (CFG.whatsapp) {
      var f = readForm();
      a.href = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(buildMessage(f));
    } else {
      a.href = 'https://ig.me/m/' + CFG.instagram;
    }
  }
  function copyText(text, onDone) {
    var ok = function () { onDone(true); };
    var fail = function () { onDone(false); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fail);
      else fail();
    } catch (e) { fail(); }
  }
  function selectPreview() {
    var pre = $('#orderPreview');
    var range = document.createRange();
    range.selectNodeContents(pre);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function wireCart() {
    $('#cartBtn').addEventListener('click', openCart);
    $('#toCheckout').addEventListener('click', function () {
      setView('checkout');
      var draft = store.get('draft', null);
      if (draft) fields.forEach(function (id) { if (!$('#' + id).value && draft[id]) $('#' + id).value = draft[id]; });
      updateSendLink();
      setTimeout(function () { $('#coName').focus(); }, 30);
    });
    $('#backToCart').addEventListener('click', function () { setView('cart'); renderCart(); });
    $('#checkoutForm').addEventListener('input', function (e) {
      var draft = {};
      fields.forEach(function (id) { draft[id] = $('#' + id).value; });
      store.set('draft', draft);
      if (e.target.getAttribute('aria-invalid') === 'true') validate(true);
      updateSendLink();
    });
    $('#checkoutForm').addEventListener('change', updateSendLink);
    $('#checkoutForm').addEventListener('submit', function (e) { e.preventDefault(); $('#sendOrder').click(); });
    $('#sendOrder').addEventListener('click', function (e) {
      var v = validate(true);
      if (!v.ok) {
        e.preventDefault();
        var first = $('#' + v.first);
        if (first) first.focus();
        toast(t('err.fix'));
        return;
      }
      var msg = buildMessage(v.data);
      $('#orderPreview').textContent = msg;
      if (CFG.whatsapp) {
        this.href = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(msg);
        $('#doneText').textContent = t('doneWA');
      } else {
        $('#doneText').textContent = t('doneManual');
        copyText(msg, function (ok) {
          $('#doneText').textContent = ok ? t('doneIG') : t('doneManual');
          if (!ok) selectPreview();
        });
      }
      setTimeout(function () { setView('done'); }, 60);
    });
    $('#copyOrder').addEventListener('click', function () {
      copyText($('#orderPreview').textContent, function (ok) {
        toast(ok ? t('copied') : t('copyFail'));
        if (!ok) selectPreview();
      });
    });
    $('#clearCart').addEventListener('click', function () {
      state.cart = [];
      state.orderId = null;
      saveCart();
      setView('cart');
      renderCart();
      toast(t('cleared'));
    });
  }

  // ------------------------------------------------------------ quiz
  function quizValues() {
    var f = $('#quiz');
    return {
      eye: (f.querySelector('input[name="eye"]:checked') || {}).value || 'dark',
      look: +((f.querySelector('input[name="look"]:checked') || {}).value || 1),
      skin: (f.querySelector('input[name="skin"]:checked') || {}).value || 'medium'
    };
  }
  function scoreShades(q) {
    var w = { dark: 1, brown: 0.65, green: 0.3, blue: 0 }[q.eye];
    var skinBonus = {
      fair: { cool: 0.8, neutral: 0.4, warm: 0.1 },
      medium: { warm: 0.8, neutral: 0.5, cool: 0.2 },
      deep: { warm: 0.8, neutral: 0.4, cool: q.look === 3 ? 0.6 : 0.2 }
    }[q.skin];
    return CAT.lenses.map(function (l) {
      var eff = l.effD * w + l.effL * (1 - w);
      var target = { 1: 1.45, 2: 2.3, 3: 3 }[q.look];
      var score = -Math.abs(eff - target) * 3 + skinBonus[l.warmth];
      // a lens that matches the natural eye color is not much of a change
      if ((q.eye === 'blue' && l.family === 'blue' && q.look > 1) || (q.eye === 'green' && l.family === 'green' && q.look > 1)) score -= 1.2;
      return { lens: l, eff: eff, score: score };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
  }
  function renderQuiz() {
    var q = quizValues();
    var top = scoreShades(q);
    $('#quizSummary').textContent = t('quiz.summary', { look: t('lookName.' + q.look), eye: t('eyeName.' + q.eye) });
    var list = $('#quizResults');
    var existing = $$('.result', list);
    top.forEach(function (r, i) {
      var l = r.lens;
      var li = existing[i];
      if (!li) {
        li = el('li', { class: 'result' });
        li.innerHTML = '<canvas aria-hidden="true"></canvas><div class="result-text"><p class="result-rank"></p><p class="result-name"></p><p class="result-why"></p>' +
          '<div class="result-actions"><button class="btn btn-text btn-small" type="button" data-act="details"></button><button class="btn btn-text btn-small" type="button" data-act="try"></button></div></div>';
        li.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          var id = li.getAttribute('data-id');
          if (b.getAttribute('data-act') === 'details') openProduct(id);
          else {
            selectTryShade(id);
            var target = $('#tryon');
            if (target) target.scrollIntoView({ behavior: motionOff() ? 'auto' : 'smooth' });
          }
        });
        list.appendChild(li);
      }
      li.setAttribute('data-id', l.id);
      $('.result-rank', li).textContent = t('rank.' + (i + 1));
      $('.result-name', li).textContent = nameOf(l);
      var how = r.eff < 1.9 ? t('reason.1') : r.eff < 2.65 ? t('reason.2', { eye: t('eyeName.' + q.eye) }) : t('reason.3');
      $('.result-why', li).textContent = how + ' · ' + t('reason.' + l.warmth, { skin: t('skinName.' + q.skin) });
      $('[data-act="details"]', li).textContent = t('quiz.details');
      $('[data-act="try"]', li).textContent = t('quiz.try');
      var c = $('canvas', li);
      var key = l.id + '|' + q.eye;
      if (c.__key !== key) {
        c.__key = key;
        paint(c, l.id, { eye: q.eye, max: 520 });
      }
      c.setAttribute('aria-label', t('aria.iris', { name: nameOf(l), view: t('eyeName.' + q.eye) }));
    });
  }

  // ------------------------------------------------------------ try-on glue
  function selectTryShade(id) {
    var input = $('#tryonSwatches input[value="' + id + '"]');
    if (input) input.checked = true;
    if (TryOn) TryOn.setShade(lensById[id]);
  }
  function initTryOn() {
    var start = state.shade;
    buildSwatches($('#tryonSwatches'), 'tryShade', start, function (id) { if (TryOn) TryOn.setShade(lensById[id]); });
    if (TryOn) TryOn.init({ t: t, lens: lensById[start], paint: paint, lensById: lensById });
  }

  // ------------------------------------------------------------ anatomy, ribbon
  function updateAnatomy() {
    var c = $('#anatomyCanvas');
    if (!c) return;
    var l = lensById[state.shade];
    paint(c, l.id, { mode: 'lens', max: 900 });
    c.setAttribute('aria-label', t('aria.iris', { name: nameOf(l), view: t('view.lens') }));
  }
  function renderRibbon() {
    var list = $('#shadeRibbon');
    list.innerHTML = '';
    CAT.lenses.forEach(function (l) {
      var li = el('li');
      var b = el('button', { type: 'button', 'data-id': l.id });
      var c = el('canvas', { 'aria-hidden': 'true' });
      b.appendChild(c);
      li.appendChild(b);
      list.appendChild(li);
      b.addEventListener('click', function () { openProduct(l.id); });
      paint(c, l.id, { eye: 'dark', max: 240 });
    });
    renderRibbonLabels();
  }
  function renderRibbonLabels() {
    $$('#shadeRibbon button').forEach(function (b) {
      var l = lensById[b.getAttribute('data-id')];
      b.setAttribute('aria-label', nameOf(l));
      b.title = nameOf(l);
    });
  }

  // ------------------------------------------------------------ care tabs + calc
  function wireTabs() {
    var tabs = $$('.tab');
    function select(tab, focus) {
      tabs.forEach(function (tb) {
        var on = tb === tab;
        tb.setAttribute('aria-selected', on ? 'true' : 'false');
        tb.tabIndex = on ? 0 : -1;
        $('#' + tb.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var rtl = document.documentElement.dir === 'rtl';
        var next = rtl ? 'ArrowLeft' : 'ArrowRight', prev = rtl ? 'ArrowRight' : 'ArrowLeft';
        var j = null;
        if (e.key === next) j = (i + 1) % tabs.length;
        else if (e.key === prev) j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j != null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d) { return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addMonths(d, m) {
    var r = new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
    if (r.getDate() !== d.getDate()) r.setDate(0);
    return r;
  }
  function updateCalc() {
    var input = $('#calcDate');
    if (!input) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var parts = (input.value || '').split('-');
    var opened = parts.length === 3 ? new Date(+parts[0], +parts[1] - 1, +parts[2]) : today;
    if (isNaN(opened.getTime())) opened = today;
    var until = addMonths(opened, 12);
    var total = Math.round((until - opened) / 864e5);
    var left = Math.max(0, Math.round((until - today) / 864e5));
    if (opened > today) left = total;
    var frac = total ? left / total : 0;
    var C = 2 * Math.PI * 52;
    $('#calcFill').style.strokeDasharray = C.toFixed(2);
    $('#calcFill').style.strokeDashoffset = (C * (1 - frac)).toFixed(2);
    $('#calcDays').textContent = left;
    $('#calcDaysLabel').textContent = left === 1 ? t('calc.day') : t('calc.days');
    $('#calcUntil').textContent = left > 0 ? t('calc.until', { date: fmtDate(until) }) : t('calc.expired', { date: fmtDate(until) });
    var nextCase = opened;
    var k = 0;
    while (nextCase <= today && k < 8) { k++; nextCase = addMonths(opened, 3 * k); }
    $('#calcCase').textContent = t('calc.case', { date: fmtDate(nextCase > until ? until : nextCase) });
  }
  function wireCalc() {
    var input = $('#calcDate');
    var saved = store.get('opened', null);
    input.value = saved || isoDate(new Date());
    input.max = isoDate(new Date());
    input.addEventListener('change', function () { store.set('opened', input.value); updateCalc(); });
    updateCalc();
  }

  // ------------------------------------------------------------ contact links
  function updateContactLinks() {
    var href = contactHref();
    ['#floatContact', '#footerChat'].forEach(function (s) { var a = $(s); if (a) a.href = href; });
    $$('.contact-link').forEach(function (a) { a.href = href; });
    var lab = $('#footerChatLabel');
    if (lab) lab.textContent = CFG.whatsapp ? t('footer.wa') : t('footer.dm');
    var ig = 'https://www.instagram.com/' + CFG.instagram + '/';
    var fb = 'https://www.facebook.com/' + CFG.facebook;
    var igL = $('#igLink'); if (igL) igL.href = ig;
    var fbL = $('#fbLink'); if (fbL) fbL.href = fb;
    var rev = $('#fbReviewsLink'); if (rev) rev.href = fb + '/reviews';
    var big = $('#followersBig'); if (big) big.textContent = CFG.followers;
  }

  // ------------------------------------------------------------ legal
  function openLegal(key) {
    var doc = Legal.get(key, CFG);
    if (!doc) return;
    $('#legalTitle').textContent = state.lang === 'ar' ? t('legal.' + key) : doc.title;
    $('#legalBody').innerHTML = doc.html;
    var note = $('#legalLangNote');
    note.textContent = t('legal.note');
    note.hidden = state.lang !== 'ar';
    var dlg = $('#legalDlg');
    openDialog(dlg);
    $('#legalBody').scrollTop = 0;
  }

  // ------------------------------------------------------------ accessibility
  function applyA11y() {
    var root = document.documentElement;
    root.classList.remove('a11y-size-1', 'a11y-size-2');
    if (state.a11y.size) root.classList.add('a11y-size-' + state.a11y.size);
    ['contrast', 'links', 'still', 'readable'].forEach(function (k) { root.classList.toggle('a11y-' + k, !!state.a11y[k]); });
    $$('.a11y-opt').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-size') === state.a11y.size)); });
    $$('.a11y-toggle').forEach(function (b) { b.setAttribute('aria-pressed', String(!!state.a11y[b.getAttribute('data-a11y')])); });
    if (hero) hero.setReduced(motionOff());
    store.set('a11y', state.a11y);
  }
  function wireA11y() {
    $('#a11yBtn').addEventListener('click', function () { openDialog($('#a11yDlg')); });
    $$('.a11y-opt').forEach(function (b) {
      b.addEventListener('click', function () { state.a11y.size = +b.getAttribute('data-size'); applyA11y(); });
    });
    $$('.a11y-toggle').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-a11y'); state.a11y[k] = !state.a11y[k]; applyA11y(); });
    });
    $('#a11yReset').addEventListener('click', function () {
      state.a11y = { size: 0, contrast: false, links: false, still: false, readable: false };
      applyA11y();
    });
    if (reducedMQ.addEventListener) reducedMQ.addEventListener('change', function () { if (hero) hero.setReduced(motionOff()); });
  }

  // ------------------------------------------------------------ toast
  var toastTimer = null;
  function toast(text, actionLabel, action) {
    var box = $('#toast');
    box.innerHTML = '';
    box.appendChild(el('span', { text: text }));
    if (actionLabel && action) {
      var b = el('button', { type: 'button', text: actionLabel });
      b.addEventListener('click', function () { box.hidden = true; action(); });
      box.appendChild(b);
    }
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.hidden = true; }, 4200);
  }

  // ------------------------------------------------------------ resize
  var lastW = window.innerWidth;
  function onResize() {
    var w = window.innerWidth;
    if (Math.abs(w - lastW) < 60) return;
    lastW = w;
    $$('#productGrid .card:not([hidden]) .card-eye').forEach(function (c) {
      paint(c, c.closest('.card').getAttribute('data-id'), { eye: 'dark' });
    });
    updateAnatomy();
  }

  // ------------------------------------------------------------ init
  function init() {
    var hashLang = (location.hash || '').replace('#', '');
    var lang = hashLang === 'ar' || hashLang === 'he' ? hashLang : store.get('lang', 'he');
    $('#year').textContent = new Date().getFullYear();
    wireDialogs();
    setLang(lang, true);
    initHero();
    renderFilters();
    renderCards();
    applyFilters();
    renderAccessories();
    wireProduct();
    wireCart();
    renderCart();
    $('#quiz').addEventListener('change', renderQuiz);
    renderQuiz();
    initTryOn();
    renderRibbon();
    wireTabs();
    wireCalc();
    updateContactLinks();
    wireA11y();
    applyA11y();

    $('#langBtn').addEventListener('click', function () { setLang(state.lang === 'ar' ? 'he' : 'ar'); });
    $('#menuBtn').addEventListener('click', function () { openDialog($('#navDlg')); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-legal]');
      if (b) { e.preventDefault(); openLegal(b.getAttribute('data-legal')); }
    });
    window.addEventListener('resize', function () { clearTimeout(onResize.t); onResize.t = setTimeout(onResize, 250); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#toast').hidden) $('#toast').hidden = true;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
