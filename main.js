/* ══════════════════════════════════════════════════════════════
   進撃の巨人 — ATTACK ON TITAN
   Scroll-scrubbed frame sequences, parallax, and a set of
   reactbits.dev components ported to dependency-free vanilla JS:
     Aurora · ScrollVelocity · DecryptedText · SplitText
     CountUp · ClickSpark · Magnet · TiltedCard · SpotlightCard
   ══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

/* ─────────────────────────── utils ─────────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const inv   = (v, a, b) => clamp((v - a) / (b - a));
const rand  = (a, b) => a + Math.random() * (b - a);

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE  = matchMedia('(pointer: coarse)').matches;
const SMALL   = innerWidth < 820;
const DPR     = Math.min(devicePixelRatio || 1, 2);

/* one shared rAF ticker — every subsystem subscribes to it */
const ticker = (() => {
  const subs = new Set();
  let running = false, last = performance.now();
  const loop = (now) => {
    const dt = Math.min(50, now - last); last = now;
    subs.forEach(fn => fn(dt, now));
    if (subs.size) requestAnimationFrame(loop); else running = false;
  };
  return {
    add(fn){ subs.add(fn); if (!running){ running = true; last = performance.now(); requestAnimationFrame(loop); } },
    remove(fn){ subs.delete(fn); }
  };
})();

/* shared, throttled scroll + pointer state */
const view = {
  y: scrollY, h: innerHeight, w: innerWidth, max: 1,
  progress: 0, velocity: 0,
  mx: innerWidth / 2, my: innerHeight / 2,   // raw pointer
  nx: 0, ny: 0                               // eased, -1..1 from centre
};
const measure = () => {
  view.h = innerHeight; view.w = innerWidth;
  view.max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
};
addEventListener('resize', measure, { passive: true });
addEventListener('scroll', () => { view.y = scrollY; }, { passive: true });
addEventListener('pointermove', (e) => { view.mx = e.clientX; view.my = e.clientY; }, { passive: true });
measure();

/* draw an image with object-fit:cover semantics */
function cover(ctx, img, w, h, ox = 0, oy = 0, scale = 1){
  if (!img || !img.width) return;
  const ir = img.width / img.height, cr = w / h;
  let dw, dh;
  if (ir > cr){ dh = h * scale; dw = dh * ir; } else { dw = w * scale; dh = dw / ir; }
  ctx.drawImage(img, (w - dw) / 2 + ox, (h - dh) / 2 + oy, dw, dh);
}

function fitCanvas(cv){
  const r = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (cv.width !== w * DPR || cv.height !== h * DPR){
    cv.width = w * DPR; cv.height = h * DPR;
    const c = cv.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  return [w, h];
}

/* ═══════════════════ FRAME SEQUENCE LOADER ═══════════════════ */
const SETS = {
  wall: { dir: SMALL ? 'assets/frames/wall-sm' : 'assets/frames/wall', count: 71 },
  eren: { dir: SMALL ? 'assets/frames/eren-sm' : 'assets/frames/eren', count: 32 }
};

function loadSequence(set, onEach){
  const imgs = new Array(set.count);
  let done = 0;
  return {
    imgs,
    promises: Array.from({ length: set.count }, (_, i) => new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = () => { done++; onEach && onEach(done, set.count); res(im); };
      im.src = `${set.dir}/${String(i + 1).padStart(3, '0')}.jpg`;
      imgs[i] = im;
    }))
  };
}

/* ═══════════════════════ PRELOADER ═══════════════════════════ */
const loaderEl   = $('#loader');
const loaderFill = $('#loaderFill');
const loaderPct  = $('#loaderPct');
const loaderTask = $('#loaderTask');
const TASKS = [
  '調査兵団 · MOUNTING GEAR',
  '壁上観測 · SCANNING THE WALL',
  '立体機動 · PRESSURISING GAS',
  '座標 · SYNCHRONISING',
  '心臓を捧げよ · READY'
];

const wall = loadSequence(SETS.wall);
const eren = loadSequence(SETS.eren);
const revealImgs = { top: new Image(), bottom: new Image(), ready: false, hasBottom: false };

