/* =========================================================
   Pixels that build the page (Three.js)
   Thousands of small square pixels sit behind the site. As you
   scroll they rebuild themselves into what a web designer and
   developer makes: a browser window, </>, { }, a laptop and a
   phone, a git branch, a Shopify bag, a rocket for launch.
   ========================================================= */
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, AdditiveBlending, NormalBlending, Color, Group, ColorManagement
} from 'three';

ColorManagement.enabled = false;   // colours are used exactly as written

/* ---------- shapes: drawn on a 256px canvas, then sampled into points ---------- */
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.stroke();
}
function line(c, pts, close) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  if (close) c.closePath();
  c.stroke();
}
function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
function ring(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }

export const SHAPES = {
  // a browser window with a page layout inside
  browser(c) {
    rr(c, 22, 44, 212, 168, 16);
    line(c, [[22, 78], [234, 78]]);
    dot(c, 42, 61, 6); dot(c, 60, 61, 6); dot(c, 78, 61, 6);
    c.lineWidth = 6; rr(c, 104, 55, 108, 13, 6);
    c.lineWidth = 8;
    rr(c, 42, 96, 172, 36, 8);
    rr(c, 42, 148, 50, 46, 8); rr(c, 103, 148, 50, 46, 8); rr(c, 164, 148, 50, 46, 8);
  },
  // </>
  code(c) {
    c.lineWidth = 15;
    line(c, [[80, 76], [30, 128], [80, 180]]);
    line(c, [[150, 56], [108, 200]]);
    line(c, [[178, 76], [228, 128], [178, 180]]);
  },
  // { ... }
  braces(c) {
    c.lineWidth = 13;
    const brace = (m) => {
      const X = (x) => (m ? 256 - x : x);
      c.beginPath(); c.moveTo(X(106), 40);
      c.bezierCurveTo(X(76), 40, X(80), 62, X(80), 90); c.lineTo(X(80), 108);
      c.bezierCurveTo(X(80), 122, X(72), 128, X(56), 128); c.bezierCurveTo(X(72), 128, X(80), 134, X(80), 148);
      c.lineTo(X(80), 166); c.bezierCurveTo(X(80), 194, X(76), 216, X(106), 216); c.stroke();
    };
    brace(false); brace(true);
    dot(c, 108, 128, 8); dot(c, 128, 128, 8); dot(c, 148, 128, 8);
  },
  // a laptop and a phone: responsive builds
  devices(c) {
    rr(c, 26, 56, 150, 104, 10);
    line(c, [[26, 162], [10, 180], [190, 180], [176, 162]]);
    c.lineWidth = 7;
    line(c, [[46, 84], [124, 84]]); line(c, [[46, 104], [156, 104]]); line(c, [[46, 124], [108, 124]]);
    c.lineWidth = 9; rr(c, 194, 92, 48, 100, 10);
    c.lineWidth = 6; line(c, [[210, 104], [226, 104]]);
  },
  // a git branch that merges back
  branch(c) {
    c.lineWidth = 9;
    line(c, [[18, 162], [238, 162]]);
    c.beginPath(); c.moveTo(70, 162); c.bezierCurveTo(96, 162, 96, 92, 124, 92); c.lineTo(174, 92); c.bezierCurveTo(202, 92, 204, 162, 220, 162); c.stroke();
    [[36, 162], [100, 162], [150, 162], [124, 92], [174, 92], [222, 162]].forEach((p) => { c.lineWidth = 7; ring(c, p[0], p[1], 13); dot(c, p[0], p[1], 4); });
  },
  // a terminal with a prompt
  terminal(c) {
    rr(c, 22, 50, 212, 156, 16);
    line(c, [[22, 84], [234, 84]]);
    dot(c, 42, 67, 6); dot(c, 60, 67, 6); dot(c, 78, 67, 6);
    c.lineWidth = 12;
    line(c, [[54, 116], [86, 142], [54, 168]]);
    line(c, [[104, 170], [156, 170]]);
  },
  // a shopping bag: Shopify stores
  bag(c) {
    line(c, [[54, 98], [202, 98], [214, 216], [42, 216]], true);
    c.beginPath(); c.moveTo(94, 98); c.bezierCurveTo(94, 34, 162, 34, 162, 98); c.stroke();
    dot(c, 94, 122, 6); dot(c, 162, 122, 6);
  },
  // a selected frame with handles and a pointer: design in Figma
  design(c) {
    c.lineWidth = 6; c.setLineDash([14, 10]); rr(c, 34, 50, 172, 132, 2); c.setLineDash([]);
    c.lineWidth = 6;
    [[34, 50], [206, 50], [34, 182], [206, 182]].forEach((p) => rr(c, p[0] - 9, p[1] - 9, 18, 18, 3));
    c.lineWidth = 8;
    line(c, [[186, 168], [186, 236], [202, 220], [214, 246], [228, 240], [216, 214], [238, 212]], true);
  },
  // ?
  question(c) {
    c.lineWidth = 18;
    c.beginPath(); c.moveTo(82, 92); c.bezierCurveTo(82, 40, 176, 36, 176, 94); c.bezierCurveTo(176, 130, 128, 128, 128, 166); c.stroke();
    dot(c, 128, 210, 13);
  },
  // @
  at(c) {
    c.lineWidth = 14;
    ring(c, 128, 128, 36);
    c.beginPath(); c.moveTo(164, 94); c.lineTo(164, 148); c.bezierCurveTo(164, 184, 214, 180, 214, 128);
    c.arc(128, 128, 86, 0, Math.PI * 0.42, true); c.stroke();
  },
  // a rocket: launch / deploy
  rocket(c) {
    c.lineWidth = 9;
    c.beginPath(); c.moveTo(128, 24); c.bezierCurveTo(170, 62, 172, 128, 158, 176); c.lineTo(98, 176); c.bezierCurveTo(84, 128, 86, 62, 128, 24); c.closePath(); c.stroke();
    ring(c, 128, 100, 17);
    line(c, [[98, 140], [64, 194], [100, 178]]);
    line(c, [[158, 140], [192, 194], [156, 178]]);
    line(c, [[112, 192], [128, 238], [144, 192]]);
  },
};
export const SHAPE_NAMES = Object.keys(SHAPES).concat(['grid']);

