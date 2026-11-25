/* =========================================================
   Three.js scenes for asrafulhoque25.github.io
   Source for assets/js/scene.min.js. Rebuild with esbuild:
     esbuild assets/js/src/scene.js --bundle --minify --format=iife \
       --outfile=assets/js/scene.min.js
   ========================================================= */
import { createGalaxy, DEFAULTS } from './galaxy.js';
import { createGalaxyPanel } from './galaxy-panel.js';
import { createMemories } from './memories.js';

(function () {
  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 900px)').matches;
  const api = window.ahScene = window.ahScene || {};

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  const gl = hasWebGL();

  /* ---------- galaxy behind the page ---------- */
  // One camera pose per section. sx/sy move the core on screen, op is brightness.
  const KEYS = [
    { el: '#home', d: 8, polar: 64, azim: 0, sx: 0, sy: -0.02, op: 1 },
    { el: '.isyou', d: 6.4, polar: 70, azim: 36, sx: -0.27, sy: 0, op: 0.8, tilt: 6 },
    { el: '#about', d: 8.2, polar: 74, azim: 78, sx: 0.32, sy: 0.04, op: 0.85, tilt: -8 },
    { el: '#services', d: 9.6, polar: 14, azim: 150, sx: -0.36, sy: 0.08, op: 0.5 },
    { el: '.toss', d: 12, polar: 38, azim: 190, sx: 0, sy: -0.08, op: 0.45 },
    { el: '#work', d: 5.4, polar: 74, azim: 232, sx: 0.05, sy: 0.12, op: 0.42 },
    { el: '#index', d: 10, polar: 80, azim: 270, sx: 0.42, sy: -0.1, op: 0.55, tilt: 6 },
    { el: '#process', d: 7.6, polar: 86, azim: 310, sx: 0.1, sy: 0.38, op: 0.9, m: { polar: 70, sy: 0, op: 0.6 } },
    { el: '#experience', d: 8.6, polar: 64, azim: 352, sx: -0.36, sy: 0, op: 0.75 },
    { el: '#pricing', d: 11, polar: 9, azim: 400, sx: 0.3, sy: 0.02, op: 0.45 },
    { el: '.gallery', d: 15, polar: 40, azim: 440, sx: -0.3, sy: 0.22, op: 0.4 },
    { el: '#faq', d: 8.6, polar: 72, azim: 480, sx: -0.34, sy: 0, op: 0.7 },
    { el: '#contact', d: 9, polar: 50, azim: 520, sx: 0.3, sy: 0.02, op: 0.8 },
    { el: '.footer', d: 6.6, polar: 66, azim: 560, sx: 0, sy: 0.2, op: 1, m: { d: 8.5, sy: -0.16, op: 0.75 } },
  ];
  const canvas = document.querySelector('.galaxy');
  if (gl && canvas) {
    try {
      api.galaxy = createGalaxy(canvas, { small, reduce, keys: KEYS });
      doc.classList.add('has-galaxy');
      if (!small && !reduce) createGalaxyPanel(api.galaxy, DEFAULTS);
      // inner pages have no boot screen, so the galaxy forms straight away
      if (!document.querySelector('.loader')) api.galaxy.intro(2);
    } catch (e) { canvas.remove(); }
  }

  /* ---------- "Beyond the code" spiral gallery ---------- */
  const mem = document.querySelector('[data-mem]');
  if (mem) {
    const idx = mem.querySelector('.mem__i');
    const cap = mem.querySelector('.mem__cap');
    const bar = mem.querySelector('.mem__rail i');
    const glyphs = '<>/{}[]=;_#*';
    let scrT = 0;
    function scramble(el, text) {
      if (!el) return;
      cancelAnimationFrame(scrT);
      const start = performance.now(), dur = 420;
      (function step(now) {
        const t = Math.min(1, (now - start) / dur);
        const keep = Math.floor(text.length * t);
        let out = text.slice(0, keep);
        for (let i = keep; i < text.length; i++) out += text[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
        el.textContent = out;
        if (t < 1) scrT = requestAnimationFrame(step);
      })(start);
    }
    function goTo(i) {
      const r = mem.getBoundingClientRect();
      const y = window.scrollY + r.top + (r.height - window.innerHeight) * (i / Math.max(1, api.memories.count - 1)) + 2;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    if (gl && !small && !reduce) {
      try {
        api.memories = createMemories(mem, {
          goTo,
          onChange(i, alt, n) {
            if (idx) idx.textContent = String(i);
            scramble(cap, '// ' + alt);
          },
          onProgress(p) { if (bar) bar.style.transform = 'scaleY(' + p.toFixed(4) + ')'; },
        });
      } catch (e) { api.memories = null; }
    }
    mem.classList.add(api.memories ? 'mem--3d' : 'mem--flat');
  }

  api.ready = true;
  window.dispatchEvent(new Event('ah:scene-ready'));
})();
