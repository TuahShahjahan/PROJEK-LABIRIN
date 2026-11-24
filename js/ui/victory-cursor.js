/* ===== KURSOR CAHAYA · CUTSCENE KEMENANGAN LEVEL 8 =====*/

const TAU = Math.PI * 2;
const MAX_LEVEL = 5;
const ULTRA_AT = 4.9;        // level tampil minimal agar klik kiri menjadi ULTRA SMASH
const SLASH_MIN_LEVEL = 5;   // level target minimal agar tombol tengah mouse (slash) aktif
const FONT = '"Press Start 2P", monospace';

/* Frame impact hitam -> putih ala anime. Berkedip cepat bisa tidak nyaman bagi sebagian orang:
   ubah ke false untuk mematikan kedipan hitam-putihnya. Otomatis mati saat prefers-reduced-motion
   dan dibatasi maksimal sekali per 400 ms. */
const SMASH_STROBE = true;
/* Slash: satu frame hitam lalu kilat putih saat layar terbelah (ala cut video referensi). Ubah ke false untuk
   menghilangkannya. Otomatis mati saat prefers-reduced-motion. */
const SLASH_STROBE = true;
const SMASH_WORDS = ['BOOM!!', 'DESTROY!', 'ULTRA!!!', 'SMASH!!', 'LEGEND!!', 'KABOOM!!', 'CRUSH!!'];
const SLASH_WORDS = ['DIMENSION CUT!!', 'REALITY BREAK!', 'VOID SLASH!!', 'PRISM SLASH!!', 'GALAXY RIP!!'];
const CHARGE_MS = 1500;      // lama menahan sampai charge penuh
const SWEEP_MS = 140;        // lama tebasan menyapu layar sebelum momen potong (T = 0)
const HEAVY_GAP = 110;       // jeda minimal antar smash PENUH (ms); lebih cepat = smash ringan
const MAX_SMASHES = 2;

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(a).toFixed(3)})`;
const easeOut3 = (t) => 1 - (1 - t) ** 3;
const easeIn3 = (t) => t * t * t;
const OUT8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/** Warna pelangi (HSL, saturasi penuh) -> [r,g,b]. h dalam derajat. */
function hue(h, l = 0.74) {
  h = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * 2 : 1, p = 2 * l - q;
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** RNG kecil dengan seed (untuk tekstur galaksi yang selalu sama). */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WHITE = [255, 255, 255];
const COOL = [127, 216, 255];   // aksen awal (biru muda)
const GOLD = [255, 216, 59];    // aksen tengah
const HOT = [255, 240, 170];    // aksen akhir (emas putih)
const ORANGE = [255, 140, 30];
const EMBER_A = [74, 160, 255]; // ekor awal (biru listrik)
const EMBER_B = [255, 140, 30]; // ekor akhir (oranye meteor)

/** Warna mengikuti level: biru -> emas -> emas putih; ekor biru -> oranye. */
const accentAt = (p) => (p < 2.5 ? mix(COOL, GOLD, p / 2.5) : mix(GOLD, HOT, (p - 2.5) / 2.5));
const outerAt = (p) => mix(EMBER_A, EMBER_B, clamp(p / 3));

/** Cincin gelombang kejut ULTRA SMASH (d = jeda mulai ms, f = jangkauan relatif diagonal layar, w = tebal awal). */
const SMASH_RINGS = [
  { d: 0, life: 760, f: 0.75, w: 34, col: WHITE },
  { d: 70, life: 900, f: 1.0, w: 26, col: GOLD },
  { d: 150, life: 1000, f: 1.15, w: 20, col: ORANGE },
  { d: 230, life: 1000, f: 0.9, w: 14, col: COOL },
  { d: 330, life: 1100, f: 1.3, w: 10, col: HOT },
];

/* ---------- Tekstur prosedural (dibuat dari gradien, bukan gambar) ---------- */

function glowTexture(rgb) {
  const n = 64, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const x = cv.getContext('2d');
  const gr = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, css(rgb, 1));
  gr.addColorStop(0.25, css(rgb, 0.55));
  gr.addColorStop(0.6, css(rgb, 0.12));
  gr.addColorStop(1, css(rgb, 0));
  x.fillStyle = gr;
  x.fillRect(0, 0, n, n);
  return cv;
}

/** Balok cahaya horizontal: terang di tengah, memudar ke ujung & ke tepi atas/bawah. */
function beamTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 16;
  const x = cv.getContext('2d');
  let gr = x.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 16);
  x.globalCompositeOperation = 'destination-in';
  gr = x.createLinearGradient(0, 0, 0, 16);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 16);
  return cv;
}

/* ---------- Ruang hampa: noise fBm untuk awan nebula, galaksi jauh, cakram holografik ---------- */

function makeNoise(seed) {
  const R = mulberry(seed), grid = new Float32Array(256 * 256);
  for (let i = 0; i < grid.length; i++) grid[i] = R();
  const at = (x, y) => grid[((y & 255) << 8) | (x & 255)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c2 = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v;
  };
}
const fbm = (nz, x, y, oct) => {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let o = 0; o < oct; o++) { s += a * nz(x * f, y * f); n += a; f *= 2; a *= 0.5; }
  return s / n;
};
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Awan nebula volumetrik: fBm 5 oktaf + domain warp, tiga warna, memudar radial (tanpa tepi keras). */
function nebulaTexture(seed, colA, colB, colC) {
  const n = 256, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const x = cv.getContext('2d'), img = x.createImageData(n, n), d = img.data, nz = makeNoise(seed);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = i / n, v = j / n;
      const wx = fbm(nz, u * 3 + 5.2, v * 3 + 1.3, 3), wy = fbm(nz, u * 3 + 9.7, v * 3 + 4.1, 3);
      const dens = fbm(nz, u * 4 + wx * 2.2, v * 4 + wy * 2.2, 5);
      const cloud = Math.pow(smooth(0.45, 0.85, dens), 1.3);
      const tone = fbm(nz, u * 2.2 + 20, v * 2.2 + 7, 3);
      const rad = 1 - smooth(0.3, 0.5, Math.hypot(u - 0.5, v - 0.5));
      const col = mix(mix(colA, colB, tone), colC, smooth(0.7, 0.95, dens));
      const k = (j * n + i) * 4;
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = cloud * rad * 200;
    }
  }
  x.putImageData(img, 0, 0);
  return cv;
}

/** Galaksi spiral kecil (dipakai sebagai galaksi jauh yang dimiringkan). */
function galaxySprite() {
  const n = 128, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const x = cv.getContext('2d'), R = mulberry(77);
  x.globalCompositeOperation = 'lighter';
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 40);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, 'rgba(255,225,170,0.5)'); gr.addColorStop(1, 'rgba(150,120,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, n, n);
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 380; i++) {
      const t = Math.pow(R(), 0.75), r = 5 + t * 58, a = arm * Math.PI + t * 4.6 + (R() - 0.5) * 0.5 * (0.3 + t);
      x.fillStyle = css(hue(200 + t * 120, 0.7), (0.3 + R() * 0.5) * (1 - t * 0.6));
      x.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1, 1);
    }
  }
  return cv;
}

/** Bintang untuk efek "terbang menembus ruang hampa" (posisi polar + kedalaman). */
function makeVoidStars() {
  const R = mulberry(555);
  return Array.from({ length: 240 }, () => ({ a: R() * TAU, r: 0.06 + R() * 0.94, z0: R(), c: R() < 0.7 ? 0 : R() < 0.55 ? 1 : 2 }));
}

/** Debu bintang statis yang berkelip dan hanyut pelan di sepanjang celah. */
function makeVoidDust() {
  const R = mulberry(909);
  return Array.from({ length: 220 }, () => ({ pu: R() * 2 - 1, pn: R() * 2 - 1, sp: 0.4 + R() * 1.6, sz: R() < 0.15 ? 2.6 : 1.5, ph: R() * TAU }));
}

/** Cakram holografik pastel (dari video referensi): kerucut pelangi lembut dengan tepi cincin bercahaya. */
function holoDiscTexture() {
  const n = 512, c0 = n / 2, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const x = cv.getContext('2d');
  if (typeof x.createConicGradient === 'function') {
    const gr = x.createConicGradient(0, c0, c0);
    for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, css(hue(i * 45 + 160, 0.82), 1));
    x.fillStyle = gr;
  } else x.fillStyle = css(hue(200, 0.82), 1);
  x.beginPath(); x.arc(c0, c0, c0 - 2, 0, TAU); x.fill();
  x.globalCompositeOperation = 'destination-in';
  const m = x.createRadialGradient(c0, c0, 0, c0, c0, c0);
  m.addColorStop(0, 'rgba(0,0,0,0.3)'); m.addColorStop(0.55, 'rgba(0,0,0,0.5)'); m.addColorStop(0.86, 'rgba(0,0,0,0.95)');
  m.addColorStop(0.95, 'rgba(0,0,0,0.45)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = m; x.fillRect(0, 0, n, n);
  x.globalCompositeOperation = 'source-atop';
  const w = x.createRadialGradient(c0 * 0.8, c0 * 0.75, 0, c0 * 0.8, c0 * 0.75, c0 * 0.9);
  w.addColorStop(0, 'rgba(255,255,255,0.35)'); w.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = w; x.fillRect(0, 0, n, n);
  return cv;
}

/* ---------- Kata (dicache ke canvas kecil; bukan 25x fillText per frame) ---------- */

const wordCache = new Map();

function wordCanvas(word, size, combo, prism) {
  const fontOk = !!(typeof document !== 'undefined' && document.fonts && document.fonts.check && document.fonts.check(`16px ${FONT}`));
  const key = `${word}|${size}|${combo >= 2 ? combo : 0}|${prism ? 1 : 0}|${fontOk ? 1 : 0}`;
  let e = wordCache.get(key);
  if (e) return e;
  const font = `${size}px ${FONT}`;
  const m = document.createElement('canvas').getContext('2d');
  m.font = font;
  const tw = Math.ceil(m.measureText(word).width);
  const w = tw + Math.ceil(size * 0.7) * 2, h = Math.ceil(size * 2.6), oy = Math.round(h * 0.4), cx = w / 2;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const x = cv.getContext('2d');
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let j = 8; j >= 1; j--) { x.fillStyle = '#1b3157'; x.fillText(word, cx + j * size * 0.012, oy + j * size * 0.02); }   // ekstrusi 3D
  x.fillStyle = '#0d1a33';
  for (const [ox, oyy] of OUT8) x.fillText(word, cx + ox * size * 0.09, oy + oyy * size * 0.09);
  x.fillStyle = '#35609e';
  for (const [ox, oyy] of OUT8) x.fillText(word, cx + ox * size * 0.055, oy + oyy * size * 0.055);
  let gr;
  if (prism) {
    gr = x.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
    for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, css(hue(190 + i * 28, 0.68), 1));
  } else {
    gr = x.createLinearGradient(0, oy - size / 2, 0, oy + size / 2);
    gr.addColorStop(0, '#fff8c4'); gr.addColorStop(0.5, '#ffd83b'); gr.addColorStop(1, '#f2a900');
  }
  x.fillStyle = gr;
  x.fillText(word, cx, oy);
  if (combo >= 2) {
    x.font = `${Math.round(size * 0.22)}px ${FONT}`;
    const label = `COMBO x${combo}`, ly = oy + size * 0.78;
    x.fillStyle = '#0d1a33';
    for (const [ox, oyy] of OUT8) x.fillText(label, cx + ox * 2.5, ly + oyy * 2.5);
    x.fillStyle = '#ffd83b';
    x.fillText(label, cx, ly);
  }
  e = { cv, w, h, oy, tw };
  if (wordCache.size > 40) wordCache.clear();
  wordCache.set(key, e);
  return e;
}

/** Gradien pelangi linear (7 warna yang bergeser menurut phase). */
function rainbowGrad(g, x0, y0, x1, y1, alpha, phase) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, css(hue(phase + i * 55), alpha));
  return gr;
}

/** Gradien kerucut pelangi (bila browser mendukung), cadangan: linear. */
function conicOr(g, cx, cy, start, alpha, phase) {
  if (typeof g.createConicGradient === 'function') {
    const gr = g.createConicGradient(start, cx, cy);
    for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, css(hue(phase + (i % 8) * 45), alpha));
    return gr;
  }
  return rainbowGrad(g, cx - 100, cy, cx + 100, cy, alpha, phase);
}

export function createStarCursor(root, { reduced = false, onSmash, onSlash, getScene, slashAudio } = {}) {
  const c = {
    on: false, cv: null, g: null, raf: 0, dpr: 1, last: 0, lowRes: false,
    x: 0, y: 0, hx: 0, hy: 0, seen: false,        // pointer & kepala kursor (halus)
    dx: 0, dy: 1, spd: 0, acc: 0, idle: 0,        // arah, kecepatan, akumulator emisi
    p: 0, target: 0, boost: 0, rayBoost: 0,       // level tampil (halus), level target, denyut
    trail: [], sparks: [], pulses: [],
    smashes: [], combo: 0, lastSmash: 0, lastHeavy: 0, lastFrameAt: 0,
    Q: 1, ema: 16.7,                              // kualitas adaptif & rata-rata durasi frame (ms)
    prism: 0,                                     // 0..1 seberapa holografik kursor sekarang
    sc: null, cp: [], cpAcc: 0,                   // state charge (tombol tengah ditahan) + partikel menyedot
    slash: null, assets: null,
    tex: null,
  };

  const isUltra = () => c.target >= MAX_LEVEL && c.p >= ULTRA_AT;
  const slashReady = () => c.target >= SLASH_MIN_LEVEL && c.p >= SLASH_MIN_LEVEL - 0.1;

  /* ---------- Pembuat efek ---------- */

  /** Satu bara/percikan. `delay` (ms) = ditunda sebelum mulai bergerak (dipakai hujan meteor). */
  function spark(x, y, vx, vy, life, sz, grav = 260, delay = 0) {
    if (c.sparks.length > 360) c.sparks.shift();
    c.sparks.push({ x, y, vx, vy, t0: performance.now() + delay, life, sz, g: grav });
  }

  function radialBurst(n, lo, hi, sizeK = 1, x = c.hx, y = c.hy) {
    n = Math.max(2, Math.round(n * c.Q));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = lerp(lo, hi, Math.random());
      spark(x, y, Math.cos(a) * v, Math.sin(a) * v, 500 + Math.random() * 600, (1.4 + Math.random() * 1.6) * sizeK, 200);
    }
  }

  function ring(delay, r1, w, life) {
    if (c.pulses.length > 14) c.pulses.shift();
    c.pulses.push({ t0: performance.now() + delay, life, r1, w });
  }

  function upgrade(level) {
    c.boost = 1;
    if (!c.seen || reduced) return;
    ring(0, 70 + 28 * level, 7 + level, 650);
    ring(110, 45 + 18 * level, 4, 520);
    radialBurst(16 + 8 * level, 130 + 40 * level, 320 + 60 * level);
  }

  /* ---------- ULTRA SMASH (klik kiri) ---------- */

  function smash(x, y) {
    const now = performance.now();
    c.combo = now - c.lastSmash < 900 ? Math.min(12, c.combo + 1) : 1;
    c.lastSmash = now;
    const k = 1 + 0.07 * (c.combo - 1);                       // intensitas naik per combo
    const light = now - c.lastHeavy < HEAVY_GAP;              // spam: versi ringan
    c.boost = Math.max(c.boost, 1.6 + 0.12 * c.combo);        // bintang kursor ikut meledak
    c.rayBoost = Math.max(c.rayBoost, light ? 0.6 : 1.2);

    if (light) {
      c.smashes.push({ t0: now, x, y, k, light: true, frame: false, bolts: [], lines: null, word: '', combo: c.combo, seed: 0, rot: 0, wsize: 0 });
      if (!reduced) radialBurst(18, 160, 620, 1.2, x, y);
    } else {
      c.lastHeavy = now;
      const frame = SMASH_STROBE && !reduced && now - c.lastFrameAt > 400;
      if (frame) c.lastFrameAt = now;
      const Q = c.Q;

      // retakan petir bercabang dari titik klik
      const bolts = [];
      if (!reduced) {
        const n = Math.max(3, Math.round((9 + 3 * k) * Q));
        for (let i = 0; i < n; i++) {
          let ang = Math.random() * TAU, px = x, py = y;
          const len = (260 + Math.random() * 520) * k, pts = [[x, y]];
          for (let dist = 0; dist < len; dist += 30) {
            ang += (Math.random() - 0.5) * 0.9;
            const step = 26 + Math.random() * 14;
            px += Math.cos(ang) * step; py += Math.sin(ang) * step;
            pts.push([px, py]);
          }
          bolts.push(pts);
        }
      }

      // garis kecepatan manga (disimpan sebagai angka, digambar satu path)
      let lines = null;
      if (!reduced) {
        const n = Math.round(60 * Q) + 12;
        lines = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          lines[i * 3] = (i * TAU) / n + (Math.random() - 0.5) * 0.08;
          lines[i * 3 + 1] = 40 + Math.random() * 70;
          lines[i * 3 + 2] = 0.008 + Math.random() * 0.02;
        }
      }

      const word = c.combo >= 6 ? 'MAXIMUM!!!' : SMASH_WORDS[(Math.random() * SMASH_WORDS.length) | 0];
      const wsize = Math.round(Math.min(innerWidth * 0.12, 96) * (0.9 + 0.15 * k));
      c.smashes.push({ t0: now, x, y, k, light: false, frame, bolts, lines, word, wsize, seed: Math.random() * 1000, rot: (Math.random() - 0.5) * 0.24, combo: c.combo });

      if (!reduced) {
        radialBurst(120 + 10 * c.combo, 220, 1000, 1.5, x, y);
        // hujan meteor dari atas layar, bertahap
        const nm = Math.round(46 * Q);
        for (let i = 0; i < nm; i++) {
          spark(
            Math.random() * innerWidth * 1.3 - innerWidth * 0.1, -20 - Math.random() * 120,
            -140 - Math.random() * 160, 520 + Math.random() * 520,
            900 + Math.random() * 500, 2 + Math.random() * 2.2, 300, Math.random() * 350,
          );
        }
      }
    }
    while (c.smashes.length > MAX_SMASHES) c.smashes.shift();
    try { onSmash?.({ x, y, combo: c.combo, k, light }); } catch (err) { console.error(err); }
  }

  /* ---------- Pointer ---------- */

  function onMove(e) {
    if (e.pointerType === 'touch') return;
    c.x = e.clientX; c.y = e.clientY;
    if (!c.seen) { c.seen = true; c.hx = c.x; c.hy = c.y; c.trail.length = 0; }
  }

  function onDown(e) {
    if (e.pointerType === 'touch') return;
    if (e.button === 1) { e.preventDefault(); startCharge(e); return; }      // tombol tengah = slash
    if (e.button !== 0) return;
    if (e.target?.closest?.('button')) return;                 // tombol LEWATI / ULANGI / MENU tidak memicu smash
    c.x = e.clientX; c.y = e.clientY;
    if (!c.seen) { c.seen = true; c.hx = c.x; c.hy = c.y; c.trail.length = 0; }
    if (isUltra()) { smash(e.clientX, e.clientY); return; }
    if (reduced) return;
    ring(0, 60 + 8 * c.p, 5, 450);
    radialBurst(12, 70, 220, 0.9, e.clientX, e.clientY);
  }
  function onUp(e) { if (e.button === 1 && c.sc) releaseCharge(); }
  const onCancel = () => cancelCharge();
  const onLeave = () => { if (!c.sc) c.seen = false; };
  const stopMiddle = (e) => { if (e.button === 1) e.preventDefault(); };   // cegah autoscroll tombol tengah
  function resize() {
    if (!c.cv) return;
    c.dpr = c.lowRes ? 1 : Math.min(2, window.devicePixelRatio || 1);
    c.cv.width = Math.round(innerWidth * c.dpr);
    c.cv.height = Math.round(innerHeight * c.dpr);
  }

  /* ---------- Charge-up & garis bidik (tombol tengah ditahan) ---------- */

  function lockActions(on) {
    const el = root.querySelector?.('.cine-actions');
    if (el) el.style.pointerEvents = on ? 'none' : '';
  }

  /** Aset ruang hampa dibangun bertahap (satu per timeout) selama tombol ditahan; sisanya dilengkapi saat dilepas. */
  function buildAsset(i) {
    const A = (c.assets ||= {});
    if (i === 0 && !A.nebA) A.nebA = nebulaTexture(11, [110, 60, 255], [255, 70, 200], [255, 230, 255]);
    if (i === 1 && !A.nebB) A.nebB = nebulaTexture(23, [30, 120, 255], [40, 230, 220], [230, 255, 255]);
    if (i === 2 && !A.nebC) A.nebC = nebulaTexture(37, [255, 150, 70], [255, 90, 150], [255, 245, 210]);
    if (i === 3 && !A.stars) { A.galaxy = galaxySprite(); A.stars = makeVoidStars(); A.dust = makeVoidDust(); }
    return A;
  }
  function ensureAssets() {
    for (let i = 0; i < 4; i++) buildAsset(i);
    return c.assets;
  }
  function warmAssets() {
    [0, 40, 90, 140].forEach((d, i) => setTimeout(() => { try { buildAsset(i); } catch (err) { console.error(err); } }, d));
  }

  function startCharge(e) {
    if (!c.on || c.sc || c.slash || !slashReady()) return;
    c.x = e.clientX; c.y = e.clientY;
    if (!c.seen) { c.seen = true; c.hx = c.x; c.hy = c.y; c.trail.length = 0; }
    try { root.setPointerCapture(e.pointerId); } catch { /* abaikan */ }
    try { slashAudio?.chargeStart?.(); } catch (err) { console.error(err); }
    const ang = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45); // sudut garis bidik bawaan bila tidak digeser
    c.sc = { x0: e.clientX, y0: e.clientY, t0: performance.now(), q: 0, ang0: ang, stage: 0, pid: e.pointerId };
    c.cp.length = 0;
    warmAssets();                                                                    // siapkan ruang hampa bertahap saat menahan
    try { onSlash?.('charge', { x: c.x, y: c.y }); } catch (err) { console.error(err); }
  }

  function cancelCharge() {
    if (!c.sc) return;
    try { root.releasePointerCapture(c.sc.pid); } catch { /* abaikan */ }
    c.sc = null;
    try { slashAudio?.chargeEnd?.(); } catch { /* abaikan */ }
    try { onSlash?.('cancel', {}); } catch (err) { console.error(err); }   // victory.js: musik latar dinyalakan lagi
  }

  function releaseCharge() {
    const sc = c.sc;
    c.sc = null;
    try { root.releasePointerCapture(sc.pid); } catch { /* abaikan */ }
    try { slashAudio?.chargeEnd?.(); } catch { /* abaikan */ }

    const hx = c.x, hy = c.y, dx = hx - sc.x0, dy = hy - sc.y0, d = Math.hypot(dx, dy);
    let ux, uy, cx, cy;
    if (d >= 24) { ux = dx / d; uy = dy / d; cx = (sc.x0 + hx) / 2; cy = (sc.y0 + hy) / 2; }   // garis ditarik: lewat titik tengah
    else { ux = Math.cos(sc.ang0); uy = Math.sin(sc.ang0); cx = sc.x0; cy = sc.y0; }           // tidak digeser: sudut bawaan
    cx = clamp(cx, innerWidth * 0.08, innerWidth * 0.92);
    cy = clamp(cy, innerHeight * 0.08, innerHeight * 0.92);
    const q = clamp((performance.now() - sc.t0) / CHARGE_MS);
    startSlash({ cx, cy, ux, uy, q, power: 0.55 + 0.45 * q });
  }

  /* ---------- SLASH ---------- */

  /** Rencana cadangan bila tidak ada slashAudio (tanpa suara): 1 bar tempo 172, kick di beat 1-2, SLAM di beat 4. */
  function fallbackPlan() {
    const beat = 60 / 172, events = [{ t: 0, kind: 'impact', pow: 1 }];
    for (let i = 1; i < 3; i++) events.push({ t: i * beat, kind: 'kick', pow: 0.8 });
    events.push({ t: 3.5 * beat, kind: 'glitch', pow: 0.8 });
    events.push({ t: 4 * beat, kind: 'final', pow: 1.3 });
    return { beat, N: 4, total: 4 * beat, events };
  }

  function startSlash({ cx, cy, ux, uy, q, power }) {
    let plan;
    try { plan = slashAudio?.plan ? slashAudio.plan(power) : fallbackPlan(); } catch (err) { console.error(err); plan = fallbackPlan(); }
    const lead = SWEEP_MS / 1000;
    let played = null;
    try { played = slashAudio?.play ? slashAudio.play(plan, lead) : null; } catch (err) { console.error(err); }
    // Visual dimulai saat suara TERDENGAR (jadwal + latensi output), jadi impact visual = impact audio.
    const tI = performance.now() + (lead + (played?.latency || 0)) * 1000;
    const diag = Math.hypot(innerWidth, innerHeight);
    c.slash = {
      cx, cy, ux, uy, nx: -uy, ny: ux, power, q, plan, tI, diag,
      total: plan.N * plan.beat * 1000,
      gapMax: Math.min(innerWidth, innerHeight) * (0.15 + 0.07 * power),
      bulge: (Math.random() < 0.5 ? -1 : 1) * diag * 0.09,
      hue0: Math.random() * 360,
      word: SLASH_WORDS[(Math.random() * SLASH_WORDS.length) | 0],
      ei: 0, cut: false, slam: false, o: 0,
      rings: [], parts: [], sucAcc: 0, fly: 0, shards: [], glitchT: -1, glitchSeed: 0,
    };
    lockActions(true);
    ensureAssets();
  }

  function endSlash() {
    c.slash = null;
    lockActions(false);
    try { onSlash?.('end', {}); } catch (err) { console.error(err); }
  }

  function slashBurst(sl, n, x, y, ang0, spread, vlo, vhi) {
    n = Math.max(2, Math.round(n * c.Q));
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      if (sl.parts.length > 260) sl.parts.shift();
      const a = ang0 + (Math.random() - 0.5) * spread, v = lerp(vlo, vhi, Math.random());
      sl.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: now, life: 500 + Math.random() * 600, hue: Math.random() * 360, sz: 1.6 + Math.random() * 2 });
    }
  }

  /** Event dari plan (kick / snare / stab / glitch / roll / final) -> denyut visual tepat di ketukan. */
  function slashEvent(sl, ev, T) {
    if (ev.kind === 'kick') {
      sl.rings.push({ t0: T, life: 560, hue: sl.hue0 + sl.ei * 40, w: 8 });
      slashBurst(sl, 10, sl.cx, sl.cy, Math.atan2(sl.uy, sl.ux), TAU, 120, 420);
    } else if (ev.kind === 'snare' || ev.kind === 'roll') {
      slashBurst(sl, 8, sl.cx, sl.cy, Math.atan2(sl.ny, sl.nx), 0.5, 160, 520);
      slashBurst(sl, 8, sl.cx, sl.cy, Math.atan2(-sl.ny, -sl.nx), 0.5, 160, 520);
    } else if (ev.kind === 'stab') {
      sl.rings.push({ t0: T, life: 520, hue: sl.hue0 + 180 + sl.ei * 30, w: 5 });
    } else if (ev.kind === 'glitch') {
      sl.glitchT = T; sl.glitchSeed = Math.random() * 1000;   // bar glitch horizontal ala video referensi
    }
  }

  function sceneRect() {
    const sc = getScene?.();
    if (!sc || !sc.width) return null;
    const r = sc.getBoundingClientRect(), k = Math.min(r.width / sc.width, r.height / sc.height) || 1;
    return { sc, x: r.left + (r.width - sc.width * k) / 2, y: r.top + (r.height - sc.height * k) / 2, w: sc.width * k, h: sc.height * k };
  }

  /** Tebasan menyapu layar: bilah sabit putih-emas dengan tepi pastel, jejak sisa, dan inti terang. */
  function drawBlade(g, sl, T) {
    if (T > 420) return;
    const swp = clamp((T + SWEEP_MS) / SWEEP_MS);
    if (swp <= 0) return;
    const p = 1 - (1 - swp) ** 3, fade = T < 0 ? 1 : (1 - T / 420) ** 2;
    const L = sl.diag * 0.78, e1x = sl.cx - sl.ux * L, e1y = sl.cy - sl.uy * L, ex = sl.ux * L * 2, ey = sl.uy * L * 2;
    const ns = Math.max(10, Math.round(26 * c.Q)), wmax = 22 + 26 * sl.power, bulge = sl.bulge;
    const ptsL = [], ptsR = [], core = [];
    for (let i = 0; i <= ns; i++) {
      const s = (p * i) / ns, a = 4 * s * (1 - s);
      const px = e1x + ex * s + sl.nx * bulge * a, py = e1y + ey * s + sl.ny * bulge * a;
      const w = wmax * Math.pow(i / ns, 1.2) * (0.35 + 0.65 * Math.sin(Math.min(1, s) * Math.PI));
      ptsL.push([px + sl.nx * w, py + sl.ny * w]); ptsR.push([px - sl.nx * w, py - sl.ny * w]); core.push([px, py]);
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    const hb = performance.now() / 6 + sl.hue0;
    for (let rep = 0; rep < 3; rep++) { // jejak sisa (afterimage) bergeser tipis
      const sh = (rep - 1) * 11 * (T < 0 ? 1 : Math.exp(-T / 160));
      g.beginPath();
      g.moveTo(ptsL[0][0] + sl.nx * sh, ptsL[0][1] + sl.ny * sh);
      for (let i = 1; i < ptsL.length; i++) g.lineTo(ptsL[i][0] + sl.nx * sh, ptsL[i][1] + sl.ny * sh);
      for (let i = ptsR.length - 1; i >= 0; i--) g.lineTo(ptsR[i][0] + sl.nx * sh, ptsR[i][1] + sl.ny * sh);
      g.closePath();
      g.fillStyle = rainbowGrad(g, e1x, e1y, e1x + ex, e1y + ey, (rep === 1 ? 0.85 : 0.4) * fade, hb + rep * 60);
      g.fill();
    }
    g.beginPath();
    g.moveTo(core[0][0], core[0][1]);
    for (let i = 1; i < core.length; i++) g.lineTo(core[i][0], core[i][1]);
    g.lineCap = 'round';
    g.strokeStyle = css(GOLD, 0.4 * fade); g.lineWidth = 12 + 10 * sl.power; g.stroke();   // cahaya emas surgawi di bawah inti
    g.strokeStyle = css(WHITE, 0.95 * fade); g.lineWidth = 3 + 3 * sl.power; g.stroke();
    g.restore();
  }

  /** Garis-garis tipis memancar sejajar tebasan (putih / biru / pink seperti video referensi). */
  function drawThinLines(g, sl, T) {
    if (T > 380 || T < -SWEEP_MS) return;
    const fade = T < 0 ? clamp((T + SWEEP_MS) / SWEEP_MS) : (1 - T / 380) ** 1.5, L = sl.diag * 1.1;
    const cols = [css(WHITE, 0.9 * fade), css([110, 150, 255], 0.9 * fade), css([255, 70, 140], 0.85 * fade)];
    const a0 = Math.atan2(sl.uy, sl.ux);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 1.2;
    for (let k = -3; k <= 3; k++) {
      const a = a0 + k * 0.032 + (k % 2 ? 0.01 : -0.01), ux = Math.cos(a), uy = Math.sin(a), off = k * 16 * (0.5 + (T < 0 ? 0 : Math.min(1, T / 200)));
      const px = sl.cx + sl.nx * off, py = sl.cy + sl.ny * off;
      g.strokeStyle = cols[Math.abs(k) % 3];
      g.beginPath(); g.moveTo(px - ux * L, py - uy * L); g.lineTo(px + ux * L, py + uy * L); g.stroke();
    }
    g.restore();
  }

  /** Penggaris tipis dengan tanda ukur di sepanjang garis potong (gaya desain grafis video referensi). */
  function drawRuler(g, sl, T) {
    if (T < 0) return;
    const fade = T < sl.total ? 1 : clamp(1 - (T - sl.total) / 400);
    if (fade <= 0.01) return;
    const step = 16, shift = (T * 0.25) % (step * 5), n = Math.ceil(sl.diag / step) + 2;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = css(WHITE, 0.55 * fade);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(sl.cx - sl.ux * sl.diag, sl.cy - sl.uy * sl.diag);
    g.lineTo(sl.cx + sl.ux * sl.diag, sl.cy + sl.uy * sl.diag);
    for (let k = -n; k <= n; k++) {
      const pos = k * step + shift, len = k % 5 === 0 ? 7 : 3.5, px = sl.cx + sl.ux * pos, py = sl.cy + sl.uy * pos;
      g.moveTo(px - sl.nx * len, py - sl.ny * len);
      g.lineTo(px + sl.nx * len, py + sl.ny * len);
    }
    g.stroke();
    g.restore();
  }

  /** Partikel slash: serpihan, semburan di tiap ketukan, dan aliran yang tersedot ke portal. */
  function slashParts(g, sl, now, dt, o) {
    // aliran tersedot ke pusat portal
    if (o > 0.1) {
      sl.sucAcc += dt * 34 * c.Q * o;
      while (sl.sucAcc >= 1) {
        sl.sucAcc -= 1;
        if (sl.parts.length > 260) sl.parts.shift();
        const s = (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * sl.diag * 0.45), off = (Math.random() - 0.5) * sl.gapMax * 1.6;
        const x = sl.cx + sl.ux * s + sl.nx * off, y = sl.cy + sl.uy * s + sl.ny * off, life = 450 + Math.random() * 350;
        sl.parts.push({ x, y, vx: ((sl.cx - x) / life) * 1000, vy: ((sl.cy - y) / life) * 1000, t0: now, life, hue: Math.random() * 360, sz: 1.4 + Math.random() * 1.4 });
      }
    }
    const bk = [[], [], [], [], [], []];
    for (let i = sl.parts.length - 1; i >= 0; i--) {
      const p = sl.parts[i], age = now - p.t0;
      if (age >= p.life) { sl.parts.splice(i, 1); continue; }
      const s = dt;
      p.x += p.vx * s; p.y += p.vy * s;
      const q = age / p.life, sp = Math.hypot(p.vx, p.vy) || 1, len = Math.max(3, sp * 0.05);
      bk[(((p.hue / 60) | 0) + 6) % 6].push(p.x, p.y, p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len, 1 - q);
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    const hb = now / 12 + sl.hue0;
    for (let b = 0; b < 6; b++) {
      const arr = bk[b];
      if (!arr.length) continue;
      g.strokeStyle = css(hue(hb + b * 60, 0.7), 0.9);
      g.lineWidth = 2.2;
      g.beginPath();
      for (let i = 0; i < arr.length; i += 5) { g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]); }
      g.stroke();
    }
    g.restore();
  }

  /** RUANG HAMPA GALAKSI di celah potongan: kekosongan gelap yang dalam, awan nebula tiga lapis berparalaks,
   *  bintang yang terbang menembus kita (makin cepat di tiap ketukan), galaksi jauh, cakram holografik pastel,
   *  cahaya surgawi di pusat, pita aurora, dan vignette terowongan agar terasa dalam. */
  function drawVoid(g, sl, T, o, off, band, hb, pulse) {
    // OPTIMASI: seluruh ruang hampa digambar ke kanvas luring beresolusi setengah (tanpa clip), lalu ditempel
    // SATU kali ke celah. Nebula/bintang/aurora jadi ±4x lebih murah dibanding digambar penuh dan di-clip.
    const k = c.Q < 0.6 ? 0.35 : 0.5, iw = innerWidth, ih = innerHeight, vw = Math.ceil(iw * k), vh = Math.ceil(ih * k);
    if (!c.voidCv) { c.voidCv = document.createElement('canvas'); c.voidCx = c.voidCv.getContext('2d'); }
    if (c.voidCv.width !== vw || c.voidCv.height !== vh) { c.voidCv.width = vw; c.voidCv.height = vh; }
    const vx = c.voidCx;
    vx.setTransform(k, 0, 0, k, 0, 0);
    vx.globalCompositeOperation = 'source-over';
    vx.globalAlpha = 1;
    drawVoidScene(vx, sl, T, o, off, hb, pulse);
    g.save();
    g.beginPath();
    g.moveTo(band[0][0], band[0][1]);
    for (let i = 1; i < band.length; i++) g.lineTo(band[i][0], band[i][1]);
    g.closePath();
    g.clip();
    g.imageSmoothingEnabled = true;
    g.drawImage(c.voidCv, 0, 0, iw, ih);
    g.restore();
  }

  function drawVoidScene(g, sl, T, o, off, hb, pulse) {
    const A = c.assets || {}, diag = sl.diag, ang = Math.atan2(sl.uy, sl.ux);
    const ux = sl.ux, uy = sl.uy, nx = sl.nx, ny = sl.ny, cx = sl.cx, cy = sl.cy, gm = sl.gapMax;
    g.save();

    // 1. kekosongan yang dalam
    const vg = g.createLinearGradient(cx - nx * gm, cy - ny * gm, cx + nx * gm, cy + ny * gm);
    vg.addColorStop(0, '#000003'); vg.addColorStop(0.5, '#04021a'); vg.addColorStop(1, '#000003');
    g.fillStyle = vg;
    g.fillRect(cx - diag, cy - diag, diag * 2, diag * 2);

    g.globalCompositeOperation = 'lighter';
    g.imageSmoothingEnabled = true;
    const zoom = 1 + 0.3 * (1 - Math.exp(-T / 700)) + 0.035 * pulse, fadeIn = Math.min(1, o * 3 + 0.2);

    // 2. awan nebula 3 lapis dengan paralaks & arah putar berbeda (kamera seolah masuk ke dalam)
    [[A.nebA, 0.6, 1, 1], [A.nebB, 0.45, 1.35, -1], [A.nebC, 0.34, 1.7, 1]].forEach(([tex, al, sc0, dir], k) => {
      if (!tex) return;
      const s = ((diag * 1.7) / 256) * sc0 * zoom;
      g.save();
      g.translate(cx + ux * T * 0.012 * (k + 1) * dir, cy + uy * T * 0.012 * (k + 1) * dir);
      g.rotate(ang + k * 1.1 + (dir * T) / 14000);
      g.globalAlpha = al * fadeIn;
      g.drawImage(tex, -128 * s, -128 * s, 256 * s, 256 * s);
      g.restore();
    });

    // 3. cakram holografik pastel berputar pelan di kedalaman
    if (c.holo) {
      const rd = (gm * 1.5 + 60) * (0.7 + 0.3 * o) * (1 + 0.05 * pulse);
      g.save(); g.translate(cx, cy); g.rotate(T / 2600); g.globalAlpha = 0.22 * fadeIn;
      g.drawImage(c.holo, -rd, -rd, rd * 2, rd * 2);
      g.restore();
    }

    // 4. galaksi-galaksi jauh (miring, redup)
    if (A.galaxy) {
      const spots = [[-0.62, 0.35, 90], [-0.3, -0.4, 60], [0.25, 0.45, 110], [0.58, -0.3, 70], [0.05, -0.15, 50]];
      for (const [pu, pn, sz] of spots) {
        g.save();
        g.translate(cx + ux * pu * diag * 0.5 + nx * pn * gm * 0.9, cy + uy * pu * diag * 0.5 + ny * pn * gm * 0.9);
        g.rotate(ang * 0.5 + pu * 3 + T / 20000);
        g.scale(1, 0.5);
        g.globalAlpha = 0.9 * fadeIn;
        g.drawImage(A.galaxy, -sz * 1.4, -sz * 1.4, sz * 2.8, sz * 2.8);
        g.restore();
      }
    }

    // 5. cahaya surgawi di pusat portal: bola cahaya, sinar tipis berputar, dan flare anamorfik sepanjang tebasan
    const R0 = (gm * 0.8 + 30) * (1 + 0.12 * pulse) * (0.4 + 0.6 * o);
    let gr = g.createRadialGradient(cx, cy, 0, cx, cy, R0);
    gr.addColorStop(0, 'rgba(255,248,225,0.5)'); gr.addColorStop(0.25, 'rgba(255,214,140,0.18)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr;
    g.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2);
    const rl = diag * 0.6, rot = T / 4000;
    gr = g.createRadialGradient(cx, cy, 0, cx, cy, rl);
    gr.addColorStop(0, css(WHITE, 0.12)); gr.addColorStop(1, css(WHITE, 0));
    g.fillStyle = gr;
    g.globalAlpha = (0.55 + 0.45 * pulse) * fadeIn;
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * TAU) / 10, w = 0.035 * (i % 2 ? 0.6 : 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a - w) * rl, cy + Math.sin(a - w) * rl);
      g.lineTo(cx + Math.cos(a + w) * rl, cy + Math.sin(a + w) * rl);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    g.save();
    g.translate(cx, cy); g.rotate(ang);
    g.globalAlpha = clamp(0.3 * fadeIn + 0.25 * pulse);
    const bh = 4 + 10 * pulse;
    g.drawImage(c.beam, -diag * 0.7, -bh / 2, diag * 1.4, bh);
    g.restore();

    // 6. bintang terbang menembus kita (garis memanjang dari pusat; makin cepat di tiap ketukan)
    if (A.stars) {
      const maxR = diag * 0.62, nS = Math.round(A.stars.length * c.Q), fly = sl.fly * 0.6, streak = 0.05 + 0.1 * pulse;
      const bk = [[], [], [], [], [], []];
      for (let i = 0; i < nS; i++) {
        const s = A.stars[i], z = (((s.z0 - fly) % 1) + 1) % 1, u = 1 - z;
        if (u < 0.04) continue;
        const rad = s.r * maxR * u * u * 1.6, rad0 = s.r * maxR * Math.max(0, u - streak) ** 2 * 1.6, ca = Math.cos(s.a), sa = Math.sin(s.a);
        bk[s.c * 2 + (u > 0.6 ? 1 : 0)].push(cx + ca * rad0, cy + sa * rad0, cx + ca * rad, cy + sa * rad);
      }
      g.lineCap = 'round';
      const cols = [[255, 255, 255], [190, 215, 255], [255, 225, 170]];
      for (let b = 0; b < 6; b++) {
        const arr = bk[b];
        if (!arr.length) continue;
        g.strokeStyle = css(cols[b >> 1], (b & 1 ? 1 : 0.7) * fadeIn);
        g.lineWidth = b & 1 ? 3 : 1.5;
        g.beginPath();
        for (let i = 0; i < arr.length; i += 4) { g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]); }
        g.stroke();
      }
    }

    // 6b. debu bintang yang berkelip dan hanyut pelan (membuat ruang terasa luas)
    if (A.dust) {
      for (let i = 0, n = Math.round(A.dust.length * c.Q); i < n; i++) {
        const d = A.dust[i], tw = 0.5 + 0.5 * Math.sin(T / 300 + d.ph), s = ((d.pu + 1 + T * 0.00004 * d.sp) % 2 - 1) * diag * 0.6, nn = d.pn * gm * 1.4;
        g.globalAlpha = (0.35 + 0.65 * tw) * fadeIn;
        g.fillStyle = d.sz > 2 ? css([255, 240, 200]) : css([210, 228, 255]);
        g.fillRect(cx + ux * s + nx * nn - d.sz / 2, cy + uy * s + ny * nn - d.sz / 2, d.sz, d.sz);
      }
      g.globalAlpha = 1;
    }

    // 7. pita aurora pastel yang melayang di sepanjang celah
    for (let k = 0; k < 3; k++) {
      const amp = gm * (0.35 + 0.1 * k), ph = T / 600 + k * 2.1;
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const s = (i / 24 - 0.5) * diag * 1.2, nn = Math.sin(i * 0.5 + ph) * amp + (k - 1) * gm * 0.35;
        const x = cx + ux * s + nx * nn, y = cy + uy * s + ny * nn;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.lineCap = 'round';
      g.strokeStyle = rainbowGrad(g, cx - ux * diag * 0.6, cy - uy * diag * 0.6, cx + ux * diag * 0.6, cy + uy * diag * 0.6, 0.22 * fadeIn, hb + k * 70);
      g.lineWidth = 18; g.stroke();
      g.strokeStyle = rainbowGrad(g, cx - ux * diag * 0.6, cy - uy * diag * 0.6, cx + ux * diag * 0.6, cy + uy * diag * 0.6, 0.5 * fadeIn, hb + k * 70);
      g.lineWidth = 3; g.stroke();
    }

    // 8. vignette terowongan: tepi celah menggelap supaya terasa dalam
    g.globalCompositeOperation = 'source-over';
    const v2 = g.createLinearGradient(cx - nx * off, cy - ny * off, cx + nx * off, cy + ny * off);
    v2.addColorStop(0, 'rgba(0,0,0,0.8)'); v2.addColorStop(0.3, 'rgba(0,0,0,0)'); v2.addColorStop(0.7, 'rgba(0,0,0,0)'); v2.addColorStop(1, 'rgba(0,0,0,0.8)');
    g.fillStyle = v2;
    g.fillRect(cx - diag, cy - diag, diag * 2, diag * 2);
    g.imageSmoothingEnabled = false;
    g.restore();
  }

  /** Serpihan "kaca" yang pecah dari layar dan melayang di ruang hampa. */
  function drawShards(g, sl, now, dt) {
    if (!sl.shards.length) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = sl.shards.length - 1; i >= 0; i--) {
      const s = sl.shards[i], age = now - s.t0;
      if (age >= s.life) { sl.shards.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
      g.save();
      g.translate(s.x, s.y); g.rotate(s.r);
      g.globalAlpha = (1 - age / s.life) ** 1.2;
      g.fillStyle = css(s.gold ? GOLD : WHITE, 0.9);
      g.beginPath(); g.moveTo(-s.w, 0); g.lineTo(0, -s.h); g.lineTo(s.w, 0); g.lineTo(0, s.h * 0.4); g.closePath(); g.fill();
      g.restore();
    }
    g.restore();
  }

  /** Gambar seluruh slash (di bawah kursor): sapuan, belahan layar, ruang hampa, cincin portal, glitch, kilat, kata. */
  function slashFrame(g, now, dt) {
    const sl = c.slash, plan = sl.plan, T = now - sl.tI, total = sl.total, beatMs = plan.beat * 1000;
    const iw = innerWidth, ih = innerHeight, diag = sl.diag, ux = sl.ux, uy = sl.uy, nx = sl.nx, ny = sl.ny, cx = sl.cx, cy = sl.cy;
    const hb = now / 9 + sl.hue0, ang = Math.atan2(uy, ux), rmK = reduced ? 0.4 : 1;

    // --- jadwal event dari plan (sumber waktu yang sama dengan musik)
    while (sl.ei < plan.events.length && T >= plan.events[sl.ei].t * 1000) slashEvent(sl, plan.events[sl.ei++], T);
    if (!sl.cut && T >= 0) {
      sl.cut = true;
      const n = Math.round(60 * c.Q);
      for (let i = 0; i < n; i++) { // serpihan cahaya di sepanjang garis potong
        const s = (Math.random() - 0.5) * 2 * diag * 0.7, sgn = Math.random() < 0.5 ? -1 : 1, v = 200 + Math.random() * 700;
        if (sl.parts.length > 260) sl.parts.shift();
        sl.parts.push({ x: cx + ux * s, y: cy + uy * s, vx: nx * sgn * v + ux * (Math.random() - 0.5) * 200, vy: ny * sgn * v + uy * (Math.random() - 0.5) * 200, t0: now, life: 500 + Math.random() * 600, hue: Math.random() * 360, sz: 2 + Math.random() * 2 });
      }
      const ns = Math.round(18 * c.Q);
      for (let i = 0; i < ns; i++) { // serpihan "kaca" melayang
        const s = (Math.random() - 0.5) * diag * 0.8, sgn = Math.random() < 0.5 ? -1 : 1, v = 60 + Math.random() * 200;
        sl.shards.push({ x: cx + ux * s, y: cy + uy * s, vx: nx * sgn * v + ux * (Math.random() - 0.5) * 80, vy: ny * sgn * v + uy * (Math.random() - 0.5) * 80, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, w: 4 + Math.random() * 10, h: 8 + Math.random() * 18, t0: now, life: 900 + Math.random() * 600, gold: Math.random() < 0.4 });
      }
      try { onSlash?.('cut', { x: cx, y: cy, ux, uy, power: sl.power }); } catch (err) { console.error(err); }
    }
    if (!sl.slam && T >= total) {
      sl.slam = true;
      for (let i = 0; i < 4; i++) sl.rings.push({ t0: T + i * 60, life: 800, hue: sl.hue0 + i * 70, w: 16 - i * 3 });
      slashBurst(sl, 90, cx, cy, 0, TAU, 200, 900);
      try { onSlash?.('slam', { x: cx, y: cy, ux, uy, power: sl.power }); } catch (err) { console.error(err); }
    }

    // --- denyut dari ketukan
    let pulse = 0, snareP = 0, stabP = 0;
    for (let i = Math.max(0, sl.ei - 12); i < sl.ei; i++) {
      const ev = plan.events[i], age = T - ev.t * 1000;
      if (age < 0 || age > 500) continue;
      const v = ev.pow * Math.exp(-age / (ev.kind === 'kick' ? 130 : 90));
      if (ev.kind === 'kick' || ev.kind === 'final' || ev.kind === 'impact') pulse += v;
      else if (ev.kind === 'snare' || ev.kind === 'roll') snareP += v;
      else if (ev.kind === 'stab') stabP += v;
    }
    pulse = Math.min(1.6, pulse);
    sl.fly += dt * (0.35 + 1.8 * pulse + 0.5 * snareP);

    // --- seberapa terbuka celah: membuka cepat, menahan, lalu menutup menghantam tepat di SLAM (semua dalam satuan beat)
    const openDur = Math.max(190, beatMs * 0.55), closeDur = beatMs * 0.8, closeStart = total - closeDur;
    let o = 0;
    if (T >= 0) o = T < openDur ? 1 - Math.pow(2, -10 * (T / openDur)) : 1;
    if (T > closeStart) o = Math.min(o, 1 - easeIn3(clamp((T - closeStart) / closeDur)));
    if (T >= total) o = 0;
    sl.o = o;
    const off = sl.gapMax * o * (reduced ? 0.55 : 1) * (1 + 0.06 * pulse), rot = 0.03 * sl.power * o * rmK;
    const takeover = T >= 0 && T < total + 40;
    const sr = takeover ? sceneRect() : null;

    g.save();
    g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = false;

    // --- layar terbelah: dasar gelap, ruang hampa di celah, dua belahan adegan yang bergeser
    if (sr) {
      g.fillStyle = '#030510';
      g.fillRect(0, 0, iw, ih);

      const tf = (px, py, s) => {
        const dx = px - cx, dy = py - cy, a = rot * s, ca = Math.cos(a), sa = Math.sin(a);
        return [cx + dx * ca - dy * sa + nx * off * s, cy + dx * sa + dy * ca + ny * off * s];
      };
      const p1x = cx - ux * diag, p1y = cy - uy * diag, p2x = cx + ux * diag, p2y = cy + uy * diag;
      if (off > 0.5) drawVoid(g, sl, T, o, off, [tf(p1x, p1y, 1), tf(p2x, p2y, 1), tf(p2x, p2y, -1), tf(p1x, p1y, -1)], hb, pulse);

      const eglow = clamp((0.45 + 0.35 * pulse + 0.2 * stabP) * Math.min(1, o * 4 + 0.2));
      for (const s of [1, -1]) {
        g.save();
        g.translate(nx * off * s, ny * off * s);
        g.translate(cx, cy); g.rotate(rot * s); g.translate(-cx, -cy);
        g.beginPath();   // setengah bidang di satu sisi garis (ikut bergeser karena transform sudah terpasang)
        g.moveTo(p1x, p1y); g.lineTo(p2x, p2y);
        g.lineTo(p2x + nx * s * diag, p2y + ny * s * diag);
        g.lineTo(p1x + nx * s * diag, p1y + ny * s * diag);
        g.closePath();
        g.clip();
        g.drawImage(sr.sc, sr.x, sr.y, sr.w, sr.h);
        // cahaya putih-emas di tepi potongan dengan fringe pastel
        g.globalCompositeOperation = 'lighter';
        const eg = g.createLinearGradient(cx, cy, cx + nx * s * 110, cy + ny * s * 110);
        eg.addColorStop(0, css(WHITE, eglow)); eg.addColorStop(0.12, css(hue(hb + s * 40), eglow * 0.7)); eg.addColorStop(1, css(hue(hb + s * 40), 0));
        g.fillStyle = eg;
        g.fillRect(cx - diag, cy - diag, diag * 2, diag * 2);
        g.strokeStyle = rainbowGrad(g, p1x, p1y, p2x, p2y, Math.min(1, eglow + 0.3), hb);
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.stroke();
        g.restore();
      }

      // bar glitch horizontal (potongan adegan bergeser + tint cyan/pink) tiap event glitch dari plan
      if (!reduced && sl.glitchT >= 0 && T - sl.glitchT >= 0 && T - sl.glitchT < 100) {
        const hsh = (n) => { const v = Math.sin(n * 127.1 + sl.glitchSeed * 311.7) * 43758.5453; return v - Math.floor(v); };
        const nb = Math.max(2, Math.round(3 * c.Q)), H0 = sr.sc.height;
        for (let i = 0; i < nb; i++) {
          const sy = hsh(i + 1) * ih, sh = 4 + hsh(i + 9) * 22, dx = (hsh(i + 5) - 0.5) * 140;
          const srcY = clamp(((sy - sr.y) / sr.h) * H0, 0, H0 - 1), srcH = Math.max(1, Math.min(H0 - srcY, (sh / sr.h) * H0));
          g.drawImage(sr.sc, 0, srcY, sr.sc.width, srcH, sr.x + dx, sy, sr.w, sh);
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = i % 2 ? 'rgba(255,60,140,0.16)' : 'rgba(80,200,255,0.16)';
          g.fillRect(0, sy, iw, sh);
          g.globalCompositeOperation = 'source-over';
        }
      }
    }

    g.globalCompositeOperation = 'lighter';

    // --- cincin portal elips (cincin astrolab) + balok cahaya sepanjang tebasan
    if (takeover && o > 0.02) {
      const A = ensureAssets(), Rp = (off * 1.05 + 26 * o) * (1 + 0.1 * pulse), rx = Rp * 1.8, ry = Rp;
      g.save();
      g.lineWidth = 5 * o + 2;
      g.strokeStyle = conicOr(g, cx, cy, now / 900, 0.95 * Math.min(1, o + 0.2), hb);
      g.beginPath(); g.ellipse(cx, cy, rx, ry, ang, 0, TAU); g.stroke();
      g.lineWidth = 1.6;
      g.setLineDash([10, 14]);
      g.strokeStyle = conicOr(g, cx, cy, -now / 1300, 0.55 * o, hb + 120);
      g.beginPath(); g.ellipse(cx, cy, rx * 1.22, ry * 1.22, ang, 0, TAU); g.stroke();
      g.setLineDash([]);
      for (let i = 0; i < 24; i++) { // butir rune yang berputar di cincin
        const a = (i * TAU) / 24 + now / 1100, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
        g.fillStyle = css(hue(hb + i * 15, 0.78), 0.85 * o);
        g.fillRect(cx + ex * Math.cos(ang) - ey * Math.sin(ang) - 1.5, cy + ex * Math.sin(ang) + ey * Math.cos(ang) - 1.5, 3, 3);
      }
      g.restore();
      const bh = (3 + 10 * pulse) * o + 1.5;
      g.save(); g.translate(cx, cy); g.rotate(ang); g.globalAlpha = clamp(0.2 + o * 0.15); g.imageSmoothingEnabled = true;
      g.drawImage(A.beam || c.beam, -diag, -bh / 2, diag * 2, bh);
      g.restore();
    }

    if (takeover) { slashParts(g, sl, now, dt, o); drawShards(g, sl, now, dt); drawRuler(g, sl, T); }
    drawThinLines(g, sl, T);
    if (T < 420) drawBlade(g, sl, T);

    // --- garis potong berfringe warna (aberasi kromatik) tepat setelah momen potong
    if (T >= 0 && T < 520) {
      const ab = 16 * Math.exp(-T / 170), a = (1 - T / 520) ** 1.3;
      g.lineWidth = 3;
      for (let k = -1; k <= 1; k++) {
        g.strokeStyle = css(hue(hb + k * 120, 0.7), a * 0.9);
        g.beginPath();
        g.moveTo(cx - ux * diag + nx * ab * k, cy - uy * diag + ny * ab * k);
        g.lineTo(cx + ux * diag + nx * ab * k, cy + uy * diag + ny * ab * k);
        g.stroke();
      }
    }

    // --- cincin gelombang dari ketukan & SLAM
    for (let i = sl.rings.length - 1; i >= 0; i--) {
      const r = sl.rings[i], age = T - r.t0;
      if (age < 0) continue;
      if (age > r.life) { sl.rings.splice(i, 1); continue; }
      const q = age / r.life, rad = easeOut3(q) * diag * 0.6;
      g.lineWidth = r.w * (1 - q) + 1;
      g.strokeStyle = css(hue(r.hue + now / 20, 0.78), (1 - q) ** 1.3 * 0.85);
      g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke();
    }

    // --- cut ala video referensi: 1 frame hitam, lalu kilat putih; SLAM: kilat putih + jahitan prismatik
    g.globalCompositeOperation = 'source-over';
    const strobe = SLASH_STROBE && !reduced;
    if (T >= 0 && T < 520) {
      if (strobe && T < 55) {
        g.fillStyle = 'rgba(0,0,0,0.92)';
        g.fillRect(0, 0, iw, ih);
      } else {
        const a = (reduced ? 0.3 : 0.65) * Math.exp(-(strobe ? T - 55 : T) / 90);
        if (a > 0.01) { g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.fillRect(0, 0, iw, ih); }
      }
      const wa = (reduced ? 0.12 : 0.3) * Math.exp(-T / 200);
      if (wa > 0.01) {
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = rainbowGrad(g, cx - nx * diag, cy - ny * diag, cx + nx * diag, cy + ny * diag, wa, hb);
        g.fillRect(0, 0, iw, ih);
        g.globalCompositeOperation = 'source-over';
      }
    }
    if (T >= total && T < total + 450) {
      const d = T - total, a = (reduced ? 0.4 : 0.9) * Math.exp(-d / 110);
      if (a > 0.01) { g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.fillRect(0, 0, iw, ih); }
      const sa = 1 - d / 450;
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rainbowGrad(g, cx - ux * diag, cy - uy * diag, cx + ux * diag, cy + uy * diag, sa, hb);
      g.lineWidth = 10 * sa + 1;
      g.beginPath(); g.moveTo(cx - ux * diag, cy - uy * diag); g.lineTo(cx + ux * diag, cy + uy * diag); g.stroke();
      g.globalCompositeOperation = 'source-over';
    }

    // --- kata prismatik (muncul cepat, hilang sebelum SLAM)
    if (T > 120 && T < total - 100) {
      const wsize = Math.round(Math.min(iw * 0.06, 52)), e = wordCanvas(sl.word, wsize, 0, true), dd = T - 120;
      const pop = reduced ? 1 : 1 + 0.9 * Math.exp(-dd / 110);
      const alpha = clamp(Math.min(dd / 90, (total - 100 - T) / 160));
      const wx = clamp(cx, e.tw * pop * 0.5 + 12, iw - e.tw * pop * 0.5 - 12), wy = clamp(cy - sl.gapMax - 60, 70, ih - 70);
      g.globalAlpha = alpha;
      g.save(); g.translate(wx, wy); g.scale(pop, pop); g.imageSmoothingEnabled = true; g.drawImage(e.cv, -e.w / 2, -e.oy); g.restore();
      g.globalAlpha = 1;
    }

    g.restore();
    if (T > total + 500) endSlash();
  }

/* ---------- Bentuk bangun kursor ---------- */

  /** Jalur pita dari titik-titik jejak (tepi kiri & kanan, dihaluskan). */
  function strip(pts, now, life, w0, wobAmp = 0, wobPh = 0) {
    const n = pts.length, L = new Array(n), R = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y;
      const m = Math.hypot(tx, ty) || 1;
      tx /= m; ty /= m;
      const nx = -ty, ny = tx, q = clamp((now - pts[i].t) / life);
      const w = w0 * Math.pow(1 - q, 1.15);
      const off = wobAmp ? Math.sin(i * 0.55 + wobPh) * wobAmp * (1 - q) : 0;
      const px = pts[i].x + nx * off, py = pts[i].y + ny * off;
      L[i] = { x: px + nx * w, y: py + ny * w };
      R[i] = { x: px - nx * w, y: py - ny * w };
    }
    return { L, R };
  }

  function tracePoly(g, L, R) {
    const n = L.length;
    g.beginPath();
    g.moveTo(L[0].x, L[0].y);
    for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(L[i].x, L[i].y, (L[i].x + L[i + 1].x) / 2, (L[i].y + L[i + 1].y) / 2);
    g.lineTo(L[n - 1].x, L[n - 1].y);
    g.lineTo(R[n - 1].x, R[n - 1].y);
    for (let i = n - 2; i > 0; i--) g.quadraticCurveTo(R[i].x, R[i].y, (R[i].x + R[i - 1].x) / 2, (R[i].y + R[i - 1].y) / 2);
    g.lineTo(R[0].x, R[0].y);
    g.closePath();
  }

  /** Satu lengan flare: lancip, sedikit cekung (seperti bintang referensi), gradien cahaya ke ujung. */
  function arm(g, ang, len, wid, grad) {
    g.save();
    g.rotate(ang);
    g.scale(len, wid);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -1);
    g.quadraticCurveTo(0.2, -0.16, 1, 0);
    g.quadraticCurveTo(0.2, 0.16, 0, 1);
    g.closePath();
    g.fill();
    g.restore();
  }

  /* ---------- Gambar per bagian ---------- */

  function drawTail(g, now, life, S, p, accent, outer, f3, pr, hb) {
    const pts = c.trail;
    if (pts.length < 4) return;
    const head = pts[pts.length - 1], tail = pts[0];
    if (Math.hypot(head.x - tail.x, head.y - tail.y) < 3) return;
    const k = 0.75 + 0.1 * p;
    // saat holografik, warna ekor bergeser pelangi sepanjang ekor
    const c0 = mix(accent, hue(hb), pr), c1 = mix(mix(accent, outer, 0.5), hue(hb + 80), pr), c2 = mix(outer, hue(hb + 160), pr);
    const passes = [
      { w: S * 0.62 * k, st: [[0, css(c2, 0.55)], [0.6, css(c2, 0.18)], [1, css(c2, 0)]] },
      { w: S * 0.36 * k, st: [[0, css(c0, 0.8)], [0.5, css(c1, 0.35)], [1, css(c2, 0)]] },
      { w: S * 0.13 * k, st: [[0, 'rgba(255,255,255,0.95)'], [0.55, css(HOT, 0.4)], [1, css(HOT, 0)]] },
    ];
    for (const ps of passes) {
      const { L, R } = strip(pts, now, life, ps.w);
      const gr = g.createLinearGradient(head.x, head.y, tail.x, tail.y);
      ps.st.forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr;
      tracePoly(g, L, R);
      g.fill();
    }
    // pita energi yang memilin di sepanjang ekor (level 3+)
    if (f3 > 0.02 && !reduced) {
      for (const ph of [0, Math.PI]) {
        const { L, R } = strip(pts, now, life, S * 0.05, S * 0.5 * f3, now / 90 + ph);
        const gr = g.createLinearGradient(head.x, head.y, tail.x, tail.y);
        gr.addColorStop(0, css(WHITE, 0.9 * f3));
        gr.addColorStop(0.5, css(c0, 0.45 * f3));
        gr.addColorStop(1, css(c0, 0));
        g.fillStyle = gr;
        tracePoly(g, L, R);
        g.fill();
      }
    }
  }

  /* Percikan digambar per-ember (batched): maksimal 36 goresan per frame berapa pun jumlah percikannya. */
  const SB = Array.from({ length: 36 }, () => []);
  const SPARK_W = [1, 2.2, 3.6];
  function drawSparks(g, now, accent, outer) {
    for (const b of SB) b.length = 0;
    for (const s of c.sparks) {
      const q = (now - s.t0) / s.life;
      if (q < 0 || q >= 1) continue;
      const sp = Math.hypot(s.vx, s.vy) || 1, len = Math.max(2, sp * 0.045);
      const ci = q < 0.3 ? 0 : q < 0.65 ? 1 : 2, ai = Math.min(3, ((1 - q) ** 1.2 * 4) | 0), wi = s.sz < 1.8 ? 0 : s.sz < 3 ? 1 : 2;
      SB[(ci * 4 + ai) * 3 + wi].push(s.x, s.y, s.x - (s.vx / sp) * len, s.y - (s.vy / sp) * len);
    }
    g.lineCap = 'round';
    const cols = [css(WHITE), css(accent), css(outer)];
    for (let ci = 0; ci < 3; ci++) {
      g.strokeStyle = cols[ci];
      for (let ai = 0; ai < 4; ai++) {
        for (let wi = 0; wi < 3; wi++) {
          const b = SB[(ci * 4 + ai) * 3 + wi];
          if (!b.length) continue;
          g.globalAlpha = (ai + 0.6) / 4;
          g.lineWidth = SPARK_W[wi];
          g.beginPath();
          for (let i = 0; i < b.length; i += 4) { g.moveTo(b[i], b[i + 1]); g.lineTo(b[i + 2], b[i + 3]); }
          g.stroke();
        }
      }
    }
    g.globalAlpha = 1;
  }

  function drawPulses(g, now, S, accent) {
    for (let i = c.pulses.length - 1; i >= 0; i--) {
      const pl = c.pulses[i], d = now - pl.t0;
      if (d < 0) continue;
      const q = d / pl.life;
      if (q >= 1) { c.pulses.splice(i, 1); continue; }
      const r = lerp(S * 0.4, pl.r1, 1 - (1 - q) ** 3);
      g.globalAlpha = (1 - q) ** 1.4;
      g.strokeStyle = css(accent, 0.9);
      g.lineWidth = lerp(pl.w, 1, q);
      g.beginPath(); g.arc(c.hx, c.hy, r, 0, TAU); g.stroke();
      g.strokeStyle = css(WHITE, 0.8);
      g.lineWidth = Math.max(1, pl.w * 0.3 * (1 - q));
      g.beginPath(); g.arc(c.hx, c.hy, r * 0.84, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
  }

  function drawHead(g, now, S, p, accent, f, pr, hb, cq) {
    const boost = c.boost, twinkle = 1 + 0.05 * Math.sin(now / 260);
    const jit = c.sc ? cq * 1.6 : 0;
    g.save();
    g.translate(c.hx + (Math.random() - 0.5) * jit * 2, c.hy + (Math.random() - 0.5) * jit * 2);

    // aura
    const Rg = S * (2.2 + 0.4 * p + 0.5 * cq) * (1 + 0.6 * boost) * twinkle;
    let gr = g.createRadialGradient(0, 0, 0, 0, 0, Rg);
    gr.addColorStop(0, css(accent, 0.55));
    gr.addColorStop(0.35, css(accent, 0.18));
    gr.addColorStop(1, css(accent, 0));
    g.fillStyle = gr;
    g.fillRect(-Rg, -Rg, Rg * 2, Rg * 2);

    // sinar radial berputar (level 4-5, dan saat finale / smash / charge)
    const rayW = clamp(f[4] * 0.55 + f[5] * 0.45 + c.rayBoost * 0.5 + cq * 0.4);
    if (rayW > 0.01) {
      const n = 12, len = S * (4 + 1.5 * f[5]) * (1 + c.rayBoost * 0.6 + cq * 0.4), rot = reduced ? 0 : now / 5000;
      if (pr > 0.05) { gr = null; } else {
        gr = g.createRadialGradient(0, 0, S * 0.3, 0, 0, len);
        gr.addColorStop(0, css(accent, 0.3));
        gr.addColorStop(1, css(accent, 0));
      }
      g.globalAlpha = rayW;
      for (let i = 0; i < n; i++) {
        const a = rot + (i * TAU) / n, w = (TAU / n) * 0.14 * (i % 2 ? 0.6 : 1);
        g.fillStyle = gr || css(hue(hb + i * 30, 0.66), 0.17);   // holografik: tiap sinar warna pelangi sendiri
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len);
        g.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
    }

    // cincin halo putus-putus berputar (level 2+)
    if (f[2] > 0.02) {
      const R = S * (1.15 + 0.1 * Math.sin(now / 400)), rot = reduced ? 0 : now / 900;
      g.strokeStyle = css(accent, 0.5 * f[2]);
      g.lineWidth = 1.5;
      g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = rot + (i * TAU) / 3;
        g.beginPath(); g.arc(0, 0, R, a, a + TAU * 0.2); g.stroke();
      }
    }

    // lengan flare 4 ujung (+ 4 diagonal di level 3+)
    const len = S * (1.55 + 0.25 * p) * (1 + boost * 0.7 + cq * 0.5) * twinkle;
    const wid = S * (0.2 + 0.02 * p);
    const ug = g.createLinearGradient(0, 0, 1, 0);
    ug.addColorStop(0, css(WHITE, 0.95));
    ug.addColorStop(0.18, css(HOT, 0.85));
    ug.addColorStop(0.5, css(accent, 0.45));
    ug.addColorStop(1, css(accent, 0));
    const hlen = len * (1 + 0.35 * f[2]);
    arm(g, -Math.PI / 2, len, wid, ug);
    arm(g, Math.PI / 2, len, wid, ug);
    arm(g, 0, hlen, wid, ug);
    arm(g, Math.PI, hlen, wid, ug);
    if (f[3] > 0.02) {
      g.globalAlpha = f[3];
      for (let k = 0; k < 4; k++) arm(g, Math.PI / 4 + (k * Math.PI) / 2, len * 0.55, wid * 0.7, ug);
      g.globalAlpha = 1;
    }
    // holografik: tiga lapis lengan berwarna R/G/B bergeser sudut (aberasi kromatik pelangi)
    if (pr > 0.05) {
      for (let k = 0; k < 3; k++) {
        const col = hue(hb + k * 120, 0.64), gg = g.createLinearGradient(0, 0, 1, 0);
        gg.addColorStop(0, css(col, 0.55 * pr)); gg.addColorStop(0.5, css(col, 0.25 * pr)); gg.addColorStop(1, css(col, 0));
        const da = (k - 1) * 0.05 * pr * (1 + cq * 2);
        arm(g, -Math.PI / 2 + da, len * 1.1, wid, gg); arm(g, Math.PI / 2 + da, len * 1.1, wid, gg);
        arm(g, da, hlen * 1.1, wid, gg); arm(g, Math.PI + da, hlen * 1.1, wid, gg);
      }
    }

    // garis kilau tipis yang berkedip
    const tw = 0.5 + 0.5 * Math.sin(now / 170);
    g.globalAlpha = 0.25 + 0.35 * tw;
    g.fillStyle = css(WHITE);
    const rl = len * (1.2 + 0.5 * tw) * (1 + 0.3 * f[2]);
    g.fillRect(-rl, -0.5, rl * 2, 1);
    g.fillRect(-0.5, -rl * 0.8, 1, rl * 1.6);
    g.globalAlpha = 1;

    // inti putih panas
    const Rc = S * 0.62 * (1 + boost * 0.6);
    gr = g.createRadialGradient(0, 0, 0, 0, 0, Rc);
    gr.addColorStop(0, css(WHITE, 1));
    gr.addColorStop(0.35, css(WHITE, 0.85));
    gr.addColorStop(0.7, css(HOT, 0.35));
    gr.addColorStop(1, css(accent, 0));
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, Rc, 0, TAU); g.fill();

    // cincin progres charge (pelangi), terisi sampai penuh
    if (c.sc) {
      const R = S * (1.9 + cq * 0.9), a0 = -Math.PI / 2;
      g.lineWidth = 2 + cq * 3;
      g.strokeStyle = css(WHITE, 0.12);
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      g.strokeStyle = conicOr(g, 0, 0, a0 + now / 1000, 0.95, hb);
      g.beginPath(); g.arc(0, 0, R, a0, a0 + TAU * cq); g.stroke();
      for (const m of [0.33, 0.66, 1]) {   // penanda tahap
        const a = a0 + TAU * m;
        g.fillStyle = css(WHITE, cq >= m ? 0.95 : 0.3);
        g.fillRect(Math.cos(a) * R - 2, Math.sin(a) * R - 2, 4, 4);
      }
    }

    g.restore();
  }

  /** Cahaya orbit berekor kecil (satu per level 2..5). */
  function drawOrbits(g, now, S, p, pr, hb) {
    const T = c.tex;
    for (let k = 0; k < 4; k++) {
      const w = clamp(p - (k + 1));
      if (w <= 0) continue;
      const dir = k % 2 ? -1 : 1, R = S * (1.5 + 0.2 * k);
      const base = (reduced ? 0 : now / (520 + 110 * k)) * dir + k * 1.7;
      for (let j = 0; j < 10; j++) {
        const a = base - dir * j * 0.1, f = 1 - j / 10;
        const x = c.hx + Math.cos(a) * R, y = c.hy + Math.sin(a) * R * 0.9;
        g.globalAlpha = w * f * 0.85;
        const r = S * 0.34 * f + 2;
        g.drawImage(T.gold, x - r, y - r, r * 2, r * 2);
        if (j === 0) { g.globalAlpha = w; const r2 = r * 0.55; g.drawImage(T.white, x - r2, y - r2, r2 * 2, r2 * 2); }
      }
      if (pr > 0.05) { // holografik: titik orbit berwarna pelangi
        const x = c.hx + Math.cos(base) * R, y = c.hy + Math.sin(base) * R * 0.9;
        g.globalAlpha = w * pr; g.fillStyle = css(hue(hb + k * 90), 0.9);
        g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  /* ---------- Charge: partikel yang menyedot ke kursor + garis bidik ---------- */

  function updateChargeFx(g, now, dt, q, hb) {
    c.cpAcc += dt * (20 + q * 160) * c.Q;
    while (c.cpAcc >= 1) {
      c.cpAcc -= 1;
      if (c.cp.length > 110) c.cp.shift();
      if (Math.random() < 0.65) { // cahaya yang tersedot melingkar ke kursor
        c.cp.push({ k: 0, a: Math.random() * TAU, r: 90 + Math.random() * 130, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3), hue: Math.random() * 360, t0: now, life: 500 + Math.random() * 400 });
      } else { // debu cahaya surgawi yang naik melayang
        c.cp.push({ k: 1, x: c.hx + (Math.random() - 0.5) * 150, y: c.hy + 10 + Math.random() * 40, vy: -(30 + Math.random() * 90), sw: Math.random() * TAU, t0: now, life: 700 + Math.random() * 700 });
      }
    }
    const bk = [[], [], [], [], [], []], motes = [];
    for (let i = c.cp.length - 1; i >= 0; i--) {
      const p = c.cp[i], u = (now - p.t0) / p.life;
      if (u >= 1) { c.cp.splice(i, 1); continue; }
      if (p.k === 1) { motes.push(p.x + Math.sin(p.sw + u * 5) * 8, p.y + p.vy * u * (p.life / 1000), 1 - u); continue; }
      const rr = p.r * Math.pow(1 - u, 1.3), a = p.a + p.w * u * 2, rr0 = p.r * Math.pow(1 - Math.max(0, u - 0.08), 1.3), a0 = p.a + p.w * Math.max(0, u - 0.08) * 2;
      bk[((((p.hue + hb) / 60) | 0) % 6 + 6) % 6].push(c.hx + Math.cos(a) * rr, c.hy + Math.sin(a) * rr * 0.9, c.hx + Math.cos(a0) * rr0, c.hy + Math.sin(a0) * rr0 * 0.9);
    }
    g.save();
    g.lineCap = 'round';
    for (let b = 0; b < 6; b++) {
      const arr = bk[b];
      if (!arr.length) continue;
      g.strokeStyle = css(hue(b * 60 + 30, 0.78), 0.85);
      g.lineWidth = 1.8;
      g.beginPath();
      for (let i = 0; i < arr.length; i += 4) { g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]); }
      g.stroke();
    }
    g.fillStyle = css(HOT, 0.9); // kilau berbentuk plus
    for (let i = 0; i < motes.length; i += 3) {
      g.globalAlpha = motes[i + 2];
      g.fillRect(motes[i] - 1, motes[i + 1] - 3.5, 2, 7);
      g.fillRect(motes[i] - 3.5, motes[i + 1] - 1, 7, 2);
    }
    g.restore();
  }

  /** Suasana CELESTIAL saat charge: cakram holografik pastel membesar, pilar cahaya, cincin astrolab bertanda ukur
   *  yang berputar berlawanan, dan halo malaikat di atas kursor. Makin penuh charge makin besar. */
  function drawCelestialCharge(g, now, cq, hb, S) {
    const hx = c.hx, hy = c.hy;
    // cakram holografik pastel (dari video referensi)
    const rd = 40 + 160 * cq;
    g.save(); g.translate(hx, hy); g.rotate(now / 2400); g.globalAlpha = 0.12 + 0.5 * cq;
    g.drawImage(c.holo, -rd, -rd, rd * 2, rd * 2);
    g.restore();
    // pilar cahaya vertikal
    const ph = 60 + 380 * cq, pw = 10 + 22 * cq;
    g.save(); g.translate(hx, hy); g.rotate(-Math.PI / 2); g.globalAlpha = 0.25 + 0.5 * cq;
    g.drawImage(c.beam, -ph, -pw / 2, ph * 2, pw);
    g.restore();
    // cincin astrolab: tanda ukur berputar berlawanan arah
    for (let k = 0; k < 2; k++) {
      const R = S * (2.6 + 0.9 * k + 0.8 * cq);
      g.save();
      g.translate(hx, hy); g.rotate((k ? -1 : 1) * now / (1800 + 600 * k));
      g.setLineDash([1.5, 9 + k * 4]);
      g.lineWidth = 5; g.strokeStyle = css(hue(hb + k * 120), 0.55 * (0.4 + cq));
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      g.setLineDash([]);
      g.lineWidth = 1; g.strokeStyle = css(WHITE, 0.3);
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      g.restore();
    }
    // halo malaikat di atas kepala kursor
    g.save();
    g.lineWidth = 7; g.strokeStyle = css(GOLD, 0.12 + 0.12 * cq);
    g.beginPath(); g.ellipse(hx, hy - S * 2.1, S * 1.15, S * 0.34, 0, 0, TAU); g.stroke();
    g.lineWidth = 2.2; g.strokeStyle = css(GOLD, 0.5 + 0.4 * cq);
    g.beginPath(); g.ellipse(hx, hy - S * 2.1, S * 1.15, S * 0.34, 0, 0, TAU); g.stroke();
    g.restore();
  }

  /** Garis tipis bidik: pratinjau garis tebasan (menembus layar) + segmen antara titik tekan dan kursor. */
  function drawAim(g, now, q, hb) {
    const sc = c.sc, ax = sc.x0, ay = sc.y0, hx = c.hx, hy = c.hy, dx = hx - ax, dy = hy - ay, d = Math.hypot(dx, dy);
    const drag = d >= 24, ux = drag ? dx / d : Math.cos(sc.ang0), uy = drag ? dy / d : Math.sin(sc.ang0);
    const mx = drag ? (ax + hx) / 2 : ax, my = drag ? (ay + hy) / 2 : ay, L = Math.hypot(innerWidth, innerHeight) * 1.2;
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = rainbowGrad(g, mx - ux * L, my - uy * L, mx + ux * L, my + uy * L, 0.22 + 0.4 * q, hb);
    g.lineWidth = 1 + q * 1.2;
    g.beginPath(); g.moveTo(mx - ux * L, my - uy * L); g.lineTo(mx + ux * L, my + uy * L); g.stroke();
    g.globalAlpha = 0.22; g.lineWidth = 6; g.stroke(); g.globalAlpha = 1;
    if (drag) {
      g.strokeStyle = rainbowGrad(g, ax, ay, hx, hy, 0.95, hb * 1.4);
      g.lineWidth = 2.2 + q * 1.6;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(hx, hy); g.stroke();
    }
    // jangkar di titik tekan: berlian berputar
    const r = 7 + q * 3, rt = now / 500;
    g.strokeStyle = css(WHITE, 0.85); g.lineWidth = 1.4;
    g.beginPath();
    for (let i = 0; i < 4; i++) { const a = rt + (i * TAU) / 4; g[i ? 'lineTo' : 'moveTo'](ax + Math.cos(a) * r, ay + Math.sin(a) * r); }
    g.closePath(); g.stroke();
    g.restore();
  }

  /* ---------- ULTRA SMASH: lapisan belakang (di bawah bintang kursor) ---------- */

  function drawSmashBack(g, now) {
    const diag = Math.hypot(innerWidth, innerHeight), T = c.tex;
    for (const s of c.smashes) {
      const d = now - s.t0, k = s.k;
      if (d < 0 || d > 1500) continue;

      // ledakan cahaya besar di titik klik (tekstur, bukan gradien layar penuh)
      if (d < 650) {
        const q = d / 650, r = lerp(90, 420 * k, easeOut3(Math.min(1, d / 450)));
        g.globalAlpha = 0.95 * (1 - q);
        g.drawImage(T.white, s.x - r, s.y - r, r * 2, r * 2);
        g.globalAlpha = 0.55 * (1 - q);
        const r2 = r * 0.85;
        g.drawImage(T.gold, s.x - r2, s.y - r2, r2 * 2, r2 * 2);
        g.globalAlpha = 1;
      }

      // gelombang kejut layar penuh
      const nRing = s.light || reduced ? 2 : c.Q < 0.6 || c.smashes.length > 1 ? 3 : SMASH_RINGS.length;
      for (let i = 0; i < nRing; i++) {
        const rg = SMASH_RINGS[i], dd = d - rg.d;
        if (dd < 0 || dd > rg.life) continue;
        const q = dd / rg.life, r = diag * rg.f * easeOut3(q) * (0.85 + 0.15 * k), a = (1 - q) ** 1.3;
        g.lineWidth = rg.w * (1 - q) + 2;
        g.strokeStyle = css(rg.col, a * 0.28);
        g.beginPath(); g.arc(s.x, s.y, r, 0, TAU); g.stroke();
        g.lineWidth = Math.max(1.5, rg.w * 0.25 * (1 - q));
        g.strokeStyle = css(mix(rg.col, WHITE, 0.6), a * 0.95);
        g.beginPath(); g.arc(s.x, s.y, r, 0, TAU); g.stroke();
      }
      if (s.light || reduced) continue;

      // balok flare memotong layar (tekstur)
      if (d < 650) {
        const a = (1 - d / 650) ** 1.5, h = (8 + 70 * Math.exp(-d / 110)) * k;
        g.globalAlpha = a;
        g.drawImage(c.beam, s.x - innerWidth, s.y - h / 2, innerWidth * 2, h);
        g.save();
        g.translate(s.x, s.y); g.rotate(Math.PI / 2);
        g.drawImage(c.beam, -innerHeight, -h * 0.35, innerHeight * 2, h * 0.7);
        g.restore();
        g.globalAlpha = 1;
      }

      // retakan petir
      if (d < 900) {
        const a = (1 - d / 900) ** 1.4, reveal = clamp(d / 160);
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const pts of s.bolts) {
          const m = Math.floor(pts.length * reveal);
          if (m < 2) continue;
          g.beginPath();
          g.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < m; i++) g.lineTo(pts[i][0], pts[i][1]);
          g.strokeStyle = css(GOLD, a * 0.4); g.lineWidth = 7 * (1 - d / 900) + 1; g.stroke();
          g.strokeStyle = css(WHITE, a * 0.95); g.lineWidth = 2.2 * (1 - d / 1500); g.stroke();
        }
      }
    }
  }

  /* ---------- ULTRA SMASH: lapisan depan (di atas segalanya) ---------- */

  function drawWord(g, s, d) {
    if (s.light || d < 30 || d > 1150) return;
    const dd = d - 30, e = wordCanvas(s.word, s.wsize, s.combo, false);
    const pop = reduced ? 1 : 1 + 1.1 * Math.exp(-dd / 100) + 0.05 * Math.cos(dd / 55) * Math.exp(-dd / 300);
    const alpha = d < 700 ? 1 : 1 - (d - 700) / 450, shk = reduced ? 0 : 7 * Math.exp(-dd / 160);
    const cx = clamp(s.x, (e.tw * pop) / 2 + 10, innerWidth - (e.tw * pop) / 2 - 10), cy = clamp(s.y - s.wsize * 0.9, s.wsize, innerHeight - s.wsize);
    g.save();
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = clamp(alpha);
    g.translate(cx + (Math.random() - 0.5) * shk, cy + (Math.random() - 0.5) * shk);
    g.rotate(s.rot * Math.exp(-dd / 300));
    g.scale(pop, pop);
    g.drawImage(e.cv, -e.w / 2, -e.oy);
    g.restore();
  }

  function drawSmashFront(g, now) {
    const W = innerWidth, H = innerHeight, diag = Math.hypot(W, H);
    for (const s of c.smashes) {
      const d = now - s.t0;
      if (d < 0 || d > 1500) continue;
      g.save();
      g.globalCompositeOperation = 'source-over';

      const framePhase = s.frame && d < 75;
      if (framePhase) { // FRAME IMPACT: layar jadi hitam pekat, hanya garis putih + inti terang
        g.fillStyle = 'rgba(0,0,0,0.94)';
        g.fillRect(0, 0, W, H);
      }

      // garis kecepatan manga memancar dari titik klik (satu path, satu fill)
      if (s.lines && (framePhase || d < 420)) {
        const alpha = framePhase ? 1 : 0.5 * (1 - d / 420), ln = s.lines, n = ln.length / 3;
        g.fillStyle = css(WHITE, alpha);
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const a = ln[i * 3], r0 = ln[i * 3 + 1], w = ln[i * 3 + 2];
          g.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
          g.lineTo(s.x + Math.cos(a - w) * diag, s.y + Math.sin(a - w) * diag);
          g.lineTo(s.x + Math.cos(a + w) * diag, s.y + Math.sin(a + w) * diag);
          g.closePath();
        }
        g.fill();
        if (framePhase) { g.beginPath(); g.arc(s.x, s.y, 46 * s.k, 0, TAU); g.fill(); }  // inti putih di frame impact
      }

      // kilat putih layar penuh (frame impact: hitam 75 ms -> putih -> memudar)
      let fa;
      if (s.frame) fa = d < 75 ? 0 : d < 150 ? 0.85 : 0.85 * (1 - clamp((d - 150) / 350)) ** 2;
      else fa = (s.light ? 0.2 : reduced ? 0.2 : 0.45) * (1 - clamp(d / 300)) ** 2;
      if (fa > 0.005) { g.fillStyle = `rgba(255,246,208,${fa.toFixed(3)})`; g.fillRect(0, 0, W, H); }

      g.restore();
      drawWord(g, s, d);
    }
  }

  /** Guncangan layar untuk lapisan smash (jumlah dari semua smash yang sedang berjalan). */
  function smashShake(now) {
    if (reduced) return [0, 0];
    let a = 0;
    for (const s of c.smashes) { const d = now - s.t0; if (d >= 0 && d < 1200) a += (s.light ? 4 : 10) * s.k * Math.exp(-d / 200); }
    return [(Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a * 0.8];
  }

  /* ---------- Loop ---------- */

  function frame() {
    c.raf = requestAnimationFrame(frame);
    const g = c.g, now = performance.now();
    const dtRaw = now - (c.last || now);
    c.last = now;
    const dt = Math.min(0.05, dtRaw / 1000);

    // kualitas adaptif: frame lambat saat ramai -> kurangi partikel/petir/garis; terus lambat -> resolusi 1x
    c.ema += (Math.min(100, dtRaw) - c.ema) * 0.08;
    if (c.smashes.length || c.slash) {
      if (c.ema > 24) c.Q = Math.max(0.35, c.Q - 0.04);
      else if (c.ema < 17.5) c.Q = Math.min(1, c.Q + 0.008);
    } else c.Q = Math.min(1, c.Q + 0.02);
    if (c.Q < 0.5 && !c.lowRes) { c.lowRes = true; resize(); }

    g.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalCompositeOperation = 'lighter';
    g.lineJoin = 'round';

    // level naik perlahan menuju target
    const diff = c.target - c.p;
    c.p = Math.abs(diff) < 0.003 ? c.target : c.p + diff * (1 - Math.exp(-dt * 2.2));
    c.boost *= Math.exp(-dt * 3.2);
    c.rayBoost *= Math.exp(-dt * 0.9);

    // charge: progres, tahap, suara
    let cq = 0;
    if (c.sc) {
      const sc = c.sc;
      cq = sc.q = clamp((now - sc.t0) / CHARGE_MS);
      const st = cq >= 1 ? 3 : cq >= 0.66 ? 2 : cq >= 0.33 ? 1 : 0;
      if (st > sc.stage) {
        sc.stage = st;
        c.boost = Math.max(c.boost, 0.8 + 0.3 * st);
        if (!reduced) ring(0, 90 + 40 * st, 6 + 2 * st, 520);
        try { slashAudio?.ping?.(st); } catch { /* abaikan */ }
      }
      try { slashAudio?.chargeSet?.(cq); } catch { /* abaikan */ }
    }

    // holografik: naik cepat saat charge / slash, turun pelan setelahnya
    const prTarget = c.sc || c.slash ? 1 : 0;
    c.prism += (prTarget - c.prism) * (1 - Math.exp(-dt * (prTarget ? 5 : 2.5)));
    if (c.prism < 0.002 && !prTarget) c.prism = 0;
    const pr = c.prism, hb = now / 9;

    const p = c.p, S = 15 + 5.5 * p;
    const f = [0, 1, 2, 3, 4, 5].map((k) => (k === 0 ? 1 : clamp(p - (k - 1)))); // f[k] = seberapa jauh fitur level k muncul
    const accent = mix(accentAt(p), hue(hb, 0.64), pr), outer = mix(outerAt(p), hue(hb + 140, 0.6), pr);

    // kepala kursor (mengikuti pointer dengan sedikit kelambanan)
    if (c.seen) {
      const px = c.hx, py = c.hy, k = reduced ? 1 : 1 - Math.exp(-dt * 45);
      c.hx += (c.x - c.hx) * k; c.hy += (c.y - c.hy) * k;
      const mx = c.hx - px, my = c.hy - py, dist = Math.hypot(mx, my);
      c.spd += ((dt > 0 ? dist / dt : 0) - c.spd) * (1 - Math.exp(-dt * 10));
      if (dist > 0.4) { c.dx = mx / dist; c.dy = my / dist; }

      if (!reduced) {
        const lastPt = c.trail[c.trail.length - 1];
        if (!lastPt || Math.hypot(lastPt.x - c.hx, lastPt.y - c.hy) > 2) {
          c.trail.push({ x: c.hx, y: c.hy, t: now });
          if (c.trail.length > 90) c.trail.shift();
        }
        // bara meteor: lepas ke belakang arah gerak, lalu jatuh
        c.acc += dist;
        const step = Math.max(3, 7 - p * 0.8) / Math.max(0.5, c.Q), per = 1 + (p >= 3 ? 1 : 0);
        while (c.acc > step) {
          c.acc -= step;
          for (let i = 0; i < per; i++) {
            const back = 20 + Math.min(c.spd, 1500) * 0.1;
            spark(
              c.hx + (Math.random() - 0.5) * S * 0.5, c.hy + (Math.random() - 0.5) * S * 0.5,
              -c.dx * back + (Math.random() - 0.5) * 60, -c.dy * back + (Math.random() - 0.5) * 60 + 20,
              450 + Math.random() * 500 + p * 80, 1 + Math.random() * 1.5 + p * 0.25, 260 + p * 20,
            );
          }
        }
        // bara melayang saat diam (level 2+)
        if (f[2] > 0) {
          c.idle += dt * (2 + p * 3) * f[2];
          while (c.idle >= 1) {
            c.idle -= 1;
            const a = Math.random() * TAU, v = 20 + Math.random() * 50;
            spark(c.hx + Math.cos(a) * S * 0.6, c.hy + Math.sin(a) * S * 0.6, Math.cos(a) * v, Math.sin(a) * v - 25, 700 + Math.random() * 500, 1 + Math.random(), 40);
          }
        }
      }
    }

    // umur ekor memanjang seiring level
    const life = 240 + 160 * p + 200 * c.boost;
    while (c.trail.length && now - c.trail[0].t > life) c.trail.shift();

    // fisika bara (yang masih tertunda belum bergerak)
    for (let i = c.sparks.length - 1; i >= 0; i--) {
      const s = c.sparks[i];
      if (now - s.t0 >= s.life) { c.sparks.splice(i, 1); continue; }
      if (now < s.t0) continue;
      s.vx *= Math.exp(-dt * 0.8);
      s.vy += s.g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    if (c.smashes.length) {
      let live = 0;
      for (let i = 0; i < c.smashes.length; i++) if (now - c.smashes[i].t0 < 1500) c.smashes[live++] = c.smashes[i];
      c.smashes.length = live;
    }

    // SLASH di lapisan paling bawah (menimpa layar dengan dua belahan + galaksi)
    if (c.slash) {
      slashFrame(g, now, dt);
      g.globalCompositeOperation = 'lighter';
    }

    drawTail(g, now, life, S, p, accent, outer, f[3], pr, hb);

    // lapisan ULTRA SMASH belakang (ikut berguncang)
    if (c.smashes.length) {
      const [sx, sy] = smashShake(now);
      g.save(); g.translate(sx, sy);
      drawSmashBack(g, now);
      g.restore();
    }

    drawSparks(g, now, accent, outer);
    drawPulses(g, now, S, accent);
    if (c.seen) {
      if (c.sc) { drawCelestialCharge(g, now, cq, hb, S); updateChargeFx(g, now, dt, cq, hb); drawAim(g, now, cq, hb); }
      drawHead(g, now, S, p, accent, f, pr, hb, cq);
      drawOrbits(g, now, S, p, pr, hb);
    }

    // lapisan ULTRA SMASH depan: frame impact, garis kecepatan, kilat, teks
    if (c.smashes.length) {
      const [sx, sy] = smashShake(now);
      g.save(); g.translate(sx * 0.5, sy * 0.5);
      drawSmashFront(g, now);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
  }

  /* ---------- API ---------- */

  function start() {
    if (c.on) return;
    if (typeof matchMedia === 'function' && !matchMedia('(hover: hover) and (pointer: fine)').matches) return; // layar sentuh: tanpa kursor
    c.on = true;
    c.tex = { white: glowTexture(WHITE), gold: glowTexture(GOLD) };
    c.beam = beamTexture();
    c.holo = holoDiscTexture();
    c.cv = document.createElement('canvas');
    c.cv.className = 'cine-cursor';
    c.g = c.cv.getContext('2d');
    root.append(c.cv);
    root.classList.add('cine-star-cursor');
    resize();
    addEventListener('resize', resize);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onCancel);
    addEventListener('blur', onCancel);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('mousedown', stopMiddle, { passive: false });
    root.addEventListener('auxclick', stopMiddle, { passive: false });
    c.last = 0;
    c.raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!c.on) return;
    c.on = false;
    cancelAnimationFrame(c.raf);
    cancelCharge();
    if (c.slash) { c.slash = null; lockActions(false); }
    removeEventListener('resize', resize);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onCancel);
    removeEventListener('blur', onCancel);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('mousedown', stopMiddle);
    root.removeEventListener('auxclick', stopMiddle);
    root.classList.remove('cine-star-cursor');
    c.cv?.remove();
    c.trail.length = c.sparks.length = c.pulses.length = c.smashes.length = c.cp.length = 0;
  }

  /** Naikkan/turunkan level (0..5). `instant` = tanpa transisi (dipakai saat LEWATI). */
  function setLevel(n, { instant = false } = {}) {
    const lv = clamp(Math.round(n), 0, MAX_LEVEL);
    if (instant) { c.target = c.p = lv; return; }
    if (lv > c.target) { c.target = lv; upgrade(lv); } else c.target = lv;
  }

  /** Ledakan terakhir (kata VICTORY menghantam). */
  function finale() {
    c.boost = 1.8;
    c.rayBoost = 1;
    if (!c.seen || reduced) return;
    ring(0, 230, 12, 800);
    ring(120, 330, 9, 850);
    ring(260, 430, 7, 900);
    radialBurst(90, 150, 520, 1.2);
  }

  return {
    start, stop, setLevel, finale,
    get level() { return c.target; },
    get ultra() { return isUltra(); },
    get quality() { return c.Q; },
  };
}