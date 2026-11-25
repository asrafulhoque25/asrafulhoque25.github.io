/* =========================================================
   pixels.config.js: a small code-editor panel that lets
   visitors play with the pixels behind the site
   ========================================================= */
import { SHAPE_NAMES } from './pixels.js';

const LABELS = { browser: 'browser', code: '</>', braces: '{ }', devices: 'devices', branch: 'git branch', terminal: 'terminal', bag: 'shop bag', design: 'figma frame', question: '?', at: '@', rocket: 'rocket', grid: 'grid' };

const ROWS = [
  { key: 'shape', type: 'select', options: ['auto'].concat(SHAPE_NAMES) },
  { key: 'count', min: 3000, max: 24000, step: 500, fmt: (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '_') },
  { key: 'size', min: 1, max: 6, step: 0.1, fmt: (v) => Number(v).toFixed(1) },
  { key: 'cursor', min: 0, max: 3, step: 0.05, fmt: (v) => Number(v).toFixed(2) },
  { key: 'colorA', type: 'color' },
  { key: 'colorB', type: 'color' },
];

const PALETTES = [
  ['#4d6bff', '#dfe5ff'],
  ['#7c3aed', '#f5d0fe'],
  ['#0ea5e9', '#d1fae5'],
  ['#96bf48', '#f4ffe0'],
  ['#ff5f57', '#ffe2c2'],
  ['#14b8a6', '#e0e7ff'],
];

export function createPixelsPanel(pixels, defaults) {
  const wrap = document.createElement('div');
  wrap.className = 'gx';
  wrap.innerHTML =
    '<button class="gx__toggle" type="button" aria-expanded="false" aria-controls="gx-panel">' +
      '<span class="gx__br" aria-hidden="true">&lt;/&gt;</span><span class="gx__file">pixels.config.js</span>' +
    '</button>' +
    '<div class="gx__panel" id="gx-panel" role="dialog" aria-label="Pixel settings" hidden>' +
      '<div class="gx__bar"><i></i><i></i><i></i><span>pixels.config.js</span><button class="gx__close" type="button" aria-label="Close pixel settings">&times;</button></div>' +
      '<div class="gx__code"></div>' +
      '<div class="gx__foot"><button type="button" data-gx="shuffle">shuffle()</button><button type="button" data-gx="reset">reset()</button><span>// pick a shape, or let the scroll decide</span></div>' +
    '</div>';
  document.body.appendChild(wrap);

  const toggle = wrap.querySelector('.gx__toggle');
  const panel = wrap.querySelector('.gx__panel');
  const code = wrap.querySelector('.gx__code');

  let n = 1;
  const line = (html, tag) => '<' + (tag || 'div') + ' class="gx__line"><i>' + (n++) + '</i>' + html + '</' + (tag || 'div') + '>';
  let html = line('<code><b class="kw">export const</b> <b class="fn">pixels</b> = {</code>');
  ROWS.forEach((r) => {
    if (r.type === 'select') {
      const opts = r.options.map((o) => '<option value="' + o + '">' + (o === 'auto' ? 'auto (scroll)' : LABELS[o] || o) + '</option>').join('');
      html += line('<code>  <b class="pr">' + r.key + '</b>: <b class="st" data-out="' + r.key + '"></b>,</code><select data-key="' + r.key + '" aria-label="shape">' + opts + '</select>', 'label');
    } else if (r.type === 'color') {
      html += line('<code>  <b class="pr">' + r.key + '</b>: <b class="st" data-out="' + r.key + '"></b>,</code><input type="color" data-key="' + r.key + '" aria-label="' + r.key + '">', 'label');
    } else {
      html += line('<code>  <b class="pr">' + r.key + '</b>: <b class="nu" data-out="' + r.key + '"></b>,</code><input type="range" data-key="' + r.key + '" min="' + r.min + '" max="' + r.max + '" step="' + r.step + '" aria-label="' + r.key + '">', 'label');
    }
  });
  html += line('<code>};</code>');
  code.innerHTML = html;

  const inputs = Array.prototype.slice.call(code.querySelectorAll('input, select'));
  function sync() {
    inputs.forEach((inp) => {
      const k = inp.dataset.key;
      const row = ROWS.find((r) => r.key === k);
      const v = pixels.params[k];
      inp.value = v;
      const out = code.querySelector('[data-out="' + k + '"]');
      out.textContent = row.type ? '"' + (row.type === 'select' ? (LABELS[v] || v) : v) + '"' : row.fmt(v);
      if (!row.type) inp.style.setProperty('--p', ((v - row.min) / (row.max - row.min) * 100) + '%');
    });
  }
  sync();

  let pending = {}, raf = 0;
  inputs.forEach((inp) => {
    const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const k = inp.dataset.key;
      const v = inp.type === 'range' ? parseFloat(inp.value) : inp.value;
      pending[k] = v;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { pixels.set(pending); pending = {}; sync(); });
      // show the new value right away
      const row = ROWS.find((r) => r.key === k);
      const out = code.querySelector('[data-out="' + k + '"]');
      out.textContent = row.type ? '"' + (row.type === 'select' ? (LABELS[v] || v) : v) + '"' : row.fmt(v);
      if (!row.type) inp.style.setProperty('--p', ((v - row.min) / (row.max - row.min) * 100) + '%');
    });
  });

  function set(next) { pixels.set(next); sync(); }
  wrap.querySelector('[data-gx="reset"]').addEventListener('click', () => set(Object.assign({}, defaults)));
  wrap.querySelector('[data-gx="shuffle"]').addEventListener('click', () => {
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const shapes = SHAPE_NAMES.filter((s) => s !== pixels.params.shape && s !== 'grid');
    set({ colorA: pal[0], colorB: pal[1], shape: shapes[Math.floor(Math.random() * shapes.length)] });
  });

  function open(on) {
    toggle.setAttribute('aria-expanded', on);
    wrap.classList.toggle('is-open', on);
    if (on) { panel.hidden = false; requestAnimationFrame(() => panel.classList.add('is-in')); }
    else { panel.classList.remove('is-in'); setTimeout(() => { if (!wrap.classList.contains('is-open')) panel.hidden = true; }, 350); }
  }
  toggle.addEventListener('click', () => open(!wrap.classList.contains('is-open')));
  wrap.querySelector('.gx__close').addEventListener('click', () => { open(false); toggle.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.classList.contains('is-open')) { open(false); toggle.focus(); } });

  // hidden on the first screen and at the very bottom, where it would cover the footer credit
  const check = () => {
    const y = window.scrollY, end = document.documentElement.scrollHeight - window.innerHeight - 160;
    wrap.classList.toggle('is-shown', (y > window.innerHeight * 0.6 && y < end) || wrap.classList.contains('is-open'));
  };
  window.addEventListener('scroll', check, { passive: true });
  check();
  return wrap;
}
