/* =========================================================
   Spiral galaxy behind the whole site (Three.js)
   - one fixed canvas, transparent, so the page colour shows through
   - the camera follows a path of poses, one pose per section
   - light sections switch the glow to "ink on paper"
   ========================================================= */
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, AdditiveBlending, NormalBlending, Color, Group, ColorManagement
} from 'three';

ColorManagement.enabled = false;   // colours are used exactly as written (sRGB in, sRGB out)

const VERT = /* glsl */`
  uniform float uSize;
  uniform float uPR;
  uniform float uIntro;
  uniform float uRadius;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uCore;
  uniform vec3 uMid;
  uniform vec3 uEdge;
  attribute float aR;
  attribute float aA;
  attribute vec3 aRnd;
  attribute float aS;
  attribute float aT;
  varying vec3 vCol;
  varying float vA;
  void main() {
    // Intro: everything starts in the core and swirls outwards into the arms
    float e = 1.0 - pow(1.0 - clamp(uIntro, 0.0, 1.0), 3.0);
    float r = aR * uRadius * e;
    float ang = aA + (1.0 - e) * (1.0 - aR) * 5.0;
    vec3 p = vec3(cos(ang) * r, 0.0, sin(ang) * r) + aRnd * e;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.78 + 0.22 * sin(uTime * 1.6 + aT * 6.2831);
    gl_PointSize = uSize * aS * uPR * tw / -mv.z;
    vec3 c = mix(uCore, uMid, smoothstep(0.0, 0.28, aR));
    vCol = mix(c, uEdge, smoothstep(0.28, 1.0, aR));
    vA = uOpacity * mix(1.0, 0.42, aR) * smoothstep(0.0, 0.12, uIntro);
  }
`;

const FRAG = /* glsl */`
  varying vec3 vCol;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float s = smoothstep(0.5, 0.0, d);
    s *= s;
    if (s < 0.02) discard;
    gl_FragColor = vec4(vCol, s * vA);
  }
`;

// Faraway stars around the galaxy
const STAR_VERT = /* glsl */`
  uniform float uPR;
  uniform float uTime;
  uniform float uOpacity;
  attribute float aS;
  attribute float aT;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aT) + aT * 40.0);
    gl_PointSize = aS * uPR * 46.0 / -mv.z;
    vA = uOpacity * tw;
  }
`;
const STAR_FRAG = /* glsl */`
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float s = smoothstep(0.5, 0.05, d);
    if (s < 0.02) discard;
    gl_FragColor = vec4(uColor, s * vA);
  }
`;

