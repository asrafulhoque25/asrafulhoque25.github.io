/* =========================================================
   "Everything your website needs": pills you can throw around.
   Uses Matter.js for physics; DOM pills follow the bodies.
   ========================================================= */
(function () {
  'use strict';
  var wrap = document.querySelector('[data-toss]');
  if (!wrap || !window.Matter) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var M = window.Matter, started = false;
  var section = wrap.closest('.toss');

  function start() {
    if (started) return;
    started = true;

    // Measure each pill where it already sits, so switching to physics moves nothing.
    // The section keeps its exact height, so nothing below it jumps either.
    var pills = [].slice.call(wrap.querySelectorAll('.pill'));
    var box = section.getBoundingClientRect();
    var sizes = pills.map(function (el) {
      var r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    });
    var floor = Math.max.apply(null, sizes.map(function (s) { return s.y + s.h / 2; }));
    section.style.height = section.offsetHeight + 'px';
    wrap.classList.add('is-live');

    var W = wrap.clientWidth, H = wrap.clientHeight;
    var engine = M.Engine.create({ gravity: { y: 1.1 }, enableSleeping: true });
    var world = engine.world, T = 120;
    var walls = [
      M.Bodies.rectangle(W / 2, floor + T / 2, W * 3, T, { isStatic: true }),
      M.Bodies.rectangle(-T / 2, H / 2, T, H * 4, { isStatic: true }),
      M.Bodies.rectangle(W + T / 2, H / 2, T, H * 4, { isStatic: true }),
      M.Bodies.rectangle(W / 2, -H * 1.5, W * 3, T, { isStatic: true })
    ];
    M.Composite.add(world, walls);

    var bodies = pills.map(function (el, i) {
      var s = sizes[i];
      var b = M.Bodies.rectangle(s.x, s.y, s.w, s.h, {
        chamfer: { radius: s.h / 2 }, restitution: .3, friction: .5, frictionAir: .02, density: .002
      });
      b.el = el; b.w = s.w; b.h = s.h;
      return b;
    });
    // Pills start at rest exactly where they were; they only move when someone throws them
    M.Composite.add(world, bodies);
    // Asleep until touched: a throw (or a pill hitting them) wakes them up
    bodies.forEach(function (b) { M.Sleeping.set(b, true); });

    // Drag and throw with pointer events (page scroll still works outside the pills)
    var drag = null, last = null;
    function point(e) { var r = wrap.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    pills.forEach(function (el, i) {
      el.addEventListener('pointerdown', function (e) {
        var b = bodies[i], p = point(e);
        M.Sleeping.set(b, false);
        el.setPointerCapture(e.pointerId); el.classList.add('is-dragging');
        drag = M.Constraint.create({ pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: .2, damping: .1, length: 0 });
        M.Composite.add(world, drag); last = { p: p, t: performance.now() };
      });
      el.addEventListener('pointermove', function (e) {
        if (!drag || drag.bodyB !== bodies[i]) return;
        var p = point(e); drag.pointA = p; last = { p: p, t: performance.now() };
      });
      var end = function () {
        if (!drag || drag.bodyB !== bodies[i]) return;
        M.Composite.remove(world, drag); drag = null; el.classList.remove('is-dragging');
      };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    });

    // Keep the DOM pills in step with their bodies
    function sync() {
      for (var k = 0; k < bodies.length; k++) {
        var b = bodies[k];
        b.el.style.transform = 'translate(' + (b.position.x - b.w / 2).toFixed(1) + 'px,' + (b.position.y - b.h / 2).toFixed(1) + 'px) rotate(' + b.angle.toFixed(3) + 'rad)';
      }
    }
    var running = true, lastT = performance.now();
    function loop(now) {
      if (running) { M.Engine.update(engine, Math.min(32, now - lastT)); sync(); }
      lastT = now;
      requestAnimationFrame(loop);
    }
    sync();
    requestAnimationFrame(loop);

    // Pause when the section is off screen
    new IntersectionObserver(function (en) { running = en[0].isIntersecting; }).observe(section);

    // Resize: move the walls and keep the pills inside
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var nW = wrap.clientWidth, nH = wrap.clientHeight;
        M.Body.setPosition(walls[0], { x: nW / 2, y: Math.min(floor, nH) + T / 2 });
        M.Body.setPosition(walls[2], { x: nW + T / 2, y: nH / 2 });
        bodies.forEach(function (b) { if (b.position.x > nW - 20) M.Body.setPosition(b, { x: nW - b.w / 2 - 10, y: b.position.y }); });
        W = nW; H = nH;
      }, 200);
    });
  }

  // Start once the section is properly on screen
  new IntersectionObserver(function (en, obs) {
    if (en[0].isIntersecting) { start(); obs.disconnect(); }
  }, { threshold: .35 }).observe(section);
})();
