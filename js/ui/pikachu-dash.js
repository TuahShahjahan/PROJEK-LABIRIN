/* ===== EASTER EGG · PIKACHU DASH =====*/

import { TILE_SIZE as TS } from '../data/config.js';
import { getCharacterImage } from '../data/sprites.js';
import { game } from '../logic/state.js';
import { sfx } from './sfx.js';

const MAX_STEP_MS = 80;                              // = kecepatan "CEPAT" di SPEEDS (config.js)
const DIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
const YELLOW = '#ffe14a', ORANGE = '#ffb02e', WHITE = '#ffffff', WIND = '#d6f3ff';
const DUST = ['#fffaf0', '#f3ead2', '#fffaf0', '#c9b98f', '#9c8b60']; // ada yang terang dan ada yang gelap supaya terbaca di lantai pasir
const SIZE = TS * 1.25;                              // ukuran sprite (sama dengan drawPlayer)
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

const st = {
  on: false, S: null, last: 0, k: 0,                 // k = seberapa "ngebut" sekarang (0..1, halus)
  moving: false, hist: [], node: null, pop: null, dir: DIR.d, dname: 'd', imp: null,
  dust: [], sparks: [], arcs: [], skid: [],
  shakeAmp: 0, shakeT0: 0, shaking: false, sparkAcc: 0, arcAcc: 0,
};

const isActive = () => game.character === 'pikachu' && game.stepMs <= MAX_STEP_MS;

function reset(S) {
  st.S = S; st.k = 0; st.hist.length = 0; st.dust.length = 0; st.sparks.length = 0; st.arcs.length = 0; st.skid.length = 0;
  st.node = S ? S.last : null; st.pop = S ? S.pop : null; st.imp = null; st.shakeAmp = 0;
}

/** Posisi pemain (satuan tile), mengikuti interpolasi yang sama dengan drawPlayer. */
function pos(S, ts) {
  let px = S.px, py = S.py;
  if (S.mv) {
    const t = Math.min(1, (ts - S.mv.t0) / S.mv.dur);
    px = S.mv.fx + (S.mv.tx - S.mv.fx) * t;
    py = S.mv.fy + (S.mv.ty - S.mv.fy) * t;
  }
  return [px, py];
}
const bodyXY = (px, py) => [px * TS + TS / 2, py * TS + TS * 0.55];

/** Titik riwayat gerak pada waktu t (atau yang terdekat). */
function histAt(t) {
  const h = st.hist;
  for (let i = 0; i < h.length; i++) if (h[i].t >= t) return h[i];
  return h[h.length - 1];
}

const tintCache = new Map();
function tinted(img, color) {
  const key = `${img.src}|${color}`;
  let c = tintCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    tintCache.set(key, c);
  }
  return c;
}

/* ---------- Impact: rem, getar, debu, bekas rem, cincin petir ---------- */

function impact(ts, px, py, p, d) {
  const x = px * TS + TS / 2, fy = py * TS + TS - 4, [bx, by] = bodyXY(px, py);
  st.imp = { t0: ts, p, dx: d[0], dy: d[1] };
  try { sfx.brake?.(); } catch { /* abaikan */ }
  st.shakeAmp = 2.6 * p; st.shakeT0 = ts;

  // debu terhempas: searah lari dengan sebaran, naik pelan, membesar lalu memudar
  const n = Math.round((reduced ? 7 : 18) * p), base = Math.atan2(d[1], d[0]);
  for (let i = 0; i < n; i++) {
    const a = base + (Math.random() - 0.5) * 2.2, v = 40 + Math.random() * 170 * p;
    st.dust.push({
      x: x + (Math.random() - 0.5) * 12 - d[0] * 4, y: fy + (Math.random() - 0.5) * 6,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - (20 + Math.random() * 40), t0: ts,
      life: 380 + Math.random() * 400, sz: 3 + Math.random() * 5, col: DUST[(Math.random() * DUST.length) | 0],
    });
  }
  // bekas rem: dua garis sejajar di tanah di belakang titik berhenti
  const L = TS * 0.85 * p, nx = -d[1], ny = d[0];
  for (const side of [-1, 1]) {
    st.skid.push({ x0: x - d[0] * L + nx * side * 5, y0: fy - d[1] * L + ny * side * 5 - 2, x1: x + nx * side * 5, y1: fy + ny * side * 5 - 2, t0: ts });
  }
  // cincin petir + cincin debu di lantai
  st.arcs.push({ kind: 'ring', x: bx, y: by, t0: ts, life: 170 });
  st.arcs.push({ kind: 'floor', x, y: fy, t0: ts, life: 380 });
  if (st.skid.length > 12) st.skid.splice(0, st.skid.length - 12);
}