export const DEFAULTS = {
  stars: 62000,
  arms: 4,
  spin: 1.15,
  radius: 5.4,
  chaos: 0.34,
  power: 3,
  speed: 0.045,
  core: '#fff1dc',
  mid: '#8ea2ff',
  edge: '#4d6bff',
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

export function createGalaxy(canvas, opts = {}) {
  const small = opts.small;
  const reduce = opts.reduce;
  const params = Object.assign({}, DEFAULTS, opts.params || {});
  if (small) params.stars = Math.min(params.stars, 17000);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  let pr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6);
  renderer.setPixelRatio(pr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(48, 1, 0.1, 200);
  const galaxy = new Group();
  scene.add(galaxy);

  /* ---------- materials: glowing on dark, ink on light ---------- */
  function makeMat(blending, colors, size) {
    return new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: false, blending,
      uniforms: {
        uSize: { value: size }, uPR: { value: pr }, uIntro: { value: reduce ? 1 : 0 },
        uRadius: { value: params.radius }, uTime: { value: 0 }, uOpacity: { value: 1 },
        uCore: { value: new Color(colors[0]) }, uMid: { value: new Color(colors[1]) }, uEdge: { value: new Color(colors[2]) },
      },
    });
  }
  const glowMat = makeMat(AdditiveBlending, [params.core, params.mid, params.edge], small ? 30 : 34);
  const inkMat = makeMat(NormalBlending, ['#0b0b0b', '#1d2b8f', '#4d6bff'], small ? 24 : 27);

  let geo = null;
  const glow = new Points(new BufferGeometry(), glowMat);
  const ink = new Points(new BufferGeometry(), inkMat);
  glow.frustumCulled = ink.frustumCulled = false;
  galaxy.add(glow, ink);

  function build() {
    const n = Math.round(params.stars);
    const aR = new Float32Array(n), aA = new Float32Array(n), aRnd = new Float32Array(n * 3);
    const aS = new Float32Array(n), aT = new Float32Array(n);
    const arms = Math.max(1, Math.round(params.arms));
    for (let i = 0; i < n; i++) {
      const bulge = Math.random() < 0.13;
      let r, a;
      if (bulge) {
        // round, bright core
        r = Math.pow(Math.random(), 1.8) * 0.16;
        a = Math.random() * Math.PI * 2;
        const s = 0.55 * (0.2 + r) * params.radius;
        aRnd[i * 3] = (Math.random() - 0.5) * s;
        aRnd[i * 3 + 1] = (Math.random() - 0.5) * s * 0.7;
        aRnd[i * 3 + 2] = (Math.random() - 0.5) * s;
      } else {
        r = Math.pow(Math.random(), 0.9);
        a = ((i % arms) / arms) * Math.PI * 2 + r * params.spin * Math.PI * 1.6;
        for (let k = 0; k < 3; k++) {
          const sign = Math.random() < 0.5 ? 1 : -1;
          let v = Math.pow(Math.random(), params.power) * sign * params.chaos * (0.25 + r) * params.radius * 0.55;
          if (k === 1) v *= 0.32;   // thin disc
          aRnd[i * 3 + k] = v;
        }
      }
      aR[i] = r; aA[i] = a;
      aS[i] = Math.random() < 0.015 ? 2.6 : 0.45 + Math.random() * (bulge ? 1.1 : 0.85);
      aT[i] = Math.random();
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aR', new BufferAttribute(aR, 1));
    g.setAttribute('aA', new BufferAttribute(aA, 1));
    g.setAttribute('aRnd', new BufferAttribute(aRnd, 3));
    g.setAttribute('aS', new BufferAttribute(aS, 1));
    g.setAttribute('aT', new BufferAttribute(aT, 1));
    if (geo) geo.dispose();
    geo = g;
    glow.geometry = g; ink.geometry = g;
    glowMat.uniforms.uRadius.value = inkMat.uniforms.uRadius.value = params.radius;
  }
  build();

  /* ---------- far stars ---------- */
  const starCount = small ? 500 : 1400;
  const sp = new Float32Array(starCount * 3), ss = new Float32Array(starCount), st = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = 18 + Math.random() * 30;
    const q = Math.sqrt(1 - u * u);
    sp[i * 3] = q * Math.cos(th) * rr; sp[i * 3 + 1] = u * rr; sp[i * 3 + 2] = q * Math.sin(th) * rr;
    ss[i] = 0.6 + Math.random() * 1.4; st[i] = Math.random();
  }
  const sg = new BufferGeometry();
  sg.setAttribute('position', new BufferAttribute(sp, 3));
  sg.setAttribute('aS', new BufferAttribute(ss, 1));
  sg.setAttribute('aT', new BufferAttribute(st, 1));
  const starMat = new ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uPR: { value: pr }, uTime: { value: 0 }, uOpacity: { value: 0.9 }, uColor: { value: new Color('#cfd8ff') } },
  });
  const stars = new Points(sg, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  /* ---------- poses: one per section, blended by scroll ---------- */
  // d: camera distance, polar/azim: degrees, sx/sy: where the core sits on screen (-0.5..0.5), op: brightness
  // a key can carry phone overrides in k.m
  let keys = (opts.keys || []).map((k) => Object.assign({ d: 8, polar: 60, azim: 0, sx: 0, sy: 0, op: 1, tilt: 0 }, k, small && k.m ? k.m : {}));
  let anchors = [];
  function measure() {
    const vh = window.innerHeight;
    const y0 = window.scrollY;
    anchors = keys.map((k) => {
      const el = typeof k.el === 'string' ? document.querySelector(k.el) : k.el;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      // the scroll position at which this section is centred (or its first screen is)
      return y0 + r.top + Math.min(r.height, vh) * 0.5 - vh * 0.5;
    });
    const list = [];
    keys.forEach((k, i) => { if (anchors[i] != null) list.push({ k, a: anchors[i] }); });
    list.sort((p, q) => p.a - q.a);
    anchors = list;
  }

  function poseAt(y) {
    const L = anchors;
    // pages without section poses (about, blog): a quiet galaxy off to the side that turns with the scroll
    if (L.length < 3) return { d: 11, polar: 58, azim: y / 24, sx: small ? 0.2 : 0.4, sy: 0.06, op: small ? 0.35 : 0.45, tilt: 0 };
    if (y <= L[0].a) return L[0].k;
    if (y >= L[L.length - 1].a) return L[L.length - 1].k;
    let i = 0;
    while (i < L.length - 2 && y > L[i + 1].a) i++;
    const A = L[i], B = L[i + 1];
    // hold the pose while a section is being read, move between sections
    const t = smooth(clamp01((y - A.a) / Math.max(1, B.a - A.a) * 1.35 - 0.18));
    const out = {};
    ['d', 'polar', 'azim', 'sx', 'sy', 'op', 'tilt'].forEach((p) => { out[p] = lerp(A.k[p], B.k[p], t); });
    return out;
  }

  const cur = { d: 8, polar: 60, azim: 0, sx: 0, sy: 0, op: 1, tilt: 0 };
  let first = true;
  let light = 0, lightTarget = 0;
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  let time = 0, spin = 0, lastY = window.scrollY, vel = 0;
  let introT = reduce ? 1 : 0, introDur = 0, introOn = false;
  let W = 0, H = 0;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // smaller screens see the galaxy from a little further back so the arms fit
    camera.fov = W < 700 ? 62 : 48;
    camera.updateProjectionMatrix();
    measure();
  }
  resize();

  if (!small && !reduce) {
    window.addEventListener('pointermove', (e) => { tmx = e.clientX / W * 2 - 1; tmy = e.clientY / H * 2 - 1; }, { passive: true });
  }
  window.addEventListener('resize', () => { resize(); if (reduce) render(); });
  window.addEventListener('load', measure);

  function render() {
    const vh = H;
    const y = window.scrollY;
    const target = poseAt(y);
    const k = first ? 1 : 1 - Math.exp(-dtLast * 3.2);
    first = false;
    for (const p in cur) cur[p] = lerp(cur[p], target[p], k);
    lightTarget = document.documentElement.classList.contains('is-light') ? 1 : 0;
    light = lerp(light, lightTarget, 1 - Math.exp(-dtLast * 4));

    const polar = (cur.polar + my * 5) * Math.PI / 180;
    const azim = (cur.azim + mx * 9) * Math.PI / 180;
    camera.position.set(Math.sin(polar) * Math.sin(azim) * cur.d, Math.cos(polar) * cur.d, Math.sin(polar) * Math.cos(azim) * cur.d);
    camera.up.set(Math.sin(cur.tilt * Math.PI / 180), Math.cos(cur.tilt * Math.PI / 180), 0);
    camera.lookAt(0, 0, 0);
    // move the core to its spot on screen (sx > 0: right, sy > 0: lower)
    camera.setViewOffset(W, vh, -cur.sx * W, -cur.sy * vh, W, vh);

    galaxy.rotation.y = -spin;
    stars.rotation.y = -spin * 0.15;

    const op = cur.op;
    glowMat.uniforms.uOpacity.value = op * (1 - light);
    inkMat.uniforms.uOpacity.value = op * light * (small ? 0.4 : 0.62);
    glow.visible = glowMat.uniforms.uOpacity.value > 0.01;
    ink.visible = inkMat.uniforms.uOpacity.value > 0.01;
    starMat.uniforms.uOpacity.value = 0.9 * (1 - light) * (0.5 + 0.5 * op);
    stars.visible = starMat.uniforms.uOpacity.value > 0.01;

    glowMat.uniforms.uTime.value = inkMat.uniforms.uTime.value = starMat.uniforms.uTime.value = time;
    glowMat.uniforms.uIntro.value = inkMat.uniforms.uIntro.value = introT;
    renderer.render(scene, camera);
  }

  /* ---------- loop ---------- */
  let last = performance.now(), dtLast = 0.016, running = false, rafId = 0;
  let slow = 0, frames = 0, degraded = false;
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; dtLast = dt;
    const y = window.scrollY;
    const v = (y - lastY) / Math.max(dt, 0.001);
    lastY = y;
    vel = lerp(vel, v, 0.12);
    const boost = 1 + Math.min(Math.abs(vel) / 900, 4);
    time += dt;
    spin += dt * params.speed * boost;
    mx = lerp(mx, tmx, 1 - Math.exp(-dt * 2.5));
    my = lerp(my, tmy, 1 - Math.exp(-dt * 2.5));
    if (introOn) {
      introT = Math.min(1, introT + dt / introDur);
      if (introT >= 1) introOn = false;
    }
    render();
    // if the device struggles, draw fewer particles at a lower resolution
    if (!degraded) {
      frames++;
      if (dt > 0.03) slow++;
      if (frames >= 120) {
        if (slow > 50) {
          degraded = true;
          pr = 1; renderer.setPixelRatio(1); resize();
          glowMat.uniforms.uPR.value = inkMat.uniforms.uPR.value = starMat.uniforms.uPR.value = 1;
          const n = Math.round(params.stars * 0.55);
          glow.geometry.setDrawRange(0, n);
        }
        frames = 0; slow = 0;
      }
    }
  }
  function start() {
    if (running || reduce) return;
    running = true; last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

  if (reduce) {
    // one still frame, redrawn when the page changes theme or size
    render();
    let raf = 0;
    const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { dtLast = 1; render(); }); };
    window.addEventListener('scroll', redraw, { passive: true });
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } else {
    start();
  }

  // re-measure when the page height changes (images, fonts, pinned sections)
  let lastH = 0;
  setInterval(() => {
    const h = document.documentElement.scrollHeight;
    if (h !== lastH) { lastH = h; measure(); }
  }, 1200);

  return {
    params,
    canvas,
    intro(seconds) {
      if (reduce) return;
      introT = 0; introDur = seconds || 2.2; introOn = true;
    },
    showNow() { introT = 1; introOn = false; },
    set(next) {
      let rebuild = false;
      for (const k in next) {
        if (['stars', 'arms', 'spin', 'chaos', 'power', 'radius'].indexOf(k) > -1) rebuild = true;
        params[k] = next[k];
      }
      glowMat.uniforms.uCore.value.set(params.core);
      glowMat.uniforms.uMid.value.set(params.mid);
      glowMat.uniforms.uEdge.value.set(params.edge);
      if (rebuild) build();
      if (reduce) render();
    },
    measure,
  };
}