let loadedCount = 0;
const TOTAL = SETS.wall.count + SETS.eren.count;
const bumpLoader = () => {
  loadedCount++;
  const p = clamp(loadedCount / TOTAL);
  loaderFill.style.width = (p * 100).toFixed(1) + '%';
  loaderPct.textContent = String(Math.round(p * 100)).padStart(2, '0');
  loaderTask.textContent = TASKS[Math.min(TASKS.length - 1, Math.floor(p * TASKS.length))];
};
[...wall.promises, ...eren.promises].forEach(p => p.then(bumpLoader));

/* release as soon as the opening beat can render; the rest streams in */
const openingReady = Promise.all(wall.promises.slice(0, SMALL ? 12 : 24));
Promise.race([openingReady, new Promise(r => setTimeout(r, 6000))]).then(() => {
  setTimeout(() => {
    loaderEl.classList.add('is-done');
    document.body.classList.add('is-ready');
  }, 380);
});

/* ═════════════════════ CUSTOM CURSOR ═════════════════════════ */
if (!COARSE && !REDUCED){
  const cur = $('#cursor');
  let cx = view.mx, cy = view.my;
  ticker.add(() => {
    cx = lerp(cx, view.mx, .2); cy = lerp(cy, view.my, .2);
    cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
  });
  const hot = 'a,button,[data-tilt],[data-magnet],#revealStage';
  addEventListener('pointerover', e => {
    if (e.target.closest(hot)) cur.classList.add('is-hot');
  });
  addEventListener('pointerout', e => {
    if (e.target.closest(hot)) cur.classList.remove('is-hot');
  });
}

/* ═══════════════ GLOBAL SCROLL CHROME + PARALLAX ═════════════ */
const railScroll   = $('#railScroll');
const progressFill = $('#progressFill');
const hintEl       = $('#hint');
const badgeEl      = $('#badge');
const badgeJp      = $('.badge__jp', badgeEl);
const badgeEn      = $('.badge__en', badgeEl);

const BADGES = [
  ['#wall',   '壁',   'WALL MARIA'],
  ['#walls',  '三重', 'THREE RINGS'],
  ['#eren',   '巨人', 'ATTACK TITAN'],
  ['#reveal', '二面', 'TWO FACES'],
  ['#end',    '自由', 'FREEDOM']
].map(([sel, jp, en]) => ({ el: $(sel), jp, en }));

let lastY = view.y;
ticker.add(() => {
  view.velocity = lerp(view.velocity, view.y - lastY, .28);
  lastY = view.y;
  view.progress = clamp(view.y / view.max);

  progressFill.style.width = (view.progress * 100).toFixed(2) + '%';
  railScroll.textContent = 'SCROLL ' + String(Math.round(view.progress * 100)).padStart(3, '0') + '%';
  hintEl.classList.toggle('is-gone', view.y > view.h * 0.4);

  /* eased pointer, normalised around centre — feeds every mouse parallax */
  view.nx = lerp(view.nx, (view.mx / view.w - .5) * 2, .06);
  view.ny = lerp(view.ny, (view.my / view.h - .5) * 2, .06);

  /* which act are we in? */
  let active = null;
  for (const b of BADGES){
    if (!b.el) continue;
    const r = b.el.getBoundingClientRect();
    if (r.top <= view.h * .5 && r.bottom >= view.h * .5) active = b;
  }
  if (active){
    badgeEl.classList.add('is-on');
    if (badgeJp.textContent !== active.jp){ badgeJp.textContent = active.jp; badgeEn.textContent = active.en; }
  } else badgeEl.classList.remove('is-on');
});

/* depth parallax — background plates react to scroll AND pointer */
const depthEls = $$('[data-depth]');
if (depthEls.length && !REDUCED){
  ticker.add(() => {
    for (const el of depthEls){
      const host = el.closest('section');
      const r = host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > view.h + 200) continue;
      const d = parseFloat(el.dataset.depth) || .1;
      const centred = (r.top + r.height / 2 - view.h / 2) / view.h;   // -1..1-ish
      const ty = -centred * d * 260;
      const tx = -view.nx * d * 70;
      const ry =  view.ny * d * 26;
      el.style.transform = `translate3d(${tx.toFixed(2)}px,${(ty + ry).toFixed(2)}px,0)`;
    }
  });
}

