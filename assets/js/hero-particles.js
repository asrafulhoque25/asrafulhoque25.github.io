/* =========================================================
   Hero particle portrait, dotted globe and skills dock.
   Plain JavaScript, no dependencies.
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Particle portrait
     --------------------------------------------------------- */
  var wrap = document.querySelector('[data-particles]');
  if (wrap) initParticles(wrap);

  function initParticles(wrap) {
    var canvas = wrap.querySelector('.hero__particles');
    var img = wrap.querySelector('.hero__reveal');
    var ctx = canvas.getContext('2d');
    if (!ctx) { wrap.classList.add('no-particles'); return; }

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = 0;            // CSS pixel size of the square canvas
    var parts = [];          // particle list
    var mouse = { x: -9999, y: -9999 };
    var running = false, visible = true, started = false, startTime = 0;
    var BUCKETS = 6;         // alpha buckets for batched drawing
    var BONE = '241,238,230', ACCENT = '255,90,31';

    function build() {
      var rect = wrap.getBoundingClientRect();
      size = Math.round(rect.width);
      if (!size || !img.naturalWidth) return;
      canvas.width = size * dpr; canvas.height = size * dpr;
      canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Sample the cut-out photo on a small grid; density follows brightness
      var N = size < 420 ? 190 : 260;
      var off = document.createElement('canvas');
      off.width = N; off.height = N;
      var octx = off.getContext('2d', { willReadFrequently: true });
      octx.drawImage(img, 0, 0, N, N);
      var data = octx.getImageData(0, 0, N, N).data;
      var cell = size / N;
      var old = parts;
      parts = [];
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var i = (y * N + x) * 4;
          if (data[i + 3] < 120) continue;
          var lum = (data[i] * .3 + data[i + 1] * .59 + data[i + 2] * .11) / 255;
          // Stretch the tones so the face reads clearly and the dark shirt stays faint
          var v = Math.min(1, Math.max(0, (lum - .04) / .62));
          v = Math.pow(v, .7);
          if (Math.random() > .2 + .8 * v) continue;
          var hx = (x + Math.random()) * cell, hy = (y + Math.random()) * cell;
          var prev = old[parts.length];
          parts.push({
            hx: hx, hy: hy,
            x: prev ? prev.x : (started ? hx : size / 2 + (Math.random() - .5) * size * 1.6),
            y: prev ? prev.y : (started ? hy : size / 2 + (Math.random() - .5) * size * 1.6),
            vx: 0, vy: 0,
            s: (.7 + v * 1.05) * (size < 420 ? .9 : 1),
            a: Math.min(1, .16 + v * .9),
            accent: Math.random() < .035,
            ph: Math.random() * Math.PI * 2
          });
        }
      }
      if (reduce) { parts.forEach(function (p) { p.x = p.hx; p.y = p.hy; }); draw(0); }
    }

    function draw(t) {
      ctx.clearRect(0, 0, size, size);
      // Batch particles by colour and alpha bucket to keep fills cheap
      var batches = {};
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var key = (p.accent ? 'a' : 'b') + Math.min(BUCKETS - 1, Math.floor(p.a * BUCKETS));
        (batches[key] || (batches[key] = [])).push(p);
      }
      for (var k in batches) {
        var list = batches[k];
        var alpha = (+k.slice(1) + .5) / BUCKETS;
        ctx.fillStyle = 'rgba(' + (k[0] === 'a' ? ACCENT : BONE) + ',' + alpha.toFixed(2) + ')';
        ctx.beginPath();
        for (var j = 0; j < list.length; j++) {
          var q = list[j];
          ctx.rect(q.x, q.y, q.s, q.s);
        }
        ctx.fill();
      }
    }

    function step(now) {
      if (!running) return;
      var t = (now - startTime) / 1000;
      // Spring eases in during the intro so particles drift into place
      var spring = Math.min(.055, .008 + t * .03);
      var R = size * .16, R2 = R * R, push = size * .0042;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > .01) {
          var d = Math.sqrt(d2), f = (1 - d / R) * push * 6;
          p.vx += dx / d * f; p.vy += dy / d * f;
        }
        // Gentle idle shimmer
        var ix = Math.sin(t * 1.3 + p.ph) * .12, iy = Math.cos(t * 1.1 + p.ph) * .12;
        p.vx += (p.hx - p.x) * spring + ix * .1;
        p.vy += (p.hy - p.y) * spring + iy * .1;
        p.vx *= .84; p.vy *= .84;
        p.x += p.vx; p.y += p.vy;
      }
      draw(t);
      requestAnimationFrame(step);
    }

    function play() {
      if (running || reduce || !visible || !started) return;
      running = true;
      requestAnimationFrame(step);
    }
    function pause() { running = false; }

    function start() {
      if (started) return;
      started = true;
      startTime = performance.now();
      play();
    }

    // Pointer: repel particles and reveal the real photo under the cursor
    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      wrap.style.setProperty('--mx', mouse.x + 'px');
      wrap.style.setProperty('--my', mouse.y + 'px');
      wrap.classList.add('is-touched');
    }
    function onLeave() {
      mouse.x = mouse.y = -9999;
      wrap.style.setProperty('--mx', '-999px');
      wrap.style.setProperty('--my', '-999px');
    }
    if (!window.matchMedia('(hover: hover)').matches) { var hint = wrap.querySelector('.hero__hint'); if (hint) hint.textContent = 'Touch the photo ↗'; }
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    wrap.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') onLeave(); });

    // Pause when the hero is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? play() : pause();
      }).observe(wrap);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });

    function ready() {
      build();
      // main.js fires this when the preloader finishes; fall back to a timer
      window.addEventListener('hero:intro', start, { once: true });
      setTimeout(start, document.querySelector('.loader') ? 4500 : 200);
    }
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
  }

  /* ---------------------------------------------------------
     Dotted globe with Dhaka marked
     --------------------------------------------------------- */
  var globe = document.querySelector('.hero__globe');
  if (globe && globe.getContext) {
    var g = globe.getContext('2d');
    var GS = globe.width, GR = GS * .45, GC = GS / 2;
    var pts = [];
    for (var lat = -80; lat <= 80; lat += 10) {
      var ring = Math.max(6, Math.round(36 * Math.cos(lat * Math.PI / 180)));
      for (var k = 0; k < ring; k++) pts.push([lat, k * 360 / ring]);
    }
    var DHAKA = [23.8, 90.4];
    var rot = 20;
    var tilt = -18 * Math.PI / 180;

    var project = function (lat, lon) {
      var la = lat * Math.PI / 180, lo = (lon + rot) * Math.PI / 180;
      var x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
      // Tilt the globe a little towards the viewer
      var y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return [GC + x * GR, GC - y2 * GR, z2];
    };

    var drawGlobe = function () {
      g.clearRect(0, 0, GS, GS);
      g.strokeStyle = 'rgba(241,238,230,.3)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(GC, GC, GR, 0, Math.PI * 2); g.stroke();
      for (var i = 0; i < pts.length; i++) {
        var q = project(pts[i][0], pts[i][1]);
        if (q[2] < -.05) continue;
        g.fillStyle = 'rgba(241,238,230,' + (.18 + q[2] * .7).toFixed(2) + ')';
        g.fillRect(q[0] - 1.4, q[1] - 1.4, 2.8, 2.8);
      }
      var d = project(DHAKA[0], DHAKA[1]);
      if (d[2] > 0) {
        g.fillStyle = 'rgba(255,90,31,.25)';
        g.beginPath(); g.arc(d[0], d[1], 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff5a1f';
        g.beginPath(); g.arc(d[0], d[1], 6, 0, Math.PI * 2); g.fill();
      }
    };

    var spin = function () {
      rot -= .12;
      drawGlobe();
      requestAnimationFrame(spin);
    };
    // Start with Dhaka facing the viewer
    rot = -DHAKA[1] + 25;
    reduce ? drawGlobe() : requestAnimationFrame(spin);
  }

  /* ---------------------------------------------------------
     Skills dock: highlight one skill at a time
     --------------------------------------------------------- */
  var dock = document.querySelectorAll('.hero__dock span:not(.hero__dock-code)');
  if (dock.length && !reduce) {
    var di = 0;
    setInterval(function () {
      dock[di].classList.remove('is-on');
      di = (di + 1) % dock.length;
      dock[di].classList.add('is-on');
    }, 2200);
  }
})();
