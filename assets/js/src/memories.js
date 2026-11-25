/* =========================================================
   "Beyond the code" gallery: photos on a 3D spiral (Three.js)
   The section is tall and its stage sticks to the screen; scroll
   turns the spiral so each photo comes to the front in turn.
   ========================================================= */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, Mesh, ShaderMaterial,
  TextureLoader, Group, Raycaster, Vector2, DoubleSide, LinearFilter
} from 'three';

const VERT = /* glsl */`
  uniform float uVel;
  uniform float uHover;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFacing;
  varying float vY;
  void main() {
    vUv = uv;
    vec3 p = position;
    // the photo curls like paper when the spiral turns fast
    p.z += sin(uv.x * 3.14159) * uVel * 0.55;
    p.z += sin(uv.y * 6.2831 + uTime * 2.4) * 0.035 * uHover;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
    vFacing = dot(n, normalize(cameraPosition - wp.xyz));
    vY = wp.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uTex;
  uniform float uVel;
  uniform float uHover;
  uniform float uAspect;
  uniform float uReady;
  varying vec2 vUv;
  varying float vFacing;
  varying float vY;
  float rbox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    float d = rbox(p, vec2(uAspect * 0.5, 0.5), 0.05);
    float a = 1.0 - smoothstep(-0.006, 0.002, d);
    float fadeY = 1.0 - smoothstep(2.5, 3.9, abs(vY));
    if (!gl_FrontFacing) {
      // the back of a photo: a dark card with a faint edge, so the whole spiral reads in 3D
      float edge = 1.0 - smoothstep(0.0, 0.014, abs(d + 0.007));
      vec3 c = mix(vec3(0.075, 0.08, 0.11), vec3(0.30, 0.42, 1.0), edge * 0.7);
      gl_FragColor = vec4(c, a * 0.62 * fadeY * uReady);
      return;
    }
    float sh = clamp(uVel, -1.0, 1.0) * 0.018;
    vec3 col;
    col.r = texture2D(uTex, uv + vec2(sh, 0.0)).r;
    col.g = texture2D(uTex, uv).g;
    col.b = texture2D(uTex, uv - vec2(sh, 0.0)).b;
    // in focus at the front: full colour; turning away: grey and dim
    float focus = max(smoothstep(0.72, 0.98, vFacing), uHover);
    float g = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(g) * vec3(0.92, 0.95, 1.08), col, focus);
    col *= mix(0.42, 1.0, focus);
    float vis = smoothstep(-0.2, 0.3, vFacing) * fadeY;
    // thin cobalt outline on the photo in focus
    float rim = (1.0 - smoothstep(0.0, 0.012, abs(d + 0.006))) * focus * 0.9;
    col = mix(col, vec3(0.30, 0.42, 1.0), rim);
    gl_FragColor = vec4(col, a * vis * uReady);
  }
`;

export function createMemories(root, opts = {}) {
  const stage = root.querySelector('.mem__stage');
  const canvas = root.querySelector('.mem__canvas');
  const imgs = Array.prototype.slice.call(root.querySelectorAll('.mem__item img'));
  const N = imgs.length;
  if (!N) return null;

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  const helix = new Group();
  scene.add(helix);

  const R = 3.3, STEP = Math.PI * 2 / 6, DY = 0.74;
  const W0 = 2.25, H0 = W0 / 1.25;
  const geo = new PlaneGeometry(W0, H0, 32, 12);
  const loader = new TextureLoader();
  const meshes = imgs.map((img, i) => {
    const mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: DoubleSide,
      uniforms: { uTex: { value: null }, uVel: { value: 0 }, uHover: { value: 0 }, uTime: { value: 0 }, uAspect: { value: W0 / H0 }, uReady: { value: 0 } },
    });
    const src = img.currentSrc || img.getAttribute('src');
    loader.load(src, (tex) => {
      tex.minFilter = LinearFilter; tex.generateMipmaps = false;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mat.uniforms.uTex.value = tex;
      mat.userData.ready = true;
    });
    const m = new Mesh(geo, mat);
    const a = i * STEP;
    m.position.set(Math.sin(a) * R, -i * DY, Math.cos(a) * R);
    m.rotation.y = a;
    m.userData = { i, alt: img.alt, hover: 0 };
    helix.add(m);
    return m;
  });

  let W = 0, H = 0, shift = 0;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    // on wide screens the spiral sits to the right of the heading
    shift = W > 1100 ? 0.16 : W > 900 ? 0.1 : 0;
    camera.setViewOffset(W, H, -shift * W, 0, W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- scroll progress ---------- */
  function progress() {
    const r = root.getBoundingClientRect();
    const range = Math.max(1, r.height - window.innerHeight);
    return Math.min(1, Math.max(0, -r.top / range));
  }

  /* ---------- pointer ---------- */
  const ray = new Raycaster();
  const ptr = new Vector2(-9, -9);
  let hovered = null;
  stage.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }, { passive: true });
  stage.addEventListener('pointerleave', () => ptr.set(-9, -9));
  stage.addEventListener('click', () => {
    if (hovered && opts.goTo) opts.goTo(hovered.userData.i);
  });

  /* ---------- loop ---------- */
  let p = progress(), vel = 0, last = performance.now(), t = 0, active = -1, running = false, raf = 0, tilt = 0, ttilt = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const target = progress();
    const np = p + (target - p) * (1 - Math.exp(-dt * 7));
    const v = (np - p) / Math.max(dt, 0.001);
    p = np;
    vel += (v * 2.2 - vel) * 0.15;

    const k = p * (N - 1);
    helix.rotation.y = -k * STEP;
    helix.position.y = k * DY;
    ttilt = ptr.x > -2 ? ptr.y * 0.06 : 0;
    tilt += (ttilt - tilt) * 0.06;
    helix.rotation.x = tilt;

    // hover: the photo under the pointer, if it faces us
    ray.setFromCamera(ptr, camera);
    const hit = ptr.x > -2 ? ray.intersectObjects(meshes, false).find((h) => {
      const m = h.object; const a = m.userData.i * STEP + helix.rotation.y;
      return Math.cos(a) > 0.35;
    }) : null;
    hovered = hit ? hit.object : null;
    stage.style.cursor = hovered ? 'pointer' : '';

    meshes.forEach((m) => {
      const u = m.material.uniforms;
      m.userData.hover += ((m === hovered ? 1 : 0) - m.userData.hover) * 0.12;
      u.uHover.value = m.userData.hover;
      u.uVel.value = vel;
      u.uTime.value = t;
      if (m.material.userData.ready) u.uReady.value = Math.min(1, u.uReady.value + dt * 2);
      const s = 1 + m.userData.hover * 0.07;
      m.scale.set(s, s, 1);
    });

    const ai = Math.round(k);
    if (ai !== active) { active = ai; if (opts.onChange) opts.onChange(ai, meshes[ai].userData.alt, N); }
    if (opts.onProgress) opts.onProgress(p);
    renderer.render(scene, camera);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() {
    running = false; cancelAnimationFrame(raf);
    // leaving the section: settle the counter on where the scroll really is
    p = progress();
    const ai = Math.round(p * (N - 1));
    if (ai !== active) { active = ai; if (opts.onChange) opts.onChange(ai, meshes[ai].userData.alt, N); }
    if (opts.onProgress) opts.onProgress(p);
  }
  let inView = false;
  new IntersectionObserver((en) => { inView = en[0].isIntersecting; inView ? start() : stop(); }, { rootMargin: '200px 0px' }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (inView) start(); });

  return { count: N, resize };
}
