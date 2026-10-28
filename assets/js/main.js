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
  if (hint && window.innerWidth <= 900) hint.innerHTML = 'Swipe to explore <span aria-hidden="true">→</span>';

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
      if (a.closest('.svc-nav') && window.__svcScrollTo && window.__svcScrollTo(target)) return;
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

  var heroChars = $$('.hero__title .c');
  gsap.set(heroChars, { yPercent: 115 });
  var heroPic = $('.hero__pic');
  var picW = heroPic ? getComputedStyle(heroPic).width : 0;
  gsap.set(heroPic, { width: 0 });
  gsap.set(['.hero__eyebrow', '.hero__lead', '.hero__rotator', '.hero__cta > *', '.nav'], { opacity: 0, y: 24 });

  /* ---------- preloader ---------- */
  var loader = $('.loader');
  var num = $('.loader__num');
  var counter = { v: 0 };
  var imgReady = new Promise(function (res) {
    var im = $('.hero__pic img');
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
      }
    });
    tl.to('.loader__inner, .loader__bar', { opacity: 0, y: -30, duration: .5, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .to(heroChars, { yPercent: 0, duration: 1.2, stagger: .025, ease: 'expo.out' }, '-=.55')
      .to(heroPic, { width: picW, duration: 1.3, ease: 'expo.inOut', clearProps: 'width' }, '-=1.1')
      .to(['.nav', '.hero__eyebrow', '.hero__lead', '.hero__rotator', '.hero__cta > *'], { opacity: 1, y: 0, stagger: .07, duration: 1, ease: 'expo.out', clearProps: 'transform' }, '-=1');
  }

  /* ---------- scroll progress ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: body, start: 'top top', end: 'bottom bottom', scrub: .3 } });

  /* ---------- background gradient that travels with the scroll ---------- */
  var bgTl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: body, start: 'top top', end: 'bottom bottom', scrub: 1.5 } });
  bgTl.to('.bgfx__b--1', { x: '-55vw', y: '50vh', '--c': 'rgba(255,170,60,.16)', duration: 1 })
      .to('.bgfx__b--2', { x: '60vw', y: '-40vh', '--c': 'rgba(32,150,130,.10)', duration: 1 }, 0)
      .to('.bgfx__b--3', { x: '-30vw', scale: 1.3, duration: 1 }, 0)
      .to('.bgfx__b--1', { x: '-20vw', y: '90vh', '--c': 'rgba(255,61,127,.12)', duration: 1 })
      .to('.bgfx__b--2', { x: '20vw', y: '-80vh', '--c': 'rgba(255,90,31,.14)', duration: 1 }, '<')
      .to('.bgfx__b--3', { x: '10vw', y: '-20vh', scale: .9, duration: 1 }, '<')
      .to('.bgfx__b--1', { x: '-60vw', y: '110vh', '--c': 'rgba(255,90,31,.22)', duration: 1 })
      .to('.bgfx__b--2', { x: '70vw', y: '-60vh', '--c': 'rgba(201,52,24,.18)', duration: 1 }, '<');

  /* ---------- hero parallax on scroll ---------- */
  gsap.to('.hero__title', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__glow', { scale: 1.4, opacity: .3, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__pic img', { scale: 1.45, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

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
    gsap.from($$('.c', t), {
      yPercent: 115, duration: 1.1, stagger: .022, ease: 'expo.out',
      scrollTrigger: { trigger: t, start: 'top 85%' }
    });
  });

  /* ---------- generic reveals ---------- */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, stagger: .1, duration: 1.1, ease: 'expo.out', overwrite: true }); }
  });
  $$('.eyebrow').forEach(function (e) {
    if (e.closest('.hero')) return;
    gsap.from(e, { opacity: 0, x: -20, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 90%' } });
  });

  /* ---------- about statement: word scrub ---------- */
  $$('.scrub-words').forEach(function (p) {
    gsap.fromTo($$('.word', p), { opacity: .14 }, {
      opacity: 1, stagger: .08, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var end = parseInt(el.dataset.count, 10);
    var start = end > 1000 ? end - 40 : 0;
    var o = { v: start };
    el.textContent = start;
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: function () { gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } }); }
    });
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

  /* ---------- services: sticky index + stacking cards ---------- */
  (function () {
    var stack = $('.stack');
    var cards = $$('.svc');
    var navItems = $$('.svc-nav li');
    var countEl = $('.svc-progress__count b');
    var bar = $('.svc-progress__bar i');
    if (!stack || !cards.length) return;
    var GAP = 28, STEP = 22, TOP = 110;
    var offs = [], active = -1, enabled = false;

    function measure() {
      TOP = parseFloat(getComputedStyle(cards[0]).top) || 110;
      var top = stack.getBoundingClientRect().top + window.scrollY;
      var acc = 0;
      offs = cards.map(function (c) { var o = top + acc; acc += c.offsetHeight + GAP; return o; });
    }
    function setActive(i) {
      if (i === active) return;
      active = i;
      navItems.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      if (countEl) countEl.textContent = String(i + 1).padStart(2, '0');
      if (bar) gsap.to(bar, { scaleX: (i + 1) / cards.length, duration: .6, ease: 'expo.out' });
    }
    function update() {
      if (!enabled) return;
      var y = window.scrollY, vh = window.innerHeight;
      var idx = 0;
      offs.forEach(function (o, i) { if (y + vh * .5 >= o - (TOP + i * STEP) + vh * .15) idx = i; });
      setActive(idx);
      cards.forEach(function (card, i) {
        var depth = 0;
        for (var j = i + 1; j < cards.length; j++) {
          var stuckAt = offs[j] - (TOP + j * STEP);
          depth += gsap.utils.clamp(0, 1, (y - (stuckAt - vh * .75)) / (vh * .75));
        }
        gsap.set(card, { scale: 1 - depth * .045, '--dim': Math.min(.55, depth * .28) });
      });
    }
    window.__svcScrollTo = function (target) {
      if (!enabled) return false;
      var i = cards.indexOf(target);
      if (i < 0) return false;
      scrollToTarget(Math.max(0, offs[i] - (TOP + i * STEP) - 8));
      return true;
    };

    mm.add('(min-width: 901px)', function () {
      enabled = true; measure(); update();
      var st = ScrollTrigger.create({ trigger: '.services', start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: function () { measure(); update(); } });
      gsap.from(cards[0], { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: stack, start: 'top 85%' } });
      gsap.from('.svc-aside > *', { y: 30, opacity: 0, stagger: .06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.svc-aside', start: 'top 80%' } });
      return function () { enabled = false; st.kill(); cards.forEach(function (c) { gsap.set(c, { clearProps: 'all' }); }); };
    });
    mm.add('(max-width: 900px)', function () {
      cards.forEach(function (c) { gsap.from(c, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' } }); });
    });
  })();

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
    gsap.from($$('.fcard', tr), { y: 100, opacity: 0, stagger: .08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: pin, start: 'top 70%' } });
  });

  /* ---------- project index: hover preview ---------- */
  var preview = $('.preview');
  if (preview && finePointer) {
    var pimg = $('img', preview);
    var plist = $('.plist');
    var px = gsap.quickTo(preview, 'x', { duration: .6, ease: 'power3' });
    var py = gsap.quickTo(preview, 'y', { duration: .6, ease: 'power3' });
    var mx = -999, my = -999, lastRot = 0, shown = false, curRow = null;

    function showFor(row) {
      var src = row && row.dataset.img;
      if (!src) { hidePreview(); return; }
      curRow = row;
      if (pimg.getAttribute('src') !== src) pimg.src = src;
      if (!shown) { shown = true; gsap.to(preview, { opacity: 1, scale: 1, duration: .5, ease: 'expo.out', overwrite: 'auto' }); }
    }
    function hidePreview() {
      curRow = null;
      if (!shown) return;
      shown = false;
      gsap.to(preview, { opacity: 0, scale: .6, duration: .35, ease: 'power3.out', overwrite: 'auto' });
    }
    // Re-check what is under the pointer. Runs on mouse move AND on scroll,
    // so the preview never stays stuck when the list scrolls away.
    function check() {
      var el = document.elementFromPoint(mx, my);
      var row = el && el.closest ? el.closest('.prow') : null;
      if (row && !row.classList.contains('is-hidden')) { if (row !== curRow || !shown) showFor(row); }
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
    window.addEventListener('scroll', function () { if (shown || (plist && plist.matches(':hover'))) check(); }, { passive: true });
    if (plist) plist.addEventListener('mouseleave', hidePreview);
    document.addEventListener('mouseleave', hidePreview);
    window.addEventListener('blur', hidePreview);
    ScrollTrigger.create({ trigger: '.index', start: 'top bottom', end: 'bottom top', onLeave: hidePreview, onLeaveBack: hidePreview });
    $$('.filter').forEach(function (b) { b.addEventListener('click', hidePreview); });
  }
  gsap.from('.prow', { y: 50, opacity: 0, stagger: .04, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.plist', start: 'top 85%' } });

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
  gsap.from('.gallery__rows', { opacity: 0, y: 80, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.gallery__rows', start: 'top 90%' } });

  /* ---------- footer big name ---------- */
  gsap.from('.footer__big span', { yPercent: 100, duration: 1.4, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.footer__big', start: 'top 95%' } });

  /* ---------- contact photo reveal ---------- */
  gsap.fromTo('.contact__photo', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.contact__photo', start: 'top 85%' } });

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
})();