/* ════════════════ SCROLL-SCRUBBED FRAME SEQUENCE ═════════════ */
class Scrub {
  constructor(section, canvas, seq, opts){
    this.section = section;
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d', { alpha: false });
    this.seq     = seq;
    this.opts    = Object.assign({ phases: [0, .34, .62], shakeFrom: .5, onProgress: null }, opts);
    this.count   = seq.length;
    this.progress = 0;
    this.frame    = -1;
    this.phases   = $$('.phase', section);
    this.readout  = $(opts.readout, section);
    this.pxEls    = $$('[data-px]', section);

    section.style.height = (parseFloat(section.dataset.vh) || 300) + 'vh';
    this.resize = this.resize.bind(this);
    addEventListener('resize', this.resize, { passive: true });
    this.resize();
    ticker.add(this.tick.bind(this));
  }

  resize(){ this.w = 0; fitCanvas(this.canvas); const r = this.canvas.getBoundingClientRect(); this.w = r.width; this.h = r.height; this.frame = -1; }

  measureProgress(){
    const r = this.section.getBoundingClientRect();
    const travel = Math.max(1, r.height - view.h);
    return clamp(-r.top / travel);
  }

  tick(){
    const r = this.section.getBoundingClientRect();
    if (r.bottom < -60 || r.top > view.h + 60) return;   // offscreen: idle

    const p = REDUCED ? 1 : this.measureProgress();
    this.progress = p;

    const idx = clamp(Math.round(p * (this.count - 1)), 0, this.count - 1);
    const shake = this.opts.shakeFrom < 1 ? inv(p, this.opts.shakeFrom, 1) : 0;

    /* the frame is also offset by the eased pointer, so a still scroll
       position still needs a repaint while the cursor is moving */
    const drifted = Math.abs(view.nx - (this._nx ?? 99)) > .004 ||
                    Math.abs(view.ny - (this._ny ?? 99)) > .004;
    if (idx !== this.frame || shake > 0.01 || drifted){
      this.frame = idx;
      this._nx = view.nx; this._ny = view.ny;
      this.draw(idx, shake, p);
    }

    if (this.readout) this.readout.textContent =
      `FRAME ${String(idx + 1).padStart(2, '0')} / ${this.count}`;

    /* phase captions */
    const ph = this.opts.phases;
    let cur = 0;
    for (let i = 0; i < ph.length; i++) if (p >= ph[i]) cur = i;
    this.phases.forEach((el, i) => el.classList.toggle('is-on', i === cur));

    /* per-element scroll parallax inside the sticky stage */
    if (!REDUCED) for (const el of this.pxEls){
      const k = parseFloat(el.dataset.px) || .1;
      el.style.transform = `translate3d(${(-view.nx * k * 34).toFixed(2)}px,${(-p * k * 420).toFixed(2)}px,0)`;
    }

    this.opts.onProgress && this.opts.onProgress(p, idx, shake);
  }

  draw(idx, shake, p){
    const img = this.seq[idx];
    const { ctx, w, h } = this;
    if (!w) return;
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, 0, w, h);
    if (!img || !img.complete || !img.naturalWidth) return;

    const jitter = REDUCED ? 0 : shake * 9;
    const ox = rand(-jitter, jitter);
    const oy = rand(-jitter, jitter);
    const scale = 1 + p * 0.06 + shake * 0.02 - view.nx * 0.004;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    cover(ctx, img, w, h, ox - view.nx * 14, oy - view.ny * 8, scale);

