/* =========================================================
   galaxy.config.js: a small code-editor panel that lets
   visitors tweak the galaxy behind the site
   ========================================================= */

const ROWS = [
  { key: 'stars', min: 6000, max: 120000, step: 1000, fmt: (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '_') },
  { key: 'arms', min: 2, max: 9, step: 1, fmt: (v) => String(Math.round(v)) },
  { key: 'spin', min: -3, max: 3, step: 0.05, fmt: (v) => Number(v).toFixed(2) },
  { key: 'radius', min: 3, max: 8, step: 0.1, fmt: (v) => Number(v).toFixed(1) },
  { key: 'chaos', min: 0, max: 1, step: 0.01, fmt: (v) => Number(v).toFixed(2) },
  { key: 'speed', min: 0, max: 0.3, step: 0.005, fmt: (v) => Number(v).toFixed(3) },
  { key: 'core', type: 'color' },
  { key: 'mid', type: 'color' },
  { key: 'edge', type: 'color' },
];

const PALETTES = [
  ['#fff1dc', '#8ea2ff', '#4d6bff'],
  ['#ffffff', '#ff9a6b', '#7c3aed'],
  ['#f8fafc', '#5eead4', '#0e7490'],
  ['#fff7d6', '#f472b6', '#4338ca'],
  ['#ffffff', '#a3e635', '#15803d'],
  ['#ffe4e6', '#fb7185', '#9f1239'],
];

export function createGalaxyPanel(galaxy, defaults) {
  const wrap = document.createElement('div');
  wrap.className = 'gx';
  wrap.innerHTML =
    '<button class="gx__toggle" type="button" aria-expanded="false" aria-controls="gx-panel">' +
      '<span class="gx__br" aria-hidden="true">&lt;/&gt;</span><span class="gx__file">galaxy.config.js</span>' +
    '</button>' +
    '<div class="gx__panel" id="gx-panel" role="dialog" aria-label="Galaxy settings" hidden>' +
      '<div class="gx__bar"><i></i><i></i><i></i><span>galaxy.config.js</span><button class="gx__close" type="button" aria-label="Close galaxy settings">&times;</button></div>' +
      '<div class="gx__code"></div>' +
      '<div class="gx__foot"><button type="button" data-gx="shuffle">shuffle()</button><button type="button" data-gx="reset">reset()</button><span>// drag a value, the galaxy follows</span></div>' +
    '</div>';
  document.body.appendChild(wrap);

  const toggle = wrap.querySelector('.gx__toggle');
  const panel = wrap.querySelector('.gx__panel');
  const code = wrap.querySelector('.gx__code');

  let n = 1;
  const line = (html, tag) => '<' + (tag || 'div') + ' class="gx__line"><i>' + (n++) + '</i>' + html + '</' + (tag || 'div') + '>';
  let html = line('<code><b class="kw">export const</b> <b class="fn">galaxy</b> = {</code>');
  ROWS.forEach((r) => {
    if (r.type === 'color') {
      html += line('<code>  <b class="pr">' + r.key + '</b>: <b class="st" data-out="' + r.key + '"></b>,</code><input type="color" data-key="' + r.key + '" aria-label="' + r.key + ' colour">', 'label');
    } else {
      html += line('<code>  <b class="pr">' + r.key + '</b>: <b class="nu" data-out="' + r.key + '"></b>,</code><input type="range" data-key="' + r.key + '" min="' + r.min + '" max="' + r.max + '" step="' + r.step + '" aria-label="' + r.key + '">', 'label');
    }
  });
  html += line('<code>};</code>');
  code.innerHTML = html;

  const inputs = Array.prototype.slice.call(code.querySelectorAll('input'));
  function sync() {
    inputs.forEach((inp) => {
      const k = inp.dataset.key;
      const row = ROWS.find((r) => r.key === k);
      inp.value = galaxy.params[k];
      const out = code.querySelector('[data-out="' + k + '"]');
      out.textContent = row.type === 'color' ? '"' + galaxy.params[k] + '"' : row.fmt(galaxy.params[k]);
      if (row.type !== 'color') {
        const p = (galaxy.params[k] - row.min) / (row.max - row.min) * 100;
        inp.style.setProperty('--p', p + '%');
      }
    });
  }
  sync();

  let pending = {}, raf = 0;
  inputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      const k = inp.dataset.key;
      pending[k] = inp.type === 'color' ? inp.value : parseFloat(inp.value);
      galaxy.params[k] = pending[k];
      sync();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { galaxy.set(pending); pending = {}; });
    });
  });

  function set(next) { galaxy.set(next); sync(); }
  wrap.querySelector('[data-gx="reset"]').addEventListener('click', () => set(Object.assign({}, defaults)));
  wrap.querySelector('[data-gx="shuffle"]').addEventListener('click', () => {
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    set({
      arms: 2 + Math.floor(Math.random() * 5),
      spin: Math.round((Math.random() * 3.4 - 1.7) * 20) / 20,
      chaos: Math.round((0.15 + Math.random() * 0.5) * 100) / 100,
      core: pal[0], mid: pal[1], edge: pal[2],
    });
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

  // show the toggle once the visitor has scrolled past the first screen
  const check = () => wrap.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.6 || wrap.classList.contains('is-open'));
  window.addEventListener('scroll', check, { passive: true });
  check();
  return wrap;
}