const SIZE = 5;   // a shape's 256px box is SIZE world units wide

function sampleShape(name, n) {
  const out = new Float32Array(n * 3);
  if (name === 'grid') {
    // an even field of pixels, like a design tool's canvas
    const cols = Math.round(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
    const w = 14, h = w * rows / cols;
    for (let i = 0; i < n; i++) {
      const cx = i % cols, cy = Math.floor(i / cols);
      out[i * 3] = (cx / (cols - 1) - 0.5) * w;
      out[i * 3 + 1] = (cy / Math.max(1, rows - 1) - 0.5) * h;
      out[i * 3 + 2] = 0;
    }
    return out;
  }
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.strokeStyle = c.fillStyle = '#fff';
  c.lineWidth = 10; c.lineCap = 'round'; c.lineJoin = 'round';
  SHAPES[name](c);
  const d = c.getImageData(0, 0, S, S).data;
  const xs = [], ys = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 120) { xs.push(x); ys.push(y); }
  const m = xs.length;
  const pick = [];
  for (let i = 0; i < n; i++) {
    const k = (Math.random() * m) | 0;
    pick.push([(xs[k] + Math.random() - S / 2) / S * SIZE, -(ys[k] + Math.random() - S / 2) / S * SIZE]);
  }
  // left to right, so a shape flows into the next one instead of criss-crossing
  pick.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < n; i++) {
    out[i * 3] = pick[i][0]; out[i * 3 + 1] = pick[i][1]; out[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }
  return out;
}