    /* cheap chromatic ghosting as the shake builds */
    if (shake > .05 && !REDUCED){
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = shake * .16;
      cover(ctx, img, w, h, ox + shake * 7, oy, scale);
      cover(ctx, img, w, h, ox - shake * 7, oy, scale);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

/* ─────────── ACT I — the wall / colossal titan ─────────── */
const wallSection = $('#wall');
const lockup      = $('#lockup');
const shockwave   = $('#shockwave');
const flashEl     = $('#globalFlash');
let shockFired = false;

const flashOnce = (strength = .5, ms = 90) => {
  if (REDUCED) return;
  flashEl.style.opacity = strength;
  setTimeout(() => { flashEl.style.opacity = 0; }, ms);
};

if (wallSection){
  new Scrub(wallSection, $('#wallCanvas'), wall.imgs, {
    phases: [0, .32, .60],
    shakeFrom: .46,
    readout: '#wallReadout',
    onProgress(p){
      lockup.style.opacity = (1 - inv(p, .04, .2)).toFixed(3);
      if (!shockFired && p > .62){
        shockFired = true;
        shockwave.classList.add('is-go');
        flashOnce(.34, 120);
      }
      if (p < .5) shockFired = false;
    }
  });
}

/* ─────────── ACT II — eren's transformation ─────────── */
const erenSection = $('#eren');
if (erenSection){
  let lastBolt = 0;
  new Scrub(erenSection, $('#erenCanvas'), eren.imgs, {
    phases: [0, .3, .58],
    shakeFrom: .28,
    readout: '#erenReadout',
    onProgress(p){
      const block = $('#erenblock');
      if (block) block.style.opacity = (1 - inv(p, .5, .78)).toFixed(3);
      const rate = lerp(1400, 210, p);
      const now = performance.now();
      if (p > .1 && now - lastBolt > rate){
        lastBolt = now;
        bolts.strike(p);
        if (Math.random() < p * .5) flashOnce(.2 + p * .25, 70);
      }
    }
  });
}

/* ════════════════════ STEAM (act I) ══════════════════════════ */
const steam = (() => {
  const cv = $('#steamCanvas'); if (!cv || REDUCED) return null;
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, parts = [];
  const spawn = () => ({
    x: rand(0, w), y: h + rand(0, 120), r: rand(28, 110),
    vy: rand(-.22, -.7), vx: rand(-.16, .16), life: 1, decay: rand(.0012, .003)
  });
  const resize = () => { [w, h] = fitCanvas(cv); };
  addEventListener('resize', resize, { passive: true }); resize();

  ticker.add(() => {
    const sec = $('#wall');
    const r = sec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > view.h){ if (parts.length) { parts = []; ctx.clearRect(0,0,w,h); } return; }
    const p = clamp(-r.top / Math.max(1, r.height - view.h));
    const want = Math.round(inv(p, .35, 1) * 46);
    while (parts.length < want) parts.push(spawn());
    ctx.clearRect(0, 0, w, h);
    for (let i = parts.length - 1; i >= 0; i--){
      const q = parts[i];
      q.x += q.vx; q.y += q.vy; q.r += .28; q.life -= q.decay;
      if (q.life <= 0 || q.y < -q.r){ parts.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
      g.addColorStop(0, `rgba(226,220,208,${(q.life * .12).toFixed(3)})`);
      g.addColorStop(1, 'rgba(226,220,208,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
    }
    if (parts.length > want) parts.length = want;
  });
  return true;
})();

/* ════════════════ LIGHTNING BOLTS (act II) ═══════════════════ */
const bolts = (() => {
  const cv = $('#boltCanvas');
  if (!cv) return { strike(){} };
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, live = [];
  const resize = () => { [w, h] = fitCanvas(cv); };
  addEventListener('resize', resize, { passive: true }); resize();

  const makePath = (x0, y0, x1, y1, spread) => {
    const pts = [[x0, y0]];
    const steps = 14;
    for (let i = 1; i < steps; i++){
      const t = i / steps;
      pts.push([
        lerp(x0, x1, t) + rand(-spread, spread) * (1 - Math.abs(t - .5) * 1.2),
        lerp(y0, y1, t) + rand(-spread * .3, spread * .3)
      ]);
    }
    pts.push([x1, y1]);
    return pts;
  };

  ticker.add(() => {
    if (!live.length){ if (w) ctx.clearRect(0, 0, w, h); return; }
    ctx.clearRect(0, 0, w, h);
    for (let i = live.length - 1; i >= 0; i--){
      const b = live[i];
      b.life -= .045;
      if (b.life <= 0){ live.splice(i, 1); continue; }
      const a = Math.pow(b.life, 1.6);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(180,225,255,${(a * .35).toFixed(3)})`;
      ctx.lineWidth = 9 * b.scale;
      ctx.beginPath(); b.pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.strokeStyle = `rgba(255,252,236,${a.toFixed(3)})`;
      ctx.lineWidth = 2.1 * b.scale;
      ctx.beginPath(); b.pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
  });

  return {
    strike(p = .5){
      if (REDUCED || !w) return;
      const fromLeft = Math.random() < .5;
      const x0 = fromLeft ? rand(-40, w * .28) : rand(w * .72, w + 40);
      const x1 = w * .5 + rand(-w * .12, w * .12);
      live.push({
        pts: makePath(x0, rand(-30, h * .18), x1, rand(h * .42, h * .82), rand(24, 70)),
        life: 1, scale: lerp(.6, 1.5, p)
      });
      if (live.length > 6) live.shift();
    }
  };
})();

/* ═══════════════════ AMBIENT DUST ════════════════════════════ */
(() => {
  const cv = $('#dustCanvas'); if (!cv || REDUCED) return;
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, motes = [];
  const resize = () => {
    [w, h] = fitCanvas(cv);
    const n = Math.round(clamp(w * h / 26000, 26, 90));
    motes = Array.from({ length: n }, () => ({
      x: rand(0, w), y: rand(0, h), r: rand(.4, 1.7),
      vx: rand(-.12, .12), vy: rand(-.3, -.05), a: rand(.06, .3), z: rand(.2, 1)
    }));
  };
  addEventListener('resize', resize, { passive: true }); resize();
  ticker.add(() => {
    ctx.clearRect(0, 0, w, h);
    for (const m of motes){
      m.x += m.vx + view.nx * m.z * .5 - view.velocity * .004 * m.z;
      m.y += m.vy - view.velocity * .05 * m.z;
      if (m.y < -8) { m.y = h + 8; m.x = rand(0, w); }
      if (m.y > h + 8) { m.y = -8; m.x = rand(0, w); }
      if (m.x < -8) m.x = w + 8; if (m.x > w + 8) m.x = -8;
      ctx.fillStyle = `rgba(233,226,210,${m.a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
    }
  });
})();

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — ScrollVelocity
   Marquee whose speed and direction follow scroll velocity.
   ══════════════════════════════════════════════════════════════ */
$$('[data-velocity]').forEach(row => {
  const track = $('.velocity__track', row);
  const dir   = parseFloat(row.dataset.velocity) || 1;
  const base  = 0.55;
  let x = 0, wSpan = 0;

  const clone = () => {
    const src = track.querySelector('span').textContent;
    track.innerHTML = '';
    const one = document.createElement('span'); one.textContent = src;
    track.appendChild(one);
    wSpan = one.getBoundingClientRect().width;
    const need = Math.ceil(innerWidth / Math.max(1, wSpan)) + 2;
    for (let i = 0; i < need; i++) track.appendChild(one.cloneNode(true));
  };
  clone();
  addEventListener('resize', () => { clone(); x = 0; }, { passive: true });

  ticker.add((dt) => {
    const r = row.getBoundingClientRect();
    if (r.bottom < 0 || r.top > view.h) return;
    const speed = (base + Math.abs(view.velocity) * .09) * (dt / 16.67);
    x -= speed * dir * (view.velocity < -1 ? -1 : 1);
    if (wSpan){ if (x <= -wSpan) x += wSpan; if (x >= 0) x -= wSpan; }
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  });
});

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — SplitText  +  scroll reveal
   ══════════════════════════════════════════════════════════════ */
$$('[data-split]').forEach(el => {
  const html = el.innerHTML.split('<br>').map(line =>
    line.trim().split(/(\s+)/).map(tok =>
      tok.trim() ? `<span class="word"><i>${tok}</i></span>` : tok
    ).join('')
  ).join('<br>');
  el.innerHTML = html;
  $$('.word i', el).forEach((w, i) => w.style.setProperty('--i', i));
});

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
  });
}, { threshold: .25, rootMargin: '0px 0px -8% 0px' });
$$('[data-split],[data-reveal],.ring').forEach(el => io.observe(el));

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — DecryptedText
   ══════════════════════════════════════════════════════════════ */
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ巨人壁自由翼血肉0123456789';
$$('[data-decrypt]').forEach(el => {
  const target = el.dataset.decrypt;
  const chars  = [...target];
  let started = false;
  const run = () => {
    if (started || REDUCED) return; started = true;
    let step = 0;
    const total = chars.length * 3 + 14;
    const id = setInterval(() => {
      step++;
      const settled = Math.floor((step / total) * chars.length * 1.25);
      el.textContent = chars.map((c, i) =>
        (i < settled || c === ' ') ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      ).join('');
      if (step >= total){ clearInterval(id); el.textContent = target; }
    }, 34);
  };
  new IntersectionObserver((es, o) => {
    es.forEach(e => { if (e.isIntersecting){ run(); o.disconnect(); } });
  }, { threshold: .4 }).observe(el);
});

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — CountUp
   ══════════════════════════════════════════════════════════════ */
$$('[data-count]').forEach(el => {
  const to = parseFloat(el.dataset.count) || 0;
  const suffix = el.dataset.suffix || '';
  el.textContent = '0' + suffix;
  new IntersectionObserver((es, o) => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      o.disconnect();
      if (REDUCED){ el.textContent = to + suffix; return; }
      const t0 = performance.now(), dur = 1700;
      const step = (now) => {
        const t = clamp((now - t0) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(to * eased) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .5 }).observe(el);
});

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — SpotlightCard
   ══════════════════════════════════════════════════════════════ */
$$('[data-spotlight]').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — TiltedCard
   ══════════════════════════════════════════════════════════════ */
if (!COARSE && !REDUCED) $$('[data-tilt]').forEach(card => {
  let rx = 0, ry = 0, trx = 0, try_ = 0, frame = 0;
  const tick = () => {
    frame = 0;
    rx = lerp(rx, trx, .12); ry = lerp(ry, try_, .12);
    card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    if (Math.abs(trx - rx) > .02 || Math.abs(try_ - ry) > .02) schedule();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5;
    const py = (e.clientY - r.top) / r.height - .5;
    trx = -py * 9; try_ = px * 9; schedule();
  });
  card.addEventListener('pointerleave', () => { trx = 0; try_ = 0; schedule(); });
});

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — Magnet
   ══════════════════════════════════════════════════════════════ */
if (!COARSE && !REDUCED) $$('[data-magnet]').forEach(el => {
  const PULL = 26, FIELD = 110;
  let x = 0, y = 0, tx = 0, ty = 0, frame = 0;
  const tick = () => {
    frame = 0;
    x = lerp(x, tx, .16); y = lerp(y, ty, .16);
    el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    if (Math.abs(tx - x) > .05 || Math.abs(ty - y) > .05) schedule();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };
  addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d < Math.max(r.width, r.height) / 2 + FIELD){
      const k = 1 - d / (Math.max(r.width, r.height) / 2 + FIELD);
      tx = (dx / (r.width / 2)) * PULL * k;
      ty = (dy / (r.height / 2)) * PULL * k;
    } else { tx = 0; ty = 0; }
    schedule();
  }, { passive: true });
});

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — ClickSpark
   ══════════════════════════════════════════════════════════════ */
