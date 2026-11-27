/* =========================================================
   Hero name: letters lift off the page under the cursor (Three.js)
   The name is drawn into a texture and shown on a WebGL canvas
   laid exactly over the HTML heading. The canvas is a finely
   divided plane. While the cursor is on the letters, a small,
   smooth bump rises under it, so the letters there lift slightly
   and lean towards you, then settle back flat when the cursor
   leaves them. A faint blue glow is left beneath lifted letters.
   Idea after "Interactive Text Effect with Three.js & GLSL"
   (Paola Demichelis, Codrops).
   ========================================================= */
import {
  WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial,
  CanvasTexture, LinearFilter
} from 'three';

// Shared by both shaders: how high the page is lifted at a point, 0..1.
const LIFT = /* glsl */`
  uniform vec2 uSize;      // canvas size in CSS pixels
  uniform vec2 uMouse;     // pointer in CSS pixels, y up
  uniform float uAmp;      // 0..1, eases in while the pointer is near the name
  uniform float uRadius;   // sideways reach of the bump in CSS pixels
  uniform float uFlat;     // its height as a share of its width (1 = round)
  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }
  float liftAt(vec2 p) {
    vec2 d = (p - uMouse) / vec2(uRadius, uRadius * uFlat);
    return easeInOutCubic(clamp(1.0 - length(d), 0.0, 1.0)) * uAmp;
  }
`;

// Letters: each vertex moves up by the lift, the way a raised point of a tilted page
// shows on screen, and spreads a touch from the cursor as if leaning towards you.
// The name stays straight, so the letters rise and arch rather than fold over.
const TEXT_VERT = /* glsl */`
  ${LIFT}
  uniform float uLift;     // how far the top of the bump moves up, in CSS pixels
  varying vec2 vUv;
  varying float vLift;
  varying float vSlope;
  void main() {
    vUv = uv;
    vec2 p = uv * uSize;
    float k = liftAt(p);
    vLift = k;
    // how steeply the page rises going up the screen at this point; with light from
    // above, the side of the bump facing up catches a little more of it
    float e = 2.0;
    vSlope = (liftAt(p + vec2(0.0, e)) - liftAt(p - vec2(0.0, e))) / (2.0 * e) * uLift;
    vec2 q = p + (p - uMouse) * k * 0.012;
    q.y += k * uLift;
    gl_Position = vec4(q / uSize * 2.0 - 1.0, 0.0, 1.0);
  }
`;

// The text texture holds the letter shape in alpha and, in green, how far down its
// word each pixel sits (0 top, 1 bottom). The shader colours it with the same
// flowing gradient the HTML heading uses; lifted parts catch a little more light.
const TEXT_FRAG = /* glsl */`
  uniform sampler2D uText;
  uniform float uFlow;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vLift;
  varying float vSlope;
  vec3 ramp(float g) {
    vec3 c0 = vec3(0.965, 0.953, 0.925);
    vec3 c1 = vec3(0.875, 0.898, 1.0);
    vec3 c2 = vec3(0.557, 0.635, 1.0);
    if (g < 0.22) return mix(c0, c1, g / 0.22);
    if (g < 0.48) return mix(c1, c2, (g - 0.22) / 0.26);
    if (g < 0.74) return mix(c2, c1, (g - 0.48) / 0.26);
    return mix(c1, c0, (g - 0.74) / 0.26);
  }
  void main() {
    vec4 t = texture2D(uText, vUv);
    // same mapping as background-size: 100% 260% with a moving background-position
    float g = (t.g + 1.6 * uFlow) / 2.6;
    vec3 col = mix(ramp(g), vec3(1.0), 0.1 * vLift);
    col = mix(col, vec3(1.0), 0.15 * clamp(-vSlope, 0.0, 1.0));
    gl_FragColor = vec4(col, t.a * uOpacity);
  }
`;

// The glow left on the page: a blurred copy of the letters, visible only where
// they have lifted away.
const GLOW_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const GLOW_FRAG = /* glsl */`
  ${LIFT}
  uniform sampler2D uShadow;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float k = liftAt(vUv * uSize);
    float a = texture2D(uShadow, vUv).a * smoothstep(0.0, 0.8, k) * 0.32 * uOpacity;
    gl_FragColor = vec4(0.36, 0.47, 1.0, a);
  }
`;