const VERT = /* glsl */`
  uniform float uT;
  uniform float uTime;
  uniform float uIntro;
  uniform float uSize;
  uniform float uPR;
  uniform float uAspect;
  uniform vec2 uMouse;
  uniform float uForce;
  uniform float uVel;
  uniform float uOpacity;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform float uWave;
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec3 aS;
  attribute vec4 aR;     // delay, phase, size, sparkle
  varying vec3 vCol;
  varying float vA;
  void main() {
    // each pixel leaves a little later than the one on its left: the shape rebuilds as a wave
    float t = clamp((uT - aR.x * 0.4) / 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(aA, aB, t);
    // a slow wave runs through flat fields of pixels (the hero floor, the gallery)
    float wv = sin(p.x * 0.85 + uTime * 0.8) * cos(p.y * 0.7 + uTime * 0.55) + 0.5 * sin((p.x + p.y) * 0.45 - uTime * 0.5);
    p.z += wv * uWave;
    float edge = (1.0 - smoothstep(5.0, 7.0, abs(p.x))) * (1.0 - smoothstep(2.7, 3.9, abs(p.y)));
    float mid = sin(t * 3.14159);
    p += vec3(sin(aR.y * 6.28 + uTime * 0.9), cos(aR.y * 5.1 + uTime * 0.7), sin(aR.y * 4.3)) * mid * 0.5;
    p += vec3(sin(uTime * 0.8 + aR.y * 20.0), cos(uTime * 0.6 + aR.y * 13.0), 0.0) * 0.02;
    p += vec3(sin(aR.y * 31.0), cos(aR.y * 17.0), 0.0) * uVel;
    // intro: pixels fly in from everywhere and assemble
    float ie = clamp((uIntro - aR.x * 0.45) / 0.55, 0.0, 1.0);
    ie = 1.0 - pow(1.0 - ie, 3.0);
    p = mix(aS, p, ie);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    // the cursor pushes pixels aside
    vec2 ndc = clip.xy / clip.w;
    vec2 dv = (ndc - uMouse) * vec2(uAspect, 1.0);
    float dist = length(dv);
    float f = uForce * (1.0 - smoothstep(0.0, 0.3, dist));
    ndc += (dist > 0.0001 ? dv / dist : vec2(0.0)) / vec2(uAspect, 1.0) * f * 0.085;
    clip.xy = ndc * clip.w;
    gl_Position = clip;
    gl_PointSize = uSize * (0.65 + aR.z * 0.7) * uPR * 8.0 / -mv.z;
    // pixels very close to the camera (the front of a floor) fade, so text at the bottom of a screen stays clean
    float near = smoothstep(4.2, 6.6, -mv.z);
    float g = clamp(p.x * 0.11 + p.y * 0.05 + 0.5, 0.0, 1.0);
    vCol = mix(uC1, uC2, g);
    vCol = mix(vCol, vec3(1.0), step(0.93, aR.w) * 0.8);
    vA = uOpacity * (0.75 + 0.25 * sin(uTime * 2.0 + aR.y * 40.0)) * smoothstep(0.0, 0.2, uIntro) * (1.0 + f * 0.6) * edge * near;
    vCol = mix(vCol, vec3(1.0), clamp(wv, 0.0, 1.0) * uWave * 1.2);
  }
`;

const FRAG = /* glsl */`
  varying vec3 vCol;
  varying float vA;
  void main() {
    // a crisp square pixel with soft edges
    vec2 q = abs(gl_PointCoord - 0.5);
    float s = 1.0 - smoothstep(0.36, 0.5, max(q.x, q.y));
    if (s < 0.05) discard;
    gl_FragColor = vec4(vCol, s * vA);
  }
`;

