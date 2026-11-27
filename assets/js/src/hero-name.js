/* =========================================================
   Hero name: the letters peel up off a tilted page (Three.js)
   After "Interactive Text Effect with Three.js & GLSL" by
   Paola Demichelis (Codrops): text on a finely divided plane,
   seen at a low angle, where a smooth bump under the cursor
   lifts the plane, so the letters there rise, curl over and
   leave their shadow on the page.

   Here the name leans back a little, from the first frame, and
   stays at that angle. While the pointer is on the letters, the
   letters under it come up off the page just a touch and cast a
   soft shadow down and to the right, onto the letters and page
   around them; when it leaves them the shadow fades away. The
   angle never changes and the letters keep their shape.
   ========================================================= */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, PlaneGeometry, Mesh, ShaderMaterial,
  CanvasTexture, LinearFilter
} from 'three';

// How high the page is lifted at a point, 0..1 (the demo's easeInOutCubic bump).
const LIFT = /* glsl */`
  uniform vec2 uSize;      // page size in CSS pixels
  uniform vec2 uMouse;     // pointer on the page in CSS pixels, y up
  uniform float uAmp;      // 0..1, grows while the pointer is on the letters
  uniform float uRadius;   // reach of the bump in CSS pixels
  uniform float uLift;     // height of the bump in CSS pixels
  uniform vec2 uCast;      // where a lifted letter's shadow lands, in CSS pixels (y up)
  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }
  float liftAt(vec2 p) {
    return easeInOutCubic(clamp(1.0 - length(p - uMouse) / uRadius, 0.0, 1.0)) * uAmp;
  }
`;

// Letters: the plane rises towards the viewer (local z) under the pointer.
const TEXT_VERT = /* glsl */`
  ${LIFT}
  varying vec2 vUv;
  varying float vLift;
  void main() {
    vUv = uv;
    float k = liftAt(uv * uSize);
    vLift = k;
    vec3 p = position;
    p.z += k * uLift;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

// The text texture holds the letter shape in alpha and, in green, how far down its
// word each pixel sits (0 top, 1 bottom). The shader colours it with the same
// flowing gradient the HTML heading uses.
const TEXT_FRAG = /* glsl */`
  uniform sampler2D uText;
  uniform float uFlow;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vLift;
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
    // empty page: draw nothing, so it never hides letters folded behind it
    if (t.a < 0.02) discard;
    // same mapping as background-size: 100% 260% with a moving background-position
    float g = (t.g + 1.6 * uFlow) / 2.6;
    vec3 col = mix(ramp(g), vec3(1.0), 0.16 * vLift);
    gl_FragColor = vec4(col, t.a * uOpacity);
  }
`;

// Shadow: a blurred copy of the letters on the page. The light comes from the upper
// left, so a lifted letter's shadow lands down and to the right of it: a point on the
// page is shaded by the letter at (point - uCast), as strongly as that letter is
// lifted. It sits just in front of the flat page, so it darkens the letters and page
// it falls on, and behind the lifted letters themselves.
const SHADOW_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SHADOW_FRAG = /* glsl */`
  ${LIFT}
  uniform sampler2D uShadow;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 caster = vUv * uSize - uCast;
    float k = liftAt(caster);
    float a = texture2D(uShadow, caster / uSize).a * smoothstep(0.0, 0.6, k) * 0.78 * uOpacity;
    gl_FragColor = vec4(0.0, 0.01, 0.05, a);
  }
