/* ===== CUTSCENE KEMENANGAN · LEVEL 8 LEGEND =====*/
import { getCharacterImage } from '../data/sprites.js';
import { createCineAudio } from './victory-audio.js';
import { createStarCursor } from './victory-cursor.js';
import { createSmashAudio } from './victory-smash-audio.js';
import { createSlashAudio } from './victory-slash-audio.js';

/* ---------- Util ---------- */

const W = 480; // lebar kanvas internal (tinggi dihitung dari layar)
const TAU = Math.PI * 2;
const FONT = '"Press Start 2P", monospace';
const C = {
  gold: '#ffd83b', gold2: '#f2b705', pale: '#fff3b0', white: '#ffffff',
  blue: '#35609e', navy: '#243d63', cyan: '#7fd8ff', electric: '#4ab3ff',
};

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const decay = (s, tau) => (s < 0 ? 0 : Math.exp(-s / tau));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const E = {
  in2: (t) => t * t,
  in3: (t) => t * t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  out3: (t) => 1 - (1 - t) ** 3,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
};
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const MIX = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
};

/* ---------- Timeline ---------- */

const T_IMPACT = 2300, T_STARS = 2750;
const SN = { a: 900, f0: 1000, f1: 1650 };   // Snorlax: antisipasi, terbang, mendarat
const PK = { a: 1100, d0: 1180, d1: 1700 };  // Pikachu: antisipasi, dash zig-zag, selesai
const SQ = { a: 1300, f0: 1380, f1: 2050 };  // Squirtle: antisipasi, terbang, mendarat

const CHARGE = [700, 760, 840, 960, 1300];
const LAUNCH = [280, 270, 260, 250, 300];
const HOLD = [220, 220, 220, 240, 700];
const STAR = [];
let acc = T_STARS;
for (let i = 0; i < 5; i++) {
  const tl = acc + CHARGE[i], ti = tl + LAUNCH[i];
  STAR.push({ t0: acc, tl, ti });
  acc = ti + HOLD[i];
}
const TV = acc;                 // awal reveal VICTORY
const GAP = 110;                // jeda antar huruf
const TS0 = TV + 450;           // huruf pertama menghantam
const TM = TS0 + 6 * GAP + 190; // mega impact (kata lengkap)
const TEND = TM + 2800;         // tombol ULANGI / MENU muncul; adegan terus berulang setelah ini
const IMPACTS = [T_IMPACT, ...STAR.map((s) => s.ti), TM];

/* ---------- Primitif pixel (semua pakai fillRect = tepi tajam) ---------- */

let g = null; // context aktif
let CLIP0 = -1e9, CLIP1 = 1e9; // baris di luar rentang ini tidak digambar (hemat fillRect)

const rect = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));

function pxCircle(cx, cy, r) {
  r = Math.round(r); cx = Math.round(cx); cy = Math.round(cy);
  if (r <= 0) { g.fillRect(cx, cy, 1, 1); return; }
  for (let dy = Math.max(-r, CLIP0 - cy); dy <= Math.min(r, CLIP1 - cy); dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    g.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

function pxEllipse(cx, cy, rx, ry) {
  rx = Math.round(rx); ry = Math.round(ry); cx = Math.round(cx); cy = Math.round(cy);
  if (rx < 1 || ry < 1) return;
  for (let dy = Math.max(-ry, CLIP0 - cy); dy <= Math.min(ry, CLIP1 - cy); dy++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    g.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

/** Cincin (elips) tajam; rx = ry untuk lingkaran. */
function pxRing(cx, cy, rx, ry, th) {
  cx = Math.round(cx); cy = Math.round(cy); rx = Math.round(rx); ry = Math.round(ry); th = Math.max(1, Math.round(th));
  if (rx < 2 || ry < 2) return;
  const rxi = Math.max(0, rx - th), ryi = Math.max(0, ry - th * (ry / rx));
  for (let dy = Math.max(-ry, CLIP0 - cy); dy <= Math.min(ry, CLIP1 - cy); dy++) {
    const w1 = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (ryi > 0.5 && Math.abs(dy) < ryi) {
      const w2 = Math.floor(rxi * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ryi * ryi))));
      const wd = Math.max(1, w1 - w2);
      g.fillRect(cx - w1, cy + dy, wd, 1);
      g.fillRect(cx + w1 - wd + 1, cy + dy, wd, 1);
    } else g.fillRect(cx - w1, cy + dy, w1 * 2 + 1, 1);
  }
}

function pxLine(x0, y0, x1, y1, th = 1) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (dx * i) / n), Math.round(y0 + (dy * i) / n), th, th);
}

/** Cahaya berpita (bertingkat, bukan gradien halus → tetap pixel-art). */
function glow(x, y, r, col, a, steps = 5) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = col;
  for (let i = 0; i < steps; i++) {
    g.globalAlpha = clamp((a / steps) * 1.4);
    pxCircle(x, y, r * (1 - i / steps));
  }
  g.restore();
}

function drawSprite(cv, x, y, s = 1, rot = 0, alpha = 1) {
  const w = cv.width * s, h = cv.height * s;
  if (w < 1 || h < 1) return;
  g.save();
  g.globalAlpha = clamp(alpha);
  g.translate(Math.round(x), Math.round(y));
  if (rot) g.rotate(rot);
  g.drawImage(cv, -w / 2, -h / 2, w, h);
  g.restore();
}

/* ---------- Sprite bintang pixel (digenerate sekali) ---------- */

function makeStar(n, mode) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d');
  const R = n / 2 - 0.5, r = R * 0.43, cx = n / 2, cy = n / 2 + n * 0.035;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
  }
  const inside = (px, py) => {
    let ins = false;
    for (let i = 0, j = 9; i < 10; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  const grid = new Uint8Array(n * n);
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) grid[yy * n + xx] = inside(xx + 0.5, yy + 0.5) ? 1 : 0;
  const at = (xx, yy) => xx >= 0 && yy >= 0 && xx < n && yy < n && grid[yy * n + xx] === 1;
  const big = n > 20;
  for (let yy = 0; yy < n; yy++) {
    for (let xx = 0; xx < n; xx++) {
      if (!at(xx, yy)) continue;
      const edge = !at(xx - 1, yy) || !at(xx + 1, yy) || !at(xx, yy - 1) || !at(xx, yy + 1);
      let col;
      if (mode === 'white') col = '#fff';
      else if (mode === 'gold') col = C.gold;
      else if (mode === 'hollow') { if (!edge) continue; col = '#fff'; }
      else if (edge) col = '#7a4b00';
      else {
        const inner = big && (!at(xx - 2, yy) || !at(xx + 2, yy) || !at(xx, yy - 2) || !at(xx, yy + 2));
        const lit = cx - xx + (cy - yy);
        if (inner) col = lit > 0 ? '#fff3b0' : '#c98a00';
        else if (Math.hypot(xx - cx, yy - cy) < R * 0.3) col = '#ffe680';
        else col = lit > R * 0.25 ? '#ffd83b' : lit < -R * 0.35 ? '#e0a000' : '#f2b705';
      }
      x.fillStyle = col;
      x.fillRect(xx, yy, 1, 1);
    }
  }
  return c;
}

let SPR = null;
const ensureSprites = () => {
  if (!SPR) SPR = { color: makeStar(48, 'color'), white: makeStar(48, 'white'), gold: makeStar(48, 'gold'), hollow: makeStar(48, 'hollow'), mini: makeStar(13, 'color') };
  return SPR;
};

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

const OUT8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/* ===================================================================== */

/** Putar cutscene Level 8.
 *  stars    : bintang ASLI hasil permainan (0–3) – tidak dipakai di layar (diterima demi kompatibilitas).
 *  bodyHtml : tidak dipakai (diterima demi kompatibilitas dengan main.js).
 *  actions  : { restart, next, menu } – dipanggil saat tombol ULANGI / MENU ditekan.
 *  onFail   : dipanggil bila cutscene error (tampilkan dialog hasil biasa). */