export const DEFAULTS = {
  count: 11000,
  size: 2.6,
  cursor: 1,
  shape: 'auto',
  colorA: '#4d6bff',
  colorB: '#dfe5ff',
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const POSE = ['s', 'sx', 'sy', 'rx', 'ry', 'op', 'wave'];

export function createPixels(canvas, opts = {}) {
  const small = opts.small;
  const reduce = opts.reduce;
  const params = Object.assign({}, DEFAULTS, opts.params || {});
  if (small) params.count = Math.min(params.count, 6000);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  let pr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(pr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 0, 8);
  const group = new Group();
  scene.add(group);

  function makeMat(blending, c1, c2) {
    return new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false, blending,
      uniforms: {
        uT: { value: 0 }, uTime: { value: 0 }, uIntro: { value: reduce ? 1 : 0 }, uSize: { value: params.size }, uPR: { value: pr },
        uAspect: { value: 1 }, uMouse: { value: [9, 9] }, uForce: { value: params.cursor }, uVel: { value: 0 }, uOpacity: { value: 1 },
        uC1: { value: new Color(c1) }, uC2: { value: new Color(c2) }, uWave: { value: 0 },
      },
    });
  }
  const glowMat = makeMat(AdditiveBlending, params.colorA, params.colorB);
  const inkMat = makeMat(NormalBlending, '#0b0b0b', '#3049d8');
  const mats = [glowMat, inkMat];
  const glow = new Points(new BufferGeometry(), glowMat);
  const ink = new Points(new BufferGeometry(), inkMat);
  glow.frustumCulled = ink.frustumCulled = false;
  group.add(glow, ink);

  /* ---------- particles and the shapes they can become ---------- */
  let N = 0, shapes = {}, attrA = null, attrB = null, loaded = [null, null];
  function build() {
    N = Math.round(params.count);
    const dust = Math.round(N * 0.08);           // a few free pixels that never join a shape
    const nShape = N - dust;
    shapes = {};
    const dustPos = new Float32Array(dust * 3);
    for (let i = 0; i < dust; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 14; dustPos[i * 3 + 1] = (Math.random() - 0.5) * 8; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    // Shapes are sampled left to right, so pixel k of one shape travels to pixel k of the
    // next. They are stored in one shared random order, so drawing fewer pixels on a slow
    // device thins every shape evenly instead of cutting off its right side.
    const perm = new Uint32Array(nShape);
    for (let i = 0; i < nShape; i++) perm[i] = i;
    for (let i = nShape - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    SHAPE_NAMES.forEach((name) => {
      const a = new Float32Array(N * 3);
      const src = sampleShape(name, nShape);
      for (let r = 0; r < nShape; r++) {
        const d = perm[r] * 3;
        a[d] = src[r * 3]; a[d + 1] = src[r * 3 + 1]; a[d + 2] = src[r * 3 + 2];
      }
      a.set(dustPos, nShape * 3);
      shapes[name] = a;
    });
    const aS = new Float32Array(N * 3), aR = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      aS[i * 3] = (Math.random() - 0.5) * 18; aS[i * 3 + 1] = (Math.random() - 0.5) * 11; aS[i * 3 + 2] = (Math.random() - 0.5) * 8;
      aR[i * 4] = Math.random();
      aR[i * 4 + 1] = Math.random(); aR[i * 4 + 2] = Math.random(); aR[i * 4 + 3] = Math.random();
    }
    // delay follows each pixel's left-to-right rank, so shapes rebuild as a sweep
    for (let r = 0; r < nShape; r++) aR[perm[r] * 4] = r / nShape * 0.8 + Math.random() * 0.2;
    const g = new BufferGeometry();
    attrA = new BufferAttribute(new Float32Array(N * 3), 3);
    attrB = new BufferAttribute(new Float32Array(N * 3), 3);
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aA', attrA); g.setAttribute('aB', attrB);
    g.setAttribute('aS', new BufferAttribute(aS, 3));
    g.setAttribute('aR', new BufferAttribute(aR, 4));
    if (glow.geometry) glow.geometry.dispose();
    glow.geometry = g; ink.geometry = g;
    loaded = [null, null];
  }
  function load(a, b) {
    if (loaded[0] === a && loaded[1] === b) return;
    attrA.array.set(shapes[a]); attrA.needsUpdate = true;
    attrB.array.set(shapes[b]); attrB.needsUpdate = true;
    loaded = [a, b];
  }
  build();

  /* ---------- one pose and one shape per section ---------- */
  const keys = (opts.keys || []).map((k) => {
    const o = Object.assign({ shape: 'code', s: 1, sx: 0, sy: 0, rx: 0, ry: 0, op: 1, wave: 0 }, k);
    // phones: smaller shapes tucked against the edge, so they decorate instead of covering text
    if (small) Object.assign(o, { s: o.s * 0.62, sx: o.sx === 0 ? 0 : Math.sign(o.sx) * 0.32, op: o.op * 0.65 }, k.m || {});
    return o;
  });
  const FALLBACK = { wave: 0, shape: 'code', s: small ? 0.5 : 0.8, sx: small ? 0.32 : 0.34, sy: 0.04, rx: 0, ry: -16, op: small ? 0.3 : 0.45 };
  let anchors = [];
  function measure() {
    const vh = window.innerHeight, y0 = window.scrollY;
    const list = [];
    keys.forEach((k) => {
      const el = document.querySelector(k.el);
      if (!el) return;
      const r = el.getBoundingClientRect();
      list.push({ k, a: y0 + r.top + Math.min(r.height, vh) * 0.5 - vh * 0.5 });
    });
    list.sort((p, q) => p.a - q.a);
    anchors = list;
  }
  // where are we between two sections, and how far along
  function segment(y) {
    const L = anchors;
    if (L.length < 3) return { A: FALLBACK, B: FALLBACK, t: 0 };
    if (y <= L[0].a) return { A: L[0].k, B: L[0].k, t: 0 };
    if (y >= L[L.length - 1].a) return { A: L[L.length - 1].k, B: L[L.length - 1].k, t: 0 };
    let i = 0;
    while (i < L.length - 2 && y > L[i + 1].a) i++;
    const A = L[i], B = L[i + 1];
    // hold each shape while its section is read; rebuild as the next section comes in
    const raw = clamp01((y - A.a) / Math.max(1, B.a - A.a));
    const t = smooth(clamp01((raw - 0.55) / 0.4));
    return { A: A.k, B: B.k, t };
  }

  /* ---------- manual shape from the config panel ---------- */
  let manual = null, manualFrom = null, manualTo = null, manualT = 1;
  function setManual(name) {
    const now = segment(window.scrollY);
    const showing = manual || (now.t < 0.5 ? now.A.shape : now.B.shape);
    manualFrom = showing;
    manual = name === 'auto' ? null : name;
    manualT = 0;
    if (!manual) manualTo = now.t < 0.5 ? now.A.shape : now.B.shape;
  }

  const cur = { s: 1, sx: 0, sy: 0, rx: 0, ry: 0, op: 1, wave: 0 };
  let first = true, light = 0, mx = 9, my = 9, tmx = 9, tmy = 9, px = 0, py = 0;
  let time = 0, lastY = window.scrollY, vel = 0, introT = reduce ? 1 : 0, introDur = 0, introOn = false, introStart = 0;
  let W = 0, H = 0, dtLast = 0.016;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = W < 700 ? 64 : 48;
    camera.updateProjectionMatrix();
    mats.forEach((m) => { m.uniforms.uAspect.value = W / H; });
    measure();
  }
  resize();
  window.addEventListener('resize', () => { resize(); if (reduce) render(); });
  window.addEventListener('load', measure);
  if (!reduce) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      tmx = e.clientX / W * 2 - 1; tmy = -(e.clientY / H * 2 - 1);
      px = tmx; py = tmy;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { tmx = tmy = 9; });
  }

  function render() {
    const seg = segment(window.scrollY);
    let a = seg.A.shape, b = seg.B.shape, t = seg.t;
    if (reduce) t = t < 0.5 ? 0 : 1;
    if (manual || manualT < 1) {
      manualT = Math.min(1, manualT + dtLast / 1.3);
      a = manualFrom; b = manual || manualTo; t = manualT;
    }
    load(a, b);
    // pose follows the scroll, eased
    const k = first ? 1 : 1 - Math.exp(-dtLast * 3.5);
    first = false;
    POSE.forEach((p) => { cur[p] = lerp(cur[p], lerp(seg.A[p], seg.B[p], seg.t), k); });
    light = lerp(light, document.documentElement.classList.contains('is-light') ? 1 : 0, 1 - Math.exp(-dtLast * 4));

    group.scale.setScalar(cur.s);
    const sway = reduce ? 0 : Math.sin(time * 0.3) * 4;
    const tx = tmx > 2 ? 0 : px, ty = tmy > 2 ? 0 : py;
    group.rotation.set((cur.rx - ty * 5) * Math.PI / 180, (cur.ry + tx * 8 + sway) * Math.PI / 180, 0);
    camera.setViewOffset(W, H, -cur.sx * W, -cur.sy * H, W, H);

    mats.forEach((m) => {
      const u = m.uniforms;
      u.uT.value = t; u.uTime.value = time; u.uIntro.value = introT;
      u.uMouse.value[0] = mx; u.uMouse.value[1] = my;
      u.uVel.value = Math.min(Math.abs(vel) / 4000, 0.35);
      u.uWave.value = reduce ? 0 : cur.wave;
    });
    glowMat.uniforms.uOpacity.value = cur.op * (1 - light);
    inkMat.uniforms.uOpacity.value = cur.op * light * (small ? 0.45 : 0.7);
    glow.visible = glowMat.uniforms.uOpacity.value > 0.01;
    ink.visible = inkMat.uniforms.uOpacity.value > 0.01;
    renderer.render(scene, camera);
  }

  /* ---------- loop ---------- */
  let last = performance.now(), running = false, raf = 0, slow = 0, frames = 0, degraded = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; dtLast = dt; time += dt;
    const y = window.scrollY;
    vel = lerp(vel, (y - lastY) / Math.max(dt, 0.001), 0.15);
    lastY = y;
    mx = lerp(mx, tmx, 1 - Math.exp(-dt * 6));
    my = lerp(my, tmy, 1 - Math.exp(-dt * 6));
    // wall-clock time, so a slow first frame never stretches the intro
    if (introOn) { introT = Math.min(1, (now - introStart) / 1000 / introDur); if (introT >= 1) introOn = false; }
    render();
    if (!degraded) {
      frames++;
      if (dt > 0.03) slow++;
      if (frames >= 120) {
        if (slow > 50) {
          degraded = true; pr = 1; renderer.setPixelRatio(1); resize();
          mats.forEach((m) => { m.uniforms.uPR.value = 1; });
          glow.geometry.setDrawRange(0, Math.round(N * 0.6));
        }
        frames = 0; slow = 0;
      }
    }
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

  if (reduce) {
    render();
    let r = 0;
    const redraw = () => { cancelAnimationFrame(r); r = requestAnimationFrame(() => { dtLast = 1; render(); }); };
    window.addEventListener('scroll', redraw, { passive: true });
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } else {
    start();
  }

  let lastH = 0;
  setInterval(() => { const h = document.documentElement.scrollHeight; if (h !== lastH) { lastH = h; measure(); } }, 1200);

  return {
    params,
    intro(seconds) { if (reduce) return; introT = 0; introDur = seconds || 2; introStart = performance.now(); introOn = true; },
    showNow() { introT = 1; introOn = false; },
    set(next) {
      let rebuild = false;
      for (const k in next) {
        if (k === 'count') rebuild = true;
        if (k === 'shape' && next.shape !== (manual || 'auto')) setManual(next.shape);
        params[k] = next[k];
      }
      if (rebuild) build();
      mats.forEach((m) => { m.uniforms.uSize.value = params.size; m.uniforms.uForce.value = params.cursor; });
      glowMat.uniforms.uC1.value.set(params.colorA);
      glowMat.uniforms.uC2.value.set(params.colorB);
      if (reduce) render();
    },
    measure,
  };
}
