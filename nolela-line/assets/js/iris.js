/*
 * Nolela LINE — procedural iris renderer.
 *
 * Draws a macro close-up of an eye wearing a colored lens (or the lens on its own)
 * with WebGL. A polar noise texture is generated once on the GPU (fibers, fine
 * fibers, crypts, print dots) and every frame is composed from it, so animating
 * the hero and painting dozens of swatches stays cheap. When WebGL is missing,
 * a Canvas 2D painter produces a simpler version of the same image.
 */
(function (global) {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var PRECISION = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif'
  ].join('\n') + '\n';

  // 3D simplex noise — Ashima Arts / Stefan Gustavson (MIT).
  var SIMPLEX = [
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1.0/6.0,1.0/3.0);',
    '  const vec4 D=vec4(0.0,0.5,1.0,2.0);',
    '  vec3 i=floor(v+dot(v,C.yyy));',
    '  vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz);',
    '  vec3 l=1.0-g;',
    '  vec3 i1=min(g.xyz,l.zxy);',
    '  vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx;',
    '  vec3 x2=x0-i2+C.yyy;',
    '  vec3 x3=x0-D.yyy;',
    '  i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    '  float n_=0.142857142857;',
    '  vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.0*floor(p*ns.z*ns.z);',
    '  vec4 x_=floor(j*ns.z);',
    '  vec4 y_=floor(j-7.0*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy;',
    '  vec4 y=y_*ns.x+ns.yyyy;',
    '  vec4 h=1.0-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy);',
    '  vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.0+1.0;',
    '  vec4 s1=floor(b1)*2.0+1.0;',
    '  vec4 sh=-step(h,vec4(0.0));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;',
    '  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x);',
    '  vec3 p1=vec3(a0.zw,h.y);',
    '  vec3 p2=vec3(a1.xy,h.z);',
    '  vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);',
    '  m=m*m;',
    '  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}'
  ].join('\n');

  // Pass 1: polar noise texture. x = angle (0..1), y = radius from pupil to limbus (0..1).
  var NOISE_FRAG = PRECISION + SIMPLEX + [
    '',
    'varying vec2 vUv;',
    'void main(){',
    '  float ang = vUv.x * 6.28318530718;',
    '  vec2 dir = vec2(cos(ang), sin(ang));',
    '  float t = vUv.y;',
    '  float w = snoise(vec3(dir * 2.4, t * 1.7 + 11.0));',
    '  float aw = ang + w * 0.07;',
    '  vec2 dw = vec2(cos(aw), sin(aw));',
    '  float f = 0.0; float amp = 0.55; float fr = 1.0;',
    '  for (int i = 0; i < 4; i++) {',
    '    f += amp * snoise(vec3(dw * 14.0 * fr, t * 2.4 * fr + 3.0 + float(i) * 7.1));',
    '    fr *= 2.0; amp *= 0.5;',
    '  }',
    '  f = clamp(f * 0.72 + 0.5, 0.0, 1.0);',
    '  float fine = snoise(vec3(dw * 70.0, t * 2.6 + 40.0)) * 0.5 + 0.5;',
    '  fine = pow(clamp(fine, 0.0, 1.0), 1.5);',
    '  float c = snoise(vec3(dir * 7.0, t * 5.0 + 90.0)) + 0.5 * snoise(vec3(dir * 14.0, t * 10.0 + 17.0));',
    '  c = smoothstep(0.38, 0.95, c);',
    '  float d = snoise(vec3(dir * 120.0, t * 70.0 + 60.0)) * 0.5 + 0.5;',
    '  gl_FragColor = vec4(f, fine, c, clamp(d, 0.0, 1.0));',
    '}'
  ].join('\n');

  // Pass 2: compose the eye (uMode 0) or the lens alone (uMode 1).
  var IRIS_FRAG = PRECISION + [
    'varying vec2 vUv;',
    'uniform sampler2D uNoise;',
    'uniform vec3 uInner; uniform vec3 uMid; uniform vec3 uOuter; uniform vec3 uRing; uniform vec3 uNat;',
    'uniform float uCover; uniform float uInnerCover; uniform float uPupil; uniform float uCollar; uniform float uRingW;',
    'uniform float uSeed; uniform vec2 uLight; uniform float uGloss; uniform float uLensAmt; uniform float uMode;',
    'uniform float uBody; uniform float uPx;',
    'const float TAU = 6.28318530718;',
    'const float R = 0.965;',
    'float sdRoundBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',
    'float windowGlint(vec2 p, vec2 size){',
    '  vec2 q = p - (vec2(-0.33, 0.35) + uLight);',
    '  q.x -= 0.35 * q.y * q.y;',
    '  float wm = 1.0 - smoothstep(-0.035, 0.04, sdRoundBox(q, size, 0.07));',
    '  return wm * (0.55 + 0.45 * smoothstep(-size.y, size.y * 1.2, q.y));',
    '}',
    'void main(){',
    '  vec2 p = vUv * 2.0 - 1.0;',
    '  float r = length(p);',
    '  float u = atan(p.y, p.x) / TAU + 0.5 + uSeed;',
    '  float aa = uPx * 1.5;',
    '  if (uMode > 0.5) {',
    '    float L = r / R;',
    '    float CLR = 0.37; float POUT = 0.905;',
    '    float tl = clamp((L - CLR) / (POUT - CLR), 0.0, 1.0);',
    '    vec4 m1 = texture2D(uNoise, vec2(u, tl));',
    '    vec3 lc = mix(uInner, uMid, smoothstep(0.0, 0.32, tl));',
    '    lc = mix(lc, uOuter, smoothstep(0.4, 0.85, tl));',
    '    lc = mix(lc, uRing, pow(smoothstep(1.0 - uRingW - 0.06, 1.0, tl), 1.25));',
    '    lc *= 0.7 + 0.55 * m1.r;',
    '    float g = smoothstep(0.28, 0.62, m1.a + 0.18);',
    '    float inner = smoothstep(CLR - 0.02 + (m1.r - 0.5) * 0.07, CLR + 0.07, L);',
    '    float outer = 1.0 - smoothstep(POUT - 0.012, POUT + 0.006, L);',
    '    float pa = inner * outer * mix(0.35, 1.0, g) * mix(0.8, 1.0, uCover);',
    '    float body = 1.0 - smoothstep(1.0 - aa * 1.2, 1.0, L);',
    '    float rim = exp(-pow((L - 0.985) / 0.012, 2.0)) * body;',
    '    float a = max(pa, body * 0.07 * uBody);',
    '    vec3 col = mix(vec3(0.92, 0.95, 0.97), lc, pa / max(a, 0.0001));',
    '    a = max(a, rim * 0.28 * uBody);',
    '    col = mix(col, vec3(0.62, 0.68, 0.74), rim * 0.5 * (1.0 - pa) * uBody);',
    '    col = pow(max(col, 0.0), vec3(0.4545));',
    '    float wm = windowGlint(p, vec2(0.14, 0.1)) * uGloss * 0.5 * body;',
    '    col = mix(col, vec3(1.0), wm / max(a + wm, 0.0001));',
    '    a = max(a, wm);',
    '    gl_FragColor = vec4(col * a, a);',
    '    return;',
    '  }',
    '  float rn = r / R;',
    '  float t = clamp((rn - uPupil) / (1.0 - uPupil), 0.0, 1.0);',
    '  vec4 n1 = texture2D(uNoise, vec2(u, t));',
    '  vec4 n2 = texture2D(uNoise, vec2(u * 2.0 + 0.31, 0.5 + 0.5 * t));',
    '  float fib = n1.r; float fine = n1.g; float crypt = n1.b; float dots = n1.a;',
    '  float cz = uCollar + (n2.r - 0.5) * 0.09;',
    // natural iris underneath the lens
    '  float pz = 1.0 - smoothstep(cz - 0.025, cz + 0.025, t);',
    '  vec3 nat = uNat * mix(1.0, 1.25, pz * 0.6);',
    '  nat *= 0.5 + 0.95 * fib;',
    '  nat *= 0.82 + 0.36 * fine;',
    '  float cryptZone = smoothstep(cz - 0.04, cz + 0.06, t) * (1.0 - smoothstep(0.5, 0.78, t));',
    '  nat *= 1.0 - 0.5 * crypt * cryptZone;',
    '  nat *= 1.0 - 0.55 * smoothstep(0.72, 1.0, t);',
    // printed lens pattern
    '  vec3 lens = mix(uInner, uMid, smoothstep(cz - 0.02, cz + 0.2, t));',
    '  lens = mix(lens, uOuter, smoothstep(0.42, 0.86, t));',
    '  lens = mix(lens, uRing, pow(smoothstep(1.0 - uRingW - 0.06, 1.0, t), 1.25));',
    '  lens *= 0.66 + 0.62 * fib;',
    '  lens *= 0.88 + 0.24 * fine;',
    '  float g = smoothstep(0.28, 0.62, dots + 0.18);',
    '  float innerEdge = smoothstep(cz - 0.1 + (fib - 0.5) * 0.12, cz + 0.04, t);',
    '  float cov = mix(uInnerCover * smoothstep(0.0, 0.18, t) * (0.6 + 0.4 * g), uCover * g, innerEdge);',
    '  cov *= uLensAmt;',
    '  vec3 col = mix(nat, lens, cov);',
    '  float collar = exp(-pow((t - cz) / 0.03, 2.0));',
    '  col += collar * 0.05 * (0.4 + fib) * (col + 0.08);',
    // pupil and pupillary ruff
    '  float pr = uPupil + (n2.g - 0.5) * 0.014;',
    '  float ruff = exp(-pow((rn - pr - 0.014) / 0.012, 2.0));',
    '  col = mix(col, col * 0.25, ruff * 0.8);',
    '  float pm = smoothstep(pr - 0.004, pr + 0.008, rn);',
    '  col = mix(vec3(0.006, 0.005, 0.006), col, pm);',
    // lighting: upper-lid shadow, directional light on fibers, limbal falloff
    '  col *= 1.0 - 0.3 * smoothstep(-0.1, 1.0, p.y) * smoothstep(0.3, 1.0, rn);',
    '  vec2 ld = normalize(vec2(-0.55, 0.75));',
    '  col *= 1.0 + 0.12 * dot(p / max(r, 0.0001), ld) * smoothstep(0.05, 0.9, t) * (1.0 - pz);',
    '  col *= 1.0 - 0.35 * smoothstep(0.93, 1.0, rn);',
    '  col = pow(max(col, 0.0), vec3(0.4545));',
    // cornea reflections, applied in display space so dark areas stay dark
    '  float wm = windowGlint(p, vec2(0.15, 0.105));',
    '  col = mix(col, vec3(1.0), wm * 0.6 * uGloss);',
    '  float sd = 1.0 - smoothstep(0.0, 0.035, length(p - vec2(0.3, -0.33) - uLight * 0.6));',
    '  col = mix(col, vec3(1.0), sd * 0.38 * uGloss);',
    '  col += uGloss * 0.035 * (1.0 - smoothstep(0.0, 1.0, length(p - vec2(-0.32, 0.34)))) * smoothstep(0.0, 0.4, col.g + 0.1);',
    '  float alpha = 1.0 - smoothstep(R - aa, R + aa * 0.5, r);',
    '  gl_FragColor = vec4(col * alpha, alpha);',
    '}'
  ].join('\n');

  // Lens design presets by effect level (1 natural, 2 noticeable, 3 dramatic).
  var STYLE = {
    1: { cover: 0.74, innerCover: 0.34, ringW: 0.13, collar: 0.3 },
    2: { cover: 0.86, innerCover: 0.24, ringW: 0.17, collar: 0.28 },
    3: { cover: 0.94, innerCover: 0.18, ringW: 0.2, collar: 0.26 }
  };

  // Natural (uncovered) eye colors used under the lens.
  var EYES = {
    dark: '#3a2314',
    brown: '#6b4524',
    green: '#5c6b3c',
    blue: '#6a86a0',
    light: '#7b8e98'
  };

  function hexToRgb(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hexToLin(hex) {
    var c = hexToRgb(hex);
    return [Math.pow(c[0] / 255, 2.2), Math.pow(c[1] / 255, 2.2), Math.pow(c[2] / 255, 2.2)];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  /**
   * Build uniform values for a shade.
   * opts.eye: key of EYES or a hex color; opts.mode: 'eye' | 'lens';
   * opts.lensAmt 0..1 (0 = natural eye only); opts.gloss; opts.body; opts.pupil.
   */
  function params(shade, opts) {
    opts = opts || {};
    var st = STYLE[shade.effect] || STYLE[2];
    var eye = opts.eye || 'dark';
    var natHex = EYES[eye] || eye;
    return {
      inner: hexToLin(shade.colors.inner),
      mid: hexToLin(shade.colors.mid),
      outer: hexToLin(shade.colors.outer),
      ring: hexToLin(shade.colors.ring),
      nat: hexToLin(natHex),
      cover: st.cover,
      innerCover: st.innerCover,
      ringW: st.ringW,
      collar: st.collar,
      pupil: opts.pupil != null ? opts.pupil : 0.27,
      seed: shade.seed || 0,
      light: opts.light || [0, 0],
      gloss: opts.gloss != null ? opts.gloss : 1,
      lensAmt: opts.lensAmt != null ? opts.lensAmt : 1,
      mode: opts.mode === 'lens' ? 1 : 0,
      body: opts.body != null ? opts.body : 1,
      hex: shade.colors,
      natHex: natHex
    };
  }

  function mixParams(a, b, t) {
    return {
      inner: lerp3(a.inner, b.inner, t),
      mid: lerp3(a.mid, b.mid, t),
      outer: lerp3(a.outer, b.outer, t),
      ring: lerp3(a.ring, b.ring, t),
      nat: lerp3(a.nat, b.nat, t),
      cover: lerp(a.cover, b.cover, t),
      innerCover: lerp(a.innerCover, b.innerCover, t),
      ringW: lerp(a.ringW, b.ringW, t),
      collar: lerp(a.collar, b.collar, t),
      pupil: lerp(a.pupil, b.pupil, t),
      seed: t < 0.5 ? a.seed : b.seed,
      light: [lerp(a.light[0], b.light[0], t), lerp(a.light[1], b.light[1], t)],
      gloss: lerp(a.gloss, b.gloss, t),
      lensAmt: lerp(a.lensAmt, b.lensAmt, t),
      mode: b.mode,
      body: b.body,
      hex: t < 0.5 ? a.hex : b.hex,
      natHex: t < 0.5 ? a.natHex : b.natHex
    };
  }

  // ---------------------------------------------------------------- WebGL
  function IrisGL(canvas) {
    this.canvas = canvas;
    var opts = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' };
    var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.progNoise = this._program(NOISE_FRAG);
    this.progIris = this._program(IRIS_FRAG);
    this.loc = {};
    var names = ['uNoise', 'uInner', 'uMid', 'uOuter', 'uRing', 'uNat', 'uCover', 'uInnerCover', 'uPupil', 'uCollar',
      'uRingW', 'uSeed', 'uLight', 'uGloss', 'uLensAmt', 'uMode', 'uBody', 'uPx'];
    for (var i = 0; i < names.length; i++) this.loc[names[i]] = gl.getUniformLocation(this.progIris, names[i]);
    this._makeNoise();
  }

  IrisGL.prototype._program = function (fragSrc) {
    var gl = this.gl;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error('Shader compile failed: ' + log);
      }
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fragSrc));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program link failed: ' + gl.getProgramInfoLog(p));
    return p;
  };

  IrisGL.prototype._quad = function () {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  };

  IrisGL.prototype._makeNoise = function () {
    var gl = this.gl, W = 2048, H = 512;
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Noise framebuffer incomplete');
    }
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.progNoise);
    this._quad();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    this.noise = tex;
  };

  IrisGL.prototype.resize = function (w, h) {
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  };

  IrisGL.prototype.render = function (P) {
    var gl = this.gl, L = this.loc, w = this.canvas.width, h = this.canvas.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.progIris);
    this._quad();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noise);
    gl.uniform1i(L.uNoise, 0);
    gl.uniform3fv(L.uInner, P.inner);
    gl.uniform3fv(L.uMid, P.mid);
    gl.uniform3fv(L.uOuter, P.outer);
    gl.uniform3fv(L.uRing, P.ring);
    gl.uniform3fv(L.uNat, P.nat);
    gl.uniform1f(L.uCover, P.cover);
    gl.uniform1f(L.uInnerCover, P.innerCover);
    gl.uniform1f(L.uPupil, P.pupil);
    gl.uniform1f(L.uCollar, P.collar);
    gl.uniform1f(L.uRingW, P.ringW);
    gl.uniform1f(L.uSeed, P.seed);
    gl.uniform2fv(L.uLight, P.light);
    gl.uniform1f(L.uGloss, P.gloss);
    gl.uniform1f(L.uLensAmt, P.lensAmt);
    gl.uniform1f(L.uMode, P.mode);
    gl.uniform1f(L.uBody, P.body);
    gl.uniform1f(L.uPx, 2 / Math.max(1, w));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // ------------------------------------------------------ Canvas 2D fallback
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function paint2D(canvas, P) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, R = w * 0.482;
    var rnd = mulberry32(Math.floor((P.seed || 0.1) * 1e6));
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    var lens = P.mode === 1;
    var inner = lens ? R * 0.37 : R * P.pupil;
    var g = ctx.createRadialGradient(cx, cy, inner, cx, cy, lens ? R * 0.9 : R);
    g.addColorStop(0, lens ? 'rgba(0,0,0,0)' : P.hex.inner);
    g.addColorStop(0.08, P.hex.inner);
    g.addColorStop(0.45, P.hex.mid);
    g.addColorStop(0.82, P.hex.outer);
    g.addColorStop(1, P.hex.ring);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, lens ? R * 0.9 : R, 0, Math.PI * 2);
    if (lens) ctx.arc(cx, cy, R * 0.37, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.lineWidth = Math.max(1, w / 360);
    for (var i = 0; i < 420; i++) {
      var a = rnd() * Math.PI * 2;
      var r0 = inner + R * rnd() * 0.12;
      var r1 = R * (0.62 + rnd() * 0.34);
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    if (!lens) {
      ctx.fillStyle = '#070607';
      ctx.beginPath();
      ctx.arc(cx, cy, R * P.pupil, 0, Math.PI * 2);
      ctx.fill();
    }
    if (P.gloss > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * P.gloss) + ')';
      var gx = cx - R * 0.34 - R * 0.15, gy = cy - R * 0.36 - R * 0.11;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(gx, gy, R * 0.3, R * 0.22, R * 0.05);
      else ctx.rect(gx, gy, R * 0.3, R * 0.22);
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------ shared painter
  var shared = null;
  var sharedFailed = false;

  function getShared() {
    if (shared || sharedFailed) return shared;
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 256;
      shared = new IrisGL(c);
      c.addEventListener('webglcontextlost', function (e) { e.preventDefault(); shared = null; sharedFailed = true; });
    } catch (err) {
      sharedFailed = true;
      shared = null;
    }
    return shared;
  }

  function sizeFor(canvas, max) {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var css = Math.max(rect.width, rect.height, 24);
    return Math.max(32, Math.min(max || 1024, Math.round(css * dpr)));
  }

  /** Paint a shade onto any canvas (sized from its CSS box). */
  function paint(canvas, shade, opts) {
    var P = params(shade, opts);
    var px = (opts && opts.size) || sizeFor(canvas, opts && opts.max);
    canvas.width = px;
    canvas.height = px;
    var r = getShared();
    if (r) {
      try {
        r.resize(px, px);
        r.render(P);
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, px, px);
        ctx.drawImage(r.canvas, 0, 0, px, px);
        return true;
      } catch (err) {
        sharedFailed = true;
        shared = null;
      }
    }
    paint2D(canvas, P);
    return false;
  }

  /** Render a lens-only texture and return its ImageData (used by the try-on). */
  function lensTexture(shade, size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    paint(c, shade, { mode: 'lens', gloss: 0, body: 0, size: size });
    return c.getContext('2d').getImageData(0, 0, size, size);
  }

  // ------------------------------------------------------ animated hero
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function HeroIris(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts || {};
    this.gl = null;
    try { this.gl = new IrisGL(canvas); } catch (e) { this.gl = null; }
    this.cur = null;
    this.from = null;
    this.to = null;
    this.t0 = 0;
    this.dur = 900;
    this.changeAt = -1e9;
    this.light = [0, 0];
    this.lightTarget = [0, 0];
    this.visible = true;
    this.running = false;
    this.reduced = !!this.opts.reducedMotion;
    this.base = this.opts.pupil || 0.265;
    this.loadAt = performance.now();
    var self = this;
    this._tick = function (now) { self.frame(now); };
    if (this.gl) {
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.gl = null; });
    }
  }

  HeroIris.prototype.ok = function () { return !!this.gl; };

  HeroIris.prototype.setShade = function (shade, eye, animate) {
    var next = params(shade, { eye: eye || 'dark', pupil: this.base });
    if (!this.cur || animate === false || this.reduced) {
      this.cur = next; this.from = next; this.to = next; this.t0 = 0;
    } else {
      this.from = this.cur; this.to = next; this.t0 = performance.now();
      this.changeAt = this.t0;
    }
    this.start();
  };

  HeroIris.prototype.pointer = function (x, y) {
    if (this.reduced) return;
    this.lightTarget = [x * 0.05, -y * 0.05];
    this.start();
  };

  HeroIris.prototype.setVisible = function (v) {
    this.visible = v;
    if (v) this.start();
  };

  HeroIris.prototype.setReduced = function (v) {
    this.reduced = v;
    this.start();
  };

  HeroIris.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this._tick);
  };

  HeroIris.prototype.frame = function (now) {
    this.running = false;
    if (!this.to) return;
    var animating = false;
    var P;
    if (this.t0 && now - this.t0 < this.dur) {
      P = mixParams(this.from, this.to, easeInOut((now - this.t0) / this.dur));
      animating = true;
    } else {
      P = this.to;
      this.t0 = 0;
    }
    this.cur = P;
    // pupil: opening on load, light reflex on change, slow breathing
    var pupil = this.base;
    if (!this.reduced) {
      var sinceLoad = (now - this.loadAt) / 1000;
      if (sinceLoad < 1.6) { pupil += 0.12 * (1 - easeInOut(sinceLoad / 1.6)); animating = true; }
      var dc = (now - this.changeAt) / 1000;
      if (dc < 1.3) {
        var bump = dc < 0.25 ? easeInOut(dc / 0.25) : 1 - easeInOut((dc - 0.25) / 1.05);
        pupil -= 0.045 * bump;
        animating = true;
      }
      pupil += 0.006 * Math.sin(now / 1000 * 0.8);
      this.light[0] += (this.lightTarget[0] - this.light[0]) * 0.08;
      this.light[1] += (this.lightTarget[1] - this.light[1]) * 0.08;
    } else {
      this.light = [0, 0];
    }
    // idle breathing only needs ~30 fps; transitions render every frame
    var idle = !animating && Math.abs(this.lightTarget[0] - this.light[0]) + Math.abs(this.lightTarget[1] - this.light[1]) < 0.001;
    if (idle && this.lastDraw && now - this.lastDraw < 33) {
      if (!this.reduced && this.visible && !document.hidden) { this.running = true; requestAnimationFrame(this._tick); }
      return;
    }
    this.lastDraw = now;
    var draw = Object.assign({}, P, { pupil: pupil, light: [this.light[0], this.light[1]] });
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var px = Math.max(64, Math.min(1400, Math.round(rect.width * dpr)));
    if (this.gl) {
      try {
        this.gl.resize(px, px);
        this.gl.render(draw);
      } catch (e) {
        this.gl = null;
      }
    }
    if (!this.gl) {
      if (this.canvas.width !== px) { this.canvas.width = px; this.canvas.height = px; }
      paint2D(this.canvas, draw);
      return;
    }
    if (this.onFrame) this.onFrame();
    var keepBreathing = !this.reduced && this.visible && !document.hidden;
    if (animating || keepBreathing) {
      this.running = true;
      requestAnimationFrame(this._tick);
    }
  };

  global.NolelaIris = {
    EYES: EYES,
    params: params,
    paint: paint,
    lensTexture: lensTexture,
    HeroIris: HeroIris,
    supported: function () { return !!getShared(); }
  };
})(window);