export function playLegendVictory({ stars = 0, bodyHtml = '', actions = {}, onFail } = {}) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rm = reduced ? 0.25 : 1;
  const spr = ensureSprites();

  const vw = window.innerWidth || 960, vh = window.innerHeight || 540;
  const H = Math.round(clamp((W * vh) / vw, 270, 540));
  const UF = 1 + ((H - 270) / 270) * 0.5; // karakter sedikit lebih besar di layar tinggi (HP potret)
  CLIP0 = -H * 0.5; CLIP1 = H * 1.5;
  const cx = W / 2, cy = H * 0.5;
  const L = { hor: H * 0.56, floorY: H * 0.86, starY: H * 0.165, gap: 72, titleY: H * 0.375, subY: H * 0.495 };
  const slot = (i) => ({ x: cx + (i - 2) * L.gap, y: L.starY });

  /* ----- DOM ----- */
  const root = document.createElement('div');
  root.id = 'cine';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Cutscene kemenangan Level 8');
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'cine-skip';
  skipBtn.textContent = 'LEWATI ▸▸';
  let A = createCineAudio();
  A.resume();
  const sheet = document.createElement('div'); // tombol ULANGI / MENU (muncul setelah animasi)
  sheet.className = 'cine-actions';
  root.append(canvas, skipBtn, sheet);
  document.body.append(root);
  g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  /* Kursor cahaya (efek murni, naik level tiap bintang mendarat) — lihat victory-cursor.js.
     Level 5: klik kiri = ULTRA SMASH, tombol tengah mouse ditahan/dilepas = SLASH (layar terbelah + portal galaksi).
     Di sini adegan pixel ikut bereaksi (hit-stop, kilat, guncangan, gelombang kejut, partikel)
     dan suara diputar lewat modul audio masing-masing. */
  const smashAudio = createSmashAudio({ isEnabled: () => A.enabled });
  const slashAudio = createSlashAudio({ isEnabled: () => A.enabled });

  /** Koordinat layar (px) -> koordinat canvas adegan (canvas memakai object-fit: contain). */
  function toScene(px, py) {
    const r = canvas.getBoundingClientRect();
    const k = Math.min(r.width / W, r.height / H) || 1;
    return [(px - r.left - (r.width - W * k) / 2) / k, (py - r.top - (r.height - H * k) / 2) / k];
  }

  let lastSceneSmash = -1e9; // reaksi adegan berat dibatasi supaya spam klik tidak membuat frame turun
  const PRISM = ['#7fd8ff', '#ff5fd2', '#ffd83b', '#9dff7f', '#fff'];

  const starCursor = createStarCursor(root, {
    reduced,
    getScene: () => canvas,
    slashAudio,
    onSmash({ x, y, combo, k, light }) {
      smashAudio.play({ combo, k, light });
      const nowMs = performance.now(), heavy = !light && nowMs - lastSceneSmash > 140;
      const [sx, sy] = toScene(x, y), t = clock;
      if (!heavy) { // klik beruntun: cukup guncangan kecil + percikan, tanpa hit-stop / gelombang pixel
        shake(t, 6 * k, 220);
        burst(sx, sy, 18, { speed: [120, 380], size: [2, 4], cols: [C.gold, '#fff'], grav: 200, life: [500, 900] });
        return;
      }
      lastSceneSmash = nowMs;
      if (!reduced) hit(80 + Math.min(combo, 8) * 10, sx, sy, false); // hit-stop singkat + garis kecepatan adegan
      flash(t, 340, Math.min(1, 0.7 + 0.05 * combo));
      shake(t, 16 * k, 420);
      shock(t, { x: sx, y: sy, r1: 320, dur: 750, th0: 12, col: '#fff' });
      shock(t + 80, { x: sx, y: sy, r1: 240, dur: 750, th0: 9, col: C.gold });
      burst(sx, sy, 80, { speed: [150, 520], size: [2, 5], cols: [C.gold, '#fff', C.pale, '#ffb02e', C.cyan], grav: 220, life: [700, 1300] });
      burst(sx, sy, 10, { type: 'star', speed: [80, 280], size: [0.7, 1.3], grav: 140, life: [1000, 1800] });
      volley(Math.round((8 + Math.min(combo, 8)) * rm) + 2);
    },
    onSlash(type, info) {
      if (type !== 'cut' && type !== 'slam') return;
      const [sx, sy] = toScene(info.x, info.y), t = clock, big = type === 'slam';
      if (!reduced) hit(big ? 130 : 110, sx, sy, false);
      flash(t, big ? 520 : 440, big ? 1 : 0.9);
      shake(t, big ? 20 : 18, big ? 600 : 520);
      shock(t, { x: sx, y: sy, r1: 380, dur: 850, th0: 12, col: '#fff' });
      shock(t + 70, { x: sx, y: sy, r1: 300, dur: 850, th0: 9, col: '#7fd8ff' });
      shock(t + 140, { x: sx, y: sy, r1: 230, dur: 850, th0: 7, col: '#ff5fd2' });
      burst(sx, sy, big ? 110 : 90, { speed: [140, 520], size: [2, 5], cols: PRISM, grav: 160, life: [700, 1400] });
      volley(Math.round((big ? 16 : 12) * rm) + 2);
    },
  });

  const tc = document.createElement('canvas'); // kanvas judul (untuk efek yaw 2.5D)
  const TH = 170, TCY = 88;
  tc.width = W; tc.height = TH;
  const tcx = tc.getContext('2d');
  tcx.imageSmoothingEnabled = false;

  const vig = document.createElement('canvas');
  vig.width = W; vig.height = H;
  {
    const v = vig.getContext('2d');
    const gr = v.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,0.9)');
    v.fillStyle = gr;
    v.fillRect(0, 0, W, H);
  }
  try { document.fonts?.load(`16px ${FONT}`); } catch { /* font fallback */ }

  /* ----- State ----- */
  let cam = { x: 0, y: 0, zoom: 1, roll: 0 };
  let sh = { x: 0, y: 0, r: 0 };
  let clock = 0, hold = 0, nowTs = 0, last = null, ei = 0, raf = 0, skipHideT = 0;
  let revealed = false, leaving = false, skipTs = null, jumped = false, fadeInTs = 0, blackA = 0;
  let imp = { until: 0, x: cx, y: cy, invert: false };
  const parts = [], shocks = [], flashes = [], shakes = [], meteors = [];
  let meteorAcc = 0, emberAcc = 0;

  const field = [[], []];
  for (let i = 0; i < 150; i++) {
    field[i % 2].push({ x: -W * 0.6 + hash(i * 3.1) * W * 2.2, y: hash(i * 7.7 + 1) * H * 2.2, ph: hash(i * 1.3) * TAU, big: hash(i * 9.1) > 0.88, col: hash(i * 5) < 0.7 ? '#cfe4ff' : '#fff3b0' });
  }

  /* ----- Karakter ----- */
  const S0 = { x: cx, y: cy + 10 };
  const mons = [
    { key: 'pk', id: 'pikachu', tx: W * 0.765, ty: H * 0.86, h: 74 * UF, col: '#fff7a0', trail: 'bolt', phase: 0.25 },
    { key: 'sn', id: 'snorlax', tx: W * 0.235, ty: H * 0.875, h: 96 * UF, col: '#ffd83b', trail: 'streak', phase: 0 },
    { key: 'sq', id: 'squirtle', tx: W * 0.5, ty: H * 0.94, h: 64 * UF, col: '#7fd8ff', trail: 'water', phase: 0.5 },
  ];
  const squashAtSource = (t, a, f0) => {
    const p = seg(t, a, f0), s = 0.2;
    return { x: S0.x, y: S0.y, sx: s * (1 + 0.3 * p), sy: s * (1 - 0.3 * p), rot: 0, alpha: p, face: 'd', fly: true };
  };
  mons.find((m) => m.key === 'sn').pose = (m, t) => {
    if (t < SN.a) return null;
    if (t < SN.f0) return squashAtSource(t, SN.a, SN.f0);
    if (t < SN.f1) {
      const q = (t - SN.f0) / (SN.f1 - SN.f0), e = E.io(q) * 0.3 + q * 0.7, s = lerp(0.2, 1, E.back(q)), st = Math.sin(q * Math.PI);
      return { x: lerp(S0.x, m.tx, e), y: lerp(S0.y, m.ty, q) - 440 * q * (1 - q), sx: s * (1 - 0.12 * st), sy: s * (1 + 0.22 * st), rot: -0.5 * (1 - q), alpha: 1, face: 'd', fly: true };
    }
    const sec = (t - SN.f1) / 1000, sq = Math.exp(-8 * sec) * Math.cos(20 * sec);
    return { x: m.tx, y: m.ty, sx: 1 + 0.2 * sq, sy: 1 - 0.3 * sq + 0.012 * Math.sin(t / 320), rot: 0, alpha: 1, face: 'd', fly: false };
  };
  mons.find((m) => m.key === 'pk').pose = (m, t) => {
    if (t < PK.a) return null;
    if (t < PK.d0) return squashAtSource(t, PK.a, PK.d0);
    const W1 = { x: S0.x + 70, y: S0.y - 80 }, W2 = { x: S0.x + 140, y: S0.y + 4 }, W3 = { x: m.tx + 26, y: m.ty };
    if (t < PK.d1) {
      const q = (t - PK.d0) / (PK.d1 - PK.d0);
      let A, B, k;
      if (q < 0.28) { A = S0; B = W1; k = E.out2(q / 0.28); }
      else if (q < 0.58) { A = W1; B = W2; k = E.out2((q - 0.28) / 0.3); }
      else { A = W2; B = W3; k = E.out3((q - 0.58) / 0.42); }
      const s = lerp(0.2, 1, E.out3(clamp(q * 1.5)));
      return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), sx: s, sy: s, rot: TAU * 2 * E.out2(q), alpha: 1, face: 'r', fly: true };
    }
    const sec = (t - PK.d1) / 1000, k = E.io(seg(t, PK.d1, PK.d1 + 280)), sq = Math.exp(-9 * sec) * Math.cos(22 * sec);
    return { x: lerp(W3.x, m.tx, k), y: m.ty, sx: 1 + 0.16 * sq, sy: 1 - 0.16 * sq + 0.012 * Math.sin(t / 300), rot: 0, alpha: 1, face: t < PK.d1 + 120 ? 'r' : 'd', fly: false };
  };
  mons.find((m) => m.key === 'sq').pose = (m, t) => {
    if (t < SQ.a) return null;
    if (t < SQ.f0) return squashAtSource(t, SQ.a, SQ.f0);
    if (t < SQ.f1) {
      const q = (t - SQ.f0) / (SQ.f1 - SQ.f0), e = E.io(q);
      const s = q < 0.8 ? lerp(0.18, 1.35, E.out2(q / 0.8)) : lerp(1.35, 1, seg(q, 0.8, 1));
      return { x: lerp(S0.x, m.tx, e) + Math.sin(q * TAU * 1.5) * 34 * (1 - q), y: lerp(S0.y, m.ty, E.in2(q) * 0.7 + q * 0.3) - 70 * Math.sin(q * Math.PI), sx: s, sy: s, rot: TAU * 3 * E.out2(q), alpha: 1, face: 'd', fly: true };
    }
    const sec = (t - SQ.f1) / 1000, sq = Math.exp(-7 * sec) * Math.cos(26 * sec);
    return { x: m.tx, y: m.ty - 34 * Math.exp(-5 * sec) * Math.abs(Math.sin(sec * TAU * 1.4)), sx: 1 + 0.22 * sq, sy: 1 - 0.22 * sq + 0.012 * Math.sin(t / 300), rot: 0, alpha: 1, face: 'd', fly: false };
  };

  /* ----- Efek: partikel, shockwave, kilat, guncangan, meteor ----- */
  function burst(x, y, n, o = {}) {
    const sp = o.speed || [60, 220], sz = o.size || [2, 4], cols = o.cols || [C.gold, C.white], life = o.life || [500, 900];
    for (let i = 0; i < n; i++) {
      const a = o.arc ? lerp(o.arc[0], o.arc[1], Math.random()) : Math.random() * TAU;
      const v = lerp(sp[0], sp[1], Math.random()), l = lerp(life[0], life[1], Math.random());
      parts.push({
        x: x + (o.jx || 0) * (Math.random() - 0.5), y: y + (o.jy || 0) * (Math.random() - 0.5),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v * (o.flat || 1), g: o.grav ?? 180, drag: o.drag ?? 0.8,
        life: l, max: l, sz: lerp(sz[0], sz[1], Math.random()), col: cols[(Math.random() * cols.length) | 0],
        type: o.type || 'sq', p: o.p || 1.3, spin: (Math.random() - 0.5) * 8, rot: Math.random() * TAU,
      });
    }
    if (parts.length > 700) parts.splice(0, parts.length - 700);
  }
  const dust = (x, y, n = 14) => burst(x, y, n, { speed: [30, 130], size: [2, 4], cols: ['#e8e1c8', '#b9b29a', '#ffffff'], arc: [Math.PI, TAU], flat: 0.45, grav: 60, life: [320, 620], p: 1 });
  const shock = (t0, o) => { if (shocks.length > 14) shocks.shift(); shocks.push({ t0, dur: 500, r0: 4, r1: 100, th0: 6, th1: 1, col: C.gold, sq: 1, ...o }); };
  const flash = (t0, dur, a) => { if (flashes.length > 12) flashes.shift(); flashes.push({ t0, dur, a }); };
  const shake = (t0, amp, tau) => { if (shakes.length > 24) shakes.shift(); shakes.push({ t0, amp, tau }); };
  const hit = (ms, x, y, invert = true) => { hold = ms; imp = { until: nowTs + ms, x, y, invert }; A.hitstop(ms); };

  function spawnMeteor(d, x, y) {
    const sp = lerp(120, 560, clamp((d - 0.2) / 1.6));
    meteors.push({ x: x ?? lerp(-W * 0.1, W * 1.35, Math.random()), y: y ?? -lerp(10, 90, Math.random()), vx: -sp * 0.5, vy: sp, d });
  }
  const volley = (n) => {
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      const d = r < 0.4 ? lerp(0.25, 0.6, Math.random()) : r < 0.7 ? lerp(0.6, 1.1, Math.random()) : lerp(1.1, 1.8, Math.random());
      spawnMeteor(d, lerp(-W * 0.1, W * 1.35, Math.random()), -lerp(5, 160, Math.random()));
    }
  };

  /* ----- Event timeline ----- */
  const ev = [];
  const at = (t, fn) => ev.push({ t, fn });
  const [mPk, mSn, mSq] = mons;

  at(SN.f0, () => burst(cx, cy, 16, { speed: [60, 220], cols: [C.gold, '#fff'], p: 1 }));
  at(PK.d0, () => burst(cx, cy, 16, { speed: [60, 240], cols: ['#fff7a0', '#fff'], type: 'spark', p: 1 }));
  at(SQ.f0, () => burst(cx, cy, 16, { speed: [60, 220], cols: [C.cyan, '#fff'], p: 1 }));
  at(SN.f1, (t) => { shake(t, 3.5, 170); dust(mSn.tx, mSn.ty, 18); shock(t, { x: mSn.tx, y: mSn.ty, r1: 70, sq: 0.3, dur: 420, col: '#ffe9a0' }); });
  at(PK.d1, (t) => { shake(t, 2, 120); burst(mPk.tx, mPk.ty - 30, 22, { speed: [60, 200], cols: ['#fff7a0', '#fff'], type: 'spark', grav: 0, life: [250, 500], p: 1 }); });
  at(SQ.f1, (t) => { shake(t, 3, 150); burst(mSq.tx, mSq.ty, 24, { speed: [60, 220], cols: [C.cyan, '#fff', '#4ab3ff'], arc: [Math.PI, TAU], grav: 420, life: [350, 700], p: 1 }); shock(t, { x: mSq.tx, y: mSq.ty, r1: 60, sq: 0.3, dur: 420, col: C.cyan }); });

  at(T_IMPACT, (t) => {
    const gx = cx, gy = H * 0.72;
    hit(115, gx, gy, true);
    flash(t, 220, 0.9);
    shake(t, 10, 260);
    shock(t, { x: gx, y: gy, r1: 320, dur: 650, th0: 10, col: '#fff' });
    shock(t + 90, { x: gx, y: gy, r1: 230, dur: 600, th0: 8, col: C.gold });
    shock(t, { x: cx, y: L.floorY, r1: 360, sq: 0.2, dur: 700, th0: 8, col: C.electric });
    mons.forEach((m) => shock(t + 40, { x: m.tx, y: m.ty - m.h * 0.5, r1: m.h * 0.9, dur: 480, th0: 6, col: '#fff7c0' }));
    burst(gx, gy, 90, { speed: [120, 420], size: [2, 5], cols: [C.gold, '#fff', C.cyan, C.pale], grav: 200, life: [700, 1300] });
    burst(cx, cy, 40, { speed: [80, 300], size: [2, 4], cols: [C.gold, '#fff'], grav: 100, life: [600, 1000] });
    volley(8);
  });

  STAR.forEach((s, i) => {
    const P = slot(i), k = 1 + i * 0.18;
    at(s.tl, (t) => {
      shake(t, 1.5 + 0.5 * i, 120);
      shock(t, { x: cx, y: cy, r0: 10, r1: 90 + i * 12, dur: 280, th0: 5, col: C.gold });
      burst(cx, cy, 14 + i * 3, { speed: [80, 260], cols: [C.gold, '#fff'], grav: 0, life: [250, 450], p: 1 });
    });
    at(s.ti, (t) => {
      hit(55 + i * 14, P.x, P.y, true);
      flash(t, 160 + i * 40, 0.4 + 0.1 * i);
      shake(t, 6 + 2.3 * i, 210 + 40 * i);
      shock(t, { x: P.x, y: P.y, r0: 6, r1: 90 + i * 14, dur: 520, th0: 9, col: '#fff7c0' });
      shock(t + 70, { x: P.x, y: P.y, r0: 6, r1: 150 + i * 22, dur: 700, th0: 6, col: C.gold });
      shock(t, { x: cx, y: L.floorY, r1: 330, sq: 0.2, dur: 650, th0: 6, col: C.gold });
      burst(P.x, P.y, 30 + i * 10, { speed: [90, 300 + 30 * i], size: [2, 5], cols: [C.gold, '#fff', C.pale, C.cyan], grav: 260, life: [600, 1100] });
      burst(P.x, P.y, 5 + i * 2, { type: 'star', speed: [60, 200], size: [0.6, 1.1], grav: 160, life: [900, 1500] });
      volley(Math.round((6 + 2 * i) * rm) + 1);
      if (i === 4) {
        flash(t, 420, 0.9);
        shake(t, 16, 420);
        shock(t + 140, { x: P.x, y: P.y, r1: 360, dur: 800, th0: 10, col: '#fff' });
        burst(cx, L.starY, 80, { speed: [100, 380], size: [2, 5], cols: [C.gold, '#fff', C.pale], grav: 220, life: [800, 1400] });
      }
    });
  });

  const FS = 40, ADV = 43;
  for (let k = 0; k < 7; k++) {
    at(TS0 + k * GAP, (t) => {
      const lx = cx + (k - 3) * ADV, ly = L.titleY + 20;
      shake(t, 2.5 + k * 0.5, 110);
      dust(lx, ly, 10);
      shock(t, { x: lx, y: ly, r1: 42, sq: 0.3, dur: 380, th0: 4, col: C.gold });
      burst(lx, ly - 10, 8, { speed: [60, 200], size: [2, 3], cols: [C.gold, '#fff'], grav: 220, life: [400, 700] });
    });
  }
  at(TM, (t) => {
    hit(130, cx, L.titleY, true);
    flash(t, 360, 1);
    shake(t, 15, 420);
    shock(t, { x: cx, y: L.titleY, r1: 360, dur: 800, th0: 12, col: '#fff' });
    shock(t + 100, { x: cx, y: L.titleY, r1: 280, dur: 800, th0: 9, col: C.gold });
    shock(t + 200, { x: cx, y: L.titleY, r1: 200, dur: 800, th0: 7, col: '#ffb02e' });
    shock(t, { x: cx, y: L.floorY, r1: 380, sq: 0.2, dur: 800, th0: 8, col: C.gold });
    burst(cx, L.titleY, 140, { speed: [120, 460], size: [2, 5], cols: [C.gold, '#fff', C.pale, '#ffb02e'], grav: 220, life: [800, 1500] });
    burst(cx, L.titleY, 24, { type: 'star', speed: [80, 260], size: [0.7, 1.3], grav: 140, life: [1000, 1800] });
    volley(Math.round(24 * rm) + 2);
  });

  /* ----- Cue audio (dipicu dari timeline yang sama dengan visual) ----- */
  at(0, () => { A.awaken(); starCursor.start(); }); // kursor cahaya aktif sejak awal, level 0
  at(SN.f0, () => A.launch('sn'));
  at(PK.d0, () => A.launch('pk'));
  at(SQ.f0, () => A.launch('sq'));
  at(SN.f1, () => A.land('sn'));
  at(PK.d1, () => A.land('pk'));
  at(SQ.f1, () => A.land('sq'));
  at(T_IMPACT - 500, () => A.riser(500));
  at(T_IMPACT, () => A.impact());
  STAR.forEach((s, i) => {
    at(s.t0, () => A.charge(i, CHARGE[i]));
    at(s.tl, () => A.starLaunch(i, LAUNCH[i]));
    at(s.ti, () => { A.starImpact(i, (TM - s.ti) / 1000); starCursor.setLevel(i + 1); }); // bintang ke-(i+1) mendarat -> kursor naik level
  });
  at(TV, () => A.titleRiser(TS0 - TV));
  for (let k = 0; k < 7; k++) at(TS0 + k * GAP, () => A.letter(k));
  at(TM, () => { A.mega(); starCursor.finale(); });
  for (let i = 0; i < 14; i++) at(TM + 450 + i * 40, () => A.type(0));
  for (let i = 0; i < 20; i++) at(TM + 900 + i * 25, () => A.type(1));
  at(TM + 3000, () => A.startAmbient()); // musik loop

  ev.sort((a, b) => a.t - b.t);

  /* ----- Kamera ----- */
  const starsDone = (t) => STAR.reduce((n, s) => n + (t >= s.ti ? 1 : 0), 0);

  function camAt(t) {
    let x = 0, y = 0, zoom = 1, roll = 0;
    const dr = seg(t, 1500, 2300);
    x += Math.sin(t / 1700) * 3 * dr; y += Math.cos(t / 2100) * 2 * dr;
    if (t < 900) { const p = seg(t, 0, 900); zoom = lerp(0.95, 1.1, E.in2(p)); roll = lerp(-0.03, 0, p); }
    else if (t < T_IMPACT) { const p = seg(t, 900, T_IMPACT); zoom = lerp(1.1, 1, E.out3(p)); roll = Math.sin(p * TAU) * 0.012; }
    x += -15 * bump(t, 1330, 230) + 15 * bump(t, 1430, 200);
    y += 7 * bump(t, 1800, 260);
    // fase 3: punch-in
    if (t < T_IMPACT) zoom += 0.05 * E.in2(seg(t, 2100, T_IMPACT));
    else { const d = t - T_IMPACT; zoom += 0.05 * decay(d, 200) + 0.2 * decay(d, 130); roll += 0.03 * decay(d, 200) * Math.cos(d / 60); }
    // fase 4: tiap bintang punya blocking kamera sendiri (charge: dolly-in + miring; launch: whip-pan; impact: punch)
    STAR.forEach((s, i) => {
      const sg = i % 2 ? 1 : -1, k = 1 + i * 0.18, P = slot(i), dx = P.x - cx, dy = P.y - cy;
      if (t >= s.t0 && t < s.tl) {
        const p = seg(t, s.t0, s.tl);
        zoom += 0.09 * k * E.in2(p); roll += sg * 0.022 * k * E.in2(p); y += 3 * E.in2(p);
      } else if (t >= s.tl && t < s.ti) {
        const p = seg(t, s.tl, s.ti);
        zoom += 0.09 * k + 0.03 * p; roll += sg * 0.022 * k * (1 - 0.6 * E.in2(p));
        x += dx * 0.3 * E.in3(p); y += dy * 0.3 * E.in3(p) + 3;
      } else if (t >= s.ti) {
        const d = t - s.ti;
        zoom += 0.12 * k * decay(d, 260) + 0.16 * k * decay(d, 70);
        roll += sg * 0.022 * k * 0.4 * decay(d, 200) - sg * 0.03 * k * decay(d, 120);
        x += dx * 0.3 * decay(d, 230); y += (dy * 0.3 + 3) * decay(d, 230);
      }
    });
    // fase 5: crane pull-back → recover dengan overshoot → mega punch → dorong pelan
    if (t >= TV - 700) {
      const pull = E.io(seg(t, TV - 700, TV + 350));
      const rec = t >= TV + 350 ? E.back(seg(t, TV + 350, TV + 950)) : 0;
      zoom += -0.15 * pull * (1 - rec); y += 14 * pull * (1 - rec); roll += -0.035 * pull * (1 - rec);
    }
    if (t >= TM) {
      const d = t - TM;
      zoom += 0.16 * decay(d, 120) + 0.06 * decay(d, 500) + 0.07 * E.io(seg(t, TM + 700, TEND));
      roll += 0.04 * decay(d, 160) * Math.cos(d / 70);
      x += Math.sin(d / 900) * 3 * seg(d, 300, 900);
      y += Math.cos(d / 1300) * 2 * seg(d, 300, 900);
    }
    return { x: x * rm, y: y * rm, zoom: 1 + (zoom - 1) * (reduced ? 0.5 : 1), roll: roll * (reduced ? 0.3 : 1) };
  }

  const nz = (t, seed) => hash(Math.floor(t / 22) * 3.1 + seed * 17) * 2 - 1;
  function shakeAt(t) {
    let a = 0;
    for (const s of shakes) { const d = t - s.t0; if (d >= 0 && d <= s.tau * 5) a += s.amp * Math.exp(-d / s.tau); }
    a *= rm;
    return { x: Math.round(nz(t, 1) * a), y: Math.round(nz(t, 2) * a * 0.8), r: nz(t, 3) * a * 0.0006 };
  }

  const warmAt = (t) => {
    let w = 0;
    STAR.forEach((s) => { w += 0.13 * E.out2(seg(t, s.ti, s.ti + 350)); });
    return clamp(w + 0.35 * E.out2(seg(t, TV, TV + 500)));
  };
  const raysAt = (t) => 0.05 * seg(t, 300, 900) + 0.1 * seg(t, 1500, 2300) + 0.05 * starsDone(t) + 0.28 * seg(t, TV, TV + 400) + 0.25 * decay(t - TM, 600);
  const pulseAt = (t) => IMPACTS.reduce((a, I) => a + decay(t - I, 380), 0);

  /* ----- Layer 2.5D: tiap lapisan bergerak dengan paralaks berbeda ----- */
  function layer(p, fn) {
    const z = 1 + (cam.zoom - 1) * p, f = 0.35 + 0.65 * p;
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate((cam.roll + sh.r) * Math.min(1, p));
    g.scale(z, z);
    g.translate(-W / 2 - cam.x * p + sh.x * f, -H / 2 - cam.y * p + sh.y * f);
    fn();
    g.restore();
  }
  const proj = (x, y, p = 1) => {
    const z = 1 + (cam.zoom - 1) * p;
    return [W / 2 + (x - W / 2 - cam.x * p) * z, H / 2 + (y - H / 2 - cam.y * p) * z];
  };

  /* ----- Gambar: latar ----- */
  function drawSky(warm) {
    const top = [0x04061a, 0x2b1a04], bot = [0x1b3a8a, 0xb36b0c], N = 16, y0 = -H * 0.6, span = H * 2.2;
    for (let i = 0; i < N; i++) {
      const q = (i / (N - 1)) ** 1.5;
      const a = rgb(top[0]), b = rgb(top[1]), c = rgb(bot[0]), d = rgb(bot[1]);
      const col = [0, 1, 2].map((k) => Math.round(lerp(lerp(a[k], b[k], warm), lerp(c[k], d[k], warm), q)));
      g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      g.fillRect(-W, Math.round(y0 + (i * span) / N), W * 3, Math.ceil(span / N) + 1);
    }
  }
  function drawStarfield(t, bin, a) {
    const sp = bin ? 16 : 7, span = H * 2.2;
    for (const s of field[bin]) {
      const yy = ((s.y + (t * sp) / 1000) % span) - H * 0.6;
      g.globalAlpha = a * (0.35 + 0.65 * Math.abs(Math.sin(t / 500 + s.ph)));
      g.fillStyle = s.col;
      rect(s.x, yy, s.big ? 2 : 1, s.big ? 2 : 1);
    }
    g.globalAlpha = 1;
  }
  function drawRays(t, inten, warm) {
    if (inten < 0.01) return;
    const rx = W / 2, ry = H * 0.42, n = 18, len = Math.max(W, H) * 1.3, rot = t / 6000;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = MIX(0x4ab3ff, 0xffd83b, warm);
    for (let i = 0; i < n; i++) {
      const a = rot + (i * TAU) / n, w = (TAU / n) * 0.32;
      g.globalAlpha = clamp(inten * (i % 2 ? 0.6 : 1));
      g.beginPath();
      g.moveTo(rx, ry);
      g.lineTo(rx + Math.cos(a - w / 2) * len, ry + Math.sin(a - w / 2) * len);
      g.lineTo(rx + Math.cos(a + w / 2) * len, ry + Math.sin(a + w / 2) * len);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  function drawFloor(t, warm, a) {
    const hor = L.hor, bot = H * 1.2;
    g.save();
    g.globalAlpha = a;
    g.fillStyle = MIX(0x0a1430, 0x2a1c06, warm);
    g.fillRect(-W, hor, W * 3, bot - hor);
    const lc = MIX(0x3f8bff, 0xffd83b, warm);
    g.fillStyle = lc;
    for (let i = 0; i < 6; i++) { g.globalAlpha = a * (0.22 - i * 0.035); g.fillRect(-W, hor + i * 3, W * 3, 3); }
    const scroll = (t / 1500) % 1, N = 12;
    for (let j = 0; j < N; j++) {
      const q = (j + scroll) / N, y = hor + (bot - hor) * q * q;
      g.globalAlpha = a * (0.15 + 0.65 * q);
      g.fillRect(-W, Math.round(y), W * 3, q > 0.5 ? 2 : 1);
    }
    g.globalAlpha = a * 0.5;
    g.strokeStyle = lc; g.lineWidth = 1;
    g.beginPath();
    for (let k = -8; k <= 8; k++) { g.moveTo(cx, hor); g.lineTo(cx + k * 62, bot); }
    g.stroke();
    g.restore();
  }
  function drawCircle(t, warm) {
    const a = seg(t, 900, 1500);
    if (a <= 0) return;
    const pu = pulseAt(t), rx = 165, ry = 34, col = MIX(0x7fd8ff, 0xffd83b, warm);
    g.save();
    g.fillStyle = col;
    g.globalAlpha = clamp(a * (0.5 + 0.5 * pu));
    pxRing(cx, L.floorY, rx, ry, 2);
    pxRing(cx, L.floorY, rx * 0.7, ry * 0.7, 2);
    for (let i = 0; i < 36; i++) {
      const ang = t / 1100 + (i * TAU) / 36, s = Math.sin(ang);
      const d = s > 0 ? 3 : 2;
      rect(cx + Math.cos(ang) * rx - d / 2, L.floorY + s * ry - d / 2, d, d);
    }
    for (let i = 0; i < 12; i++) {
      const ang = -t / 1700 + (i * TAU) / 12, c = Math.cos(ang), s = Math.sin(ang);
      pxLine(cx + c * rx * 0.72, L.floorY + s * ry * 0.72, cx + c * rx * 0.97, L.floorY + s * ry * 0.97, 1);
    }
    g.restore();
  }

  /* ----- Gambar: meteor (dekat / jauh) ----- */
  function drawMeteors(bin) {
    const warm = warmAt(clock);
    const tail = MIX(0x7fd8ff, 0xffb02e, warm);
    for (const m of meteors) {
      const b = m.d < 0.6 ? 0 : m.d < 1.1 ? 1 : 2;
      if (b !== bin) continue;
      const sp = Math.hypot(m.vx, m.vy), dx = m.vx / sp, dy = m.vy / sp;
      const len = 10 + m.d * 26, hs = Math.round(1.5 + m.d * 2.2), base = b === 2 ? 0.8 : b === 1 ? 0.7 : 0.5;
      for (let k = 0; k < len; k += 2) {
        const f = 1 - k / len;
        g.globalAlpha = base * f;
        g.fillStyle = k < len * 0.25 ? '#fff' : k < len * 0.6 ? C.gold : tail;
        rect(m.x - dx * k, m.y - dy * k, Math.max(1, hs * f), Math.max(1, hs * f));
      }
      g.globalAlpha = base;
      g.fillStyle = '#fff';
      rect(m.x - hs / 2, m.y - hs / 2, hs, hs);
      if (b > 0) glow(m.x, m.y, hs * 3.2, C.gold, 0.4, 3);
    }
    g.globalAlpha = 1;
  }

  /* ----- Gambar: fase 1 (energi) ----- */
  function drawOrbFx(t) {
    if (t >= T_IMPACT) return;
    const inten = E.in2(seg(t, 0, 900));
    if (inten <= 0.001) return;
    const gp = clamp(t / 1500);
    for (let i = 0; i < 30; i++) {
      const a0 = hash(i) * TAU, r0 = 50 + hash(i + 9) * 130, w = 1.6 + hash(i + 3) * 3.2;
      const rr = r0 * (1 - 0.92 * E.in2(gp)) + 4 + (t > 1500 ? Math.sin(t / 90 + i) * 3 : 0);
      const ang = a0 + ((w * t) / 1000) * (1 + 2 * gp);
      for (let k = 3; k >= 0; k--) {
        const aa = ang - k * 0.09 * w, rk = rr + k * 1.5, sz = k === 0 ? 3 : 2;
        g.globalAlpha = clamp(inten * 1.6) * (1 - k * 0.22);
        g.fillStyle = i % 3 === 0 ? '#fff' : i % 3 === 1 ? C.gold : C.cyan;
        rect(cx + Math.cos(aa) * rk - sz / 2, cy + Math.sin(aa) * rk * 0.92 - sz / 2, sz, sz);
      }
    }
    g.globalAlpha = 1;
    // lingkaran energi yang mengembang
    for (let j = 0; ; j++) {
      const t0 = 100 + j * 380;
      if (t0 > 2050) break;
      const q = seg(t, t0, t0 + 700);
      if (q <= 0 || q >= 1) continue;
      g.globalAlpha = (1 - q) * (j === 0 ? 0.85 : 0.6);
      g.fillStyle = j % 2 ? C.gold : C.electric;
      const r = lerp(10, j === 0 ? 160 : 130, E.out2(q));
      pxRing(cx, cy, r, r, 2 + (1 - q) * 2);
    }
    g.globalAlpha = 1;
    // cincin rune berputar
    const rr = lerp(20, 64, E.out3(seg(t, 0, 900)));
    for (let i = 0; i < 20; i++) {
      const a = t / 700 + (i * TAU) / 20;
      g.globalAlpha = inten; g.fillStyle = C.gold;
      rect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, 2);
    }
    for (let i = 0; i < 12; i++) {
      const a = -t / 500 + (i * TAU) / 12;
      g.fillStyle = C.cyan;
      rect(cx + Math.cos(a) * rr * 0.65, cy + Math.sin(a) * rr * 0.65, 2, 2);
    }
    g.globalAlpha = 1;
    // inti
    const shrink = t > 2050 ? lerp(1, 0.35, seg(t, 2050, T_IMPACT)) : 1;
    const R = (4 + 26 * inten) * shrink * (1 + 0.08 * Math.sin(t / 55));
    glow(cx, cy, R * 2.6, C.electric, 0.55 * inten, 5);
    glow(cx, cy, R * 1.6, C.pale, 0.7 * inten, 4);
    g.fillStyle = '#fff';
    pxCircle(cx, cy, R * 0.55);
  }

  /* ----- Gambar: karakter ----- */
  function hopAt(m, t) {
    let h = 0;
    STAR.forEach((s, i) => { const d = t - s.ti; if (d >= 0 && d < 260) h += 5 * (1 + i * 0.2) * Math.sin((d / 260) * Math.PI); });
    if (t >= TM) { const d = t - TM, ph = (d / 520 + m.phase) % 1; h += (10 + 14 * Math.exp(-d / 1400)) * Math.sin(ph * Math.PI); } // lompat terus berulang
    return h;
  }
  function drawMonRaw(src, m, x, feet, sx, sy, rot, alpha) {
    const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
    if (!w0 || !h0 || alpha <= 0) return;
    const k = m.h / h0, w = w0 * k;
    g.save();
    g.globalAlpha = clamp(alpha);
    g.translate(Math.round(x), Math.round(feet));
    g.scale(sx, sy);
    g.translate(0, -m.h / 2);
    if (rot) g.rotate(rot);
    g.drawImage(src, -w / 2, -m.h / 2, w, m.h);
    g.restore();
  }
  function drawTrail(m, t) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const gp = m.pose(m, t - k * 18);
      if (!gp || !gp.fly) break;
      pts.push([gp.x, gp.y - (m.h * gp.sy) / 2, gp.sx]);
    }
    if (pts.length < 2) return;
    g.save();
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0, s0] = pts[i - 1], [x1, y1] = pts[i], f = 1 - i / pts.length;
      g.globalAlpha = 0.85 * f;
      if (m.trail === 'bolt') {
        const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 12, my = (y0 + y1) / 2 + (Math.random() - 0.5) * 12;
        g.fillStyle = C.gold2; pxLine(x0, y0, mx, my, 3); pxLine(mx, my, x1, y1, 3);
        g.fillStyle = '#fff'; pxLine(x0, y0, mx, my, 1); pxLine(mx, my, x1, y1, 1);
      } else if (m.trail === 'streak') {
        g.fillStyle = C.gold; pxLine(x0, y0, x1, y1, Math.max(2, Math.round(7 * f * s0)));
        g.fillStyle = '#fff'; pxLine(x0, y0, x1, y1, 2);
      } else {
        g.fillStyle = C.cyan; pxLine(x0, y0, x1, y1, Math.max(2, Math.round(4 * f * s0)));
        g.fillStyle = '#fff';
        rect(x1 + (hash(i + Math.floor(t / 40)) - 0.5) * 16, y1 + (hash(i * 3 + Math.floor(t / 40)) - 0.5) * 16, 2, 2);
      }
    }
    g.restore();
  }
  function drawMons(t) {
    for (const m of mons) {
      const pose = m.pose(m, t);
      if (!pose) continue;
      const img = getCharacterImage(m.id, pose.face === 'r' ? 'r' : 'd');
      if (!img || !img.naturalWidth) continue;
      const hop = hopAt(m, t);
      const pop = t >= T_IMPACT ? 1 + 0.08 * decay(t - T_IMPACT, 150) : 1;
      const alt = Math.max(0, m.ty - pose.y + hop);
      g.fillStyle = '#000';
      g.globalAlpha = (0.33 / (1 + alt / 90)) * pose.alpha;
      pxEllipse(pose.x, m.ty + 1, Math.max(2, ((m.h * 0.38) * pose.sx * pop) / (1 + alt / 140)), Math.max(1, m.h * 0.06));
      g.globalAlpha = 1;
      if (pose.fly) {
        drawTrail(m, t);
        const tint = tinted(img, m.col);
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let k = 1; k <= 6; k++) {
          const gp = m.pose(m, t - k * 24);
          if (!gp || !gp.fly) continue;
          drawMonRaw(tint, m, gp.x, gp.y, gp.sx, gp.sy, gp.rot, 0.32 * (1 - k / 7));
        }
        g.restore();
      }
      drawMonRaw(img, m, pose.x, pose.y - hop, pose.sx * pop, pose.sy * pop, pose.rot, pose.alpha);
      const fl = t >= T_IMPACT ? decay(t - T_IMPACT, 160) : 0;
      if (fl > 0.02) drawMonRaw(tinted(img, '#ffffff'), m, pose.x, pose.y - hop, pose.sx * pop, pose.sy * pop, pose.rot, fl);
    }
  }

  /* ----- Gambar: bintang (charge → launch → impact → settle) ----- */
  function drawSlots(t) {
    const a = seg(t, 2600, 3000);
    if (a <= 0) return;
    for (let i = 0; i < 5; i++) {
      if (t >= STAR[i].ti) continue;
      const P = slot(i);
      drawSprite(spr.hollow, P.x, P.y, 1, 0, 0.18 * a * (0.7 + 0.3 * Math.sin(t / 300 + i)));
    }
  }
  function drawStarFx(i, t) {
    const s = STAR[i], P = slot(i), k = 1 + i * 0.18, sg = i % 2 ? 1 : -1;
    if (t < s.t0) return;

    if (t < s.tl) { // A. CHARGE
      const c = seg(t, s.t0, s.tl), jit = c > 0.5 ? (c - 0.5) * 2 * (1 + i * 0.35) : 0;
      const wind = seg(t, s.tl - 140, s.tl);
      const px = cx + (hash(Math.floor(t / 30) + i) * 2 - 1) * jit;
      const py = cy + (hash(Math.floor(t / 30) + i + 50) * 2 - 1) * jit + 10 * E.in2(wind);
      const size = lerp(0.12, 1.3, E.out2(c)) * (1 + 0.1 * Math.sin(t / 40) * c) * (1 - 0.12 * wind);
      // garis energi menyatu ke tengah
      for (let j = 0; j < 12; j++) {
        const ph = (c * 3 + j / 12 + i * 0.13) % 1, a = (j * TAU) / 12 + i, r = (90 + i * 20) * (1 - ph);
        g.globalAlpha = clamp(ph * 1.5) * 0.9;
        g.fillStyle = j % 2 ? C.gold : '#fff';
        const x1 = px + Math.cos(a) * r, y1 = py + Math.sin(a) * r;
        pxLine(x1, y1, x1 - Math.cos(a) * 12 * ph, y1 - Math.sin(a) * 12 * ph, 1);
      }
      g.globalAlpha = 1;
      glow(px, py, lerp(8, 54 + i * 8, c), c < 0.5 ? C.cyan : C.gold, 0.25 + 0.6 * c, 6);
      const vib = Math.sin(t / 120) * 0.06 * c;
      if (c > 0.12) drawSprite(spr.white, px, py, size, vib, 0.8 * seg(c, 0.12, 0.8));
      if (c > 0.7) drawSprite(spr.color, px, py, size, vib, seg(c, 0.7, 1));
      const no = 6 + i;
      for (let j = 0; j < no; j++) { // partikel energi berputar di sekeliling bintang
        const a = c * TAU * (3 + i) + (j * TAU) / no, r = size * 30 + 6;
        g.fillStyle = j % 2 ? '#fff' : C.gold;
        rect(px + Math.cos(a) * r, py + Math.sin(a) * r * 0.9, 2, 2);
      }
      g.fillStyle = '#fff';
      pxCircle(px, py, 2 + c * 3);
      return;
    }

    if (t < s.ti) { // B. LAUNCH
      const u = seg(t, s.tl, s.ti);
      const C1 = { x: lerp(cx, P.x, 0.25) + sg * 70, y: cy - 110 };
      const bez = (e) => { const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e; return { x: a * cx + b * C1.x + c * P.x, y: a * (cy + 10) + b * C1.y + c * P.y }; };
      const ease = (q) => E.in2(q) * 0.88 + q * 0.12;
      const pos = bez(ease(u)), sc = lerp(1.3, 1, u);
      for (let j = 12; j >= 1; j--) { // jejak cahaya
        const uk = u - j * 0.05;
        if (uk < 0) continue;
        const pk = bez(ease(uk)), f = 1 - j / 13;
        g.save(); g.globalCompositeOperation = 'lighter';
        drawSprite(spr.gold, pk.x, pk.y, sc * (1 - j * 0.04), (1 - E.out3(uk)) * TAU * 3 * sg, 0.34 * f);
        g.restore();
        g.fillStyle = j % 2 ? '#fff' : C.gold; g.globalAlpha = f;
        rect(pk.x + (hash(j + i * 7 + Math.floor(t / 30)) - 0.5) * 14, pk.y + (hash(j * 2 + i + Math.floor(t / 30)) - 0.5) * 14, 3, 3);
        g.globalAlpha = 1;
      }
      glow(pos.x, pos.y, 36 * sc, C.gold, 0.55, 5);
      drawSprite(spr.color, pos.x, pos.y, sc, (1 - E.out3(u)) * TAU * 3 * sg, 1);
      return;
    }

    // C+D. IMPACT & SETTLE
    const d = t - s.ti, sec = d / 1000;
    let sc = 1 + 0.6 * k * Math.exp(-8 * sec) * Math.cos(26 * sec);
    for (let j = 0; j < 5; j++) sc += 0.16 * bump(t, STAR[4].ti + 150 + 110 * j, 90) * (j === i ? 1 : 0);
    const oy = -12 * Math.exp(-9 * sec) * Math.sin(22 * sec), rot = 0.28 * Math.exp(-7 * sec) * Math.sin(26 * sec) * sg;
    if (d < 420) { // flare impact lokal
      const q = d / 420;
      glow(P.x, P.y, lerp(110, 30, q) * k, '#fff', 0.9 * (1 - q), 5);
      g.fillStyle = '#fff'; g.globalAlpha = 1 - q;
      const len = lerp(40, i === 4 ? W : 200, E.out2(Math.min(1, d / 120))) * k;
      rect(P.x - len, P.y - 1, len * 2, 2);
      rect(P.x - 1, P.y - len * 0.6, 2, len * 1.2);
      g.globalAlpha = 1;
    }
    glow(P.x, P.y, 40 + 4 * Math.sin(t / 380 + i), C.gold, 0.35, 5);
    drawSprite(spr.color, P.x, P.y + oy, sc, rot, 1);
    const tw = Math.max(0, Math.sin(t / 500 + i * 1.7)) ** 8; // kilau
    if (tw > 0.05) {
      g.fillStyle = '#fff'; g.globalAlpha = tw;
      const L2 = 4 + tw * 8, kx = P.x - 12, ky = P.y - 12;
      rect(kx - L2, ky, L2 * 2, 1); rect(kx, ky - L2, 1, L2 * 2);
      g.globalAlpha = 1;
    }
  }

  /* ----- Gambar: judul VICTORY ----- */
  const titleYaw = (t) => {
    if (t < TS0 - 300) return 0.6;
    const q = seg(t, TS0 - 300, TM + 600);
    return 0.6 * (1 - E.out3(q)) + (t > TM ? 0.09 * Math.sin((t - TM) / 750) * seg(t, TM, TM + 700) : 0);
  };
  function drawLetter(x, ch, px, py, sc, al, ex, ey) {
    x.save();
    x.globalAlpha = clamp(al);
    x.translate(Math.round(px), Math.round(py));
    x.scale(sc, sc);
    for (let j = 10; j >= 1; j--) { x.fillStyle = j % 3 === 0 ? '#1b3157' : C.navy; x.fillText(ch, Math.round(ex * j), Math.round(ey * j)); }
    x.fillStyle = C.blue;
    for (const [dx, dy] of OUT8) x.fillText(ch, dx * 2, dy * 2);
    x.fillStyle = C.gold; x.fillText(ch, 0, 0);
    x.save(); x.beginPath(); x.rect(-FS, FS * 0.12, FS * 2, FS); x.clip(); x.fillStyle = '#f2a900'; x.fillText(ch, 0, 0); x.restore();
    x.save(); x.beginPath(); x.rect(-FS, -FS, FS * 2, FS * 0.82); x.clip(); x.fillStyle = '#ffec80'; x.fillText(ch, 0, 0); x.restore();
    x.restore();
  }
  function renderTitle(t) {
    tcx.globalCompositeOperation = 'source-over';
    tcx.globalAlpha = 1;
    tcx.clearRect(0, 0, W, TH);
    tcx.font = `${FS}px ${FONT}`;
    tcx.textAlign = 'center';
    tcx.textBaseline = 'middle';
    const yaw = titleYaw(t), ex = 0.5 + yaw * 1.6, ey = 0.9;
    for (let k = 0; k < 7; k++) {
      const tk = TS0 + k * GAP;
      if (t < tk - 300) continue;
      let sc, oy, al;
      if (t < tk) { const q = seg(t, tk - 300, tk); sc = lerp(3, 1, E.in2(q)); oy = lerp(-70, 0, E.in2(q)); al = q * 4; }
      else { const s = t - tk; sc = 1 - 0.24 * Math.exp(-s / 95) * Math.cos(s / 24); oy = 0; al = 1; }
      if (t >= TM) sc += 0.22 * decay(t - TM - k * 18, 170);
      drawLetter(tcx, 'VICTORY'[k], W / 2 + (k - 3) * ADV, TCY + oy, sc, al, ex, ey);
    }
    if (t >= TM) {
      tcx.globalCompositeOperation = 'source-atop';
      const wh = decay(t - TM, 220);
      if (wh > 0.02) { tcx.fillStyle = `rgba(255,255,255,${(wh * 0.9).toFixed(3)})`; tcx.fillRect(0, 0, W, TH); }
      const dd = t - TM - 250;
      if (dd >= 0) {
        const q = seg(dd % 2400, 0, 700);
        if (q > 0 && q < 1) {
          const bx = lerp(-80, W + 80, E.io(q));
          tcx.fillStyle = 'rgba(255,255,255,0.75)';
          tcx.beginPath(); tcx.moveTo(bx, 0); tcx.lineTo(bx + 26, 0); tcx.lineTo(bx + 6, TH); tcx.lineTo(bx - 20, TH); tcx.closePath(); tcx.fill();
          tcx.fillStyle = 'rgba(255,255,255,0.4)';
          tcx.beginPath(); tcx.moveTo(bx + 34, 0); tcx.lineTo(bx + 42, 0); tcx.lineTo(bx + 22, TH); tcx.lineTo(bx + 14, TH); tcx.closePath(); tcx.fill();
        }
      }
      tcx.globalCompositeOperation = 'source-over';
    }
  }
  function drawTitleBack(t, warm) {
    if (t < TS0 - 300) return;
    const q = seg(t, TS0 - 300, TM);
    glow(cx, L.titleY, lerp(40, 170, E.out2(q)) + 30 * decay(t - TM, 400), MIX(0xffd83b, 0xffffff, decay(t - TM, 300)), 0.35 + 0.35 * q, 6);
    if (t >= TM) {
      g.fillStyle = '#fff'; g.globalAlpha = 0.5 * decay(t - TM, 500) + 0.12;
      rect(cx - W, L.titleY - 1, W * 2, 2);
      g.globalAlpha = 1;
    }
  }
  function blitTitle(t) {
    if (t < TS0 - 300) return;
    renderTitle(t);
    const yaw = titleYaw(t), cs = Math.cos(yaw), sn = Math.sin(yaw), F = 380;
    const baseY = L.titleY - 8 + (t >= TM ? Math.sin(t / 520) * 1.5 : 0);
    for (let xx = 0; xx < W; xx++) {
      const dx = xx - W / 2, dd = 1 - (dx * sn) / F;
      if (dd <= 0.2) continue;
      const f = 1 / dd;
      g.drawImage(tc, xx, 0, 1, TH, Math.floor(cx + dx * cs * f), baseY - TCY * f, Math.max(1, Math.ceil(cs * f)) + 1, TH * f);
    }
  }
  function drawSubtitle(t) {
    if (t < TM + 450) return;
    const txt = 'LEGEND CLEARED', n = Math.floor(seg(t, TM + 450, TM + 1000) * txt.length);
    if (n > 0) {
      g.font = `12px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      const full = g.measureText(txt).width, x0 = Math.round(cx - full / 2), s = txt.slice(0, n);
      g.fillStyle = C.navy;
      for (const [dx, dy] of OUT8) g.fillText(s, x0 + dx * 2, L.subY + dy * 2);
      g.fillStyle = C.gold; g.fillText(s, x0, L.subY);
    }
    const n2 = 'SEMUA NODE TERHUBUNG', m = Math.floor(seg(t, TM + 900, TM + 1400) * n2.length);
    if (m > 0) {
      g.font = `8px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      const full = g.measureText(n2).width, x0 = Math.round(cx - full / 2), s = n2.slice(0, m);
      g.fillStyle = C.navy; g.fillText(s, x0 + 1, L.subY + 17);
      g.fillStyle = C.pale; g.fillText(s, x0, L.subY + 16);
    }
    const a = seg(t, TM + 800, TM + 1100);
    drawSprite(spr.mini, cx - 100, L.subY, 1, t / 600, a * (0.6 + 0.4 * Math.sin(t / 200)));
    drawSprite(spr.mini, cx + 100, L.subY, 1, -t / 600, a * (0.6 + 0.4 * Math.cos(t / 200)));
  }

  /* ----- Gambar: partikel & shockwave ----- */
  function drawShocks(t) {
    for (const s of shocks) {
      const d = t - s.t0;
      if (d < 0 || d > s.dur) continue;
      const q = d / s.dur, r = lerp(s.r0, s.r1, E.out3(q));
      g.globalAlpha = (1 - q) ** 1.4;
      g.fillStyle = s.col;
      pxRing(s.x, s.y, r, r * s.sq, lerp(s.th0, s.th1, q));
    }
    g.globalAlpha = 1;
  }
  function drawParts(near) {
    for (const p of parts) {
      if ((p.p > 1.2) !== near) continue;
      const f = clamp((p.life / p.max) * 1.6);
      g.globalAlpha = f;
      g.fillStyle = p.col;
      if (p.type === 'star') drawSprite(spr.mini, p.x, p.y, p.sz, p.rot, f);
      else if (p.type === 'spark') { rect(p.x - 2, p.y, 5, 1); rect(p.x, p.y - 2, 1, 5); }
      else rect(p.x, p.y, Math.max(1, p.sz * (0.5 + 0.5 * f)), Math.max(1, p.sz * (0.5 + 0.5 * f)));
    }
    g.globalAlpha = 1;
  }

  /* ----- Overlay layar (vignette, flash, impact frame, bar sinematik, fade) ----- */
  function speedLines(x, y, n) {
    const far = Math.max(W, H) * 1.2;
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n + hash(i) * 0.1, r0 = 24 + hash(i + 7) * 40, w = 0.012 + hash(i + 2) * 0.02;
      g.fillStyle = i % 3 === 0 ? '#000' : '#fff';
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      g.lineTo(x + Math.cos(a - w) * far, y + Math.sin(a - w) * far);
      g.lineTo(x + Math.cos(a + w) * far, y + Math.sin(a + w) * far);
      g.closePath();
      g.fill();
    }
  }
  function overlay(t, ts) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.5 + 0.45 * (1 - E.out2(seg(t, 0, T_IMPACT)));
    g.drawImage(vig, 0, 0);
    let fa = 0;
    for (const f of flashes) { const d = t - f.t0; if (d >= 0 && d <= f.dur) fa += f.a * (1 - d / f.dur) ** 2; }
    fa = Math.min(1, fa * (reduced ? 0.5 : 1));
    if (fa > 0.01) { g.globalAlpha = fa; g.fillStyle = '#fff6d0'; g.fillRect(0, 0, W, H); }
    if (!reduced && ts < imp.until) { // frame impact ala anime: negatif + garis kecepatan
      g.globalAlpha = 1;
      if (imp.invert) { g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
      const [sx, sy] = proj(imp.x, imp.y, 1);
      g.globalAlpha = 0.85;
      speedLines(sx, sy, 46);
    }
    g.globalAlpha = 1;
    const bh = Math.round(H * 0.045 * E.out3(seg(t, 0, 600)));
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh);
    if (blackA > 0.001) { g.globalAlpha = blackA; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }

  /* ----- Render satu frame ----- */
  function render(t, ts) {
    cam = camAt(t); sh = shakeAt(t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    const bgA = E.out2(seg(t, 0, 700)), warm = warmAt(t);
    root.style.backgroundColor = `rgba(3,5,16,${bgA.toFixed(3)})`;

    layer(0.1, () => { g.globalAlpha = bgA; drawSky(warm); g.globalAlpha = 1; });
    layer(0.18, () => drawStarfield(t, 0, bgA));
    layer(0.32, () => drawStarfield(t, 1, bgA));
    layer(0.25, () => drawMeteors(0));
    layer(0.4, () => drawRays(t, raysAt(t) * bgA, warm));
    layer(0.6, () => drawMeteors(1));
    layer(0.6, () => drawFloor(t, warm, bgA));
    layer(0.75, () => drawCircle(t, warm));
    layer(1, () => {
      drawOrbFx(t);
      drawMons(t);
      drawSlots(t);
      for (let i = 0; i < 5; i++) drawStarFx(i, t);
      drawTitleBack(t, warm);
      blitTitle(t);
      drawSubtitle(t);
      drawShocks(t);
      drawParts(false);
    });
    layer(1.3, () => drawParts(true));
    layer(1.45, () => drawMeteors(2));
    overlay(t, ts);
  }

  /* ----- Update simulasi (dt = 0 saat hit-stop) ----- */
  function update(dt, t) {
    const s = dt / 1000;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vx *= 1 - Math.min(1, p.drag * s);
      p.vy = p.vy * (1 - Math.min(1, p.drag * 0.5 * s)) + p.g * s;
      p.x += p.vx * s; p.y += p.vy * s; p.rot += p.spin * s;
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * s; m.y += m.vy * s;
      if (m.y > H * 1.3 || m.x < -W * 0.7) meteors.splice(i, 1);
    }
    for (let i = shocks.length - 1; i >= 0; i--) if (t > shocks[i].t0 + shocks[i].dur + 100) shocks.splice(i, 1);
    const rate = (t < T_STARS ? 1 : t < TV ? 2 + 2.5 * starsDone(t) : t < TM ? 8 : 14) * rm;
    meteorAcc += (rate * dt) / 1000;
    while (meteorAcc >= 1) { meteorAcc -= 1; spawnMeteor(lerp(0.25, 1.8, Math.pow(Math.random(), 1.4))); }
    const er = t >= TM ? 18 : t >= TV ? 8 : 0;
    emberAcc += (er * rm * dt) / 1000;
    while (emberAcc >= 1) {
      emberAcc -= 1;
      burst(Math.random() * W, H + 6, 1, { speed: [20, 50], size: [1, 3], cols: [C.gold, C.pale, '#ffb02e'], arc: [-Math.PI * 0.6, -Math.PI * 0.4], grav: -20, drag: 0.1, life: [1500, 2600], p: 1.3 });
    }
  }

  /* ----- Kontrol ----- */
  function cleanup() {
    cancelAnimationFrame(raf);
    clearTimeout(skipHideT);
    starCursor.stop();
    smashAudio.close();
    slashAudio.close();
    removeEventListener('keydown', onKey, true);
    A.stopAmbient();
    A.fadeOut(0.25);
    A.close();
    root.style.transition = 'opacity .35s ease';
    root.style.opacity = '0';
    root.style.pointerEvents = 'none';
    setTimeout(() => root.remove(), 400);
  }
  /** Tombol ULANGI / MENU ditekan: tutup cutscene lalu jalankan aksinya. */
  function leave(name) {
    if (leaving) return;
    leaving = true;
    cleanup();
    try { actions[name]?.(); } catch (err) { console.error(err); }
  }
  function fail(err) {
    if (leaving) return;
    leaving = true;
    console.error('[victory] cutscene error:', err);
    cleanup();
    try { onFail?.(); } catch (e) { console.error(e); }
  }

  /** Setelah cutscene selesai: munculkan hanya tombol ULANGI + MENU di atas canvas (canvas tidak berubah). */
  function reveal() {
    revealed = true;
    clearTimeout(skipHideT);
    skipBtn.classList.remove('show');
    skipBtn.style.display = 'none';
    sheet.innerHTML = `
      <button type="button" class="cine-btn" data-action="restart">ULANGI</button>
      <button type="button" class="cine-btn" data-action="menu">MENU</button>`;
    setTimeout(() => sheet.classList.add('show'), 30);
    setTimeout(() => { try { sheet.querySelector('.cine-btn')?.focus({ preventScroll: true }); } catch { /* abaikan */ } }, 800);
  }

  sheet.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) leave(btn.dataset.action);
  });

  /** Lewati: loncat ke adegan akhir (semua event/suara animasi dibuang, musik latar mulai). */
  function jumpToEnd() {
    ei = ev.length; clock = TEND; hold = 0;
    parts.length = 0; shocks.length = 0; flashes.length = 0; shakes.length = 0; meteors.length = 0;
    imp = { until: 0, x: cx, y: cy, invert: false };
    A.stopAmbient(); A.fadeOut(0.05); A.close();
    A = createCineAudio();
    A.resume(); A.startAmbient();
    starCursor.start();                              // aman dipanggil ulang
    starCursor.setLevel(5, { instant: true });       // langsung level penuh
  }
  const requestSkip = () => { if (skipTs == null && !revealed) { skipTs = nowTs; skipBtn.disabled = true; A.fadeOut(0.2); } };
  function onKey(e) {
    if (e.key === 'm' || e.key === 'M') { e.stopPropagation(); A.toggle(); return; }
    if (revealed) return; // setelah tombol muncul, keyboard lain bekerja normal (Tab / Enter pada tombol)
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); requestSkip(); }
  }

  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); skipBtn.classList.remove('show'); requestSkip(); });

  // Tombol LEWATI tersembunyi; muncul 3 detik setiap layar diklik/disentuh
  root.addEventListener('pointerdown', () => {
    if (revealed || skipTs != null) return;
    skipBtn.classList.add('show');
    clearTimeout(skipHideT);
    skipHideT = setTimeout(() => skipBtn.classList.remove('show'), 3000);
  });

  addEventListener('keydown', onKey, true);

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    try {
      nowTs = ts;
      const real = last == null ? 0 : Math.min(50, ts - last);
      last = ts;
      let dt = real;
      if (hold > 0) { hold -= real; dt = 0; } // hit-stop
      clock += dt;
      while (ei < ev.length && ev[ei].t <= clock) { ev[ei].fn(ev[ei].t); ei++; }

      // lewati: fade hitam -> loncat ke adegan akhir -> fade masuk
      if (skipTs != null) {
        if (!jumped) {
          blackA = seg(ts, skipTs, skipTs + 250);
          if (blackA >= 1) { jumpToEnd(); jumped = true; fadeInTs = ts; }
        } else blackA = 1 - seg(ts, fadeInTs, fadeInTs + 300);
      }

      update(dt, clock);
      render(clock, ts);
      if (!revealed && clock >= TEND && (skipTs == null || jumped)) reveal();
    } catch (err) {
      fail(err); // apa pun yang terjadi, dialog hasil biasa tetap muncul
    }
  }
  raf = requestAnimationFrame(frame);

  return { skip: requestSkip };
}