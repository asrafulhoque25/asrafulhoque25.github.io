/* Footer name (ASRAFUL HOQUE), shared by every page:
   - one continuous aurora gradient across the letters
   - letters drop in from above one after another, tied to scroll (reverses on scroll up)
   - a slow liquid wave that never stops while the name is on screen; hover makes it
     stronger and swells the letters under the pointer */
(function () {
  'use strict';
  var big = document.querySelector('.footer__big');
  if (!big) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One span per letter; each letter paints its slice of the word-sized gradient
  var words = [].slice.call(big.children);
  words.forEach(function (w) {
    var txt = w.textContent; w.textContent = '';
    txt.split('').forEach(function (ch) { var l = document.createElement('span'); l.className = 'fl'; l.textContent = ch; w.appendChild(l); });
  });
  var letters = [].slice.call(big.querySelectorAll('.fl')), centers = [];
  function measure() {
    var br = big.getBoundingClientRect();
    words.forEach(function (w) {
      w.style.setProperty('--ww', w.offsetWidth + 'px'); w.style.setProperty('--wh', w.offsetHeight + 'px');
      [].forEach.call(w.querySelectorAll('.fl'), function (l) { l.style.setProperty('--lx', l.offsetLeft + 'px'); l.style.setProperty('--ly', l.offsetTop + 'px'); });
    });
    centers = letters.map(function (l) { var r = l.getBoundingClientRect(); return r.left - br.left + r.width / 2; });
  }
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var running = false, raf = 0;
  function watch(onShow, onHide) {
    if (!('IntersectionObserver' in window)) { big.classList.add('is-live'); onShow(); return; }
    new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      big.classList.toggle('is-live', on);
      if (on) onShow(); else onHide();
    }, { rootMargin: '120px 0px' }).observe(big);
  }
  if (reduce) { watch(function () {}, function () {}); return; }

  var amp = 0, hovered = false, px = -9999, pxS = -9999, spot = 0, t0 = performance.now();
  var n = letters.length, K = 3.5;
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function frame() {
    raf = requestAnimationFrame(frame);
    var t = (performance.now() - t0) / 1000;
    amp += ((hovered ? 1 : .55) - amp) * .05;
    pxS += (px - pxS) * .12;
    spot += ((hovered ? 1 : 0) - spot) * .1;
    big.style.setProperty('--spot', spot.toFixed(3));
    var br = big.getBoundingClientRect(), vh = window.innerHeight, bw = br.width || 1;
    // 0 when the name's top reaches the bottom of the screen, 1 once it has risen well into view
    var P = Math.min(1, Math.max(0, (vh - br.top - 30) / (br.height * .95 + 60)));
    letters.forEach(function (l, i) {
      var local = Math.min(1, Math.max(0, (P * (n + K) - i) / K));
      var e = easeOut(local);
      var d = (centers[i] - pxS) / (bw * .09);
      var swell = hovered ? Math.exp(-d * d) : 0;
      var ph = t * 1.5 - i * .5;
      l.style.setProperty('--wy', (-(Math.sin(ph) * .03 + swell * .07) * amp).toFixed(4) + 'em');
      l.style.setProperty('--ws', (1 + (Math.sin(ph + 1.2) * .022 + swell * .06) * amp).toFixed(4));
      l.style.setProperty('--dy', (-(1 - e) * .6).toFixed(4) + 'em');
      l.style.setProperty('--do', Math.pow(local, 1.4).toFixed(3));
    });
  }
  watch(function () { if (!running) { running = true; raf = requestAnimationFrame(frame); } },
        function () { if (running) { running = false; cancelAnimationFrame(raf); } });
  frame(); cancelAnimationFrame(raf); if (running) raf = requestAnimationFrame(frame);

  big.addEventListener('pointermove', function (e) {
    var r0 = big.getBoundingClientRect();
    px = e.clientX - r0.left;
    if (pxS < -9000) pxS = px;
    words.forEach(function (w) {
      var r = w.getBoundingClientRect();
      w.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      w.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  big.addEventListener('pointerenter', function () { hovered = true; });
  big.addEventListener('pointerleave', function () { hovered = false; px = -9999; pxS = -9999; });
})();