if (!REDUCED) addEventListener('pointerdown', (e) => {
  const N = 9, R = 46;
  const cv = document.createElement('canvas');
  const S = 160;
  cv.width = S * DPR; cv.height = S * DPR;
  cv.className = 'spark';
  cv.style.cssText = `left:${e.clientX - S / 2}px;top:${e.clientY - S / 2}px;width:${S}px;height:${S}px`;
  document.body.appendChild(cv);
  const c = cv.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const t0 = performance.now(), DUR = 460;
  const step = (now) => {
    const t = clamp((now - t0) / DUR);
    const eased = 1 - Math.pow(1 - t, 3);
    c.clearRect(0, 0, S, S);
    c.strokeStyle = '#d4491f'; c.lineWidth = 1.6; c.lineCap = 'round';
    for (let i = 0; i < N; i++){
      const a = (i / N) * 6.283;
      const r0 = 6 + eased * R, r1 = r0 + 10 * (1 - eased);
      c.globalAlpha = 1 - t;
      c.beginPath();
      c.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
      c.lineTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1);
      c.stroke();
    }
    if (t < 1) requestAnimationFrame(step); else cv.remove();
  };
  requestAnimationFrame(step);
}, { passive: true });

/* ══════════════════════════════════════════════════════════════
   ACT III — top / bottom cursor-trail reveal
   The base plate is always visible; the second plate is carved
   out of the darkness by a trailing, feathered spotlight.
   ══════════════════════════════════════════════════════════════ */