`;

const smooth = (t) => t * t * (3 - 2 * t);

// How far the page leans back (radians from upright). Fixed: it never changes.
const TILT = 0.42;
const FOV = 6;

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
  const camera = new PerspectiveCamera(FOV, 1, 1, 20000);
  // the page turns about a line through the middle of the letters
  const pivot = new Group();
  scene.add(pivot);

  const mkTex = (cv) => {
    const t = new CanvasTexture(cv);
    t.minFilter = LinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = false;
    return t;
  };
  const textCanvas = document.createElement('canvas');
  const shadowCanvas = document.createElement('canvas');
  const textTex = mkTex(textCanvas);
  const shadowTex = mkTex(shadowCanvas);

  // uniforms shared by both materials
  const shared = {
    uSize: { value: [1, 1] }, uMouse: { value: [-9999, -9999] }, uAmp: { value: 0 },
    uRadius: { value: 100 }, uLift: { value: 40 }, uCast: { value: [10, -10] }, uOpacity: { value: 0 },
  };
  const shadowMat = new ShaderMaterial({
    vertexShader: SHADOW_VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthTest: true, depthWrite: false,
    uniforms: Object.assign({ uShadow: { value: shadowTex } }, shared),
  });
  const textMat = new ShaderMaterial({
    vertexShader: TEXT_VERT, fragmentShader: TEXT_FRAG, transparent: true, depthTest: true, depthWrite: true,
    uniforms: Object.assign({ uText: { value: textTex }, uFlow: { value: 0 } }, shared),
  });
  const shadowMesh = new Mesh(new PlaneGeometry(1, 1), shadowMat);
  const textMesh = new Mesh(new PlaneGeometry(1, 1), textMat);
  // letters first (they fill the depth buffer), then the shadow over the flat parts
  textMesh.renderOrder = 0; shadowMesh.renderOrder = 1;
  pivot.add(shadowMesh, textMesh);

  let W = 0, H = 0, dpr = 1, padTop = 0, bands = [], midDown = 0;

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
    // room above the heading for the letters to rise into
    padTop = Math.round(fs * 0.36);
    const padBottom = Math.round(fs * 0.24);
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

    // a blurred copy at half size for the shadow. The text is drawn far off to the
    // left and only its canvas shadow lands on the canvas, which blurs in every browser.
    const k = 0.5, OFF = 6000;
    shadowCanvas.width = Math.ceil(W * k);
    shadowCanvas.height = Math.ceil(H * k);
    const s = shadowCanvas.getContext('2d');
    s.setTransform(k, 0, 0, k, 0, 0);
    s.clearRect(0, 0, W, H);
    s.shadowColor = '#000';
    s.shadowBlur = fs * 0.06 * k;
    s.shadowOffsetX = OFF * k;            // shadow offsets ignore the transform: device pixels
    drawWords(s, fs, cs, -OFF);
    shadowTex.needsUpdate = true;

    // world units are CSS pixels; the camera sees the upright page exactly as the canvas
    camera.aspect = W / H;
    camera.position.set(0, 0, (H / 2) / Math.tan((FOV * Math.PI / 180) / 2));
    camera.near = camera.position.z * 0.2;
    camera.far = camera.position.z * 3;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // the page turns about the middle of the letters
    midDown = bands.length ? (bands[0].y0 + bands[bands.length - 1].y1) / 2 : H / 2;
    const pivotY = H / 2 - midDown;
    pivot.position.set(0, pivotY, 0);

    // about one vertex every 4px, so the bump bends smoothly
    textMesh.geometry.dispose();
    textMesh.geometry = new PlaneGeometry(W, H, Math.min(420, Math.ceil(W / 4)), Math.min(180, Math.ceil(H / 4)));
    shadowMesh.geometry.dispose();
    shadowMesh.geometry = new PlaneGeometry(W, H);
    textMesh.position.set(0, -pivotY, 0);
    shadowMesh.position.set(0, -pivotY, 0.6);

    shared.uSize.value = [W, H];
    // the letters barely rise, so they keep their shape; the shadow does the work
    shared.uRadius.value = fs * 0.7;
    shared.uLift.value = fs * 0.1;
    shared.uCast.value = [fs * 0.07, -fs * 0.11];
    edge = fs * 0.03;
  }

  /* ---------- the pointer ---------- */
  const target = { x: -9999, y: -9999, near: false };
  const mouse = { x: -9999, y: -9999 };
  let on = 0, edge = 4, client = null;
  const angle = TILT;
  pivot.rotation.x = -angle;
  // Only while the pointer is on the letters themselves (each word's cap-height box).
  // The pointer is mapped onto the leaning page, so the part of the letter under it
  // is the part that lifts.
  function point() {
    if (!client) { target.near = false; return; }
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = (client.x - r.left) * W / r.width;
    const yScreen = (client.y - r.top) * H / r.height;
    const yDown = midDown + (yScreen - midDown) / Math.cos(angle);
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
    // the shadow eases in over about a third of a second and fades out a little slower
    const goal = target.near ? 1 : 0;
    on += (goal - on) * (1 - Math.pow(goal > on ? 0.92 : 0.945, f));
    if (on < 0.02 && target.near) { mouse.x = target.x; mouse.y = target.y; }
    else {
      const e = 1 - Math.pow(0.84, f);
      mouse.x += (target.x - mouse.x) * e;
      mouse.y += (target.y - mouse.y) * e;
    }
    shared.uMouse.value = [mouse.x, mouse.y];
    shared.uAmp.value = smooth(Math.min(1, on));
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
