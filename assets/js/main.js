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

  /* ---------- Three.js scenes (scene.min.js loads after this file) ---------- */
  function onScene(fn) {
    if (window.ahScene && window.ahScene.ready) fn(window.ahScene);
    else window.addEventListener('ah:scene-ready', function () { fn(window.ahScene); }, { once: true });
  }

  /* ---------- gallery on phones: a card slider with arrows, counter and caption ---------- */
  function memSlider() {
    var list = $('.mem--flat .mem__list');
    if (!list) return;
    var items = $$('.mem__item', list);
    var pos = $('.mem__pos b'), alt = $('.mem__alt'), bar = $('.mem__track i');
    var prev = $('[data-mem-go="-1"]'), next = $('[data-mem-go="1"]');
    var cur = -1, q = false;
    function update() {
      q = false;
      var r = list.getBoundingClientRect(), mid = r.left + r.width / 2, best = 0, bestD = 1e9;
      items.forEach(function (it, i) {
        var b = it.getBoundingClientRect();
        var d = (b.left + b.width / 2 - mid) / b.width;
        if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
        if (!reduce) {
          var a = Math.min(1, Math.abs(d));
          it.style.setProperty('--s', (1 - a * .08).toFixed(3));
          it.style.setProperty('--o', (1 - a * .5).toFixed(3));
        }
      });
      if (best !== cur) {
        cur = best;
        items.forEach(function (it, i) { it.classList.toggle('is-on', i === cur); });
        if (pos) pos.textContent = cur + 1;
        if (alt) alt.textContent = $('img', items[cur]).alt;
        if (prev) prev.disabled = cur === 0;
        if (next) next.disabled = cur === items.length - 1;
      }
      if (bar) bar.style.transform = 'scaleX(' + ((cur + 1) / items.length).toFixed(3) + ')';
    }
    function go(step) {
      var t = items[Math.max(0, Math.min(items.length - 1, cur + step))];
      list.scrollTo({ left: t.offsetLeft - (list.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    list.setAttribute('tabindex', '0');
    list.setAttribute('aria-label', 'Photos, use the arrow keys or swipe');
    list.addEventListener('scroll', function () { if (!q) { q = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  onScene(memSlider);

  /* ---------- text that decodes like code being typed ---------- */
  var GLYPHS = '<>/{}[]=;_#*';
  function scrambleIn(el, dur) {
    var text = el.dataset.text || el.textContent;
    el.dataset.text = text;
    var start = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - start) / (dur || 700));
      var keep = Math.floor(text.length * t), s = text.slice(0, keep);
      for (var i = keep; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = s;
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

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
    window.__lenis = lenis;
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
      // number the rows that are left: [01], [02]...
      show.forEach(function (r, i) { var n = $('.prow__n', r); if (n) n.textContent = '[' + (i < 9 ? '0' : '') + (i + 1) + ']'; });
      if (window.__plist) window.__plist.replay(show);
      else if (hasGSAP) gsap.fromTo(show, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: .04, duration: .6, ease: 'power3.out', clearProps: 'transform' });
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
    window.__ahIntroDone = true;
    var ld = $('.loader'); if (ld) ld.style.display = 'none';
    body.classList.remove('is-loading');
    onScene(function (s) { if (s.pixels) s.pixels.showNow(); });
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
  gsap.set(['.px__intro > *', '.px__actions > *', '.nav', '.px__note'], { opacity: 0, y: 24 });
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

  /* ---------- preloader: a short terminal boot ----------
     Every visit plays the whole boot, line by line: the command is typed,
     two build steps finish, the counter reaches 100 and "ready" prints. Only
     then, and only once the portrait, fonts and pixels have loaded, does the
     terminal close and the site come in. */
  var loader = $('.loader');
  var out = $('.term__out');
  var num = $('.loader__num');
  var counter = { v: 0 };
  var t0 = performance.now();
  try { sessionStorage.removeItem('ah-booted'); } catch (e) {}
  var imgReady = new Promise(function (res) {
    var im = $('.px__portrait img');
    if (!im || im.complete) return res();
    im.addEventListener('load', res); im.addEventListener('error', res);
    setTimeout(res, 4000);
  });
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var sceneReady = new Promise(function (res) { onScene(res); setTimeout(res, 4000); });

  var typed = { n: 0 };
  var CMD = 'npm run portfolio';
  var PROMPT = '<span class="p">~/asraful</span> <span class="hl">$</span> ';
  var STEP1 = '\n<span class="dim">&gt; compiling</span> figma &rarr; html <span class="dim">..........</span> <span class="ok">done</span>';
  var STEP2 = '\n<span class="dim">&gt; mounting</span> &lt;AsrafulHoque /&gt; <span class="dim">.......</span> <span class="ok">done</span>';
  var shown = '';
  function draw() { out.innerHTML = PROMPT + CMD.slice(0, Math.round(typed.n)) + shown; }
  // Each step waits for the one before it; the counter and bar end with the last step.
  var bootTl = gsap.timeline({ paused: true });
  bootTl
    .to(typed, { n: CMD.length, duration: .6, ease: 'none', onUpdate: draw })
    .add(function () { shown = STEP1; draw(); }, '+=.2')
    .add(function () { shown = STEP1 + STEP2; draw(); }, '+=.35')
    .to(counter, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(counter.v); } }, 0)
    .to('.loader__bar', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
    .to({}, { duration: .2 });
  var bootDone = new Promise(function (r) { bootTl.eventCallback('onComplete', r); });
  // Start on the next frame, so a slow first paint can't swallow the start of the typing.
  requestAnimationFrame(function () { requestAnimationFrame(function () { bootTl.play(0); }); });

  Promise.all([bootDone, imgReady, fontsReady, sceneReady]).then(intro);

  function intro() {
    var secs = ((performance.now() - t0) / 1000).toFixed(2);
    out.innerHTML += '\n<span class="ok">&#10003; ready</span> in ' + secs + 's <span class="dim">&middot; shipping since 2018</span>';
    var tl = gsap.timeline({
      onComplete: function () {
        window.__ahIntroDone = true;
        window.dispatchEvent(new Event('ah:intro-done'));
        body.classList.remove('is-loading');
        if (lenis) lenis.start();
        loader.remove();
        ScrollTrigger.refresh();
        checkPending();
      }
    });
    // hold on "ready" long enough to read it, then close the terminal
    tl.to('.term', { opacity: 0, y: -14, scale: .97, duration: .45, delay: .6, ease: 'power2.in' })
      .add(function () { onScene(function (s) { if (s.pixels) s.pixels.intro(2.4); }); }, '-=.15')
      .to(loader, { opacity: 0, duration: .7, ease: 'power2.out' }, '-=.1')
      .to(heroChars, { yPercent: 0, opacity: 1, duration: 1.3, stagger: .12, ease: 'expo.out' }, '-=.55')
      .to('.px__portrait img', { yPercent: 0, opacity: 1, duration: 1.5, ease: 'expo.out', clearProps: 'transform' }, '-=1.1')
      .to('.ptile', { opacity: 1, duration: .8, stagger: { each: .06, from: 'random' }, ease: 'power2.out' }, '-=1.1')
      .to(['.nav', '.px__intro > *', '.px__actions > *', '.px__note'], { opacity: 1, y: 0, stagger: .07, duration: 1.1, ease: 'expo.out', clearProps: 'transform' }, '-=1');
  }

  /* ---------- scroll progress ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: body, start: 'top top', end: 'bottom bottom', scrub: .3 } });

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
    // Tiles fly off in a straight line, 63 degrees up and slightly to the left, with uneven
    // spacing: they leave one after another at irregular moments and at slightly
    // different speeds. Front tiles (furthest along the path) always leave first and
    // are never slower than the tiles behind them, so no tile can catch the one ahead:
    // the gaps grow unevenly but tiles never overlap.
    // The fade sits on the inner face so it never clashes with the page-load fade-in.
    var tiles = $$('.ptile');
    var ang = 63 * Math.PI / 180, ux = -Math.cos(ang), uy = -Math.sin(ang);   // mostly up, a little left: 63 degrees above horizontal
    var rects = tiles.map(function (el) { return el.getBoundingClientRect(); });
    var lowest = Math.max.apply(null, rects.map(function (r) { return r.bottom; })) - sr.top;
    var dist = (lowest + 160) / -uy;                                         // far enough for every tile to clear the top
    var order = tiles.map(function (el, i) {
      var r = rects[i];
      return { el: el, lead: (r.left + r.width / 2) * ux + (r.top + r.height / 2) * uy };
    }).sort(function (p, q) { return q.lead - p.lead; });                    // front tile first
    var start = 0, dur = .66;
    order.forEach(function (o, k) {
      if (k) {
        start += .006 + seeded(k + 7) * .03;                                 // irregular head starts
        dur = Math.min(1 - start, dur + seeded(k + 17) * .035);              // never faster than the tile ahead
      }
      tl.fromTo(o.el, { x: 0, y: 0 }, { x: dist * ux, y: dist * uy, duration: dur, ease: 'power1.in' }, start);
      tl.fromTo($('.ptile__face', o.el), { opacity: 1 }, { opacity: 0, duration: dur * .3, ease: 'none' }, start + dur * .7);
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
    whenVisible(e, function () {
      gsap.to(e, { opacity: 1, x: 0, duration: 1, ease: 'power3.out' });
      if (e.classList.contains('eyebrow--tag')) scrambleIn(e, 650);
    }, .94);
  });


  /* ---------- page theme: white while a light section fills the middle of the screen ---------- */
  var lightSecs = $$('[data-theme="light"]');
  function themeCheck() {
    var mid = window.innerHeight * .5, light = false, white = false;
    for (var i = 0; i < lightSecs.length; i++) {
      var r = lightSecs[i].getBoundingClientRect();
      if (r.top < mid && r.bottom > mid) { light = true; white = lightSecs[i].dataset.tone === 'white'; break; }
    }
    if (light !== doc.classList.contains('is-light')) doc.classList.toggle('is-light', light);
    if (white !== doc.classList.contains('is-white')) doc.classList.toggle('is-white', white);
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

  /* ---------- project index: letters roll into the project's colour, cards slide up ----------
     Each name is split into word masks and letters. A row is "on" while the
     pointer is over it (desktop) or while it crosses the middle of the screen
     (touch). A soft bar in the row's colour glides to the active row. */
  var plist = $('[data-plist]');
  if (plist) {
    var prows = $$('.prow', plist);
    var split = !reduce;
    if (split) {
      prows.forEach(function (r) {
        var nm = $('.prow__name', r);
        var text = nm.textContent.trim(), k = 0;
        nm.textContent = '';
        var sr = document.createElement('span');
        sr.className = 'visually-hidden'; sr.textContent = text;
        nm.appendChild(sr);
        text.split(/\s+/).forEach(function (word, wi) {
          if (wi) { var sp = document.createElement('span'); sp.setAttribute('aria-hidden', 'true'); sp.textContent = ' '; nm.appendChild(sp); }
          var w = document.createElement('span');
          w.className = 'w'; w.setAttribute('aria-hidden', 'true');
          word.split('').forEach(function (ch) {
            var l = document.createElement('span');
            l.className = 'l'; l.textContent = ch; l.style.setProperty('--k', k++);
            w.appendChild(l);
          });
          nm.appendChild(w);
        });
      });
      plist.classList.add('is-split');
    }

    // letters rise into place, one row after another
    function enter(r, delay) {
      r.style.setProperty('--d', Math.round(delay * 1000) + 'ms');
      r.classList.add('is-in');
      setTimeout(function () { r.style.removeProperty('--d'); }, delay * 1000 + 1200);
    }
    prows.forEach(function (r) {
      if (!split) { r.classList.add('is-in'); return; }
      whenVisible(r, function (d) { enter(r, d * 1.6); }, .96);
    });

    var onRow = null;
    var bar = document.createElement('li');
    bar.className = 'plist__bar'; bar.setAttribute('aria-hidden', 'true');
    plist.insertBefore(bar, plist.firstChild);
    // keep the cards on screen when a long name leaves no room after it
    function fit(r) {
      r.classList.remove('is-tight');
      if (window.innerWidth <= 900) return;
      var inner = $('.prow__in', r), pk = $('.prow__peek', r);
      var room = plist.getBoundingClientRect().right - inner.getBoundingClientRect().right;
      if (room < pk.offsetWidth + parseFloat(getComputedStyle(pk).marginLeft) - 4) r.classList.add('is-tight');
    }
    function moveBar(r) {
      if (!r) { bar.classList.remove('is-on'); return; }
      var first = !bar.classList.contains('is-on');
      // the first time it appears it fades in where it is instead of sliding from the top
      if (first) bar.style.transition = 'opacity .35s';
      bar.style.setProperty('--c', r.style.getPropertyValue('--c'));
      bar.style.transform = 'translateY(' + r.offsetTop + 'px)';
      bar.style.height = r.offsetHeight + 'px';
      if (first) { void bar.offsetWidth; bar.style.transition = ''; }
      bar.classList.add('is-on');
    }
    function setOn(r) {
      if (onRow === r) return;
      if (onRow) onRow.classList.remove('is-on');
      onRow = r;
      if (r) { fit(r); r.classList.add('is-on'); }
      moveBar(r);
    }

    if (finePointer) {
      // Track the pointer over the whole page, and check again on every scroll
      // frame, so a row lights up as soon as it slides under a still mouse.
      var mx = -1, my = -1, ticking = false;
      var check = function () {
        ticking = false;
        if (mx < 0) { setOn(null); return; }
        var lb = plist.getBoundingClientRect();
        if (my < lb.top || my >= lb.bottom || mx < lb.left - 40 || mx > lb.right + 40) { setOn(null); return; }
        for (var i = 0; i < prows.length; i++) {
          if (prows[i].classList.contains('is-hidden')) continue;
          var b = prows[i].getBoundingClientRect();
          if (my >= b.top && my < b.bottom) { setOn(prows[i]); return; }
        }
        setOn(null);
      };
      var queue = function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } };
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        mx = e.clientX; my = e.clientY; queue();
      }, { passive: true });
      window.addEventListener('scroll', queue, { passive: true });
      if (lenis) lenis.on('scroll', queue);
      document.addEventListener('mouseleave', function () { mx = -1; queue(); });
      window.addEventListener('blur', function () { mx = -1; queue(); });
      window.addEventListener('resize', function () { if (onRow) moveBar(onRow); });
    } else if ('IntersectionObserver' in window) {
      // touch screens: the row in the middle of the screen is the active one
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) setOn(e.target); else if (e.target === onRow) setOn(null); });
      }, { rootMargin: '-46% 0px -46% 0px' });
      prows.forEach(function (r) { io.observe(r); });
    }
    plist.addEventListener('focusin', function (e) { var r = e.target.closest('.prow'); if (r) setOn(r); });
    plist.addEventListener('focusout', function () { setOn(null); });

    // used by the filter buttons
    window.__plist = {
      replay: function (show) {
        setOn(null);
        if (!split) return;
        show.forEach(function (r) { r.classList.remove('is-in'); });
        void plist.offsetWidth;
        show.forEach(function (r, i) { enter(r, Math.min(i, 8) * .06); });
      }
    };
  }

  /* ---------- timeline line draw ---------- */
  $$('.timeline').forEach(function (t) {
    gsap.to($('.timeline__line i', t), { scaleY: 1, ease: 'none', scrollTrigger: { trigger: t, start: 'top 75%', end: 'bottom 60%', scrub: true } });
  });

  /* ---------- footer big name ---------- */


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
