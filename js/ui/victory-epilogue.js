/* ===== EPILOG SINEMATIK · KISAH PARA PARTNER (±68 detik) =====
   Diputar setelah tombol MENU ditekan di cutscene kemenangan Level 8.
   Pixel-art 480×H (sama seperti cutscene kemenangan), seluruhnya digambar dengan kode:
     0  Poké Ball retak                      (4 dtk)
     1  Padang fajar  · perkenalan Pikachu, Snorlax, Squirtle
     2  Hutan Viridian · PIKACHU: Thunderbolt + Volt Tackle
     3  Gua Batu       · SNORLAX: Body Slam + Hyper Beam
     4  Pantai senja   · SQUIRTLE: Rapid Spin + Hydro Pump
     5  Malam gunung   · rasi bintang = pohon rentang (Prim) + TRI COMBO
     6  Puncak fajar   · kredit, lalu whiteout -> menu utama
   Tombol LEWATI: klik/sentuh layar lalu tekan tombolnya, atau Esc / Enter / Spasi. M = bisu.

   playEpilogue({ onDone, onFail }) -> onDone dipanggil saat layar sudah putih penuh (aman untuk ganti layar). */
import { getCharacterImage } from '../data/sprites.js';
import { createEpilogueAudio } from './victory-epilogue-audio.js';

export const SCENES = [0, 4000, 14000, 25000, 36000, 47000, 58000, 68000];
export const EPILOGUE_MS = SCENES[SCENES.length - 1];