/* ---------- Pembaruan per frame (panggil sebelum menggambar) ---------- */

function update(ctx, S, ts) {
  if (!S || !isActive()) {
    if (st.shaking) { ctx.canvas.style.transform = ''; st.shaking = false; }
    st.on = false;
    if (st.S) reset(null);
    return;
  }
  st.on = true;
  if (st.S !== S) reset(S);
  const dt = st.last ? Math.min(0.05, (ts - st.last) / 1000) : 0.016;
  st.last = ts;

  const moving = !S.over && !!(S.mv || S.steps.length);
  const [px, py] = pos(S, ts);
  st.dir = DIR[S.dir] || DIR.d; st.dname = DIR[S.dir] ? S.dir : 'd';

  // mulai ngebut -> suara dash (sfx.dash ada di sfx.js; bila belum ditambahkan, dilewati diam-diam)
  if (moving && !st.moving && st.k < 0.3) { try { sfx.dash?.(); } catch { /* abaikan */ } }
  st.moving = moving;

  if (moving) st.hist.push({ px, py, t: ts });
  while (st.hist.length && ts - st.hist[0].t > (moving ? 260 : 160)) st.hist.shift();
  st.k += ((moving ? 1 : 0) - st.k) * (1 - Math.exp(-dt * (moving ? 9 : 14)));

  // sampai di titik -> rem (node berganti), memantul karena siklus -> rem kecil
  if (S.last !== st.node) {
    if (st.k > 0.2) impact(ts, S.px, S.py, 1, st.dir);
    st.node = S.last;
  }
  if (S.pop !== st.pop) {
    st.pop = S.pop;
    if (S.pop && S.pop.text === 'SIKLUS!') impact(ts, px, py, 0.6, [-st.dir[0], -st.dir[1]]);
  }

  // partikel baru saat ngebut
  if (st.k > 0.25 && moving) {
    const [bx, by] = bodyXY(px, py), d = st.dir, nx = -d[1], ny = d[0];
    st.sparkAcc += dt * (reduced ? 25 : 90) * st.k;
    while (st.sparkAcc >= 1) {
      st.sparkAcc -= 1;
      const side = (Math.random() - 0.5) * 120;
      st.sparks.push({ x: bx + (Math.random() - 0.5) * 12, y: by + (Math.random() - 0.5) * 12, vx: -d[0] * (40 + Math.random() * 90) + nx * side, vy: -d[1] * (40 + Math.random() * 90) + ny * side, t0: ts, life: 220 + Math.random() * 260, col: Math.random() < 0.5 ? YELLOW : WHITE });
    }
    if (!reduced) {
      st.arcAcc += dt * 14 * st.k;
      while (st.arcAcc >= 1) {
        st.arcAcc -= 1;
        st.arcs.push({ kind: 'wind', x: bx, y: by, ang: Math.atan2(d[1], d[0]), side: Math.random() < 0.5 ? -1 : 1, r: 14 + Math.random() * 12, t0: ts, life: 260 });
      }
    }
  }

  // fisika & umur partikel
  for (let i = st.dust.length - 1; i >= 0; i--) {
    const p = st.dust[i];
    if (ts - p.t0 >= p.life) { st.dust.splice(i, 1); continue; }
    p.vx *= Math.exp(-dt * 4); p.vy *= Math.exp(-dt * 4);
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = st.sparks.length - 1; i >= 0; i--) {
    const p = st.sparks[i];
    if (ts - p.t0 >= p.life) { st.sparks.splice(i, 1); continue; }
    p.vx *= Math.exp(-dt * 3); p.vy *= Math.exp(-dt * 3);
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = st.arcs.length - 1; i >= 0; i--) if (ts - st.arcs[i].t0 >= st.arcs[i].life) st.arcs.splice(i, 1);
  for (let i = st.skid.length - 1; i >= 0; i--) if (ts - st.skid[i].t0 > 700) st.skid.splice(i, 1);
  if (st.dust.length > 120) st.dust.splice(0, st.dust.length - 120);
  if (st.sparks.length > 90) st.sparks.splice(0, st.sparks.length - 90);

  // layar getar ringan (CSS transform pada canvas)
  const a = ts - st.shakeT0;
  if (!reduced && st.shakeAmp > 0 && a < 240) {
    const q = Math.exp(-a / 70) * st.shakeAmp, d = st.dir;
    const sx = (Math.sin(a / 9) * 0.7 + (Math.random() - 0.5) * 0.6) * q * (d[0] ? 1 : 0.45);
    const sy = (Math.sin(a / 11) * 0.7 + (Math.random() - 0.5) * 0.6) * q * (d[1] ? 1 : 0.45);
    ctx.canvas.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px)`;
    st.shaking = true;
  } else if (st.shaking) {
    ctx.canvas.style.transform = '';
    st.shaking = false;
  }
}

/* ---------- Di BELAKANG Pikachu: bekas rem, cahaya, bayangan, petir, garis angin ---------- */

function drawBehind(ctx, S, ts) {
  if (!st.on) return;
  const [px, py] = pos(S, ts), [bx, by] = bodyXY(px, py), d = st.dir, k = st.k, nx = -d[1], ny = d[0];
  ctx.save();

  // bekas rem di tanah
  ctx.lineCap = 'round';
  for (const s of st.skid) {
    const a = 1 - (ts - s.t0) / 700;
    ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = '#8a7442'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (k > 0.05) {
    ctx.globalCompositeOperation = 'lighter';

    // cahaya kuning di badan
    const gr = ctx.createRadialGradient(bx, by, 0, bx, by, TS * 0.95);
    gr.addColorStop(0, `rgba(255,225,74,${(0.45 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,225,74,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(bx - TS, by - TS, TS * 2, TS * 2);

    // bayangan kuning (afterimage)
    const img = getCharacterImage('pikachu', st.dname);
    if (img && img.naturalWidth && st.hist.length > 1) {
      const tc = tinted(img, YELLOW);
      for (const age of [45, 90, 135, 180, 225]) {
        const h = histAt(ts - age);
        if (!h) continue;
        ctx.globalAlpha = 0.5 * k * (1 - age / 260);
        ctx.drawImage(tc, h.px * TS + TS / 2 - SIZE / 2, h.py * TS + TS - SIZE + 2, SIZE, SIZE);
      }
      ctx.globalAlpha = 1;
    }

    // trail PETIR zig-zag (berkedip tiap ±45 ms)
    if (st.hist.length > 3) {
      const seed = Math.floor(ts / 45), pts = [];
      for (const age of [0, 30, 60, 90, 125, 160, 200, 245]) {
        const h = histAt(ts - age);
        if (h) pts.push(bodyXY(h.px, h.py));
      }
      const path = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], j = (hash(seed, i) - 0.5) * 16 * k;
        path.push([(x0 + x1) / 2 + nx * j, (y0 + y1) / 2 + ny * j], [x1, y1]);
      }
      const trace = () => { ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = ORANGE; ctx.globalAlpha = 0.5 * k; ctx.lineWidth = 7; trace();
      ctx.strokeStyle = YELLOW; ctx.globalAlpha = 0.9 * k; ctx.lineWidth = 3.5; trace();
      ctx.strokeStyle = WHITE; ctx.globalAlpha = k; ctx.lineWidth = 1.4; trace();
      // cabang kecil
      ctx.strokeStyle = YELLOW; ctx.lineWidth = 2; ctx.globalAlpha = 0.85 * k;
      for (let f = 0; f < 3; f++) {
        const [sx, sy] = pts[1 + ((hash(seed, 40 + f) * (pts.length - 1)) | 0) % (pts.length - 1)], dir = hash(seed, 50 + f) < 0.5 ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        for (let s = 1; s <= 3; s++) ctx.lineTo(sx + nx * dir * s * 6 + (hash(seed, 60 + f * 3 + s) - 0.5) * 8 - d[0] * s * 3, sy + ny * dir * s * 6 + (hash(seed, 70 + f * 3 + s) - 0.5) * 8 - d[1] * s * 3);
        ctx.stroke();
      }
    }

    // garis tebasan angin (garis kecepatan) di belakang & samping
    ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = WIND; ctx.lineWidth = 1.2; ctx.lineCap = 'butt';
    const wseed = Math.floor(ts / 55);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const off = (hash(wseed, i + 20) - 0.5) * TS * 1.0, back = 8 + hash(wseed, i + 30) * 34, len = 26 + hash(wseed, i + 40) * 52;
      const sx = bx - d[0] * back + nx * off, sy = by - d[1] * back + ny * off;
      ctx.moveTo(sx, sy); ctx.lineTo(sx - d[0] * len, sy - d[1] * len);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Membungkus gambar Pikachu: condong saat ngebut, rem & gepeng saat berhenti ---------- */

function wrapPlayer(ctx, S, ts, fn) {
  if (!st.on) { fn(); return; }
  const [px, py] = pos(S, ts), x = px * TS + TS / 2, fy = py * TS + TS - 4, d = st.dir, horiz = d[0] !== 0, k = st.k;
  let ox = 0, oy = 0, rot = 0, sx = 1, sy = 1;

  if (k > 0.02) { // meluncur: condong ke depan dan sedikit memanjang
    rot += d[0] * 0.14 * k;
    if (horiz) { sx *= 1 + 0.12 * k; sy *= 1 - 0.06 * k; } else { sy *= 1 + 0.1 * k; sx *= 1 - 0.06 * k; }
  }
  const im = st.imp;
  if (im && ts - im.t0 < 420) { // rem: meluncur sedikit lewat titik lalu kembali, gepeng, condong ke belakang
    const a = ts - im.t0, brake = Math.sin(Math.min(1, a / 240) * Math.PI) * 0.2 * TS * im.p, sq = Math.exp(-a / 110) * im.p;
    ox += im.dx * brake; oy += im.dy * brake;
    if (horiz) { sx *= 1 - 0.2 * sq; sy *= 1 + 0.16 * sq; } else { sy *= 1 - 0.2 * sq; sx *= 1 + 0.16 * sq; }
    rot -= im.dx * 0.2 * sq;
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.translate(x, fy); ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-x, -fy);
  fn();
  ctx.restore();
}

/* ---------- Di DEPAN Pikachu: busur listrik, percikan, sabit angin, debu, cincin ---------- */

function drawFront(ctx, S, ts) {
  if (!st.on) return;
  const [px, py] = pos(S, ts), [bx, by] = bodyXY(px, py), k = st.k, seed = Math.floor(ts / 45);
  ctx.save();

  // debu terhempas (membesar sambil memudar)
  for (const p of st.dust) {
    const q = (ts - p.t0) / p.life, s = p.sz * (1 + q * 1.4);
    ctx.globalAlpha = (1 - q) * 0.9; ctx.fillStyle = p.col;
    ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.round(s), Math.round(s));
  }
  ctx.globalAlpha = 1;

  // cincin & sabit
  ctx.lineCap = 'round';
  for (const a of st.arcs) {
    const q = (ts - a.t0) / a.life;
    if (a.kind === 'floor') { // cincin debu melebar di lantai
      ctx.globalAlpha = (1 - q) * 0.8; ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.5 * (1 - q) + 0.5;
      ctx.beginPath(); ctx.ellipse(a.x, a.y, 6 + q * TS * 0.95, 3 + q * TS * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (a.kind === 'ring') { // 8 petir pendek memancar
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - q; ctx.strokeStyle = YELLOW; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 + hash(seed, i) * 0.5, r0 = 8 + q * 10, r1 = 16 + q * 26, mj = (hash(seed, i + 9) - 0.5) * 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x + Math.cos(ang) * r0, a.y + Math.sin(ang) * r0);
        ctx.lineTo(a.x + Math.cos(ang + mj) * (r0 + r1) / 2, a.y + Math.sin(ang + mj) * (r0 + r1) / 2);
        ctx.lineTo(a.x + Math.cos(ang) * r1, a.y + Math.sin(ang) * r1);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (a.kind === 'wind') { // sabit angin: busur putih-biru yang melebar
      const r = a.r + q * 26, cx = a.x - Math.cos(a.ang) * (10 + q * 30), cy = a.y - Math.sin(a.ang) * (10 + q * 30) + a.side * 8;
      ctx.globalAlpha = (1 - q) * 0.8; ctx.strokeStyle = WIND; ctx.lineWidth = 2 * (1 - q) + 0.6;
      ctx.beginPath(); ctx.arc(cx, cy, r, a.ang + Math.PI - 0.8, a.ang + Math.PI + 0.8); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = 'lighter';
  // percikan listrik
  for (const p of st.sparks) {
    const q = (ts - p.t0) / p.life;
    ctx.globalAlpha = 1 - q; ctx.fillStyle = p.col;
    ctx.fillRect(Math.round(p.x - 1.5), Math.round(p.y - 1.5), 3, 3);
  }
  // busur listrik di sekitar badan saat ngebut
  if (k > 0.25) {
    ctx.lineWidth = 1.6; ctx.lineJoin = 'miter';
    for (let b = 0; b < 3; b++) {
      const a0 = hash(seed, b + 80) * Math.PI * 2;
      ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = b % 2 ? WHITE : YELLOW;
      ctx.beginPath();
      for (let s = 0; s < 4; s++) {
        const r = TS * 0.5 + (hash(seed, b * 7 + s + 90) - 0.5) * 8, a = a0 + s * 0.35;
        if (s) ctx.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r); else ctx.moveTo(bx + Math.cos(a) * r, by + Math.sin(a) * r);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

export const pikachuDash = { isActive, update, drawBehind, wrapPlayer, drawFront };