(() => {
  const stage = $('#revealStage'); if (!stage) return;
  const cv = $('#revealCanvas');
  const ctx = cv.getContext('2d');
  const hint = $('#revealHint');
  const missing = $('#revealMissing');
  const off = document.createElement('canvas');
  const offc = off.getContext('2d');

  const TRAIL = 46;
  const OVERLAY = 'rgba(6,6,9,0.5)';
  let w = 0, h = 0, radius = 220;
  let trail = [], mx = -9999, my = -9999, sx = -9999, sy = -9999;
  let baseImg = null, topImg = null, engaged = false;
  let gate = 0, gateTarget = 1;   // collapses the spotlight instead of letting it streak away

  const resize = () => {
    const r = stage.getBoundingClientRect();
    w = r.width; h = r.height;
    cv.width = w * DPR; cv.height = h * DPR;
    off.width = w * DPR; off.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    offc.setTransform(DPR, 0, 0, DPR, 0, 0);
    radius = Math.max(170, Math.min(w, h) * .34);
  };
  addEventListener('resize', resize, { passive: true });

  const point = (cx, cy) => {
    const r = stage.getBoundingClientRect();
    mx = cx - r.left; my = cy - r.top;
    gateTarget = 1;
    if (!engaged){ engaged = true; sx = mx; sy = my; hint.classList.add('is-gone'); }
  };
  stage.addEventListener('pointermove', e => point(e.clientX, e.clientY));
  stage.addEventListener('pointerleave', () => { gateTarget = 0; });
  addEventListener('blur', () => { gateTarget = 0; });

  /* on touch, sweep the spotlight automatically so the idea still lands */
  let autoT = 0;
  const auto = () => {
    autoT += .012;
    mx = w * (.5 + Math.sin(autoT) * .3);
    my = h * (.5 + Math.cos(autoT * .78) * .22);
    if (sx < -1000){ sx = mx; sy = my; }
  };

  /* build a desaturated, blood-tinted stand-in until bottom.jpg lands */
  const makeFallback = (src) => {
    const c = document.createElement('canvas');
    c.width = src.naturalWidth; c.height = src.naturalHeight;
    const g = c.getContext('2d');
    g.filter = 'grayscale(1) contrast(1.25) brightness(.52)';
    g.drawImage(src, 0, 0);
    g.filter = 'none';
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#6d2a1c';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  };

  let raf = null;
  const draw = () => {
    const r = stage.getBoundingClientRect();
    if (r.bottom < -40 || r.top > view.h + 40) return;
    if (!w) resize();
    if (COARSE || !engaged){ auto(); gateTarget = 1; }

    gate = lerp(gate, gateTarget, .12);
    sx = lerp(sx, mx, .14); sy = lerp(sy, my, .14);
    trail.unshift({ x: sx, y: sy });
    if (trail.length > TRAIL) trail.length = TRAIL;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#07080a'; ctx.fillRect(0, 0, w, h);
    if (baseImg) cover(ctx, baseImg, w, h, -view.nx * 18, -view.ny * 12, 1.06);
    ctx.fillStyle = OVERLAY; ctx.fillRect(0, 0, w, h);

    /* carve the trail, then fill it with the second plate */
    offc.clearRect(0, 0, w, h);
    offc.globalCompositeOperation = 'source-over';
    for (let i = 0; i < trail.length; i++){
      const t = 1 - i / trail.length;
      const rr = radius * (.22 + .78 * t) * gate;
      if (rr < .5) continue;
      offc.beginPath();
      offc.arc(trail[i].x, trail[i].y, rr, 0, 6.283);
      offc.fillStyle = `rgba(0,0,0,${Math.pow(t, 1.5).toFixed(3)})`;
      offc.fill();
    }
    offc.globalCompositeOperation = 'source-in';
    if (topImg) cover(offc, topImg, w, h, view.nx * 26, view.ny * 16, 1.06);
    offc.globalCompositeOperation = 'source-atop';
    offc.fillStyle = 'rgba(10,4,4,0.28)'; offc.fillRect(0, 0, w, h);
    offc.globalCompositeOperation = 'source-over';
    ctx.drawImage(off, 0, 0, w, h);

    /* ember glow at the head of the trail */
    if (trail.length && gate > .02){
      const head = trail[0], rr = radius * 1.4 * gate;
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, rr);
      g.addColorStop(0, `rgba(255,196,140,${(0.22 * gate).toFixed(3)})`);
      g.addColorStop(.45, `rgba(212,73,31,${(0.10 * gate).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(head.x, head.y, rr, 0, 6.283); ctx.fill();
    }
  };

  /* load the plates: bottom.jpg is the base, top.jpg is revealed */
  const top = new Image(); top.decoding = 'async';
  const bottom = new Image(); bottom.decoding = 'async';
  let pending = 2;
  const start = () => { if (--pending === 0){ resize(); ticker.add(draw); } };

  top.onload = () => { topImg = top; start(); };
  top.onerror = start;
  bottom.onload = () => { baseImg = bottom; start(); };
  bottom.onerror = () => {
    /* bottom.jpg not supplied yet — derive a plate so the act still reads */
    missing.hidden = false;
    if (top.complete && top.naturalWidth) baseImg = makeFallback(top);
    else top.addEventListener('load', () => { baseImg = makeFallback(top); }, { once: true });
    start();
  };
  top.src = 'assets/reveal/top.jpg';
  bottom.src = 'assets/reveal/bottom.jpg';
})();

/* ══════════════════════════════════════════════════════════════
   reactbits.dev — Aurora  (ported to raw WebGL)
   ══════════════════════════════════════════════════════════════ */
(() => {
  const cv = $('#auroraCanvas'); if (!cv) return;
  const gl = cv.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
          || cv.getContext('experimental-webgl');
  if (!gl){
    cv.style.background = 'radial-gradient(70% 60% at 50% 100%, rgba(142,27,27,.5), transparent 70%)';
    return;
  }

  const VERT = `
    attribute vec2 aPos;
    void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform float uAmp;
    uniform vec3  uA, uB, uC;

    vec3 hash3(vec2 p){
      vec3 q = vec3(dot(p, vec2(127.1, 311.7)),
                    dot(p, vec2(269.5, 183.3)),
                    dot(p, vec2(419.2, 371.9)));
      return fract(sin(q) * 43758.5453);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash3(i).x, b = hash3(i + vec2(1.0, 0.0)).x;
      float c = hash3(i + vec2(0.0, 1.0)).x, d = hash3(i + vec2(1.0, 1.0)).x;
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
      return v;
    }

    vec3 ramp(float t){
      t = clamp(t, 0.0, 1.0);
      return t < 0.5 ? mix(uA, uB, t * 2.0) : mix(uB, uC, (t - 0.5) * 2.0);
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 p  = vec2(uv.x * 2.4, uv.y);

      float t = uTime * 0.06;
      float curtain = fbm(vec2(p.x * 1.7 + t, p.y * 0.7 - t * 0.6));
      curtain += 0.5 * fbm(vec2(p.x * 3.4 - t * 1.4, p.y * 1.3 + t));

      // aurora rises from the bottom edge
      float height = 0.30 + curtain * 0.42 * uAmp;
      float band   = smoothstep(height, height - 0.34, uv.y);
      band *= smoothstep(0.0, 0.22, uv.y);

      float shimmer = 0.72 + 0.28 * sin(p.x * 9.0 + uTime * 0.8 + curtain * 6.0);
      vec3  col = ramp(uv.y / max(height, 0.001) * 0.9 + curtain * 0.2) * band * shimmer;

      // ember sparks drifting up through it
      float sp = fbm(vec2(p.x * 22.0, p.y * 22.0 - uTime * 0.9));
      col += vec3(1.0, 0.42, 0.12) * pow(smoothstep(0.78, 1.0, sp), 3.0) * band * 0.8;

      float alpha = clamp(band * 0.95 + length(col) * 0.25, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
      console.warn('aurora shader:', gl.getShaderInfoLog(s)); return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uTime = U('uTime'), uAmp = U('uAmp');
  gl.uniform3f(U('uA'), 0.36, 0.06, 0.06);   // blood
  gl.uniform3f(U('uB'), 0.83, 0.29, 0.12);   // ember
  gl.uniform3f(U('uC'), 0.78, 0.64, 0.30);   // gold

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const resize = () => {
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * Math.min(DPR, 1.5)));
    const h = Math.max(1, Math.round(r.height * Math.min(DPR, 1.5)));
    if (cv.width !== w || cv.height !== h){
      cv.width = w; cv.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
  };
  addEventListener('resize', resize, { passive: true }); resize();

  const section = $('#end');
  let t = 0;
  ticker.add((dt) => {
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > view.h) return;
    resize();
    if (!REDUCED) t += dt / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform1f(uAmp, 0.85 + Math.abs(view.velocity) * 0.006);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
})();

/* ═══════════════════ FINALE BUTTONS ══════════════════════════ */
$$('.finale__cta .btn').forEach((b, i) => {
  b.addEventListener('click', () => {
    if (i === 1) scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    else { flashOnce(.55, 120); bolts.strike(1); setTimeout(() => flashOnce(.3, 80), 150); }
  });
});

/* ═══════════════════ SMOOTH ANCHORS ══════════════════════════ */
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = $(a.getAttribute('href'));
  if (!t) return;
  e.preventDefault();
  scrollTo({ top: t.offsetTop, behavior: REDUCED ? 'auto' : 'smooth' });
}));

})();
