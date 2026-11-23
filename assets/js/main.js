/* =========================================================
   Asraful Hoque Portfolio · interactions
   GSAP 3 + ScrollTrigger + Lenis smooth scroll
   ========================================================= */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var animate = hasGSAP && !reduce;

  /* ---------- small utilities (always on) ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  function tickClock() {
    var t = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dhaka' }).format(new Date());
    $$('[data-clock]').forEach(function (el) { el.textContent = t; });
  }
  tickClock(); setInterval(tickClock, 30000);

  var hint = $('.featured__hint');
  if (hint && window.innerWidth <= 900) hint.innerHTML = 'Swipe to explore <svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

  /* ---------- gallery: duplicate sets for a seamless loop ---------- */
  $$('.gallery__row').forEach(function (row) {
    var set = $('.gallery__set', row);
    if (!set) return;
    var clone = set.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    $$('img', clone).forEach(function (im) { im.alt = ''; });
    row.appendChild(clone);
  });

  /* ---------- split text ---------- */
  function splitChars(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach(function (word, i, arr) {
      var w = document.createElement('span');
      w.className = 'w mask';
      w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var c = document.createElement('span');
        c.className = ch === '-' ? 'c c--dash' : 'c';
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  function splitWords(el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="word" aria-hidden="true">' + w + '</span>'; }).join(' ');
  }

  /* ---------- mobile menu ---------- */
  var burger = $('.nav__burger');
  var menu = $('#menu');
  var menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    if (hasGSAP) {
      gsap.killTweensOf(menu);
      if (open) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.to(menu, { clipPath: 'inset(0 0 0% 0)', duration: .8, ease: 'expo.inOut' });
        gsap.fromTo($$('.menu__links a', menu), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .05, duration: .8, delay: .3, ease: 'expo.out' });
      } else {
        gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut', onComplete: function () { gsap.set(menu, { visibility: 'hidden' }); } });
      }
    } else {
      menu.style.visibility = open ? 'visible' : 'hidden';
      menu.style.clipPath = open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)';
    }
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  /* ---------- smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (animate && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      setTimeout(function () { scrollToTarget(target); }, menuOpen ? 350 : 0);
      history.replaceState(null, '', id);
    });
  });
  $$('[data-scrolltop]').forEach(function (b) { b.addEventListener('click', function () { scrollToTarget(0); }); });

  /* ---------- nav: hide on scroll down, active link ---------- */
  var nav = $('.nav');
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen) nav.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  var scrollT;
  window.addEventListener('scroll', function () {
    if (!doc.classList.contains('is-scrolling')) doc.classList.add('is-scrolling');
    clearTimeout(scrollT);
    scrollT = setTimeout(function () { doc.classList.remove('is-scrolling'); }, 160);
  }, { passive: true });
  onScroll();

  var navLinks = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id === 'index' ? 'work' : en.target.id;
        navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'about', 'services', 'work', 'index', 'process', 'experience', 'pricing', 'faq', 'contact'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- copy email ---------- */
  $$('[data-copy]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (!navigator.clipboard) return;
      e.preventDefault();
      navigator.clipboard.writeText(el.dataset.copy).then(function () {
        var a = $('.crow__a', el); var old = a.textContent; a.textContent = 'Copied!';
        setTimeout(function () { a.textContent = old; }, 1800);
      }, function () { window.location.href = el.getAttribute('href'); });
    });
  });

  /* ---------- project filter ---------- */
  var filters = $$('.filter');
  var rows = $$('.prow');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      filters.forEach(function (b) { var on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
      var show = rows.filter(function (r) { return f === 'all' || r.dataset.cat.split(' ').indexOf(f) > -1; });
      rows.forEach(function (r) { r.classList.toggle('is-hidden', show.indexOf(r) === -1); });
      if (hasGSAP) gsap.fromTo(show, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: .04, duration: .6, ease: 'power3.out', clearProps: 'transform' });
      if (hasGSAP) ScrollTrigger.refresh();
    });
  });

  /* ---------- contact form (FormSubmit AJAX, mailto fallback) ---------- */
  var form = $('#contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('.form__status', form);
      var btn = $('button[type="submit"] span', form);
      var data = new FormData(form);
      var services = data.getAll('service').join(', ');
      data.delete('service');
      data.append('services', services || 'Not specified');
      status.className = 'form__status'; status.textContent = 'Sending...';
      btn.textContent = 'Sending...';
      fetch('https://formsubmit.co/ajax/asrafulhoqueemon25@gmail.com', {
        method: 'POST', headers: { 'Accept': 'application/json' }, body: data
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res && (res.success === true || res.success === 'true')) {
          status.classList.add('ok'); status.textContent = 'Thanks! Your message is in. I\'ll reply within 24 hours.';
          form.reset();
        } else { throw new Error('fail'); }
      }).catch(function () {
        status.classList.add('err');
        var subject = encodeURIComponent('Project inquiry from ' + (data.get('name') || 'portfolio'));
        var bodyTxt = encodeURIComponent((data.get('message') || '') + '\n\nBudget: ' + (data.get('budget') || '') + '\nServices: ' + services + '\nPhone: ' + (data.get('phone') || '') + '\nFrom: ' + (data.get('email') || ''));
        status.innerHTML = 'Couldn\'t send right now. <a class="link" href="mailto:asrafulhoqueemon25@gmail.com?subject=' + subject + '&body=' + bodyTxt + '">Email me directly instead</a>.';
      }).finally(function () { btn.textContent = 'Send message'; });
    });
  }

  /* ---------- hero word rotator ---------- */
  var words = $$('.rotator__word');
  if (words.length > 1) {
    var wi = 0;
    if (!hasGSAP || reduce) {
      words.forEach(function (w, i) { w.style.transform = i ? 'translateY(110%)' : 'none'; });
    }
    setInterval(function () {
      var cur = words[wi]; wi = (wi + 1) % words.length; var next = words[wi];
      if (hasGSAP && !reduce) {
        gsap.to(cur, { yPercent: -110, duration: .7, ease: 'expo.inOut' });
        gsap.fromTo(next, { yPercent: 110, y: 0 }, { yPercent: 0, duration: .7, ease: 'expo.inOut' });
      } else {
        cur.style.transform = 'translateY(110%)'; next.style.transform = 'none';
      }
    }, 2400);
    if (hasGSAP && !reduce) gsap.set(words.slice(1), { yPercent: 110 });
  }

  /* ---------- no-GSAP fallback ---------- */
  if (!animate) {
    var ld = $('.loader'); if (ld) ld.style.display = 'none';
    body.classList.remove('is-loading');
    return;
  }

  /* =========================================================
     Everything below runs only with GSAP + motion allowed
     ========================================================= */
  gsap.registerPlugin(ScrollTrigger);
  doc.classList.add('anim');
  body.classList.add('is-loading');
  if (lenis) lenis.stop();

  $$('.split-chars').forEach(splitChars);
  $$('.scrub-words').forEach(splitWords);

  // Parallax hero: name rises, portrait lifts in, tiles pop out from behind
  var heroChars = $$('.px__word');
  gsap.set(heroChars, { yPercent: 60, opacity: 0 });
  gsap.set('.px__portrait img', { yPercent: 30, opacity: 0 });
  gsap.set('.ptile', { opacity: 0 });
  gsap.set(['.px__intro > *', '.px__actions > *', '.nav'], { opacity: 0, y: 24 });
  var isDesk = window.matchMedia('(min-width: 901px)');
  if (!isDesk.matches) gsap.set('.ptile', { opacity: 1 });

  /* ---------- reveal on view ----------
     One small engine for every entrance animation. It checks real positions on
     each scroll frame, so content can never be left hidden by stale trigger
     positions (lazy images, fonts, pinned sections). Anything already above the
     fold-line is revealed at once, even after a fast fling or an anchor jump. */
  var pending = [];
  function whenVisible(el, fn, line) { if (el) pending.push({ el: el, fn: fn, line: line || .9 }); }
  function checkPending() {
    if (!pending.length || body.classList.contains('is-loading')) return;
    var vh = window.innerHeight, n = 0;
    pending = pending.filter(function (p) {
      if (p.el.getBoundingClientRect().top < vh * p.line) { p.fn(Math.min(n++, 5) * .08); return false; }
      return true;
    });
  }
  var queued = false;
  function queueCheck() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; checkPending(); }); }
  window.addEventListener('scroll', queueCheck, { passive: true });
  window.addEventListener('resize', queueCheck);

  /* ---------- preloader ---------- */
  var loader = $('.loader');
  var num = $('.loader__num');
  var counter = { v: 0 };
  var imgReady = new Promise(function (res) {
    var im = $('.px__portrait img');
    if (!im || im.complete) return res();
    im.addEventListener('load', res); im.addEventListener('error', res);
    setTimeout(res, 2500);
  });
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  var loadTl = gsap.timeline();
  loadTl.from('.loader__name span', { yPercent: 100, opacity: 0, stagger: .1, duration: .9, ease: 'expo.out' })
    .to(counter, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(counter.v); } }, 0)
    .to('.loader__bar span', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0);

  Promise.all([new Promise(function (r) { loadTl.eventCallback('onComplete', r); }), imgReady, fontsReady]).then(intro);

  function intro() {
    var tl = gsap.timeline({
      onComplete: function () {
        body.classList.remove('is-loading');
        if (lenis) lenis.start();
        loader.remove();
        ScrollTrigger.refresh();
        checkPending();
      }
    });
    tl.to('.loader__inner, .loader__bar', { opacity: 0, y: -30, duration: .5, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .to(heroChars, { yPercent: 0, opacity: 1, duration: 1.3, stagger: .12, ease: 'expo.out' }, '-=.55')
      .to('.px__portrait img', { yPercent: 0, opacity: 1, duration: 1.5, ease: 'expo.out', clearProps: 'transform' }, '-=1.1')
      .to('.ptile', { opacity: 1, duration: .8, stagger: { each: .06, from: 'random' }, ease: 'power2.out' }, '-=1.1')
      .to(['.nav', '.px__intro > *', '.px__actions > *'], { opacity: 1, y: 0, stagger: .07, duration: 1.1, ease: 'expo.out', clearProps: 'transform' }, '-=1');
  }

  /* ---------- scroll progress ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: body, start: 'top top', end: 'bottom bottom', scrub: .3 } });

  /* ---------- background gradient that travels with the scroll ---------- */
  var bgTl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: body, start: 'top top', end: 'bottom bottom', scrub: 1.5 } });
  bgTl.to('.bgfx__b--1', { x: '-55vw', y: '50vh', '--c': 'rgba(90,170,255,.12)', duration: 1 })
      .to('.bgfx__b--2', { x: '60vw', y: '-40vh', '--c': 'rgba(40,150,170,.10)', duration: 1 }, 0)
      .to('.bgfx__b--3', { x: '-30vw', scale: 1.3, duration: 1 }, 0)
      .to('.bgfx__b--1', { x: '-20vw', y: '90vh', '--c': 'rgba(130,100,255,.12)', duration: 1 })
      .to('.bgfx__b--2', { x: '20vw', y: '-80vh', '--c': 'rgba(77,107,255,.14)', duration: 1 }, '<')
      .to('.bgfx__b--3', { x: '10vw', y: '-20vh', scale: .9, duration: 1 }, '<')
      .to('.bgfx__b--1', { x: '-60vw', y: '110vh', '--c': 'rgba(77,107,255,.20)', duration: 1 })
      .to('.bgfx__b--2', { x: '70vw', y: '-60vh', '--c': 'rgba(40,70,190,.18)', duration: 1 }, '<');

  /* ---------- hero scroll parallax ----------
     The stage is pinned while: the portrait rises, the name lifts and its
     outlined echoes fan out below it, and the tool tiles fly outwards from
     behind the portrait, each at its own speed. */
  function heroParallax() {
    var stage = $('.px__stage');
    if (!stage) return null;
    var sr = stage.getBoundingClientRect();
    var cx = sr.left + sr.width / 2, cy = sr.top + sr.height * .55;
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.hero--px', start: 'top top', end: '+=110%', pin: '.px__stage', scrub: 1, anticipatePin: 1, invalidateOnRefresh: true }
    });
    tl.fromTo('.px__portrait', { yPercent: 14, scale: .94 }, { yPercent: -4, scale: 1.04, duration: 1 }, 0)
      .fromTo('.px__title', { yPercent: 0, scale: 1 }, { yPercent: -26, scale: .94, duration: 1 }, 0)
      .to('.hero__glow', { scale: 1.3, opacity: .5, duration: 1 }, 0)
      .to('.px__bar', { opacity: 0, y: 40, duration: .45 }, .55);
    $$('.px__echo').forEach(function (el, i) {
      tl.fromTo(el, { yPercent: 0, opacity: 0 }, { yPercent: (i + 1) * 34, opacity: .9 - i * .25, duration: .8 }, .05 + i * .06);
    });
    // Tiles float up out of their cluster as you scroll, each on its own path.
    // The "random" values are seeded, so every visit moves the same way.
    function seeded(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    // Tiles leave one after another with clear gaps: the first starts right away,
    // each next one a little later, and every tile flies past the top of the screen
    // and fades out before the hero is gone. The fade sits on the inner face, so it
    // never clashes with the page-load fade-in on the tile itself.
    var tiles = $$('.ptile'), n = tiles.length, gap = .07, dur = 1 - gap * (n - 1);
    tiles.forEach(function (el, i) {
      var a = seeded(i + 1), b = seeded(i + 21), c = seeded(i + 41);
      var r = el.getBoundingClientRect();
      var rise = (r.top - sr.top) + r.height + 140 + b * 220;
      var rot = gsap.getProperty(el, 'rotation');
      var start = i * gap;
      tl.fromTo(el, { x: 0, y: 0, rotation: rot, scale: 1 }, {
        x: (a - .5) * 220, y: -rise, rotation: rot + (c - .5) * 80, scale: .85 + a * .3,
        duration: dur, ease: 'power2.in'
      }, start);
      tl.fromTo($('.ptile__face', el), { opacity: 1 }, { opacity: 0, duration: dur * .4, ease: 'none' }, start + dur * .6);
    });
    ScrollTrigger.refresh();
    return tl;
  }
  gsap.matchMedia().add('(min-width: 901px)', function () {
    var tl = heroParallax();
    return function () {
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(true); tl.kill(); }
      gsap.set(['.px__portrait', '.px__title', '.px__echo', '.ptile', '.ptile__face', '.px__bar', '.hero__glow'], { clearProps: 'transform,opacity,x,y,scale,rotation,yPercent' });
      gsap.set('.ptile', { opacity: 1 });
    };
  });

  /* hero glow follows the mouse */
  if (finePointer) {
    var glow = $('.hero__glow');
    var gx = gsap.quickTo(glow, 'x', { duration: 1.4, ease: 'power3' });
    var gy = gsap.quickTo(glow, 'y', { duration: 1.4, ease: 'power3' });
    $('.hero').addEventListener('mousemove', function (e) {
      gx((e.clientX - window.innerWidth / 2) * .35);
      gy((e.clientY - window.innerHeight / 2) * .35);
    });
  }

  /* ---------- section titles: char reveal ---------- */
  $$('.title, .contact__title').forEach(function (t) {
    var cs = $$('.c', t);
    gsap.set(cs, { yPercent: 115 });
    whenVisible(t, function () { gsap.to(cs, { yPercent: 0, duration: 1.2, stagger: .025, ease: 'power3.out' }); }, .92);
  });

  /* ---------- generic reveals ---------- */
  // Phones get a plain fade (no sliding) so nothing overlaps while scrolling
  var small = window.matchMedia('(max-width: 900px)').matches;
  $$('[data-reveal]').forEach(function (el) {
    whenVisible(el, function (d) {
      // Mark it revealed first: the CSS start state (hidden, 24px down) only applies
      // to elements without .is-in, so clearing GSAP's inline transform at the end
      // can never send the element back down.
      el.classList.add('is-in');
      if (small) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: .9, ease: 'sine.out' });
      else gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, delay: d * 1.5, duration: 1.3, ease: 'power3.out', clearProps: 'transform' });
    }, small ? 1.05 : .9);
  });

  /* ---------- handwritten notes: a small pop when they come into view ---------- */
  $$('.hand-note .tag-hand').forEach(function (n) {
    gsap.set(n, small ? { opacity: 0 } : { opacity: 0, scale: .6 });
    whenVisible(n, function () {
      gsap.to(n, small ? { opacity: 1, duration: .9, delay: .2, ease: 'sine.out' } : { opacity: 1, scale: 1, duration: 1, delay: .2, ease: 'back.out(1.6)', clearProps: 'transform' });
    }, .92);
  });
  $$('.eyebrow').forEach(function (e) {
    if (e.closest('.hero')) return;
    gsap.set(e, { opacity: 0, x: -16 });
    whenVisible(e, function () { gsap.to(e, { opacity: 1, x: 0, duration: 1, ease: 'power3.out' }); }, .94);
  });


  /* ---------- page theme: white while a light section fills the middle of the screen ---------- */
  var lightSecs = $$('[data-theme="light"]');
  function themeCheck() {
    var mid = window.innerHeight * .5, light = false;
    for (var i = 0; i < lightSecs.length; i++) {
      var r = lightSecs[i].getBoundingClientRect();
      if (r.top < mid && r.bottom > mid) { light = true; break; }
    }
    if (light !== doc.classList.contains('is-light')) doc.classList.toggle('is-light', light);
  }

  /* ---------- about statement: words go from blurred, bold and blue to sharp as you scroll ---------- */
  var blurSets = $$('.blur-words').map(function (el) {
    var words = [];
    [].slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'word'; w.textContent = part;
          frag.appendChild(w); words.push(w);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1) { n.classList.add('word'); words.push(n); }
    });
    return { el: el, words: words, last: [] };
  });
  function blurCheck() {
    var vh = window.innerHeight;
    blurSets.forEach(function (b) {
      var r = b.el.getBoundingClientRect();
      // 0 when the statement's top reaches 90% of the screen, 1 once it has risen well into view
      var P = Math.min(1, Math.max(0, (vh * .9 - r.top) / (r.height + vh * .4)));
      var n = b.words.length, k = 6;
      b.words.forEach(function (w, i) {
        var v = Math.min(1, Math.max(0, (P * (n + k) - i) / k));
        v = Math.round(v * 100) / 100;
        if (b.last[i] !== v) { b.last[i] = v; w.style.setProperty('--p', v); }
      });
    });
  }

  var tq = false;
  function onFrame() { tq = false; themeCheck(); blurCheck(); }
  function queueFrame() { if (!tq) { tq = true; requestAnimationFrame(onFrame); } }
  window.addEventListener('scroll', queueFrame, { passive: true });
  window.addEventListener('resize', queueFrame);
  onFrame();

  /* ---------- footer name: aurora gradient + liquid letter wave ---------- */
  (function () {
    var big = $('.footer__big');
    if (!big) return;
    var words = $$(':scope > span', big);
    // One span per letter; each letter paints its slice of the word's gradient
    words.forEach(function (w) {
      var txt = w.textContent; w.textContent = '';
      txt.split('').forEach(function (ch) { var l = document.createElement('span'); l.className = 'fl'; l.textContent = ch; w.appendChild(l); });
    });
    var letters = $$('.fl', big), centers = [];
    function measure() {
      var br = big.getBoundingClientRect();
      words.forEach(function (w) {
        w.style.setProperty('--ww', w.offsetWidth + 'px'); w.style.setProperty('--wh', w.offsetHeight + 'px');
        $$('.fl', w).forEach(function (l) { l.style.setProperty('--lx', l.offsetLeft + 'px'); l.style.setProperty('--ly', l.offsetTop + 'px'); });
      });
      centers = letters.map(function (l) { var r = l.getBoundingClientRect(); return r.left - br.left + r.width / 2; });
    }
    measure();
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { big.classList.toggle('is-live', es[0].isIntersecting); }).observe(big);
    } else big.classList.add('is-live');
    if (reduce) return;

    // Liquid: a slow travelling wave across the letters, plus a soft swell under the pointer.
    // Everything eases toward its target each frame, so it never jumps or shakes.
    var amp = 0, ampT = 0, px = -9999, pxS = -9999, running = false, t0 = performance.now(), spot = { v: 0 };
    function tick() {
      var t = (performance.now() - t0) / 1000;
      amp += (ampT - amp) * .05;
      pxS += (px - pxS) * .12;
      var bw = big.offsetWidth || 1;
      letters.forEach(function (l, i) {
        var d = (centers[i] - pxS) / (bw * .09);
        var swell = Math.exp(-d * d);
        var wave = Math.sin(t * 2.1 - i * .55);
        var y = -(wave * .028 + swell * .07) * amp;
        var sc = 1 + (Math.sin(t * 2.1 - i * .55 + 1.2) * .025 + swell * .06) * amp;
        l.style.setProperty('--wy', y.toFixed(4) + 'em');
        l.style.setProperty('--ws', sc.toFixed(4));
      });
      if (ampT === 0 && amp < .004) {
        letters.forEach(function (l) { l.style.removeProperty('--wy'); l.style.removeProperty('--ws'); });
        running = false; gsap.ticker.remove(tick);
      }
    }
    function start() { if (!running) { running = true; gsap.ticker.add(tick); } }
    big.addEventListener('pointermove', function (e) {
      var br = big.getBoundingClientRect();
      px = e.clientX - br.left;
      if (pxS < -9000) pxS = px;
      words.forEach(function (w) {
        var r = w.getBoundingClientRect();
        w.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        w.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    big.addEventListener('pointerenter', function (e) {
      ampT = 1; start();
      gsap.to(spot, { v: 1, duration: .5, onUpdate: function () { big.style.setProperty('--spot', spot.v.toFixed(3)); } });
    });
    big.addEventListener('pointerleave', function () {
      ampT = 0; px = -9999;
      gsap.to(spot, { v: 0, duration: .6, onUpdate: function () { big.style.setProperty('--spot', spot.v.toFixed(3)); } });
    });
    // Touch: a tap sends one wave through the name
    big.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      ampT = 1; start(); setTimeout(function () { ampT = 0; }, 1800);
    });
  })();

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var end = parseInt(el.dataset.count, 10);
    var start = end > 1000 ? end - 40 : 0;
    var o = { v: start };
    el.textContent = start;
    whenVisible(el, function () { gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } }); }, .95);
  });

  /* ---------- marquee: loop + scroll velocity ---------- */
  var track = $('.marquee__track');
  if (track) {
    var loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 26, repeat: -1 });
    var dir = 1;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) {
        var v = self.getVelocity();
        if (v !== 0) dir = v > 0 ? 1 : -1;
        var boost = 1 + Math.min(Math.abs(v) / 300, 6);
        gsap.to(loop, { timeScale: dir * boost, duration: .2, overwrite: true, onComplete: function () { gsap.to(loop, { timeScale: dir, duration: 1.2, ease: 'power2.out' }); } });
        gsap.to('.marquee__item', { skewX: gsap.utils.clamp(-8, 8, v / -250), duration: .4, overwrite: true });
      }
    });
  }

  var mm = gsap.matchMedia();


  /* ---------- featured: horizontal pinned scroll ---------- */
  mm.add('(min-width: 901px)', function () {
    var pin = $('.featured__pin');
    var tr = $('.featured__track');
    var dist = function () { return Math.max(0, tr.scrollWidth - window.innerWidth); };
    var tween = gsap.to(tr, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    $$('.fcard__media img', tr).forEach(function (img) {
      gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.fcard'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    var fc = $$('.fcard', tr);
    gsap.set(fc, { y: 60, opacity: 0 });
    whenVisible(pin, function () { gsap.to(fc, { y: 0, opacity: 1, stagger: .1, duration: 1.3, ease: 'power3.out' }); }, .8);
    return function () { gsap.set(fc, { clearProps: 'all' }); };
  });

  /* ---------- project index: hover preview ---------- */
  var preview = $('.preview');
  if (preview && finePointer) {
    var pimg = $('img', preview);
    var plist = $('.plist');
    var px = gsap.quickTo(preview, 'x', { duration: .45, ease: 'power3' });
    var py = gsap.quickTo(preview, 'y', { duration: .45, ease: 'power3' });
    var mx = -999, my = -999, lastRot = 0, shown = false, curRow = null;

    // Load every preview image in the background once the page is idle,
    // so hovering a row shows its picture instantly instead of downloading it first.
    var cache = {};
    function warm() {
      $$('.prow').forEach(function (r) {
        var src = r.dataset.img;
        if (!src || cache[src]) return;
        var im = new Image(); im.decoding = 'async'; im.src = src; cache[src] = im;
        if (im.decode) im.decode().catch(function () {});
      });
    }
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 }); else setTimeout(warm, 1500);
    if (plist) plist.addEventListener('mouseenter', warm, { once: true });

    function showFor(row) {
      var src = row && row.dataset.img;
      if (!src) { hidePreview(); return; }
      curRow = row;
      if (pimg.getAttribute('src') !== src) pimg.src = src;
      if (!shown) { shown = true; gsap.to(preview, { opacity: 1, scale: 1, duration: .35, ease: 'expo.out', overwrite: 'auto' }); }
    }
    function hidePreview() {
      curRow = null;
      if (!shown) return;
      shown = false;
      gsap.to(preview, { opacity: 0, scale: .6, duration: .35, ease: 'power3.out', overwrite: 'auto' });
    }
    // Re-check what is under the pointer. Runs on mouse move AND on scroll,
    // so the preview never stays stuck when the list scrolls away.
    // Find the row under the pointer by its box, not by hit-testing, so it
    // still works while hover is paused during scrolling.
    function rowAt(x, y) {
      var rows = $$('.prow:not(.is-hidden)');
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i].getBoundingClientRect();
        if (y >= r.top && y < r.bottom && x >= r.left && x <= r.right) return rows[i];
      }
      return null;
    }
    function check() {
      var row = rowAt(mx, my);
      if (row) { if (row !== curRow || !shown) showFor(row); }
      else hidePreview();
    }
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      var dx = mx - (gsap.getProperty(preview, 'x') || 0);
      px(mx); py(my);
      var rot = gsap.utils.clamp(-12, 12, dx * .04);
      if (Math.abs(rot - lastRot) > .5) { gsap.to(preview, { rotation: rot, duration: .5 }); lastRot = rot; }
      check();
    }, { passive: true });
    window.addEventListener('scroll', function () { if (mx > -999) check(); }, { passive: true });
    if (plist) plist.addEventListener('mouseleave', hidePreview);
    document.addEventListener('mouseleave', hidePreview);
    window.addEventListener('blur', hidePreview);
    ScrollTrigger.create({ trigger: '.index', start: 'top bottom', end: 'bottom top', onLeave: hidePreview, onLeaveBack: hidePreview });
    $$('.filter').forEach(function (b) { b.addEventListener('click', hidePreview); });
  }
  $$('.prow').forEach(function (r) {
    gsap.set(r, { y: 30, opacity: 0 });
    whenVisible(r, function (d) { gsap.to(r, { y: 0, opacity: 1, delay: d * 1.5, duration: 1.1, ease: 'power3.out', clearProps: 'transform,opacity' }); }, .94);
  });

  /* ---------- timeline line draw ---------- */
  $$('.timeline').forEach(function (t) {
    gsap.to($('.timeline__line i', t), { scaleY: 1, ease: 'none', scrollTrigger: { trigger: t, start: 'top 75%', end: 'bottom 60%', scrub: true } });
  });

  /* ---------- gallery: two infinite rows, scroll speeds them up ---------- */
  var gLoops = $$('.gallery__row').map(function (row, i) {
    var dir = parseFloat(row.dataset.dir || '1');
    var tw = gsap.fromTo(row, { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, ease: 'none', duration: 38 + i * 8, repeat: -1 });
    row.addEventListener('mouseenter', function () { gsap.to(tw, { timeScale: .15, duration: .6 }); });
    row.addEventListener('mouseleave', function () { gsap.to(tw, { timeScale: 1, duration: .6 }); });
    return tw;
  });
  ScrollTrigger.create({
    trigger: '.gallery', start: 'top bottom', end: 'bottom top',
    onToggle: function (self) { gLoops.forEach(function (t) { self.isActive ? t.play() : t.pause(); }); },
    onUpdate: function (self) {
      var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 400, 4);
      gLoops.forEach(function (t) { gsap.to(t, { timeScale: boost, duration: .2, overwrite: true, onComplete: function () { gsap.to(t, { timeScale: 1, duration: 1.2, ease: 'power2.out' }); } }); });
    }
  });
  gsap.set('.gallery__rows', { opacity: 0, y: 40 });
  whenVisible($('.gallery__rows'), function () { gsap.to('.gallery__rows', { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out' }); }, .98);

  /* ---------- footer big name ---------- */
  gsap.set('.footer__big > span', { yPercent: 100 });
  whenVisible($('.footer__big'), function () { gsap.to('.footer__big > span', { yPercent: 0, duration: 1.4, stagger: .12, ease: 'power3.out' }); }, 1);

  /* ---------- contact photo reveal ---------- */
  gsap.set('.contact__photo', { clipPath: 'inset(100% 0 0 0)' });
  whenVisible($('.contact__photo'), function () { gsap.to('.contact__photo', { clipPath: 'inset(0% 0 0 0)', duration: 1.1, ease: 'expo.inOut' }); }, .95);

  /* ---------- magnetic buttons ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' });
      var yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .3);
        yTo((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  }

  /* ---------- custom cursor ---------- */
  if (finePointer) {
    doc.classList.add('has-cursor');
    var cur = $('.cursor');
    var dot = $('.cursor__dot');
    var ring = $('.cursor__ring');
    var label = $('.cursor__label');
    var dX = gsap.quickTo(dot, 'x', { duration: .1 }), dY = gsap.quickTo(dot, 'y', { duration: .1 });
    var rX = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), rY = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { dX(e.clientX); dY(e.clientY); rX(e.clientX); rY(e.clientY); });
    document.addEventListener('mouseover', function (e) {
      var v = e.target.closest('[data-cursor]');
      var h = e.target.closest('a, button, summary, label, .filter');
      cur.classList.toggle('is-view', !!v);
      cur.classList.toggle('is-hover', !v && !!h);
      if (v) label.textContent = v.dataset.cursor;
    });
    document.addEventListener('mouseleave', function () { gsap.to(cur, { opacity: 0, duration: .2 }); });
    document.addEventListener('mouseenter', function () { gsap.to(cur, { opacity: 1, duration: .2 }); });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if ('ResizeObserver' in window) {
    var lastH = 0, rt;
    new ResizeObserver(function () {
      var h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h; clearTimeout(rt);
      rt = setTimeout(function () { ScrollTrigger.refresh(); checkPending(); }, 200);
    }).observe(body);
  }
})();