const TAU = Math.PI * 2;
const FONT = '"Press Start 2P", monospace';
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const E = {
  in2: (t) => t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  out3: (t) => 1 - (1 - t) ** 3,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
};
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const MIX = (a, b, t) => { const A = rgb(a), B = rgb(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; };
const OUT8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const sceneAt = (t) => { for (let i = SCENES.length - 2; i >= 0; i--) if (t >= SCENES[i]) return i; return 0; };

/** Posisi gulir latar: berjalan (v px/ms) -> berhenti (stop, dec) -> jalan lagi (res, acc). */
function scroll(u, v, stop, dec, res = 1e9, acc = 800) {
  let s = u < stop ? v * u : v * stop + (u < stop + dec ? v * (u - stop) - (v * (u - stop) ** 2) / (2 * dec) : (v * dec) / 2);
  if (u > res) { const d = u - res; s += d < acc ? (v * d * d) / (2 * acc) : (v * acc) / 2 + v * (d - acc); }
  return s;
}
/** Seberapa "berjalan" (0..1) untuk animasi langkah. */
function moving(u, stop, dec, res = 1e9, acc = 800) {
  if (u < stop) return 1;
  if (u < stop + dec) return 1 - (u - stop) / dec;
  return u > res ? seg(u, res, res + acc) : 0;
}

/* Subtitle (waktu global, ms) */
const CAPS = [
  [4400, 8300, 'Fajar menyingsing di atas Rute 01, tempat semuanya bermula…'],
  [9300, 13500, 'Tiga partner. Satu tujuan: menyambung semua Poké Ball.'],
  [14400, 17800, 'Hutan Viridian menyimpan banyak Poké Ball yang tersembunyi.'],
  [21300, 24800, 'Thunderbolt menumbangkan penghalang. Volt Tackle menyerbu tanpa ragu!'],
  [25500, 28200, 'Di Gua Batu, jalan mereka tertutup dinding batu raksasa.'],
  [30700, 35200, 'Body Slam mengguncang gua, Hyper Beam meluluhlantakkan dinding batu!'],
  [36500, 39000, 'Senja membakar pantai, namun api liar menghadang di depan.'],
  [43500, 46700, 'Hydro Pump memadamkan api dan melukis pelangi di langit senja.'],
  [47400, 50500, 'Malam di puncak gunung. Mereka mengingat setiap jalan yang dilalui.'],
  [50800, 54000, 'Seperti algoritma Prim: pilih jalur termurah, sambungkan titik demi titik.'],
  [55600, 57800, 'Tiga kekuatan menjadi satu, langit pun terbelah menjadi fajar!'],
  [59500, 62800, 'Semua node akhirnya terhubung. Semua Poké Ball terkumpul.'],
  [63300, 66900, 'Namun bagi mereka, ini baru permulaan petualangan.'],
];
const NAMES = ['EGA ASLIYA PUTRI', 'ENDRY JULYAN PUTRA', 'M. BOLKIAH AYESHA A.A', 'TUAH SHAHJAHAN ARZU', 'SHAFIN MAULANA'];

/* ===================================================================== */
/*  RENDERER (tidak menyentuh DOM kecuali lewat makeCanvas/getImg)       */
/* ===================================================================== */

export function createEpilogueRenderer({ W, H, getImg, sfx = {}, makeCanvas = () => document.createElement('canvas') }) {
  let g = null, t = 0, dtMs = 16, ei = 0;
  const cx = W / 2, UF = 1 + ((H - 270) / 270) * 0.5, GY = Math.round(H * 0.8), BAR = Math.round(H * 0.05);
  const SZ = { sn: 84 * UF, pk: 62 * UF, sq: 54 * UF };
  const X = { sn: cx - 110, sq: cx - 10, pk: cx + 85 };
  const Y = { sn: GY, sq: GY + 8, pk: GY + 4 };
  const parts = [], rings = [], shakes = [], flashes = [], ev = [], acc = {};
  const S = (name, ...a) => { try { sfx[name]?.(...a); } catch { /* abaikan */ } };
  const every = (k, ms, fn) => { acc[k] = (acc[k] || 0) + dtMs; let n = 0; while (acc[k] >= ms && n++ < 4) { acc[k] -= ms; fn(); } if (acc[k] > ms * 4) acc[k] = 0; };

  const STARS = Array.from({ length: 130 }, (_, i) => ({ x: hash(i * 3.3) * W, y: hash(i * 7.1 + 2) * H * 0.62, ph: hash(i) * TAU, big: hash(i * 9.7) > 0.9 }));

  /* ---------- Primitif ---------- */
  const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const fill = (c, a = 1) => { g.fillStyle = c; g.globalAlpha = a; };
  function circ(x, y, r) {
    r = Math.round(r); x = Math.round(x); y = Math.round(y);
    if (r <= 0) { g.fillRect(x, y, 1, 1); return; }
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(x - w, y + dy, w * 2 + 1, 1); }
  }
  function ell(x, y, rx, ry) {
    rx = Math.round(rx); ry = Math.round(ry); x = Math.round(x); y = Math.round(y);
    if (rx < 1 || ry < 1) return;
    for (let dy = -ry; dy <= ry; dy++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); g.fillRect(x - w, y + dy, w * 2 + 1, 1); }
  }
  function glow(x, y, r, col, a, steps = 5) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = col;
    for (let i = 0; i < steps; i++) { g.globalAlpha = clamp((a / steps) * 1.4); circ(x, y, r * (1 - i / steps)); }
    g.restore();
  }
  function text(str, x, y, size, col, out = '#0d1a33', align = 'center') {
    g.font = `${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
    const o = Math.max(1, Math.round(size / 8));
    g.fillStyle = out; for (const [dx, dy] of OUT8) g.fillText(str, x + dx * o, y + dy * o);
    g.fillStyle = col; g.fillText(str, x, y);
  }

  const tintCache = new Map();
  function tinted(img, color) {
    const key = `${img.src}|${color}`;
    let c = tintCache.get(key);
    if (!c) {
      c = makeCanvas(); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      tintCache.set(key, c);
    }
    return c;
  }

  function mon(id, dir, x, feet, h, o = {}) {
    const img = getImg(id, dir);
    if (!img || !img.naturalWidth) return;
    const k = h / img.naturalHeight, w = img.naturalWidth * k, lift = o.lift || 0;
    if (!o.noShadow) { g.fillStyle = '#000'; g.globalAlpha = 0.3 / (1 + lift / 60); ell(x, feet + 1, Math.max(3, (w * 0.36 * (o.sx || 1)) / (1 + lift / 120)), Math.max(1.5, h * 0.06)); g.globalAlpha = 1; }
    g.save();
    g.globalAlpha = o.a ?? 1;
    g.translate(Math.round(x), Math.round(feet - lift)); g.scale(o.sx ?? 1, o.sy ?? 1); g.translate(0, -h / 2);
    if (o.rot) g.rotate(o.rot);
    g.drawImage(img, -w / 2, -h / 2, w, h);
    if (o.white) { g.globalAlpha = o.white; g.drawImage(tinted(img, '#ffffff'), -w / 2, -h / 2, w, h); }
    if (o.dark) { g.globalAlpha = o.dark; g.drawImage(tinted(img, '#0b0820'), -w / 2, -h / 2, w, h); }
    if (o.tint) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = o.tintA ?? 0.4; g.drawImage(tinted(img, o.tint), -w / 2, -h / 2, w, h); }
    g.restore();
  }
  const drawTeam = (list) => list.filter(Boolean).sort((a, b) => a[3] - b[3]).forEach((m) => mon(...m));
  const walk = (u, ph, m = 1) => { const s = Math.sin(u / 110 + ph); return { lift: Math.abs(s) * 4 * m, rot: s * 0.035 * m }; };

  /* ---------- Partikel & efek ---------- */
  function spawn(o) {
    if (parts.length > 900) parts.shift();
    const life = o.life ?? 600;
    parts.push({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0.5, sz: 2, col: '#fff', type: 'sq', add: false, spin: 0, rot: 0, ...o, life, max: life });
  }
  function burst(x, y, n, o = {}) {
    const sp = o.speed || [60, 220], sz = o.size || [2, 4], cols = o.cols || ['#ffd83b', '#fff'], life = o.life || [500, 900];
    for (let i = 0; i < n; i++) {
      const a = o.arc ? lerp(o.arc[0], o.arc[1], Math.random()) : Math.random() * TAU, v = lerp(sp[0], sp[1], Math.random());
      spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.grav ?? 180, drag: o.drag ?? 0.8, life: lerp(life[0], life[1], Math.random()), sz: lerp(sz[0], sz[1], Math.random()), col: cols[(Math.random() * cols.length) | 0], type: o.type || 'sq', add: !!o.add, spin: (Math.random() - 0.5) * 8 });
    }
  }
  const ring = (t0, o) => { if (rings.length > 20) rings.shift(); rings.push({ t0, dur: 600, r0: 4, r1: 100, th: 6, col: '#ffd83b', sq: 1, ...o }); };
  const flash = (t0, dur, a, col = '#fff6d0') => { if (flashes.length > 12) flashes.shift(); flashes.push({ t0, dur, a, col }); };
  const shake = (t0, amp, tau) => { if (shakes.length > 24) shakes.shift(); shakes.push({ t0, amp, tau }); };
  const dust = (x, y, n = 14) => burst(x, y, n, { speed: [30, 130], size: [2, 4], cols: ['#e8e1c8', '#b9b29a', '#ffffff'], arc: [Math.PI, TAU], grav: 60, life: [320, 620] });
  const at = (ms, fn) => ev.push({ t: ms, fn });

  function updateParts(dt) {
    const s = dt / 1000;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * s);
      p.vx *= k; p.vy = p.vy * k + p.g * s;
      if (p.type === 'petal') p.vy = Math.min(p.vy, 40);
      p.x += p.vx * s; p.y += p.vy * s; p.rot += p.spin * s;
    }
    for (let i = rings.length - 1; i >= 0; i--) if (t > rings[i].t0 + rings[i].dur + 50) rings.splice(i, 1);
  }
  function drawParts() {
    for (const p of parts) {
      const f = clamp(p.life / p.max);
      g.save();
      if (p.add) g.globalCompositeOperation = 'lighter';
      g.globalAlpha = clamp(f * 1.6);
      if (p.type === 'flame') {
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = f > 0.7 ? '#fff6b0' : f > 0.45 ? '#ffc83a' : f > 0.2 ? '#ff6a1a' : '#a8201a';
        const s = Math.max(1, p.sz * (0.4 + f)); R(p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.type === 'spark') { g.fillStyle = p.col; R(p.x - 2, p.y, 5, 1); R(p.x, p.y - 2, 1, 5); }
      else if (p.type === 'streak') { g.strokeStyle = p.col; g.lineWidth = p.sz; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke(); }
      else if (p.type === 'bubble') { g.strokeStyle = p.col; g.lineWidth = 1; g.beginPath(); g.arc(p.x, p.y, p.sz, 0, TAU); g.stroke(); }
      else if (p.type === 'smoke') { g.globalAlpha = f * 0.45; g.fillStyle = p.col; circ(p.x, p.y, p.sz * (2.2 - f)); }
      else if (p.type === 'rock') { g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col; g.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-p.sz / 2, -p.sz / 2, p.sz, 1); }
      else if (p.type === 'zzz') { g.font = `${p.sz}px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.globalAlpha = f; g.fillText('Z', p.x + Math.sin(p.life / 200) * 3, p.y); }
      else { g.fillStyle = p.col; const s = Math.max(1, p.sz * (0.5 + 0.5 * f)); R(p.x, p.y, s, s); }
      g.restore();
    }
    g.globalAlpha = 1;
    for (const r of rings) {
      const d = t - r.t0;
      if (d < 0 || d > r.dur) continue;
      const q = d / r.dur, rad = lerp(r.r0, r.r1, E.out3(q));
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - q) ** 1.4; g.strokeStyle = r.col; g.lineWidth = Math.max(1, r.th * (1 - q));
      g.beginPath(); g.ellipse(r.x, r.y, rad, Math.max(1, rad * r.sq), 0, 0, TAU); g.stroke(); g.restore();
    }
  }

  /* Petir bergerigi dengan cabang */
  function bolt(x0, y0, x1, y1, seed, w = 3, branch = true) {
    const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 16)), nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1, pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const q = i / n, off = (hash(seed + i * 7.3) * 2 - 1) * 16 * (1 - Math.abs(q - 0.5) * 0.6); pts.push([lerp(x0, x1, q) + (nx / nl) * off, lerp(y0, y1, q) + (ny / nl) * off]); }
    pts.push([x1, y1]);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter'; g.lineCap = 'square';
    for (const [lw, c, a] of [[w * 4, '#4a9aff', 0.35], [w * 2, '#ffe650', 0.8], [w * 0.8, '#ffffff', 1]]) {
      g.lineWidth = lw; g.strokeStyle = c; g.globalAlpha = a; g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    }
    g.restore();
    if (branch) for (let b = 1; b <= 2; b++) {
      const k = Math.floor(hash(seed + b * 3.7) * (pts.length - 3)) + 1, [bx, by] = pts[k], ang = Math.atan2(y1 - y0, x1 - x0) + (hash(seed + b) * 2 - 1) * 1.1, len = 30 + hash(seed + b * 5) * 50;
      bolt(bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, seed + b * 11, w * 0.6, false);
    }
  }
  /* Sinar tebal (Hyper Beam) */
  function beamLine(x0, y0, x1, y1, w, cols) {
    if (w < 0.5) return;
    const fl = 0.9 + 0.1 * Math.sin(t / 25);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const [m, c, a] of [[2.2, cols[0], 0.3], [1.3, cols[1], 0.6], [0.6, cols[2], 1]]) {
      g.lineWidth = w * m * fl; g.strokeStyle = c; g.globalAlpha = a; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.lineWidth = Math.max(1, w * 0.3); g.strokeStyle = '#fff'; g.globalAlpha = 0.9; g.setLineDash([10, 24]); g.lineDashOffset = -t / 3;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.restore();
  }
  /* Semburan air melengkung (Hydro Pump) */
  function jetLine(x0, y0, x1, y1, w, arc = 30) {
    if (w < 0.5) return;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - arc;
    g.save(); g.lineCap = 'round';
    for (const [m, c, a] of [[1.9, '#2a7cff', 0.4], [1, '#4ab8ff', 0.85], [0.45, '#d8f4ff', 1]]) {
      g.lineWidth = w * m; g.strokeStyle = c; g.globalAlpha = a; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    }
    g.lineWidth = Math.max(1, w * 0.25); g.strokeStyle = '#fff'; g.setLineDash([6, 14]); g.lineDashOffset = -t / 4; g.globalAlpha = 0.9;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    g.restore();
  }

  /* ---------- Latar ---------- */
  const num = (c) => { if (typeof c === 'number') return c; const m = String(c).match(/\d+/g); return (m[0] << 16) | (m[1] << 8) | +m[2]; };
  function sky(top, bot, y1 = H) {
    const N = 20;
    top = num(top); bot = num(bot);
    for (let i = 0; i < N; i++) { fill(MIX(top, bot, (i / (N - 1)) ** 1.2)); g.fillRect(0, Math.floor((i * y1) / N), W, Math.ceil(y1 / N) + 1); }
    g.globalAlpha = 1;
  }
  function starfield(a = 1, ymax = H) {
    for (const s of STARS) {
      if (s.y > ymax) continue;
      fill(hash(s.ph) > 0.7 ? '#fff3b0' : '#cfe4ff', a * (0.3 + 0.7 * Math.abs(Math.sin(t / 500 + s.ph))));
      R(s.x, s.y, s.big ? 2 : 1, s.big ? 2 : 1);
    }
    g.globalAlpha = 1;
  }
  function cloud(x, y, s, c, a = 1) { fill(c, a); R(x, y, 44 * s, 9 * s); R(x + 8 * s, y - 7 * s, 28 * s, 9 * s); R(x + 18 * s, y - 13 * s, 14 * s, 8 * s); R(x - 6 * s, y + 3 * s, 56 * s, 6 * s); g.globalAlpha = 1; }
  function clouds(speed, y0, n, c, a = 1, sc = 1) {
    for (let i = 0; i < n; i++) { const span = W * 1.5, x = ((hash(i * 2.1) * span + t * speed / 1000 * 8) % span) - 70; cloud(x, y0 + hash(i + 3) * H * 0.12, (0.8 + hash(i + 9) * 0.8) * sc, c, a); }
  }
  function hills(base, amp, f, off, c, a = 1) {
    fill(c, a);
    for (let x = 0; x < W; x += 4) { const h = Math.round(base - amp * (0.55 + 0.3 * Math.sin((x + off) * f) + 0.15 * Math.sin((x + off) * f * 2.3 + 1.7))); g.fillRect(x, h, 4, H - h); }
    g.globalAlpha = 1;
  }
  function pine(x, by, h, c1, c2) {
    const tw = Math.max(2, h * 0.07); fill('#3a2616'); R(x - tw / 2, by - h * 0.22, tw, h * 0.22);
    const top = by - h, rows = Math.round((h * 0.8) / 3);
    for (let i = 0; i < rows; i++) { const q = i / rows, w = 2 + q * h * 0.5 + (i % 7 < 2 ? h * 0.06 : 0); fill(i % 7 < 2 ? c2 : c1); R(x - w / 2, top + i * 3, w, 3); }
    g.globalAlpha = 1;
  }
  function pineRow(sc, sp, spacing, by, hf, c1, c2, seed) {
    const base = Math.floor((sc * sp) / spacing);
    for (let i = -1; i < Math.ceil(W / spacing) + 2; i++) { const k = base + i, x = k * spacing - sc * sp + hash(k * 1.7 + seed) * spacing * 0.5; pine(x, by, H * 0.4 * hf * (0.75 + 0.5 * hash(k + seed * 3)), c1, c2); }
  }
  function groundStrip(y, c1, c2, sc = 0, tuft = '#fff', ta = 0.15) {
    fill(c1); g.fillRect(0, y, W, H - y); fill(c2); g.fillRect(0, y, W, 3);
    for (let x = -14; x < W + 14; x += 14) { const k = Math.floor((x + sc) / 14); if (hash(k * 1.9) > 0.55) { fill(tuft, ta); R(x - (sc % 14), y + 6 + hash(k) * (H - y - 10), 5, 1); } }
    g.globalAlpha = 1;
  }
  function pokeball(x, y, r) {
    r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillStyle = Math.abs(dy) <= Math.max(1, r * 0.1) ? '#222' : dy < 0 ? '#d9444d' : '#f4f4f4'; g.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1); }
    fill('#222'); circ(x, y, r * 0.3); fill('#fff'); circ(x, y, r * 0.18); g.globalAlpha = 1;
  }
  function star4(x, y, s, col, a = 1) { fill(col, a); R(x - s, y, s * 2 + 1, 1); R(x, y - s, 1, s * 2 + 1); R(x - 1, y - 1, 3, 3); g.globalAlpha = 1; }

  /* ---------- UI: banner skill, subtitle ---------- */
  function banner(u, u0, dur, title, sub, col) {
    const d = u - u0;
    if (d < 0 || d > dur) return;
    const x = d < 300 ? lerp(-230, 12, E.out3(d / 300)) : d > dur - 300 ? lerp(12, -230, E.in2((d - (dur - 300)) / 300)) : 12, y = BAR + 10, w = 200, h = 28;
    fill('rgba(8,12,30,.8)'); g.fillRect(x, y, w, h); fill(col); g.fillRect(x, y, 4, h); g.fillRect(x, y + h - 2, w * seg(d, 100, 600), 2);
    text(title, x + 12, y + 10, 9, '#fff', '#0d1a33', 'left');
    text(sub, x + 12, y + 21, 6, '#fff3b0', '#0d1a33', 'left');
    g.globalAlpha = 1;
  }
  function caption() {
    const c = CAPS.find(([a, b]) => t >= a && t < b);
    if (!c) return;
    const [a, b, str] = c, n = Math.floor(seg(t, a, a + str.length * 38) * str.length), shown = str.slice(0, n), fade = clamp(Math.min((t - a) / 200, (b - t) / 300));
    g.font = `8px ${FONT}`;
    const maxW = W - 60, words = str.split(' '), lines = [];
    let cur = '';
    for (const w of words) { const test = cur ? `${cur} ${w}` : w; if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
    lines.push(cur);
    let used = 0;
    const y0 = H - BAR - 10 - lines.length * 12;
    g.globalAlpha = fade * 0.45; g.fillStyle = '#000'; g.fillRect(14, y0 - 6, W - 28, lines.length * 12 + 8);
    lines.forEach((ln, i) => {
      const take = Math.max(0, Math.min(ln.length + 1, shown.length - used)); used += ln.length + 1;
      if (take <= 0) return;
      g.globalAlpha = fade; text(ln.slice(0, take), cx, y0 + 4 + i * 12, 8, '#fff7d0', '#0d1a33');
    });
    g.globalAlpha = 1;
  }

  /* ===================================================================== */
  /*  ADEGAN                                                                */
  /* ===================================================================== */

  /* ---- 0 · Poké Ball ---- */
  function s0(u) {
    g.fillStyle = '#02030c'; g.fillRect(0, 0, W, H);
    starfield(1);
    const by = H * 0.52, r = 20 * UF + 8;
    if (u < 3300) {
      const sh = u > 1500 ? Math.sin(u / 55) * 0.28 * seg(u, 1500, 3300) : 0;
      glow(cx, by, r * 2.4, '#ff5a5a', 0.1 + 0.3 * seg(u, 1500, 3300), 4);
      g.save(); g.translate(cx, by); g.rotate(sh); pokeball(0, 0, r); g.restore();
    } else {
      const q = seg(u, 3300, 4000);
      glow(cx, by, 30 + q * 300, '#ffffff', 0.95, 6);
    }
    if (u > 300) { const s = 'EPILOG', n = Math.floor(seg(u, 300, 1100) * s.length); text(s.slice(0, n), cx, H * 0.2, 18, '#ffd83b', '#35609e'); }
    if (u > 1100) { const s = 'KISAH PARA PARTNER', n = Math.floor(seg(u, 1100, 2000) * s.length); text(s.slice(0, n), cx, H * 0.2 + 26, 8, '#fff3b0'); }
  }
  at(1500, () => S('charge', 1800));
  at(3300, () => { flash(3300, 800, 1); burst(cx, H * 0.52, 50, { speed: [80, 320], cols: ['#fff', '#ffd83b', '#ff8a8a'], add: true, grav: 0, life: [500, 900] }); ring(3300, { x: cx, y: H * 0.52, r1: 260, th: 10, col: '#fff', dur: 700 }); S('boom', 0.6); });

  /* ---- 1 · Padang fajar ---- */
  function s1(u) {
    const warm = seg(u, 0, 9000);
    sky(MIX(0x2a3b7e, 0x6fbaff, warm), MIX(0xff7b5c, 0xffe4b0, warm), GY);
    starfield(1 - warm * 1.4, H * 0.4);
    const sx = W * 0.7, sy = lerp(GY - 8, H * 0.34, E.out2(seg(u, 0, 8500)));
    glow(sx, sy, 80, '#ffd88a', 0.55, 6); fill('#fff6c0'); circ(sx, sy, 24); g.globalAlpha = 1;
    clouds(5, H * 0.13, 5, MIX(0xffb9a8, 0xffffff, warm), 0.9);
    hills(GY - 34, 26, 0.012, 0, MIX(0x4a6fa5, 0x7fc48a, warm));
    hills(GY - 14, 16, 0.02, 90, MIX(0x3f7f4a, 0x5fbf62, warm));
    groundStrip(GY - 4, MIX(0x3f8f4a, 0x63c864, warm), MIX(0x5fb85c, 0x8be07a, warm), 0, '#2a6b34', 0.4);
    for (let i = 0; i < 30; i++) { const x = hash(i) * W, y = GY + 4 + hash(i + 9) * (H - GY - BAR - 14); fill(['#ff7aa8', '#fff', '#ffd83b', '#9f7bff'][i % 4]); R(x, y, 2, 2); g.globalAlpha = 1; }
    // kolam
    fill('#1f66a8'); ell(X.sq, GY + 14, 54, 13); fill('#4aa6e8'); ell(X.sq, GY + 13, 48, 10);
    fill('#bfe8ff', 0.6); for (let i = 0; i < 4; i++) R(X.sq - 28 + ((u / 60 + i * 17) % 56), GY + 10 + i * 2, 8, 1); g.globalAlpha = 1;
    if (u > 6000 && u < 6600) every('bub', 120, () => spawn({ x: X.sq + (Math.random() - 0.5) * 30, y: GY + 12, vy: -30, vx: 0, g: 0, life: 500, sz: 2, col: '#d8f4ff', type: 'bubble' }));
    // Snorlax tidur / bangun
    const sleeping = u < 4800, wk = seg(u, 4800, 5600);
    const snSy = sleeping ? 1 + 0.025 * Math.sin(u / 450) : 1 + 0.1 * Math.sin(wk * Math.PI) * (1 - wk) + 0.012 * Math.sin(u / 400);
    const snSx = sleeping ? 1 : 1 - 0.06 * Math.sin(wk * Math.PI);
    if (sleeping) every('zz', 800, () => spawn({ x: X.sn + 34, y: GY - SZ.sn * 0.7, vx: 14, vy: -22, g: 0, drag: 0, life: 1500, sz: 8, type: 'zzz' }));
    // Pikachu masuk
    const pkIn = seg(u, 500, 2300), pkX = lerp(-40, X.pk, E.out2(pkIn));
    const pkLift = pkIn < 1 ? Math.abs(Math.sin(u / 150)) * 14 : (u > 9000 ? Math.abs(Math.sin((u - 9000) / 320)) * 16 * (u < 9950 ? 1 : 0) : 0);
    // Squirtle lompat dari kolam
    const sqq = seg(u, 6600, 7400);
    const sqVis = u >= 6600, sqLift = sqq < 1 ? Math.sin(sqq * Math.PI) * 95 : (u > 9000 ? Math.abs(Math.sin((u - 9000) / 320)) * 16 * (u < 9950 ? 1 : 0) : 0);
    drawTeam([
      ['snorlax', 'd', X.sn, Y.sn, SZ.sn, { sx: snSx, sy: snSy, lift: u > 9000 && u < 9950 ? Math.abs(Math.sin((u - 9000) / 320)) * 14 : 0 }],
      u > 500 && ['pikachu', pkIn < 1 ? 'r' : 'd', pkX, Y.pk, SZ.pk, { lift: pkLift }],
      sqVis && ['squirtle', 'd', lerp(X.sq - 10, X.sq, sqq), Y.sq, SZ.sq, { lift: sqLift, rot: sqq < 1 ? sqq * TAU * 2 : 0, noShadow: sqq < 0.2 }],
    ]);
    banner(u, 2200, 2400, 'PIKACHU', 'TIPE LISTRIK', '#ffd83b');
    banner(u, 4800, 2400, 'SNORLAX', 'TIPE NORMAL', '#e8e1c8');
    banner(u, 7400, 2400, 'SQUIRTLE', 'TIPE AIR', '#4ab8ff');
  }
  const T1 = SCENES[1];
  at(T1 + 800, () => S('whoosh'));
  at(T1 + 2300, () => { burst(X.pk, Y.pk - 30, 22, { speed: [60, 200], cols: ['#fff7a0', '#fff'], type: 'spark', grav: 0, life: [300, 600], add: true }); S('zap'); });
  at(T1 + 4800, () => { dust(X.sn, GY, 16); shake(T1 + 4800, 3, 160); S('wake'); });
  at(T1 + 6600, () => { burst(X.sq, GY + 10, 26, { speed: [60, 220], cols: ['#4ab8ff', '#fff', '#bfe8ff'], arc: [Math.PI, TAU], grav: 420, life: [350, 700] }); ring(T1 + 6600, { x: X.sq, y: GY + 12, r1: 60, sq: 0.3, col: '#bfe8ff' }); S('splash'); });
  at(T1 + 7400, () => { burst(X.sq, GY + 10, 26, { speed: [60, 220], cols: ['#4ab8ff', '#fff', '#bfe8ff'], arc: [Math.PI, TAU], grav: 420, life: [350, 700] }); ring(T1 + 7400, { x: X.sq, y: GY + 12, r1: 60, sq: 0.3, col: '#bfe8ff' }); S('splash'); });
  at(T1 + 9000, () => { burst(cx, GY - 30, 40, { speed: [80, 260], cols: ['#ffd83b', '#fff', '#ff7aa8'], grav: 120, life: [600, 1100] }); S('chime'); });

  /* ---- 2 · Hutan · Thunderbolt ---- */
  const sc2 = (u) => scroll(u, 0.06, 4200, 800, 9300, 700);
  const mv2 = (u) => moving(u, 4200, 800, 9300, 700);
  const pk2 = (u) => { const b = X.pk, D = 120; if (u < 5000) return b; if (u < 5500) return lerp(b, b + 25, E.out2(seg(u, 5000, 5500))); if (u < 7900) return b + 25; if (u < 8180) return lerp(b + 25, b + D, E.out3(seg(u, 7900, 8180))); if (u < 8500) return b + D; if (u < 9300) return lerp(b + D, b, E.io(seg(u, 8500, 9300))); return b; };
  const barX2 = (u) => W - 90 + sc2(4200 + 800) - sc2(u);
  function s2(u) {
    const storm = seg(u, 5000, 6400) * (1 - seg(u, 9500, 10500)), s = sc2(u), m = mv2(u);
    sky(MIX(0x3a86a8, 0x1a1f33, storm), MIX(0xa8e0b0, 0x39405a, storm), GY);
    if (storm > 0.02) { for (let i = 0; i < 6; i++) cloud(((i * 95 + u * 0.01) % (W + 120)) - 60, BAR + 6 + (i % 3) * 12, 2.2, '#2b2f45', storm); }
    pineRow(s, 0.2, 70, GY - 24, 1.2, MIX(0x1f5f58, 0x141b2e, storm), MIX(0x2a7a6a, 0x1c2540, storm), 1);
    pineRow(s, 0.5, 64, GY - 10, 1.05, MIX(0x1b4f3c, 0x101826, storm), MIX(0x2a6b4a, 0x182236, storm), 2);
    groundStrip(GY - 4, MIX(0x3b6b3a, 0x1d2a2a, storm), MIX(0x5a9a4a, 0x2a3a3a, storm), s, '#16301a', 0.4);
    pineRow(s, 1, 58, GY + 2, 0.7, MIX(0x143a2c, 0x0b1220, storm), MIX(0x1f5238, 0x121c2e, storm), 3);
    if (u < 6000) every('ff', 140, () => spawn({ x: Math.random() * W, y: GY - 60 - Math.random() * 60, vx: -10, vy: (Math.random() - 0.5) * 10, g: 0, drag: 0, life: 1400, sz: 2, col: '#e8ff9a', type: 'sq', add: true }));
    // Poké Ball di jalan
    for (const pu of [2200, 3700]) { if (u < pu) { const x = X.pk + 20 + sc2(pu) - s; if (x < W + 20) { glow(x, GY - 14, 16, '#fff3b0', 0.25, 3); pokeball(x, GY - 14 - Math.abs(Math.sin(u / 220)) * 3, 8); } } }
    // penghalang batang pohon
    if (u < 7000) { const bx = barX2(u), by = GY + 2; fill('#5a3a1c'); R(bx - 18, by - 38, 38, 42); fill('#7a5230'); R(bx - 18, by - 38, 38, 4); R(bx - 14, by - 30, 6, 30); fill('#2f6b2f'); R(bx - 24, by - 16, 22, 14); R(bx + 8, by - 20, 22, 18); fill('#3f8f3f'); R(bx - 20, by - 18, 14, 6); g.globalAlpha = 1; fill('#3a2616'); circ(bx + 2, by - 18, 8); fill('#a8794a'); circ(bx + 2, by - 18, 5); g.globalAlpha = 1; }
    // tim
    const w1 = walk(u, 0, m), w2 = walk(u, 1.4, m), w3 = walk(u, 2.8, m);
    const px = pk2(u), dashing = u >= 7900 && u < 8300, chg = seg(u, 5600, 6900) * (u < 6900 ? 1 : 0);
    if (dashing) for (let k = 1; k <= 5; k++) { const xx = pk2(u - k * 22); mon('pikachu', 'r', xx, Y.pk, SZ.pk, { noShadow: true, a: 0.3 * (1 - k / 6), tint: '#ffe650', tintA: 0.7 }); }
    const pkTop = Y.pk - SZ.pk * 0.55;
    drawTeam([
      ['snorlax', 'r', X.sn, Y.sn, SZ.sn, { lift: w1.lift, rot: w1.rot }],
      ['squirtle', 'r', X.sq, Y.sq, SZ.sq, { lift: w2.lift, rot: w2.rot }],
      ['pikachu', 'r', px, Y.pk, SZ.pk, { lift: u > 5000 && u < 7900 ? 0 : w3.lift, rot: dashing ? 0.1 : w3.rot, tint: chg > 0 || dashing ? '#ffe650' : null, tintA: dashing ? 0.6 : 0.3 + 0.3 * Math.sin(u / 40) * chg }],
    ]);
    if (chg > 0) { glow(px, pkTop, 18 + 14 * chg, '#ffe650', 0.4 * chg, 4); every('ch', 60, () => { const a = Math.random() * TAU, r = 30 + Math.random() * 20; spawn({ x: px + Math.cos(a) * r, y: pkTop + Math.sin(a) * r, vx: -Math.cos(a) * 80, vy: -Math.sin(a) * 80, g: 0, drag: 0, life: 380, sz: 2, col: '#fff7a0', type: 'spark', add: true }); }); }
    if (dashing) glow(px, pkTop, 26, '#ffe650', 0.6, 4);
    // Thunderbolt
    const seed = Math.floor(u / 55);
    if (u >= 6900 && u < 7300) { bolt(px, BAR, px, pkTop - 6, seed, 4 * UF); glow(px, pkTop, 40, '#fff', 0.7, 4); }
    if (u >= 7000 && u < 7600) bolt(px + 14, pkTop, Math.min(barX2(u), W - 20), GY - 28, seed + 40, 3 * UF);
    if (u >= 7100 && u < 7800) for (let i = 0; i < 3; i++) { const gx = hash(Math.floor(u / 120) * 3 + i) * W; bolt(gx, BAR, gx + (hash(i + 5) - 0.5) * 40, GY + 2, seed + i * 9, 2 * UF); }
    banner(u, 5600, 2300, 'THUNDERBOLT', 'PIKACHU · LISTRIK', '#ffd83b');
    banner(u, 7900, 2100, 'VOLT TACKLE', 'PIKACHU · LISTRIK', '#ffb02e');
  }
  const T2 = SCENES[2];
  at(T2 + 2200, () => { burst(X.pk + 10, GY - 22, 24, { speed: [60, 220], cols: ['#fff3b0', '#fff'], type: 'spark', grav: -40, life: [400, 800], add: true }); S('chime'); });
  at(T2 + 3700, () => { burst(X.pk + 10, GY - 22, 24, { speed: [60, 220], cols: ['#fff3b0', '#fff'], type: 'spark', grav: -40, life: [400, 800], add: true }); S('chime'); });
  at(T2 + 5300, () => { S('charge', 1500); });
  at(T2 + 6900, () => { flash(T2 + 6900, 600, 1, '#fff'); shake(T2 + 6900, 12, 300); S('thunder'); });
  at(T2 + 7000, () => { const bx = W - 90; burst(bx, GY - 20, 70, { speed: [100, 380], size: [2, 5], cols: ['#7a5230', '#5a3a1c', '#a8794a', '#ffe650'], grav: 380, life: [600, 1200] }); burst(bx, GY - 20, 20, { type: 'smoke', speed: [20, 80], size: [6, 10], cols: ['#555'], grav: -30, life: [800, 1400] }); ring(T2 + 7000, { x: bx, y: GY, r1: 140, sq: 0.3, col: '#ffe650' }); shake(T2 + 7000, 10, 260); S('boom', 0.8); });
  at(T2 + 7900, () => { S('whoosh'); S('zap'); });
  at(T2 + 8180, () => { ring(T2 + 8180, { x: X.pk + 120, y: GY + 2, r1: 120, sq: 0.3, col: '#fff' }); burst(X.pk + 120, GY - 20, 40, { speed: [100, 340], cols: ['#ffe650', '#fff'], type: 'spark', grav: 100, life: [400, 800], add: true }); shake(T2 + 8180, 8, 200); flash(T2 + 8180, 260, 0.5); S('boom', 0.5); });

  /* ---- 3 · Gua Batu · Body Slam + Hyper Beam ---- */
  const sc3 = (u) => scroll(u, 0.05, 2600, 700, 9200, 800);
  const mv3 = (u) => moving(u, 2600, 700, 9200, 800);
  const wallL = (u) => W - 110 + sc3(3300) - sc3(u);
  const sn3 = (u) => (u < 3400 ? X.sn : u < 3900 ? lerp(X.sn, X.sn + 35, E.out2(seg(u, 3400, 3900))) : X.sn + 35);
  const snPose3 = (u) => {
    let sx = 1, sy = 1, lift = 0;
    if (u >= 4000 && u < 4700) { const q = E.io(seg(u, 4000, 4600)); sy = lerp(1, 0.8, q); sx = lerp(1, 1.1, q); }
    else if (u >= 4700 && u < 5300) { const q = seg(u, 4700, 5300); lift = Math.sin(q * Math.PI) * 110 * UF; sy = 1.1; sx = 0.93; }
    else if (u >= 5300 && u < 6200) { const d = (u - 5300) / 1000, sq = Math.exp(-d * 6) * Math.cos(d * 26); sy = 1 - 0.22 * sq; sx = 1 + 0.2 * sq; }
    return { sx, sy, lift };
  };
  function s3(u) {
    const s = sc3(u), m = mv3(u), wl = wallL(u), broken = u >= 7600, leak = seg(u, 7600, 8600);
    sky(0x090818, 0x1c1438);
    // stalaktit
    fill('#120f26'); for (let i = -1; i < W / 38 + 2; i++) { const x = i * 38 - ((s * 0.3) % 38), len = 20 + hash(i + Math.floor(s * 0.3 / 38) * 1.3) * 50; for (let r = 0; r < len; r += 3) { const w = (1 - r / len) * 26; R(x - w / 2, r, w, 3); } }
    g.globalAlpha = 1;
    // kristal berpendar
    for (let i = 0; i < 9; i++) { const x = ((i * 70 - s * 0.6) % (W + 140) + W + 140) % (W + 140) - 40, h = 14 + hash(i) * 22, hue = ['#7a5cff', '#4ab8ff', '#ff5fd2'][i % 3], p = 0.55 + 0.35 * Math.sin(u / 300 + i); glow(x, GY - 6, 26, hue, 0.22 * p, 3); fill(hue, 0.9); for (let r = 0; r < h; r += 2) R(x - (h - r) * 0.22, GY - 4 - r, (h - r) * 0.44, 2); g.globalAlpha = 1; }
    groundStrip(GY - 4, '#241d36', '#3d3350', s, '#6b5f8a', 0.3);
    glow(cx, GY - 40, 180, '#ffb86a', 0.1 + 0.02 * Math.sin(u / 90), 5);
    // dinding batu
    if (!broken && wl < W + 130) {
      const bw = 15, bh = 14, cols = 9;
      for (let c = 0; c < cols; c++) for (let r = 0; r * bh < GY - BAR + 4; r++) { const h = hash(c * 17 + r * 3.1); fill(MIX(0x4a4458, 0x6e6880, h)); R(wl + c * bw, BAR + r * bh, bw - 1, bh - 1); fill('#fff', 0.12); R(wl + c * bw, BAR + r * bh, bw - 1, 1); }
      g.globalAlpha = 1;
      if (u >= 5300) { g.strokeStyle = '#0a0814'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 5; i++) { let x = wl + 8 + hash(i) * 90, y = BAR + hash(i + 4) * (GY - BAR) * 0.5; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (hash(i * 5 + k) - 0.5) * 24; y += 14 + hash(i + k * 2) * 12; g.lineTo(x, y); } } g.stroke(); }
    }
    if (leak > 0) { glow(W + 10, GY - 50, 260, '#fff2c0', 0.55 * leak, 6); g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 8; i++) { const a = Math.PI + (i - 3.5) * 0.12, w2 = 0.05; g.fillStyle = `rgba(255,242,192,${(0.1 * leak).toFixed(3)})`; g.beginPath(); g.moveTo(W + 20, GY - 50); g.lineTo(W + 20 + Math.cos(a - w2) * 500, GY - 50 + Math.sin(a - w2) * 500); g.lineTo(W + 20 + Math.cos(a + w2) * 500, GY - 50 + Math.sin(a + w2) * 500); g.fill(); } g.restore(); }
    // tim
    const w1 = walk(u, 0, m), w2 = walk(u, 1.4, m), w3 = walk(u, 2.8, m), sp = snPose3(u), snx = sn3(u);
    const charge = seg(u, 6200, 7400) * (u < 7400 ? 1 : 0), fire = u >= 7400 && u < 8800;
    drawTeam([
      ['snorlax', 'r', snx - (fire ? 3 : 0), Y.sn, SZ.sn, { sx: sp.sx, sy: sp.sy, lift: sp.lift + (u > 5300 && u < 6200 ? 0 : w1.lift), rot: fire ? -0.03 : w1.rot, white: u >= 5300 && u < 5400 ? 0.7 : 0, tint: charge > 0 ? '#ffb02e' : null, tintA: 0.3 * charge }],
      ['squirtle', 'r', X.sq, Y.sq, SZ.sq, { lift: w2.lift, rot: w2.rot }],
      ['pikachu', 'r', X.pk, Y.pk, SZ.pk, { lift: w3.lift, rot: w3.rot }],
    ]);
    // Hyper Beam
    const ox = snx + SZ.sn * 0.34, oy = GY - SZ.sn * 0.5;
    if (charge > 0) { const r = 4 + 20 * UF * charge; glow(ox + 6, oy, r * 2.2, '#ffb02e', 0.5, 5); fill('#fff'); circ(ox + 6, oy, r * 0.5); g.globalAlpha = 1; every('hb', 40, () => { const a = Math.random() * TAU, d = 50 + Math.random() * 40; spawn({ x: ox + 6 + Math.cos(a) * d, y: oy + Math.sin(a) * d, vx: -Math.cos(a) * d * 3, vy: -Math.sin(a) * d * 3, g: 0, drag: 0, life: 320, sz: 2, col: '#ffcf6a', add: true }); }); }
    if (fire) { const w = 18 * UF * E.out2(seg(u, 7400, 7520)) * (1 - E.in2(seg(u, 8500, 8800))), tx = broken ? W + 40 : wl; beamLine(ox + 6, oy, tx, oy, w, ['#ff7a1a', '#ffd070', '#ffffff']); glow(ox + 6, oy, 18 * UF, '#fff', 0.7, 4); if (!broken) glow(tx, oy, 30, '#fff', 0.8, 4); else every('bs', 50, () => spawn({ x: W - Math.random() * 60, y: oy + (Math.random() - 0.5) * 30, vx: 120, vy: (Math.random() - 0.5) * 80, g: 0, life: 400, sz: 2, col: '#fff3b0', add: true })); }
    banner(u, 3900, 2300, 'BODY SLAM', 'SNORLAX · TIPE NORMAL', '#e8e1c8');
    banner(u, 6000, 2300, 'HYPER BEAM', 'SNORLAX · PAMUNGKAS', '#ff7a1a');
    if (charge > 0) { g.fillStyle = '#000'; g.globalAlpha = 0.25 * charge; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  const T3 = SCENES[3];
  at(T3 + 5300, () => { const x = X.sn + 35, tt = T3 + 5300; shake(tt, 16, 340); flash(tt, 300, 0.5); ring(tt, { x, y: GY + 2, r1: 280, sq: 0.22, th: 9, col: '#e8e1c8', dur: 700 }); ring(tt + 80, { x, y: GY + 2, r1: 200, sq: 0.22, th: 6, col: '#fff', dur: 700 }); dust(x, GY, 34); burst(cx, BAR + 4, 50, { speed: [20, 140], size: [3, 6], cols: ['#6e6880', '#4a4458', '#8a84a0'], arc: [0.2, Math.PI - 0.2], grav: 520, type: 'rock', life: [900, 1500] }); S('boom', 1.2); });
  at(T3 + 6000, () => S('charge', 1400));
  at(T3 + 7400, () => S('beam', 1500));
  at(T3 + 7600, () => { const wl = W - 110, tt = T3 + 7600; for (let c = 0; c < 9; c++) for (let r = 0; r * 14 < GY - BAR; r++) if ((c + r) % 2 === 0) spawn({ x: wl + c * 15, y: BAR + r * 14, vx: 140 + Math.random() * 380, vy: (Math.random() - 0.5) * 260, g: 420, drag: 0.4, life: 900 + Math.random() * 700, sz: 4 + Math.random() * 4, col: ['#6e6880', '#4a4458', '#8a84a0'][(Math.random() * 3) | 0], type: 'rock', spin: (Math.random() - 0.5) * 10 }); flash(tt, 700, 1, '#fff'); shake(tt, 18, 420); ring(tt, { x: wl, y: GY - 40, r1: 320, th: 12, col: '#fff', dur: 800 }); dust(wl + 40, GY, 30); S('boom', 1.5); });

  /* ---- 4 · Pantai · Rapid Spin + Hydro Pump ---- */
  const sc4 = (u) => scroll(u, 0.055, 3200, 700, 8700, 800);
  const mv4 = (u) => moving(u, 3200, 700, 8700, 800);
  const fireX = (u) => W - 80 + sc4(3900) - sc4(u);
  const fireLv = (u) => 1 - seg(u, 6500, 7600);
  const sq4 = (u) => (u < 3400 ? X.sq : u < 3900 ? lerp(X.sq, X.sq + 55, E.out2(seg(u, 3400, 3900))) : X.sq + 55);
  function s4(u) {
    const s = sc4(u), m = mv4(u), hz = Math.round(H * 0.46);
    sky(0x35287a, 0xff8f4f, hz);
    fill('#ffd89a'); circ(W * 0.3, hz - 2, 34); glow(W * 0.3, hz - 6, 90, '#ffb06a', 0.5, 6);
    // laut
    for (let y = hz; y < GY - 14; y += 3) { const q = (y - hz) / (GY - 14 - hz); fill(MIX(0xff9a5a, 0x1f5f9a, Math.min(1, q * 1.2))); g.fillRect(0, y, W, 3); }
    for (let y = hz + 4; y < GY - 18; y += 6) { const q = (y - hz) / (GY - hz); for (let x = -20; x < W + 20; x += 34) { const o = Math.sin(u / 500 + y * 0.4 + x * 0.1) * 6; fill('#fff', 0.18 + q * 0.2); R(x + o + ((y * 7) % 20), y, 10 + q * 12, 1); } }
    fill('#ffe6b0', 0.4); for (let i = 0; i < 9; i++) R(W * 0.3 - 30 + hash(i) * 60 + Math.sin(u / 300 + i) * 6, hz + 3 + i * 7, 26 - i * 2, 2); g.globalAlpha = 1;
    // burung camar
    for (let i = 0; i < 4; i++) { const x = ((i * 130 + u * 0.03) % (W + 80)) - 40, y = H * 0.18 + i * 12 + Math.sin(u / 400 + i) * 4, f = Math.sin(u / 120 + i) * 3; g.strokeStyle = '#2a1a3a'; g.lineWidth = 1.5; g.globalAlpha = 1; g.beginPath(); g.moveTo(x - 6, y - f); g.lineTo(x, y + 2); g.lineTo(x + 6, y - f); g.stroke(); }
    // pelangi
    const rb = seg(u, 7300, 8300);
    if (rb > 0) ['#ff4a4a', '#ff9a3a', '#ffe650', '#6fe06a', '#4ab8ff', '#6a5cff', '#c05cff'].forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = 0.55 * rb; g.lineWidth = 5; g.beginPath(); g.arc(W * 0.5, GY + 30, H * 0.5 + i * 5, Math.PI, TAU); g.stroke(); });
    g.globalAlpha = 1;
    groundStrip(GY - 16, '#e8c98a', '#f5dda4', s, '#b8975a', 0.5);
    // palem
    for (let i = -1; i < 4; i++) { const k = Math.floor(s * 0.4 / 170) + i, x = k * 170 - s * 0.4 + 40 + hash(k) * 60, by = GY - 14; fill('#1a1020'); for (let r = 0; r < 70; r += 3) R(x + Math.sin(r * 0.06) * 6, by - r, 5, 3); g.globalAlpha = 1; g.strokeStyle = '#1a1020'; g.lineWidth = 3; g.beginPath(); for (let a = 0; a < 6; a++) { const ang = -Math.PI * (0.1 + a * 0.16); g.moveTo(x + 4, by - 70); g.quadraticCurveTo(x + 4 + Math.cos(ang) * 22, by - 70 + Math.sin(ang) * 22 - 8, x + 4 + Math.cos(ang) * 34, by - 70 + Math.sin(ang) * 34 + 8); } g.stroke(); }
    for (let i = 0; i < 18; i++) { const x = (((hash(i * 3) * 700 - s) % 520) + 520) % 520 - 20; fill('#c0a26a'); R(x, GY - 10 + hash(i + 4) * (H - GY + 8), 3, 1); g.globalAlpha = 1; }
    if (u < 2000) { const x = X.pk + 20 + scroll(2000, 0.055, 3200, 700) - s; glow(x, GY - 10, 16, '#fff3b0', 0.25, 3); pokeball(x, GY - 10, 8); }
    // dinding api
    const lv = fireLv(u), fx = fireX(u), fb = GY - 2, fw = 46, fh = 72 * UF;
    fill('#3a2616'); R(fx - 26, fb - 10, 52, 10); fill('#241608'); R(fx - 22, fb - 18, 44, 8); g.globalAlpha = 1;
    if (lv > 0.01) { g.save(); g.globalCompositeOperation = 'lighter'; for (let c = 0; c < fw; c += 4) { const edge = 1 - Math.abs(c - fw / 2) / (fw / 2) * 0.35, hh = fh * lv * (0.6 + 0.4 * Math.abs(Math.sin(u / 110 + c * 0.9))) * edge; [['#ff3a1a', 1], ['#ff8a1a', 0.75], ['#ffd23a', 0.5], ['#fff6b0', 0.25]].forEach(([col, k]) => { g.fillStyle = col; g.globalAlpha = 0.9; g.fillRect(fx - fw / 2 + c, fb - 10 - hh * k, 4, hh * k); }); } g.restore(); glow(fx, fb - 30, 70 * lv + 10, '#ff8a2a', 0.3 * lv, 4); every('fe', 70, () => { if (fireLv(u) > 0.2) spawn({ x: fx + (Math.random() - 0.5) * fw, y: fb - 20, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, g: -20, life: 700, sz: 3, type: 'flame' }); }); }
    // tim
    const w1 = walk(u, 0, m), w2 = walk(u, 1.4, m), w3 = walk(u, 2.8, m);
    const sqx = sq4(u), spin = seg(u, 3800, 5000), jet = u >= 6400 && u < 8000, hch = seg(u, 5600, 6400) * (u < 6400 ? 1 : 0);
    const jw = 11 * UF * E.out2(seg(u, 6400, 6560)) * (1 - E.in2(seg(u, 7700, 8000))), rec = jw > 1 ? 1 : 0;
    const cheer = u > 8200 ? Math.abs(Math.sin((u - 8200) / 300)) * 8 * (u < 9400 ? 1 : 0) : 0;
    drawTeam([
      ['snorlax', 'r', X.sn, Y.sn, SZ.sn, { lift: u > 8200 ? cheer : w1.lift, rot: w1.rot }],
      ['pikachu', 'r', X.pk, Y.pk, SZ.pk, { lift: u > 8200 ? cheer * 1.4 : w3.lift, rot: w3.rot }],
      ['squirtle', 'r', sqx - rec * 4, Y.sq, SZ.sq, { lift: spin > 0 && spin < 1 ? Math.abs(Math.sin(spin * Math.PI * 3)) * 12 : u < 3400 || u > 8700 ? w2.lift : 0, rot: spin > 0 && spin < 1 ? E.io(spin) * TAU * 3 : rec ? -0.05 : w2.rot, sx: 1 + 0.08 * Math.sin(u / 60) * hch, tint: spin > 0 && spin < 1 || hch > 0 ? '#4ab8ff' : null, tintA: 0.3 }],
    ]);
    const sqTop = Y.sq - SZ.sq * 0.5;
    if (spin > 0 && spin < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#bfe8ff'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.globalAlpha = 0.7; g.beginPath(); g.ellipse(sqx, sqTop, 30 + i * 6, 14 + i * 3, 0, u / 80 + i * 2, u / 80 + i * 2 + 2.2); g.stroke(); } g.restore(); every('rs', 50, () => spawn({ x: sqx + (Math.random() - 0.5) * 30, y: sqTop + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 120, vy: -30, g: 120, life: 500, sz: 2, col: '#d8f4ff', type: 'bubble' })); }
    if (hch > 0) { glow(sqx + SZ.sq * 0.4, sqTop, 6 + 16 * hch, '#4ab8ff', 0.5, 4); every('hc', 45, () => { const a = Math.random() * TAU, d = 50; spawn({ x: sqx + SZ.sq * 0.4 + Math.cos(a) * d, y: sqTop + Math.sin(a) * d, vx: -Math.cos(a) * d * 3, vy: -Math.sin(a) * d * 3, g: 0, drag: 0, life: 320, sz: 3, col: '#8fd0ff', type: 'bubble' }); }); }
    if (jet) { const x0 = sqx + SZ.sq * 0.42, y0 = sqTop, x1 = fx - 8, y1 = GY - 34; jetLine(x0, y0, x1, y1, jw, 34); glow(x1, y1, 22, '#bfe8ff', 0.6, 4); every('js', 35, () => { spawn({ x: x1, y: y1, vx: (Math.random() - 0.3) * 160, vy: -60 - Math.random() * 140, g: 300, life: 600, sz: 2, col: '#d8f4ff', type: 'sq' }); if (fireLv(u) > 0.05) spawn({ x: fx + (Math.random() - 0.5) * 30, y: fb - 30, vx: 0, vy: -50, g: -20, life: 1000, sz: 8, col: '#e8e8f0', type: 'smoke' }); }); }
    banner(u, 3700, 2100, 'RAPID SPIN', 'SQUIRTLE · TIPE AIR', '#4ab8ff');
    banner(u, 5700, 2300, 'HYDRO PUMP', 'SQUIRTLE · TIPE AIR', '#2a7cff');
  }
  const T4 = SCENES[4];
  at(T4 + 2000, () => { burst(X.pk + 20, GY - 10, 20, { speed: [60, 200], cols: ['#fff3b0', '#fff'], type: 'spark', grav: -40, life: [400, 800], add: true }); S('chime'); });
  at(T4 + 3800, () => S('whoosh'));
  at(T4 + 5000, () => { const x = X.sq + 55; ring(T4 + 5000, { x, y: GY + 10, r1: 70, sq: 0.3, col: '#bfe8ff' }); burst(x, GY + 6, 24, { speed: [60, 200], cols: ['#4ab8ff', '#fff'], arc: [Math.PI, TAU], grav: 420, life: [300, 600] }); S('splash'); });
  at(T4 + 5600, () => S('charge', 800));
  at(T4 + 6400, () => { S('water', 1600); S('crackle', 1000); });
  at(T4 + 6600, () => S('steam'));
  at(T4 + 7600, () => { burst(W - 80 + 0, GY - 30, 30, { type: 'smoke', speed: [10, 50], size: [6, 10], cols: ['#ddd'], grav: -30, life: [900, 1500] }); S('chime'); });

  /* ---- 5 · Malam · rasi Prim + TRI COMBO ---- */
  const CN = [[0.12, 0.3], [0.26, 0.14], [0.4, 0.28], [0.5, 0.1], [0.62, 0.26], [0.76, 0.14], [0.88, 0.3], [0.33, 0.4], [0.7, 0.4]].map(([a, b]) => ({ x: W * a, y: H * b }));
  const CE = (() => { const inT = new Set([0]), out = []; while (inT.size < CN.length) { let best = null; for (const a of inT) for (let b = 0; b < CN.length; b++) { if (inT.has(b)) continue; const d = Math.hypot(CN[a].x - CN[b].x, CN[a].y - CN[b].y); if (!best || d < best.d) best = { a, b, d }; } inT.add(best.b); out.push(best); } return out; })();
  const CC = { x: CN.reduce((s, n) => s + n.x, 0) / CN.length, y: CN.reduce((s, n) => s + n.y, 0) / CN.length };
  function peaks(base, hmax, sp, c, snow, off) { for (let i = -1; i < W / sp + 2; i++) { const px = i * sp + off, h = hmax * (0.6 + 0.4 * hash(i * 3.3 + off)), rows = Math.round(h / 3); for (let r = 0; r < rows; r++) { fill(r < rows * 0.22 ? snow : c); const w = r * 3 * 1.1; R(px - w / 2, base - h + r * 3, w, 3); } } g.globalAlpha = 1; }
  function s5(u) {
    const dawn = seg(u, 9400, 11000);
    sky(MIX(0x040820, 0x6a4aa8, dawn), MIX(0x1b2c62, 0xffa87a, dawn));
    starfield(1 - dawn, H * 0.5);
    glow(W * 0.2, H * 0.2, 40, '#dfe8ff', 0.25 * (1 - dawn), 4); fill('#f4f6ff', 1 - dawn * 0.7); circ(W * 0.2, H * 0.2, 14); fill('#c9d2f0', 1 - dawn * 0.7); circ(W * 0.2 + 4, H * 0.2 - 3, 4); g.globalAlpha = 1;
    // aurora
    g.save(); g.globalCompositeOperation = 'lighter'; for (let x = 0; x < W; x += 4) for (let k = 0; k < 2; k++) { const y = H * (0.2 + 0.08 * k) + Math.sin(x * 0.02 + u / 900 + k * 2) * 14, a = (0.08 + 0.05 * Math.sin(x * 0.05 + u / 500)) * (1 - dawn); g.fillStyle = k ? `rgba(160,100,255,${a})` : `rgba(80,255,170,${a})`; g.fillRect(x, y, 4, 36); } g.restore();
    peaks(GY - 10, H * 0.36, 130, '#101a38', '#3a4a80', 20);
    peaks(GY - 4, H * 0.24, 90, '#0a1226', '#2a3a68', 60);
    // konstelasi (pohon rentang Prim)
    const lit = seg(u, 3800 + CE.length * 380, 3800 + CE.length * 380 + 600);
    CN.forEach((n, i) => { const e = CE.findIndex((c) => c.b === i), at0 = e < 0 ? 3600 : 3800 + e * 380 + 300, a = seg(u, at0 - 200, at0 + 150); if (a > 0) { star4(n.x, n.y, 3 + Math.round(2 * Math.sin(u / 300 + i)), lit > 0 ? '#ffe9a0' : '#fff', a); glow(n.x, n.y, 12, '#ffe9a0', 0.4 * a, 3); } });
    g.save(); g.lineWidth = 1.5; for (let k = 0; k < CE.length; k++) { const q = seg(u, 3800 + k * 380, 3800 + k * 380 + 320); if (q <= 0) continue; const A = CN[CE[k].a], B = CN[CE[k].b]; g.strokeStyle = lit > 0 ? '#ffe9a0' : '#bfe0ff'; g.globalAlpha = (0.5 + 0.4 * lit) * (1 - dawn); g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(lerp(A.x, B.x, q), lerp(A.y, B.y, q)); g.stroke(); } g.restore();
    // bintang jatuh
    for (const [u0, x0, y0, x1, y1] of [[1500, W * 0.9, H * 0.1, W * 0.55, H * 0.3], [3200, W * 0.6, H * 0.06, W * 0.2, H * 0.28]]) { const q = seg(u, u0, u0 + 700); if (q > 0 && q < 1) { const hx = lerp(x0, x1, q), hy = lerp(y0, y1, q); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.globalAlpha = 1 - q; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - (x1 - x0) * 0.2, hy - (y1 - y0) * 0.2); g.stroke(); g.restore(); } }
    groundStrip(GY - 2, '#141c2c', '#243448', 0, '#3a4a66', 0.5);
    for (const [x, h] of [[30, 90], [78, 66], [W - 40, 100], [W - 92, 70]]) pine(x, GY + 6, h * (H / 270 > 1 ? 1.2 : 1), '#0a1418', '#12202a');
    // api unggun
    const fx = cx - 10, fy = GY + 6;
    glow(fx, fy - 20, 130 + 6 * Math.sin(u / 70), '#ff8a2a', 0.22, 5);
    fill('#3a2616'); R(fx - 14, fy - 4, 28, 5); R(fx - 10, fy - 8, 20, 5); g.globalAlpha = 1;
    every('cf', 40, () => spawn({ x: fx + (Math.random() - 0.5) * 12, y: fy - 8, vx: (Math.random() - 0.5) * 12, vy: -50 - Math.random() * 40, g: -10, life: 600, sz: 5, type: 'flame' }));
    every('em', 220, () => spawn({ x: fx, y: fy - 14, vx: (Math.random() - 0.5) * 40, vy: -60, g: -5, life: 1400, sz: 1, col: '#ffcf6a', type: 'sq', add: true }));
    // karakter
    const jump = u >= 7300 ? Math.abs(Math.sin(seg(u, 7300, 7700) * Math.PI)) * 14 : 0, br = Math.sin(u / 450);
    const combo = seg(u, 7300, 8300) * (u < 8300 ? 1 : 0), fire = u >= 8300 && u < 9500;
    if (u < 7300) every('z5', 900, () => spawn({ x: X.sn + 34, y: GY - SZ.sn * 0.7, vx: 14, vy: -22, g: 0, drag: 0, life: 1500, sz: 8, type: 'zzz' }));
    const hot = u >= 7300 ? 0.3 : 0;
    drawTeam([
      ['snorlax', 'd', X.sn, Y.sn, SZ.sn, { sy: 1 + 0.02 * br, lift: jump, dark: 0.35 * (1 - hot), tint: combo > 0 || fire ? '#ffb02e' : null, tintA: 0.3 }],
      ['pikachu', 'd', X.pk - 25, Y.pk, SZ.pk, { sy: 1 + 0.015 * br, lift: jump * 1.2, dark: 0.3 * (1 - hot), tint: combo > 0 || fire ? '#ffe650' : null, tintA: 0.35 }],
      ['squirtle', 'd', X.sq + 120, Y.sq, SZ.sq, { sy: 1 + 0.015 * br, lift: jump, dark: 0.3 * (1 - hot), tint: combo > 0 || fire ? '#4ab8ff' : null, tintA: 0.35 }],
    ]);
    // TRI COMBO
    const hP = { x: X.pk - 25, y: Y.pk - SZ.pk * 0.95 }, hS = { x: X.sq + 120, y: Y.sq - SZ.sq * 0.95 }, hN = { x: X.sn + 10, y: Y.sn - SZ.sn * 0.95 };
    if (combo > 0) { glow(hP.x, hP.y, 10 + 14 * combo, '#ffe650', 0.5, 4); glow(hS.x, hS.y, 10 + 14 * combo, '#4ab8ff', 0.5, 4); glow(hN.x, hN.y, 10 + 14 * combo, '#ff9a2a', 0.5, 4); }
    if (fire) { const k = E.out2(seg(u, 8300, 8450)) * (1 - E.in2(seg(u, 9300, 9500))), seed = Math.floor(u / 55); bolt(hP.x, hP.y, lerp(hP.x, CC.x, k), lerp(hP.y, CC.y, k), seed, 3 * UF); jetLine(hS.x, hS.y, lerp(hS.x, CC.x, k), lerp(hS.y, CC.y, k), 9 * UF * (1 - E.in2(seg(u, 9300, 9500))), 24); beamLine(hN.x, hN.y, lerp(hN.x, CC.x, k), lerp(hN.y, CC.y, k), 14 * UF * (1 - E.in2(seg(u, 9300, 9500))), ['#ff7a1a', '#ffd070', '#ffffff']); glow(CC.x, CC.y, 12 + 90 * E.in2(seg(u, 8300, 9400)), '#fff', 0.8, 6); }
    banner(u, 7300, 2400, 'TRI COMBO', 'THUNDER · HYDRO · BEAM', '#ff5fd2');
  }
  const T5 = SCENES[5];
  at(T5 + 1500, () => S('star')); at(T5 + 3200, () => S('star'));
  CE.forEach((_, k) => at(T5 + 3800 + k * 380, () => S('node')));
  at(T5 + 3800 + CE.length * 380 + 100, () => { S('sunrise'); burst(CC.x, CC.y, 40, { speed: [30, 140], cols: ['#ffe9a0', '#fff'], add: true, grav: 0, life: [600, 1100] }); });
  at(T5 + 7300, () => { S('combo'); S('charge', 1000); });
  at(T5 + 8300, () => { S('thunder'); S('beam', 1200); S('water', 1200); });
  at(T5 + 9400, () => { const tt = T5 + 9400; flash(tt, 1300, 1, '#fff'); shake(tt, 20, 500); for (let i = 0; i < 4; i++) ring(tt + i * 90, { x: CC.x, y: CC.y, r1: 380 - i * 50, th: 14 - i * 2, col: ['#fff', '#ffd83b', '#4ab8ff', '#ff7aa8'][i], dur: 1000 }); burst(CC.x, CC.y, 140, { speed: [120, 480], cols: ['#ffd83b', '#fff', '#ff7aa8', '#4ab8ff'], add: true, grav: 60, life: [800, 1500] }); S('boom', 2); });

  /* ---- 6 · Puncak · fajar + kredit ---- */
  function s6(u) {
    const dawn = seg(u, 0, 9000), hz = Math.round(H * 0.58);
    sky(MIX(0x4a3a9a, 0x6fa8ff, dawn * 0.6), MIX(0xff7ab0, 0xffe0a0, dawn), hz + 4);
    fill(MIX(0xffe0a0, 0xffc890, 0)); g.fillRect(0, hz, W, H - hz);
    const sx = cx, sy = lerp(hz + 36, hz - 56, E.out3(seg(u, 300, 6000)));
    g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const a = u / 6000 + (i * TAU) / 16, w = (TAU / 16) * 0.3; g.fillStyle = `rgba(255,230,160,${(0.08 + 0.07 * dawn) * (i % 2 ? 0.6 : 1)})`; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a - w) * 600, sy + Math.sin(a - w) * 600); g.lineTo(sx + Math.cos(a + w) * 600, sy + Math.sin(a + w) * 600); g.fill(); } g.restore();
    glow(sx, sy, 100, '#ffd88a', 0.6, 6); fill('#fff6c0'); circ(sx, sy, 30); fill('#ffe28a'); circ(sx, sy, 26); g.globalAlpha = 1;
    hills(hz + 6, 28, 0.012, 30, '#7a58b0', 0.8);
    for (let k = 0; k < 3; k++) { const y = hz + 2 + k * 16; for (let i = 0; i < 5; i++) { const sp = 3 + k * 2, x = ((i * 150 + u * sp / 100) % (W + 200)) - 100; cloud(x, y, 1.8 + k * 0.4, MIX(0xffd0e0, 0xffffff, k / 2), 0.95); } }
    fill('#ffd0e0'); g.fillRect(0, hz + 40, W, H - hz - 40); g.globalAlpha = 1;
    clouds(3, hz + 36, 5, '#fff0f4', 0.9, 2);
    hills(GY - 2, 6, 0.03, 40, '#1d2a1f'); fill('#1d2a1f'); g.fillRect(0, GY + 6, W, H); g.globalAlpha = 1;
    for (let x = 0; x < W; x += 7) if (hash(x) > 0.4) { fill('#2a4a2c'); R(x, GY - 4 - hash(x + 1) * 6, 2, 8); } g.globalAlpha = 1;
    // petal tertiup angin
    every('pt', 130, () => spawn({ x: -4, y: GY - 60 - Math.random() * 120, vx: 60 + Math.random() * 60, vy: 4, g: 14, drag: 0.1, life: 4200, sz: 2, col: Math.random() < 0.5 ? '#ffb0d0' : '#fff', type: 'petal', spin: 3 }));
    // burung
    if (u > 2000 && u < 7500) for (let i = 0; i < 6; i++) { const q = seg(u, 2000 + i * 120, 7000 + i * 120), x = lerp(-30, W + 30, q), y = H * 0.22 + i * 7 + Math.sin(q * 9 + i) * 6, f = Math.sin(u / 110 + i) * 3; g.strokeStyle = '#3a2050'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 5, y - f); g.lineTo(x, y + 2); g.lineTo(x + 5, y - f); g.stroke(); }
    const br = Math.sin(u / 500);
    drawTeam([
      ['snorlax', 'u', cx - 80, GY + 12, SZ.sn, { sy: 1 + 0.012 * br, dark: 0.45 }],
      ['squirtle', 'u', cx - 2, GY + 16, SZ.sq, { sy: 1 + 0.012 * br, dark: 0.45 }],
      ['pikachu', 'u', cx + 70, GY + 12, SZ.pk, { sy: 1 + 0.012 * br, dark: 0.45, lift: u > 4600 && u < 5000 ? Math.abs(Math.sin((u - 4600) / 400 * Math.PI)) * 10 : 0 }],
    ]);
    // kredit
    const ty = H * 0.13;
    if (u > 5200) { const q = seg(u, 5200, 5900), sc2 = lerp(2.2, 1, E.out3(q)); g.save(); g.globalAlpha = q; g.translate(cx, ty); g.scale(sc2, sc2); text('POKÉMON MAZE', 0, 0, 20, '#ffd83b', '#35609e'); g.restore(); }
    if (u > 6200) { g.globalAlpha = seg(u, 6200, 6600); text('KELOMPOK 6', cx, ty + 26, 9, '#fff', '#35609e'); g.globalAlpha = 1; }
    NAMES.forEach((n, i) => { const a = seg(u, 6700 + i * 330, 7000 + i * 330); if (a > 0) { g.globalAlpha = a; text(n, cx, ty + 46 + i * 12, 7, '#fff3b0', '#243d63'); g.globalAlpha = 1; } });
  }
  const T6 = SCENES[6];
  at(T6 + 300, () => S('sunrise'));
  at(T6 + 5200, () => { flash(T6 + 5200, 500, 0.5); burst(cx, H * 0.13, 40, { speed: [80, 260], cols: ['#ffd83b', '#fff'], add: true, grav: 80, life: [600, 1100] }); S('boom', 0.8); });

  ev.sort((a, b) => a.t - b.t);

  /* ---------- Kamera & overlay ---------- */
  function camera(si, u) {
    let z = 1.04, px = 0, py = 0;
    if (si === 1) z = lerp(1.07, 1, seg(u, 0, 10000));
    if (si === 2) { z = 1.03 + 0.05 * seg(u, 5600, 6900) - 0.05 * seg(u, 6900, 7300); }
    if (si === 3) { z = 1.03 + 0.07 * seg(u, 6200, 7400) * (u < 7400 ? 1 : 0); }
    if (si === 4) z = 1.03 + 0.04 * seg(u, 5600, 6400) * (u < 6400 ? 1 : 0);
    if (si === 5) z = lerp(1.02, 1.1, seg(u, 7300, 9400)) - 0.1 * seg(u, 9400, 9800);
    if (si === 6) z = lerp(1.16, 1.0, E.io(seg(u, 0, 8000)));
    if (si === 0) z = lerp(1.0, 1.12, seg(u, 0, 3300));
    for (const s of shakes) { const d = t - s.t0; if (d >= 0 && d < s.tau * 5) { const a = s.amp * Math.exp(-d / s.tau); px += (hash(Math.floor(t / 22) * 3.1 + 1) * 2 - 1) * a; py += (hash(Math.floor(t / 22) * 3.1 + 2) * 2 - 1) * a * 0.8; } }
    return { z: Math.max(z, 1.0 + Math.abs(px) / W * 2), px: Math.round(px), py: Math.round(py) };
  }

  function render(ctx2d, tms, dt, extraWhite = 0) {
    g = ctx2d; t = tms; dtMs = dt;
    while (ei < ev.length && ev[ei].t <= t) { try { ev[ei].fn(); } catch (e) { console.error(e); } ei++; }
    updateParts(dt);
    const si = sceneAt(t), u = t - SCENES[si], dur = SCENES[si + 1] - SCENES[si];
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cam = camera(si, u);
    g.save();
    g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-W / 2 + cam.px, -H / 2 + cam.py);
    [s0, s1, s2, s3, s4, s5, s6][si](u);
    drawParts();
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // vinyet
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.58);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // kilat
    let fa = 0, fc = '#fff6d0';
    for (const f of flashes) { const d = t - f.t0; if (d >= 0 && d <= f.dur) { const a = f.a * (1 - d / f.dur) ** 2; if (a > fa) { fa = a; fc = f.col; } } }
    if (fa > 0.01) { g.globalAlpha = Math.min(1, fa); g.fillStyle = fc; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    caption();
    // bar sinematik
    g.fillStyle = '#000'; g.fillRect(0, 0, W, BAR); g.fillRect(0, H - BAR, W, BAR);
    // transisi antar adegan
    let ov = 0, oc = '#000';
    if (si === 0) { ov = seg(u, 3500, 4000); oc = '#fff'; }
    else if (si === 1) { ov = 1 - seg(u, 0, 800); oc = '#fff'; if (u > dur - 450) { ov = seg(u, dur - 450, dur); oc = '#000'; } }
    else if (si === 5) { if (u < 450) { ov = 1 - u / 450; } else if (u > 10300) { ov = seg(u, 10300, 11000); oc = '#fff'; } }
    else if (si === 6) { if (u < 900) { ov = 1 - u / 900; oc = '#fff'; } else if (u > 8800) { ov = seg(u, 8800, 10000); oc = '#fff6d8'; } }
    else { if (u < 450) ov = 1 - u / 450; else if (u > dur - 450) ov = seg(u, dur - 450, dur); }
    if (t < 400) { ov = Math.max(ov, 1 - t / 400); oc = '#000'; }
    if (ov > 0.002) { g.globalAlpha = ov; g.fillStyle = oc; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (extraWhite > 0.002) { g.globalAlpha = extraWhite; g.fillStyle = '#fff6d8'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }

  return { render };
}

/* ===================================================================== */
/*  PEMUTAR                                                               */
/* ===================================================================== */

export function playEpilogue({ onDone, onFail } = {}) {
  const W = 480, vw = window.innerWidth || 960, vh = window.innerHeight || 540;
  const H = Math.round(clamp((W * vh) / vw, 270, 540));
  const root = document.createElement('div');
  root.id = 'epilogue';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Epilog sinematik');
  Object.assign(root.style, { position: 'fixed', inset: '0', zIndex: '40', background: '#000', display: 'grid', placeItems: 'center', opacity: '0', transition: 'opacity .5s ease', touchAction: 'none', overflow: 'hidden' });
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  Object.assign(canvas.style, { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' });
  const skipBtn = document.createElement('button');
  skipBtn.type = 'button'; skipBtn.className = 'cine-skip'; skipBtn.textContent = 'LEWATI ▸▸';
  root.append(canvas, skipBtn);
  document.body.append(root);
  requestAnimationFrame(() => { root.style.opacity = '1'; });
  try { document.fonts?.load(`16px ${FONT}`); } catch { /* font cadangan */ }

  const g = canvas.getContext('2d');
  let A = null, R = null, raf = 0, t0 = null, last = null, skipTs = null, ended = false, hideT = 0;
  try {
    A = createEpilogueAudio({ scenes: SCENES, total: EPILOGUE_MS });
    R = createEpilogueRenderer({ W, H, getImg: (id, dir) => getCharacterImage(id, dir), sfx: A.sfx });
    A.start();
  } catch (err) { console.error(err); cleanupListeners(); root.remove(); onFail?.(); return; }

  function cleanupListeners() { cancelAnimationFrame(raf); clearTimeout(hideT); removeEventListener('keydown', onKey, true); }
  function finish() {
    if (ended) return;
    ended = true;
    cleanupListeners();
    try { A.fadeOut(0.6); A.close(); } catch { /* abaikan */ }
    skipBtn.style.display = 'none';
    try { onDone?.(); } catch (err) { console.error(err); }
    root.style.pointerEvents = 'none';
    setTimeout(() => { root.style.transition = 'opacity 1.3s ease'; root.style.opacity = '0'; }, 60);
    setTimeout(() => root.remove(), 1500);
  }
  function fail(err) { if (ended) return; ended = true; console.error('[epilogue]', err); cleanupListeners(); try { A.close(); } catch { /* abaikan */ } root.remove(); try { onFail?.(); } catch (e) { console.error(e); } }
  const requestSkip = (ts) => { if (skipTs == null) { skipTs = ts ?? performance.now(); skipBtn.disabled = true; skipBtn.classList.remove('show'); try { A.fadeOut(0.4); } catch { /* abaikan */ } } };
  function onKey(e) {
    if (e.key === 'm' || e.key === 'M') { e.stopPropagation(); try { A.toggle(); } catch { /* abaikan */ } return; }
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); requestSkip(); }
  }
  addEventListener('keydown', onKey, true);
  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); requestSkip(); });
  root.addEventListener('pointerdown', () => { if (skipTs != null) return; skipBtn.classList.add('show'); clearTimeout(hideT); hideT = setTimeout(() => skipBtn.classList.remove('show'), 3000); });
  setTimeout(() => { if (skipTs == null && !ended) { skipBtn.classList.add('show'); hideT = setTimeout(() => skipBtn.classList.remove('show'), 3500); } }, 1200);

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    try {
      if (t0 == null) { t0 = ts; last = ts; }
      const t = ts - t0, dt = Math.min(50, ts - last);
      last = ts;
      const white = skipTs == null ? 0 : clamp((ts - skipTs) / 600);
      R.render(g, Math.min(t, EPILOGUE_MS - 1), dt, white);
      A.tick(t);
      if (t >= EPILOGUE_MS || white >= 1) finish();
    } catch (err) { fail(err); }
  }
  raf = requestAnimationFrame(frame);
  return { skip: requestSkip };
}