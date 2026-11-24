/* Inner pages (About, Blog, posts): the same smooth scrolling as the homepage,
   the frosted nav on scroll and the gradient footer name. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }

  // In-page links glide instead of jumping
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    var id = a.getAttribute('href');
    var target = (id === '#' || id === '#main' || id === '#top') ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -80, duration: 1.3 });
  });

  /* ---------- nav background once the page moves ---------- */
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 20); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- footer name: one continuous gradient across the letters ---------- */
  var big = document.querySelector('.footer__big');
  if (!big) return;
  var words = [].slice.call(big.children);
  words.forEach(function (w) {
    var txt = w.textContent; w.textContent = '';
    txt.split('').forEach(function (ch) { var l = document.createElement('span'); l.className = 'fl'; l.textContent = ch; w.appendChild(l); });
  });
  function measure() {
    words.forEach(function (w) {
      w.style.setProperty('--ww', w.offsetWidth + 'px'); w.style.setProperty('--wh', w.offsetHeight + 'px');
      [].forEach.call(w.querySelectorAll('.fl'), function (l) { l.style.setProperty('--lx', l.offsetLeft + 'px'); l.style.setProperty('--ly', l.offsetTop + 'px'); });
    });
  }
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { big.classList.toggle('is-live', es[0].isIntersecting); }).observe(big);
  } else big.classList.add('is-live');
})();
