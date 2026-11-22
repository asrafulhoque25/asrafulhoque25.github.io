/* =========================================================
   Hero: 3D particle portrait that turns into the name on scroll,
   plus an interactive dotted globe. Plain JavaScript.
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------------------------------------------------------
     Shared pointer state (window-wide, canvas ignores events)
     --------------------------------------------------------- */
  var pointer = { x: -9999, y: -9999, nx: 0, ny: 0, active: false };
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    pointer.nx = e.clientX / window.innerWidth * 2 - 1;
    pointer.ny = e.clientY / window.innerHeight * 2 - 1;
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.active = false; pointer.x = pointer.y = -9999; });
  window.addEventListener('touchend', function () { pointer.active = false; pointer.x = pointer.y = -9999; }, { passive: true });

  var figure = document.querySelector('[data-particles]');
  var band = document.querySelector('[data-nameband]');
  var hero = document.querySelector('.hero--particles');

  if (figure && band && hero && !reduce) initParticles();
  else root.classList.add('no-particles');

  function initParticles() {
    var img = figure.querySelector('.hero__reveal');
    var canvas = document.createElement('canvas');
    canvas.className = 'pfx';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) { root.classList.add('no-particles'); canvas.remove(); return; }

    var vw = 0, vh = 0;
    var P = [];                 // particles
    var textW = 1;              // width of one copy of the name
    var started = false, introStart = 0, last = 0, marquee = 0;
    var yaw = 0, pitch = 0;     // smoothed 3D rotation
    var titleWords = [].slice.call(document.querySelectorAll('.hero__title .w'));
    var heroFade = [].slice.call(document.querySelectorAll('.hero--particles .hero__text > :not(.hero__title), .hero__side'));
    var mobile = false, faded = false;

    /* ---------- sampling ---------- */
    function samplePortrait() {
      var N = mobile ? 200 : 310;
      var off = document.createElement('canvas'); off.width = off.height = N;
      var o = off.getContext('2d', { willReadFrequently: true });
      o.drawImage(img, 0, 0, N, N);
      var d = o.getImageData(0, 0, N, N).data, out = [];
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var i = (y * N + x) * 4;
        if (d[i + 3] < 120) continue;
        var lum = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
        var v = Math.pow(Math.min(1, Math.max(0, (lum - .04) / .62)), .7);
        if (Math.random() > .26 + .74 * v) continue;
        var u = (x + Math.random()) / N, w = (y + Math.random()) / N;
        // Depth: the body bulges towards the viewer at its centre; bright face tones sit closer
        var cx = (u - .5) / .42;
        var z = Math.sqrt(Math.max(0, 1 - cx * cx)) * .55 + v * .25 + (w < .55 ? .15 : 0);
        out.push({ u: u, w: w, z: z, v: v });
      }
      return out;
    }

    function sampleText(count) {
      var label = 'MD ASRAFUL HOQUE ✦ ';
      var H = mobile ? 120 : 220;
      var off = document.createElement('canvas');
      var o = off.getContext('2d', { willReadFrequently: true });
      var font = '800 ' + H + 'px "Bricolage Grotesque", system-ui, sans-serif';
      o.font = font;
      var W = Math.ceil(o.measureText(label).width);
      off.width = W; off.height = Math.ceil(H * 1.25);
      o.font = font; o.textBaseline = 'middle'; o.fillStyle = '#fff';
      o.fillText(label, 0, off.height / 2);
      var d = o.getImageData(0, 0, off.width, off.height).data, pts = [];
      var step = 2;
      for (var y = 0; y < off.height; y += step) for (var x = 0; x < W; x += step) {
        if (d[(y * off.width + x) * 4 + 3] > 128) pts.push([x, y]);
      }
      var res = [];
      for (var i = 0; i < count; i++) {
        var p = pts[(Math.random() * pts.length) | 0];
        res.push([(p[0] + Math.random() * step) / off.height, (p[1] + Math.random() * step) / off.height]);
      }
      textW = W / off.height;   // width in units of text height
      return res;
    }

    function build() {
      vw = window.innerWidth; vh = window.innerHeight;
      mobile = vw < 900;
      // Particles are written straight into a pixel buffer (much faster than drawing shapes)
      K = mobile ? Math.min(2, window.devicePixelRatio || 1) : 1;
      BW = Math.round(vw * K); BH = Math.round(vh * K);
      canvas.width = BW; canvas.height = BH;
      canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
      imgData = ctx.createImageData(BW, BH);
      buf = new Uint32Array(imgData.data.buffer);
      measure();
      var pts = samplePortrait();
      var txt = sampleText(pts.length);
      var old = P;
      P = pts.map(function (p, i) {
        var prev = old[i];
        return {
          u: p.u, w: p.w, z: p.z,
          tx: txt[i][0], ty: txt[i][1],
          s: (.85 + p.v * 1.15) * (mobile ? .8 : 1),
          a: Math.min(1, .2 + p.v * .85) * (p.w > .8 ? Math.max(0, (1 - p.w) / .2) : 1),
          accent: Math.random() < .035,
          // Random start position for the intro and a scatter direction for the scroll morph
          sx: Math.random(), sy: Math.random(),
          dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1, dz: Math.random(),
          ph: Math.random() * Math.PI * 2,
          ox: prev ? prev.ox : 0, oy: prev ? prev.oy : 0, vx: 0, vy: 0
        };
      });
    }

    /* ---------- scroll progress: 0 = portrait, 1 = name ---------- */
    var startY = 0, endY = 1;
    function measure() {
      var sec = band.closest('.nameband') || band;
      var hr = hero.getBoundingClientRect(), sr = sec.getBoundingClientRect(), sc = window.scrollY;
      startY = hr.top + sc + hr.height * .08;
      endY = sr.top + sc + sr.height * .45 - vh / 2;
      if (endY <= startY) endY = startY + 300;
    }
    function progress() {
      return Math.min(1, Math.max(0, (window.scrollY - startY) / (endY - startY)));
    }

    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    var imgData = null, buf = null, K = 1, BW = 0, BH = 0;
    // Pre-computed RGBA words (little-endian ABGR) for every alpha level
    var BONE = [], ACC = [];
    for (var al = 0; al < 256; al++) {
      BONE[al] = ((al << 24) | (230 << 16) | (238 << 8) | 241) >>> 0;
      ACC[al] = ((al << 24) | (31 << 16) | (90 << 8) | 255) >>> 0;
    }

    function frame(now) {
      requestAnimationFrame(frame);
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      var t = now / 1000;

      var fr = figure.getBoundingClientRect();
      var br = band.getBoundingClientRect();
      if (br.bottom < -vh * .3) { canvas.style.opacity = 0; return; }   // far below: sleep

      var p = progress(), e = ease(p);
      // Fade the whole canvas out as the name band leaves the screen
      var out = Math.min(1, Math.max(0, (vh * .35 - br.bottom) / (vh * .35)));
      canvas.style.opacity = (1 - out).toFixed(3);

      // Intro assembly
      var intro = started ? Math.min(1, (now - introStart) / 1800) : 0;
      var introE = 1 - Math.pow(1 - intro, 3);

      // 3D rotation follows the pointer while in portrait mode, with a slow idle sway
      var targetYaw = (pointer.active ? pointer.nx * .42 : Math.sin(t * .45) * .12) * (1 - e);
      var targetPitch = (pointer.active ? pointer.ny * .22 : Math.cos(t * .38) * .05) * (1 - e);
      yaw += (targetYaw - yaw) * .06; pitch += (targetPitch - pitch) * .06;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);

      // Keep the real-photo layer in step with the dots
      img.style.transform = 'rotateY(' + (yaw * 57.3 * .55).toFixed(2) + 'deg) rotateX(' + (-pitch * 57.3 * .55).toFixed(2) + 'deg)';
      var mx = pointer.x - fr.left, my = pointer.y - fr.top;
      figure.style.setProperty('--mx', (e < .05 ? mx : -999) + 'px');
      figure.style.setProperty('--my', (e < .05 ? my : -999) + 'px');

      // Headline words drift apart as the morph starts
      var wp = Math.min(1, p * 2.2);
      if (wp > 0 || faded) for (var k = 0; k < titleWords.length; k++) {
        var wd = titleWords[k], seed = (k * 9301 + 49297) % 233280 / 233280;
        wd.style.transform = wp ? 'translate3d(' + ((seed - .5) * 260 * wp).toFixed(1) + 'px,' + (-(40 + seed * 160) * wp).toFixed(1) + 'px,0) rotate(' + ((seed - .5) * 24 * wp).toFixed(1) + 'deg)' : '';
        wd.style.opacity = (1 - wp * 1.2).toFixed(3);
      }
      if (p > 0 || faded) { faded = p > 0; for (var h = 0; h < heroFade.length; h++) heroFade[h].style.opacity = p > 0 ? (1 - Math.min(1, p * 3)).toFixed(3) : ''; }

      // Name marquee
      marquee += dt * (mobile ? 40 : 70);
      var TH = Math.min(br.height * .9, mobile ? vw * .3 : vh * .3);   // text height in px
      var unit = textW * TH;
      var tTop = br.top + (br.height - TH) / 2;

      var S = fr.width, cX = fr.left + S / 2, cY = fr.top + S * .58;
      var persp = S * 2.4, depth = S * .32;
      var R = mobile ? 70 : 120, R2 = R * R;
      var spread = Math.sin(Math.PI * p);                   // scatter peaks mid-morph

      buf.fill(0);
      for (var i = 0; i < P.length; i++) {
        var q = P[i];
        // Portrait position with 3D rotation and perspective
        var x0 = (q.u - .5) * S, y0 = (q.w - .58) * S, z0 = q.z * depth;
        var x1 = x0 * cy + z0 * sy, z1 = -x0 * sy + z0 * cy;
        var y1 = y0 * cp - z1 * sp, z2 = y0 * sp + z1 * cp;
        var f = persp / (persp - z2);
        var ax = cX + x1 * f, ay = cY + y1 * f;
        // Idle shimmer
        ax += Math.sin(t * 1.3 + q.ph) * .35; ay += Math.cos(t * 1.1 + q.ph) * .35;

        // Name position (wrapping marquee)
        var bx = ((q.tx * TH - marquee) % unit + unit) % unit - (unit - vw) * .0;
        var by = tTop + q.ty * TH;

        var X = ax + (bx - ax) * e, Y = ay + (by - ay) * e;
        // Mid-morph scatter into a wide sheet
        X += q.dx * vw * .45 * spread; Y += q.dy * vh * .35 * spread * (.4 + q.dz);

        // Intro: fly in from random spots
        if (introE < 1) { X = q.sx * vw + (X - q.sx * vw) * introE; Y = q.sy * vh + (Y - q.sy * vh) * introE; }

        // Pointer pushes particles away, they spring back
        var ddx = X + q.ox - pointer.x, ddy = Y + q.oy - pointer.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < R2 && d2 > .5) { var dd = Math.sqrt(d2), force = (1 - dd / R) * 3.2; q.vx += ddx / dd * force; q.vy += ddy / dd * force; }
        q.vx += -q.ox * .07; q.vy += -q.oy * .07; q.vx *= .82; q.vy *= .82; q.ox += q.vx; q.oy += q.vy;
        X += q.ox; Y += q.oy;

        var ix = (X * K) | 0, iy = (Y * K) | 0;
        if (ix < 0 || iy < 0 || ix >= BW - 1 || iy >= BH - 1) continue;
        var al2 = ((q.a * (1 - e) + .8 * e) * 255) | 0;
        var col = q.accent ? ACC[al2] : BONE[al2];
        var o2 = iy * BW + ix;
        buf[o2] = col;
        // Bigger (closer, brighter) particles cover 2x2 pixels
        if (q.s * (1 + (f - 1) * (1 - e)) > 1.45) { buf[o2 + 1] = col; buf[o2 + BW] = col; buf[o2 + BW + 1] = col; }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    function start() { if (!started) { started = true; introStart = performance.now(); } }

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });

    function ready() {
      var go = function () {
        build();
        requestAnimationFrame(frame);
        window.addEventListener('load', measure);
        setTimeout(measure, 1500);
        window.addEventListener('hero:intro', start, { once: true });
        setTimeout(start, document.querySelector('.loader') ? 4500 : 100);
      };
      // Wait for the display font so the name is sampled with the right letters
      (document.fonts && document.fonts.load ? document.fonts.load('800 100px "Bricolage Grotesque"') : Promise.resolve()).then(go, go);
    }
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
  }

  /* ---------------------------------------------------------
     Dotted globe: drag/hover and scroll spin it, Dhaka is marked
     --------------------------------------------------------- */
  var globe = document.querySelector('.hero__globe');
  if (globe && globe.getContext) {
    var g = globe.getContext('2d');
    var GS = globe.width, GR = GS * .46, GC = GS / 2;
    var LAND = [-528,-688,-496,-715,-464,-738,-464,-692,-432,-702,-432,-659,-432,1712,-400,-712,-400,-670,-400,-628,-400,1758,-368,-720,-368,-680,-368,-640,-368,-600,-368,1400,-368,1440,-368,1480,-336,-689,-336,-651,-336,-613,-336,-574,-336,-536,-336,191,-336,230,-336,268,-336,1187,-336,1226,-336,1417,-336,1455,-336,1494,-304,-687,-304,-649,-304,-612,-304,-575,-304,-538,-304,204,-304,241,-304,278,-304,1169,-304,1206,-304,1243,-304,1280,-304,1318,-304,1355,-304,1392,-304,1429,-304,1466,-304,1503,-272,-684,-272,-648,-272,-612,-272,-576,-272,-540,-272,-504,-272,180,-272,216,-272,252,-272,288,-272,324,-272,1152,-272,1188,-272,1224,-272,1260,-272,1296,-272,1332,-272,1368,-272,1404,-272,1440,-272,1476,-272,1512,-240,-682,-240,-647,-240,-612,-240,-577,-240,-542,-240,-507,-240,-472,-240,157,-240,192,-240,227,-240,262,-240,297,-240,332,-240,437,-240,472,-240,1136,-240,1171,-240,1206,-240,1241,-240,1276,-240,1311,-240,1346,-240,1381,-240,1416,-240,1450,-240,1485,-208,-669,-208,-634,-208,-600,-208,-566,-208,-531,-208,-497,-208,-463,-208,-429,-208,154,-208,189,-208,223,-208,257,-208,291,-208,326,-208,463,-208,1183,-208,1217,-208,1251,-208,1286,-208,1320,-208,1354,-208,1389,-208,1423,-208,1457,-176,-690,-176,-656,-176,-622,-176,-589,-176,-555,-176,-521,-176,-488,-176,-454,-176,-421,-176,118,-176,151,-176,185,-176,219,-176,252,-176,286,-176,320,-176,353,-176,454,-176,488,-176,1228,-176,1262,-176,1295,-176,1329,-176,1363,-176,1396,-176,1430,-144,-743,-144,-710,-144,-677,-144,-644,-144,-611,-144,-578,-144,-545,-144,-512,-144,-479,-144,-446,-144,-413,-144,149,-144,182,-144,215,-144,248,-144,281,-144,314,-144,347,-144,380,-144,479,-144,1272,-144,1305,-144,1338,-144,1437,-112,-753,-112,-720,-112,-687,-112,-655,-112,-622,-112,-589,-112,-556,-112,-524,-112,-491,-112,-458,-112,-425,-112,-393,-112,164,-112,196,-112,229,-112,262,-112,295,-112,327,-112,360,-112,393,-80,-762,-80,-730,-80,-697,-80,-665,-80,-632,-80,-600,-80,-568,-80,-535,-80,-503,-80,-470,-80,-438,-80,-405,-80,-373,-80,146,-80,178,-80,211,-80,243,-80,276,-80,308,-80,341,-80,373,-80,1119,-80,1378,-80,1411,-80,1476,-48,-804,-48,-771,-48,-739,-48,-707,-48,-675,-48,-643,-48,-611,-48,-579,-48,-546,-48,-514,-48,-482,-48,-450,-48,-418,-48,-386,-48,129,-48,161,-48,193,-48,225,-48,257,-48,289,-48,321,-48,354,-48,386,-48,1382,-48,1414,-48,1446,-16,-804,-16,-771,-16,-739,-16,-707,-16,-675,-16,-643,-16,-611,-16,-579,-16,-546,-16,-514,-16,-482,-16,-450,-16,96,-16,129,-16,161,-16,193,-16,225,-16,257,-16,289,-16,321,-16,354,-16,386,-16,1029,-16,1125,-16,1157,-16,1221,-16,1318,16,-771,16,-739,16,-707,16,-675,16,-643,16,-611,16,-579,16,-546,16,-514,16,96,16,129,16,161,16,193,16,225,16,257,16,289,16,321,16,354,16,386,16,418,16,996,16,1093,16,1125,16,1157,48,-771,48,-739,48,-707,48,-675,48,-643,48,-611,48,-579,48,-546,48,64,48,96,48,129,48,161,48,193,48,225,48,257,48,289,48,321,48,354,48,386,48,418,48,450,48,964,48,1029,48,1157,80,-762,80,-730,80,-697,80,-665,80,-632,80,-600,80,-114,80,-81,80,-49,80,-16,80,16,80,49,80,81,80,114,80,146,80,178,80,211,80,243,80,276,80,308,80,341,80,373,80,405,80,438,80,470,80,1249,112,-851,112,-720,112,-687,112,-131,112,-98,112,-65,112,-33,112,0,112,33,112,65,112,98,112,131,112,164,112,196,112,229,112,262,112,295,112,327,112,360,112,393,112,425,112,491,112,785,112,1047,112,1080,144,-908,144,-875,144,-842,144,-149,144,-116,144,-83,144,-50,144,-17,144,17,144,50,144,83,144,116,144,149,144,182,144,215,144,248,144,281,144,314,144,347,144,380,144,413,144,446,144,479,144,776,144,1007,144,1040,144,1073,176,-993,176,-959,176,-925,176,-892,176,-151,176,-118,176,-84,176,-50,176,-17,176,17,176,50,176,84,176,118,176,151,176,185,176,219,176,252,176,286,176,320,176,353,176,387,176,454,176,488,176,521,176,757,176,791,176,824,176,959,176,993,176,1026,176,1060,208,-1046,208,-1011,208,-977,208,-874,208,-771,208,-154,208,-120,208,-86,208,-51,208,-17,208,17,208,51,208,86,208,120,208,154,208,189,208,223,208,257,208,291,208,326,208,360,208,394,208,429,208,463,208,497,208,531,208,566,208,737,208,771,208,806,208,840,208,943,208,977,208,1011,208,1046,240,-1101,240,-1066,240,-1031,240,-996,240,-122,240,-87,240,-52,240,-17,240,17,240,52,240,87,240,122,240,157,240,192,240,227,240,262,240,297,240,332,240,402,240,437,240,472,240,507,240,542,240,682,240,717,240,751,240,786,240,821,240,856,240,891,240,926,240,961,240,996,240,1031,240,1066,240,1101,240,1136,240,1171,240,1206,272,-1080,272,-1044,272,-1008,272,-108,272,-72,272,-36,272,0,272,36,272,72,272,108,272,144,272,180,272,216,272,252,272,288,272,324,272,360,272,396,272,432,272,468,272,540,272,576,272,612,272,648,272,684,272,720,272,756,272,792,272,828,272,864,272,900,272,936,272,972,272,1008,272,1044,272,1080,272,1116,272,1152,272,1188,304,-1095,304,-1058,304,-1021,304,-984,304,-946,304,-909,304,-872,304,-835,304,-93,304,-56,304,-19,304,19,304,56,304,93,304,130,304,167,304,204,304,241,304,278,304,315,304,353,304,390,304,427,304,464,304,501,304,538,304,575,304,612,304,649,304,687,304,724,304,761,304,798,304,835,304,872,304,909,304,946,304,984,304,1021,304,1058,304,1095,304,1132,304,1169,304,1206,336,-1149,336,-1111,336,-1072,336,-1034,336,-996,336,-957,336,-919,336,-881,336,-843,336,-804,336,-77,336,-38,336,0,336,38,336,77,336,383,336,421,336,460,336,498,336,536,336,574,336,613,336,651,336,689,336,728,336,766,336,804,336,843,336,881,336,919,336,957,336,996,336,1034,336,1072,336,1111,336,1149,336,1187,336,1302,336,1340,368,-1200,368,-1160,368,-1120,368,-1080,368,-1040,368,-1000,368,-960,368,-920,368,-880,368,-840,368,-800,368,-760,368,-40,368,40,368,80,368,120,368,320,368,400,368,440,368,480,368,520,368,560,368,600,368,640,368,680,368,720,368,760,368,800,368,840,368,880,368,920,368,960,368,1000,368,1040,368,1080,368,1120,368,1160,368,1200,368,1280,368,1400,400,-1214,400,-1172,400,-1130,400,-1088,400,-1047,400,-1005,400,-963,400,-921,400,-879,400,-837,400,-795,400,-753,400,-84,400,-42,400,0,400,42,400,209,400,293,400,335,400,377,400,419,400,460,400,502,400,544,400,586,400,628,400,670,400,712,400,753,400,795,400,837,400,879,400,921,400,963,400,1005,400,1047,400,1088,400,1130,400,1172,400,1256,432,-1229,432,-1185,432,-1141,432,-1098,432,-1054,432,-1010,432,-966,432,-922,432,-878,432,-834,432,-790,432,-746,432,-88,432,-44,432,0,432,132,432,176,432,220,432,263,432,439,432,483,432,527,432,571,432,615,432,659,432,702,432,746,432,790,432,834,432,878,432,922,432,966,432,1010,432,1054,432,1098,432,1141,432,1185,432,1229,432,1273,432,1317,432,1405,432,1449,464,-1200,464,-1154,464,-1108,464,-1062,464,-1015,464,-969,464,-923,464,-877,464,-831,464,-785,464,-738,464,-692,464,0,464,46,464,92,464,138,464,185,464,231,464,277,464,323,464,415,464,462,464,508,464,554,464,600,464,646,464,692,464,738,464,785,464,831,464,877,464,923,464,969,464,1015,464,1062,464,1108,464,1154,464,1200,464,1246,464,1292,464,1338,496,-1258,496,-1208,496,-1159,496,-1110,496,-1060,496,-1011,496,-962,496,-912,496,-863,496,-814,496,-764,496,-715,496,-567,496,25,496,74,496,123,496,173,496,222,496,271,496,321,496,370,496,419,496,468,496,518,496,567,496,616,496,666,496,715,496,764,496,814,496,863,496,912,496,962,496,1011,496,1060,496,1110,496,1159,496,1208,496,1258,496,1307,496,1356,528,-1271,528,-1218,528,-1165,528,-1112,528,-1059,528,-1006,528,-953,528,-900,528,-847,528,-741,528,-688,528,-635,528,-582,528,0,528,106,528,159,528,212,528,265,528,318,528,371,528,424,528,476,528,529,528,582,528,635,528,688,528,741,528,794,528,847,528,900,528,953,528,1006,528,1059,528,1112,528,1165,528,1218,528,1271,528,1324,528,1376,528,1429,560,-1286,560,-1229,560,-1171,560,-1114,560,-1057,560,-1000,560,-943,560,-886,560,-714,560,-657,560,-29,560,86,560,143,560,257,560,314,560,371,560,429,560,486,560,543,560,600,560,657,560,714,560,771,560,829,560,886,560,943,560,1000,560,1057,560,1114,560,1171,560,1229,560,1286,560,1343,560,1571,592,-1614,592,-1552,592,-1366,592,-1303,592,-1241,592,-1179,592,-1117,592,-1055,592,-993,592,-745,592,62,592,124,592,248,592,310,592,372,592,434,592,497,592,559,592,621,592,683,592,745,592,807,592,869,592,931,592,993,592,1055,592,1117,592,1179,592,1241,592,1303,592,1366,592,1614,624,-1592,624,-1523,624,-1454,624,-1385,624,-1315,624,-1246,624,-1177,624,-1108,624,-1038,624,-969,624,-831,624,-485,624,138,624,277,624,346,624,415,624,485,624,554,624,623,624,692,624,762,624,831,624,900,624,969,624,1038,624,1108,624,1177,624,1246,624,1315,624,1385,624,1454,624,1523,624,1592,624,1662,624,1731,656,-1800,656,-1722,656,-1643,656,-1565,656,-1487,656,-1409,656,-1330,656,-1252,656,-1174,656,-1096,656,-1017,656,-939,656,-704,656,-470,656,-235,656,-157,656,157,656,313,656,470,656,548,656,626,656,704,656,783,656,861,656,939,656,1017,656,1096,656,1174,656,1252,656,1330,656,1409,656,1487,656,1565,656,1643,656,1722,688,-1800,688,-1624,688,-1537,688,-1449,688,-1361,688,-1273,688,-1185,688,-1098,688,-922,688,-834,688,-746,688,-483,688,-395,688,-307,688,220,688,307,688,659,688,834,688,922,688,1010,688,1098,688,1185,688,1273,688,1361,688,1449,688,1537,688,1624,688,1712,720,-1183,720,-977,720,-874,720,-771,720,-463,720,-360,720,-257,720,874,720,977,720,1080,720,1183,720,1286,720,1491,752,-807,752,-559,752,-434,752,-310,752,-186,752,931,752,1055,752,1428];
    var grid = [];
    for (var lat = -60; lat <= 60; lat += 30) for (var lon = -180; lon < 180; lon += 4) grid.push([lat, lon]);
    var DHAKA = [23.8, 90.4];
    var rot = -DHAKA[1], tilt = -.3, spinV = 0, hoverX = 0, hovering = false;

    globe.addEventListener('pointerenter', function () { hovering = true; });
    globe.addEventListener('pointerleave', function () { hovering = false; });
    var lastScroll = window.scrollY;
    window.addEventListener('scroll', function () {
      var d = window.scrollY - lastScroll; lastScroll = window.scrollY;
      spinV += d * .12;
    }, { passive: true });

    var proj = function (la, lo) {
      var a = la * Math.PI / 180, b = (lo + rot) * Math.PI / 180;
      var x = Math.cos(a) * Math.sin(b), y = Math.sin(a), z = Math.cos(a) * Math.cos(b);
      var y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return [GC + x * GR, GC - y2 * GR, z2];
    };

    var drawGlobe = function () {
      g.clearRect(0, 0, GS, GS);
      var grd = g.createRadialGradient(GC - GR * .3, GC - GR * .3, GR * .1, GC, GC, GR);
      grd.addColorStop(0, 'rgba(255,255,255,.06)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(GC, GC, GR, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(241,238,230,.28)'; g.lineWidth = 1.5; g.stroke();
      for (var i = 0; i < grid.length; i++) {
        var c = proj(grid[i][0], grid[i][1]); if (c[2] < 0) continue;
        g.fillStyle = 'rgba(241,238,230,' + (c[2] * .22).toFixed(2) + ')'; g.fillRect(c[0] - .8, c[1] - .8, 1.6, 1.6);
      }
      for (var j = 0; j < LAND.length; j += 2) {
        var q = proj(LAND[j] / 10, LAND[j + 1] / 10); if (q[2] < 0) continue;
        g.fillStyle = 'rgba(241,238,230,' + (.25 + q[2] * .7).toFixed(2) + ')';
        g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
      }
      var d = proj(DHAKA[0], DHAKA[1]);
      if (d[2] > 0) {
        g.fillStyle = 'rgba(255,90,31,.28)'; g.beginPath(); g.arc(d[0], d[1], 13, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff5a1f'; g.beginPath(); g.arc(d[0], d[1], 5.5, 0, Math.PI * 2); g.fill();
      }
    };

    var spin = function () {
      // Pointer position over the hero turns the world; scroll adds momentum
      var target = hovering || pointer.active ? pointer.nx * 70 : 0;
      hoverX += (target - hoverX) * .05;
      spinV *= .92;
      rot += .06 + spinV * .1;
      tilt += ((pointer.active ? -.3 - pointer.ny * .25 : -.3) - tilt) * .05;
      var keep = rot; rot = keep + hoverX;
      drawGlobe();
      rot = keep;
      requestAnimationFrame(spin);
    };
    reduce ? drawGlobe() : requestAnimationFrame(spin);
  }
})();
