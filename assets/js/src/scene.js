/* =========================================================
   Three.js scenes for asrafulhoque25.github.io
   Source for assets/js/scene.min.js. Rebuild with esbuild:
     esbuild assets/js/src/scene.js --bundle --minify --format=iife \
       --outfile=assets/js/scene.min.js
   ========================================================= */
import { createPixels, DEFAULTS } from './pixels.js';
import { createPixelsPanel } from './pixels-panel.js';
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

  /* ---------- pixels behind the page ---------- */
  // Each section gets the thing it is about, built from pixels.
  // s: size, sx/sy: where it sits on screen (-0.5..0.5), rx/ry: tilt in degrees, op: brightness.
  const KEYS = [
    { el: '#home', shape: 'grid', s: 1, sx: 0, sy: 0.3, rx: -74, op: 0.6, wave: 0.3, m: { s: 0.8, sx: 0, sy: 0.34, op: 0.35 } },
    { el: '.marquee', shape: 'grid', s: 1.05, sx: 0, sy: 0.16, rx: -62, op: 0.7, wave: 0.5, m: { s: 0.8, sx: 0, sy: 0.34, op: 0.35 } },
    { el: '.isyou', shape: 'code', s: 0.9, sx: 0.3, sy: 0, ry: -18, op: 0.8 },
    { el: '#about', shape: 'design', s: 0.9, sx: 0.32, sy: 0.08, rx: 6, ry: -14, op: 0.75 },
    { el: '#services', shape: 'braces', s: 0.65, sx: 0.4, sy: -0.06, ry: -16, op: 0.45 },
    { el: '.toss', shape: 'grid', s: 1, sx: 0, sy: 0.05, rx: -58, op: 0.55, wave: 0.25 },
    { el: '#work', shape: 'devices', s: 0.7, sx: 0.34, sy: -0.27, ry: -12, op: 0.7 },
    { el: '#index', shape: 'devices', s: 0.72, sx: 0.41, sy: 0.12, ry: -16, op: 0.45 },
    { el: '#process', shape: 'branch', s: 0.8, sx: 0.32, sy: -0.3, ry: -10, op: 0.9 },
    { el: '#experience', shape: 'terminal', s: 0.7, sx: 0.34, sy: -0.28, ry: -14, op: 0.5 },
    { el: '#pricing', shape: 'bag', s: 0.72, sx: 0.35, sy: -0.24, ry: -12, op: 0.8 },
    { el: '.gallery', shape: 'grid', s: 1.15, sx: 0, sy: 0.12, rx: -70, op: 0.4, wave: 0.25 },
    { el: '#faq', shape: 'question', s: 0.62, sx: -0.38, sy: 0.3, ry: 14, op: 0.6 },
    { el: '#contact', shape: 'at', s: 0.72, sx: 0.34, sy: -0.24, ry: -12, op: 0.8 },
    { el: '.footer', shape: 'rocket', s: 0.4, sx: 0.03, sy: 0.19, op: 0.95, m: { s: 0.36, sx: 0.3, sy: -0.02, op: 0.8 } },
  ];
  const canvas = document.querySelector('.pixels');
  if (gl && canvas) {
    try {
      api.pixels = createPixels(canvas, { small, reduce, keys: KEYS });
      doc.classList.add('has-pixels');
      if (!small && !reduce) createPixelsPanel(api.pixels, DEFAULTS);
      // inner pages have no boot screen, so the pixels assemble straight away
      if (!document.querySelector('.loader')) api.pixels.intro(1.8);
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
