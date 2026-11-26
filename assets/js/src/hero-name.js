/* =========================================================
   Hero name with a grid-distortion hover (Three.js)
   The name is drawn into a texture and shown on a WebGL canvas
   laid exactly over the HTML heading. The canvas is cut into a
   grid of square cells; moving the cursor pushes the cells it
   passes in the direction of the movement, so the letters smear
   in blocks, then every cell eases back into place.
   ========================================================= */
import {
  WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial,
  CanvasTexture, DataTexture, RGBAFormat, FloatType, NearestFilter, LinearFilter
} from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// The text texture holds the letter shape in alpha and, in green, how far down its
// word each pixel sits (0 top, 1 bottom). The shader colours it with the same
// flowing gradient the HTML heading uses.
const FRAG = /* glsl */`
  uniform sampler2D uText;
  uniform sampler2D uGrid;
  uniform float uFlow;
  uniform float uOpacity;
  varying vec2 vUv;
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
    vec2 off = texture2D(uGrid, vUv).rg;
    vec4 t = texture2D(uText, vUv - 0.02 * off);
    // same mapping as background-size: 100% 260% with a moving background-position
    float g = (t.g + 1.6 * uFlow) / 2.6;
    gl_FragColor = vec4(ramp(g), t.a * uOpacity);
  }
`;

const smooth = (t) => t * t * (3 - 2 * t);

export function createHeroName(h1, opts = {}) {
  const words = Array.prototype.slice.call(h1.querySelectorAll('.px__word'));
  if (!words.length) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'px__gl';
  canvas.setAttribute('aria-hidden', 'true');
  h1.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const textCanvas = document.createElement('canvas');
  const textTex = new CanvasTexture(textCanvas);
  textTex.minFilter = LinearFilter; textTex.magFilter = LinearFilter; textTex.generateMipmaps = false;

  let cols = 1, rows = 1, gridData = new Float32Array(4), gridTex = null;
  const mat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uText: { value: textTex }, uGrid: { value: null }, uFlow: { value: 0 }, uOpacity: { value: 0 } },
  });
  scene.add(new Mesh(new PlaneGeometry(2, 2), mat));

  // the canvas reaches past the heading so smeared cells are not cut off
  const PAD = 0.28;
  let W = 0, H = 0, dpr = 1;

  function layout() {
    // layout sizes only (offsetWidth/offsetTop), so scroll and intro transforms don't skew them
    W = h1.offsetWidth;
    const hh = h1.offsetHeight;
    const pad = Math.round(hh * PAD);
    H = hh + pad * 2;
    canvas.style.top = -pad + 'px';
    canvas.style.height = H + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);

    // draw the words where the HTML puts them
    textCanvas.width = Math.round(W * dpr);
    textCanvas.height = Math.round(H * dpr);
    const c = textCanvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const cs = getComputedStyle(words[0]);
    const fs = parseFloat(getComputedStyle(h1).fontSize);
    c.font = '400 ' + fs + 'px ' + cs.fontFamily;
    if ('letterSpacing' in c) c.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    c.textBaseline = 'alphabetic';
    const m = c.measureText('H');
    const asc = m.fontBoundingBoxAscent || fs * 0.92, desc = m.fontBoundingBoxDescent || fs * 0.25;
    words.forEach((w) => {
      const x = w.offsetLeft;
      const top = w.offsetTop + pad;
      const lh = w.offsetHeight;
      const base = top + (lh - (asc + desc)) / 2 + asc;
      // green carries "how far down the word", alpha carries the letter
      const g = c.createLinearGradient(0, top, 0, top + lh);
      g.addColorStop(0, 'rgb(255,0,0)');
      g.addColorStop(1, 'rgb(255,255,0)');
      c.fillStyle = g;
      c.fillText(w.textContent.toUpperCase(), x, base);
    });
    textTex.needsUpdate = true;

    // square cells of about 34px on desktop, 22px on phones
    const cell = W < 700 ? 22 : 34;
    cols = Math.max(4, Math.round(W / cell));
    rows = Math.max(2, Math.round(H / cell));
    gridData = new Float32Array(cols * rows * 4);
    if (gridTex) gridTex.dispose();
    gridTex = new DataTexture(gridData, cols, rows, RGBAFormat, FloatType);
    gridTex.magFilter = gridTex.minFilter = NearestFilter;
    gridTex.needsUpdate = true;
    mat.uniforms.uGrid.value = gridTex;
  }

  /* ---------- the cursor ---------- */
  const mouse = { x: -1, y: -1, px: -1, py: -1, vx: 0, vy: 0 };
  function move(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const x = (cx - r.left) / r.width, y = 1 - (cy - r.top) / r.height;
    if (mouse.x < -0.5) { mouse.px = x; mouse.py = y; }
    mouse.vx += x - mouse.px; mouse.vy += y - mouse.py;
    mouse.px = mouse.x = x; mouse.py = mouse.y = y;
  }
  window.addEventListener('pointermove', (e) => move(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); }, { passive: true });

  const STRENGTH = 0.16, RADIUS = 3.4, RELAX = 0.9;
  function updateGrid(dt) {
    const relax = Math.pow(RELAX, dt * 60);
    for (let i = 0; i < gridData.length; i += 4) { gridData[i] *= relax; gridData[i + 1] *= relax; }
    if (mouse.x > -0.5 && mouse.x < 1.5 && mouse.y > -0.5 && mouse.y < 1.5) {
      const gx = cols * mouse.x, gy = rows * mouse.y;
      const rr = RADIUS * RADIUS;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const d = (gx - i - 0.5) * (gx - i - 0.5) + (gy - j - 0.5) * (gy - j - 0.5);
          if (d >= rr) continue;
          const k = 4 * (i + cols * j);
          const power = Math.min(10, RADIUS / Math.sqrt(Math.max(d, 0.0001)));
          gridData[k] += STRENGTH * 100 * mouse.vx * power;
          gridData[k + 1] += STRENGTH * 100 * mouse.vy * power;
        }
      }
    }
    const fade = Math.pow(0.9, dt * 60);
    mouse.vx *= fade; mouse.vy *= fade;
    gridTex.needsUpdate = true;
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
    updateGrid(dt);
    mat.uniforms.uFlow.value = flow(now);
    mat.uniforms.uOpacity.value = opacity;
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