const smooth = (t) => t * t * (3 - 2 * t);

export function createHeroName(h1) {
  const words = Array.prototype.slice.call(h1.querySelectorAll('.px__word'));
  if (!words.length) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'px__gl';
  canvas.setAttribute('aria-hidden', 'true');
  h1.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const mkTex = (cv) => {
    const t = new CanvasTexture(cv);
    t.minFilter = LinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = false;
    return t;
  };
  const textCanvas = document.createElement('canvas');
  const glowCanvas = document.createElement('canvas');
  const textTex = mkTex(textCanvas);
  const glowTex = mkTex(glowCanvas);

  // uniforms shared by both materials
  const shared = {
    uSize: { value: [1, 1] }, uMouse: { value: [-9999, -9999] }, uAmp: { value: 0 },
    uRadius: { value: 100 }, uFlat: { value: 1.0 }, uOpacity: { value: 0 },
  };
  const glowMat = new ShaderMaterial({
    vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: Object.assign({ uShadow: { value: glowTex } }, shared),
  });
  const textMat = new ShaderMaterial({
    vertexShader: TEXT_VERT, fragmentShader: TEXT_FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: Object.assign({ uText: { value: textTex }, uFlow: { value: 0 }, uLift: { value: 40 } }, shared),
  });
  const glowMesh = new Mesh(new PlaneGeometry(2, 2), glowMat);
  const textMesh = new Mesh(new PlaneGeometry(2, 2), textMat);
  glowMesh.renderOrder = 0; textMesh.renderOrder = 1;
  scene.add(glowMesh, textMesh);

  let W = 0, H = 0, dpr = 1, padTop = 0, bands = [];

  function drawWords(c, fs, cs, offsetX) {
    c.font = '400 ' + fs + 'px ' + cs.fontFamily;
    if ('letterSpacing' in c) c.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    c.textBaseline = 'alphabetic';
    const m = c.measureText('H');
    const asc = m.fontBoundingBoxAscent || fs * 0.92, desc = m.fontBoundingBoxDescent || fs * 0.25;
    const cap = m.actualBoundingBoxAscent || fs * 0.72;
    if (!offsetX) bands = [];
    words.forEach((w) => {
      const top = w.offsetTop + padTop;
      const lh = w.offsetHeight;
      const base = top + (lh - (asc + desc)) / 2 + asc;
      // green carries "how far down the word", alpha carries the letter
      const g = c.createLinearGradient(0, top, 0, top + lh);
      g.addColorStop(0, 'rgb(255,0,0)');
      g.addColorStop(1, 'rgb(255,255,0)');
      c.fillStyle = g;
      const text = w.textContent.toUpperCase();
      c.fillText(text, w.offsetLeft + offsetX, base);
      // the box the letters fill: cap height down to the baseline (a little more for the Q's tail)
      if (!offsetX) bands.push({ x0: w.offsetLeft, x1: w.offsetLeft + c.measureText(text).width, y0: base - cap, y1: base + fs * 0.05 });
    });
  }

  function layout() {
    // layout sizes only (offsetWidth/offsetTop), so scroll and intro transforms don't skew them
    const fs = parseFloat(getComputedStyle(h1).fontSize);
    const cs = getComputedStyle(words[0]);
    W = h1.offsetWidth;
    // room above the heading for the letters to lift into
    padTop = Math.round(fs * 0.3);
    const padBottom = Math.round(fs * 0.2);
    H = h1.offsetHeight + padTop + padBottom;
    canvas.style.top = -padTop + 'px';
    canvas.style.height = H + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);

    // the letters, where the HTML puts them
    textCanvas.width = Math.round(W * dpr);
    textCanvas.height = Math.round(H * dpr);
    const c = textCanvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    drawWords(c, fs, cs, 0);
    textTex.needsUpdate = true;

    // a blurred copy at half size for the glow. The text is drawn far off to the
    // left and only its shadow lands on the canvas, which blurs in every browser.
    const k = 0.5, OFF = 6000;
    glowCanvas.width = Math.ceil(W * k);
    glowCanvas.height = Math.ceil(H * k);
    const s = glowCanvas.getContext('2d');
    s.setTransform(k, 0, 0, k, 0, 0);
    s.clearRect(0, 0, W, H);
    s.shadowColor = '#fff';
    s.shadowBlur = fs * 0.09 * k;
    s.shadowOffsetX = OFF * k;            // shadow offsets ignore the transform: device pixels
    drawWords(s, fs, cs, -OFF);
    glowTex.needsUpdate = true;

    // about one vertex every 5px, so the bump bends smoothly
    textMesh.geometry.dispose();
    textMesh.geometry = new PlaneGeometry(2, 2, Math.min(360, Math.ceil(W / 5)), Math.min(160, Math.ceil(H / 5)));

    shared.uSize.value = [W, H];
    shared.uRadius.value = fs * 0.6;
    textMat.uniforms.uLift.value = fs * 0.13;
    edge = fs * 0.03;
  }

  /* ---------- the pointer ---------- */
  const target = { x: -9999, y: -9999, near: false };
  const mouse = { x: -9999, y: -9999 };
  let amp = 0, edge = 4, client = null;
  // Only while the pointer is on the letters themselves (each word's cap-height box),
  // not above, below or beside them.
  function point() {
    if (!client) { target.near = false; return; }
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // canvas pixels; undo the scroll scale on the heading
    const x = (client.x - r.left) * W / r.width;
    const yDown = (client.y - r.top) * H / r.height;
    target.near = bands.some((b) => x >= b.x0 - edge && x <= b.x1 + edge && yDown >= b.y0 - edge && yDown <= b.y1 + edge);
    if (target.near) { target.x = x; target.y = H - yDown; }
  }
  const at = (x, y) => { client = { x, y }; point(); };
  const away = () => { client = null; target.near = false; };
  window.addEventListener('pointermove', (e) => at(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', (e) => at(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) at(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchend', away, { passive: true });
  window.addEventListener('touchcancel', away, { passive: true });
  document.addEventListener('mouseleave', away);
  window.addEventListener('blur', away);

  function updatePointer(dt) {
    const f = 60 * dt;
    // the heading moves while the page scrolls, so check again against a still pointer
    point();
    // the bump grows in quickly and settles back a little slower
    const goal = target.near ? 1 : 0;
    amp += (goal - amp) * (1 - Math.pow(goal > amp ? 0.86 : 0.91, f));
    if (amp < 0.02 && target.near) { mouse.x = target.x; mouse.y = target.y; }
    else {
      const e = 1 - Math.pow(0.78, f);
      mouse.x += (target.x - mouse.x) * e;
      mouse.y += (target.y - mouse.y) * e;
    }
    shared.uMouse.value = [mouse.x, mouse.y];
    shared.uAmp.value = amp;
  }

  /* ---------- gradient flow, kept in step with the HTML heading's CSS animation ---------- */
  let cssAnim = null;
  try { cssAnim = words[0].getAnimations().find((a) => a.animationName === 'name-flow') || null; } catch (e) { cssAnim = null; }
  function flow(now) {
    const t = cssAnim && cssAnim.currentTime != null ? cssAnim.currentTime / 1000 : now / 1000;
    const k = (t % 12) / 6;                       // 6s each way, alternating
    return smooth(k <= 1 ? k : 2 - k);
  }

  /* ---------- loop: only while the hero is on screen ---------- */
  let running = false, raf = 0, last = performance.now(), shown = false, opacity = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (shown && opacity < 1) opacity = Math.min(1, opacity + dt / 0.35);
    updatePointer(dt);
    textMat.uniforms.uFlow.value = flow(now);
    shared.uOpacity.value = opacity;
    renderer.render(scene, camera);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  let inView = true;
  new IntersectionObserver((en) => { inView = en[0].isIntersecting; inView ? start() : stop(); }).observe(h1);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (inView) start(); });

  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

  const fontReady = document.fonts && document.fonts.load ? document.fonts.load('400 100px Anton').catch(() => {}) : Promise.resolve();
  return fontReady.then(() => {
    layout();
    start();
    return {
      // fade the canvas in over the HTML heading, then hide the HTML letters underneath
      show() {
        if (shown) return;
        shown = true;
        setTimeout(() => h1.classList.add('has-gl'), 380);
      },
      layout,
    };
  });
}
