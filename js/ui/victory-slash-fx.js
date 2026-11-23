/* ===== EFEK SLASH · CELESTIAL RIFT =====
   Tombol tengah mouse: tahan = charge (cahaya surgawi berkumpul), lepas = tebasan.
   Layar terbelah, di celahnya terbuka RUANG HAMPA GALAKSI sungguhan:
   nebula berlapis, galaksi spiral miring yang berputar, planet bercincin, bintang yang terbang
   melewati kamera (3D), bintang berduri ala teleskop, komet. Di atasnya: halo geometri suci,
   sinar cahaya, bulu & debu emas.
   Gaya potongan mengikuti video referensi (motion graphic): garis sumbu dengan skala penggaris,
   frame hitam-putih 1-2 frame saat impact, geseran irisan (glitch), garis kecepatan radial.

   Durasi dibuat PENDEK: potong -> celah terbuka cepat -> 4 ketuk -> menutup menghantam (SLAM) ±1,3 dtk.

   Antarmuka:
     const fx = createSlashFx({ reduced, getScene, audio, emit, getQ, wordCanvas, lockActions, onEnd })
     fx.prepare()                  siapkan tekstur (dicicil per potongan kecil, aman dipanggil berulang)
     fx.charge(g, now, dt, info)   gambar efek charge (info = { sc, hx, hy, q, hb })
     fx.start({ cx, cy, ux, uy, q, power })   mulai tebasan (jadwalkan audio + visual)
     fx.frame(g, now, dt)          gambar tebasan (hanya bila fx.active)
     fx.active / fx.stop()                                                                         */

const TAU = Math.PI * 2;
const SWEEP_MS = 140;     // lama bilah menyapu layar sebelum momen potong (T = 0)
const AFTER_MS = 700;     // ekor setelah SLAM sebelum efek selesai
const STROBE = true;      // frame hitam -> negatif 1-2 frame ala video referensi. false = matikan kedipan.
const WORDS = ['CELESTIAL RIFT!!', 'HEAVEN SPLIT!!', 'STARFALL CUT!!', 'COSMOS BREAK!!', 'ASTRAL SLASH!!', 'GALAXY GATE!!'];

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(a).toFixed(3)})`;
const easeOut3 = (t) => 1 - (1 - t) ** 3;
const easeIn3 = (t) => t * t * t;
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const fract = (v) => v - Math.floor(v);

const WHITE = [255, 255, 255], PALE = [255, 244, 214], GOLD = [255, 214, 128];
const ICE = [170, 222, 255], VIOLET = [165, 125, 255], ROSE = [255, 150, 205];
const CEL = [ICE, WHITE, GOLD, ROSE, VIOLET];      // palet surgawi (pengganti pelangi penuh)

/** Warna palet surgawi, k bebas (siklik, interpolasi halus). */
function celCol(k) {
  k = ((k % CEL.length) + CEL.length) % CEL.length;
  const i = Math.floor(k);
  return mix(CEL[i], CEL[(i + 1) % CEL.length], k - i);
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (R) => (R() + R() + R() + R() - 2) * 0.9;

/* ---------- Noise (nebula) ---------- */

const PERM = (() => {
  const p = new Uint8Array(512), R = mulberry(2024), a = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = (R() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  return p;
})();

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), X = xi & 255, Y = yi & 255;
  const a = PERM[X + PERM[Y]], b = PERM[X + 1 + PERM[Y]], c = PERM[X + PERM[Y + 1]], d = PERM[X + 1 + PERM[Y + 1]];
  const top = a + (b - a) * u, bot = c + (d - c) * u;
  return (top + (bot - top) * v) / 255;
}
function fbm(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; x += 17.3; y += 9.1; }
  return s / n;
}

const mkCanvas = (w, h = w) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };

/* ---------- Tekstur prosedural (dibangun bertahap supaya tidak ada hitch) ---------- */

/** Nebula: fBm + domain warping, diwarnai palet. Alpha = kerapatan gas (dipakai dengan 'lighter'). */
function* jobNebula(A, key, n, seed, pal, scale) {
  const cv = mkCanvas(n), x = cv.getContext('2d'), img = x.createImageData(n, n), d = img.data;
  const ox = seed * 13.7, oy = seed * 7.3;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const nx = (i / n - 0.5) * 2, ny = (j / n - 0.5) * 2, px = nx * scale + ox, py = ny * scale + oy;
      const wx = fbm(px + 3.1, py + 1.7, 3), wy = fbm(px + 8.3, py + 2.8, 3);
      const v = fbm(px + wx * 2.4, py + wy * 2.4, 5), w = fbm(px * 0.6 + 9.1 + wy, py * 0.6 + 4.4, 2);
      const dens = smooth((v - 0.43) / 0.4), m = 1 - smooth((Math.hypot(nx, ny) - 0.5) / 0.5);
      const col = mix(pal(w), [255, 246, 232], dens * dens * dens * 0.55), o = (j * n + i) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = dens * m * 235;
    }
    if (j % 10 === 9) yield;
  }
  x.putImageData(img, 0, 0);
  A[key] = cv;
}
const palA = (w) => (w < 0.34 ? mix([60, 48, 215], [226, 70, 176], w / 0.34) : w < 0.68 ? mix([226, 70, 176], [60, 190, 240], (w - 0.34) / 0.34) : mix([60, 190, 240], [255, 205, 120], (w - 0.68) / 0.32));
const palB = (w) => (w < 0.5 ? mix([105, 70, 232], [40, 192, 205], w / 0.5) : mix([40, 192, 205], [255, 226, 176], (w - 0.5) / 0.5));

/** Galaksi spiral: lengan logaritmik (2 utama + 2 kecil), bulge kuning, debu gelap, wilayah HII merah muda. */
function* jobGalaxy(A, key, n, seed, hueTilt = 0) {
  const R = mulberry(seed), cv = mkCanvas(n), g = cv.getContext('2d'), c = n / 2, Rg = n * 0.46;
  g.globalCompositeOperation = 'lighter';
  let gr = g.createRadialGradient(c, c, 0, c, c, Rg);
  gr.addColorStop(0, 'rgba(255,236,205,0.6)'); gr.addColorStop(0.16, 'rgba(255,205,150,0.3)');
  gr.addColorStop(0.5, 'rgba(120,150,255,0.13)'); gr.addColorStop(1, 'rgba(60,80,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  yield;

  const glow = mkCanvas(32), gx = glow.getContext('2d');
  gr = gx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gr; gx.fillRect(0, 0, 32, 32);

  const P = 1 / Math.tan(0.31), arms = [0, Math.PI, Math.PI / 2, Math.PI * 1.5], armW = [1, 1, 0.42, 0.42];
  for (let a = 0; a < 4; a++) {
    const cnt = Math.round(5600 * armW[a]);
    for (let i = 0; i < cnt; i++) {
      const t = Math.pow(R(), 0.85), r = (0.05 + 0.95 * t) * Rg;
      const th = arms[a] + hueTilt + P * Math.log(r / (0.05 * Rg)), off = gauss(R) * (0.012 + 0.05 * t) * Rg;
      const x = c + Math.cos(th) * r - Math.sin(th) * off, y = c + Math.sin(th) * r + Math.cos(th) * off;
      let col;
      if (R() < 0.05) col = [255, 120, 185];
      else if (t < 0.18) col = [255, 232, 190];
      else col = mix([255, 244, 232], [175, 205, 255], clamp((t - 0.18) / 0.7));
      g.fillStyle = css(col, (0.25 + 0.75 * R()) * (1 - 0.5 * t));
      const s = R() < 0.07 ? 2 : 1;
      g.fillRect(x, y, s, s);
    }
    // gas halus di sepanjang lengan
    g.globalAlpha = 0.05;
    for (let i = 0; i < 260 * armW[a]; i++) {
      const t = Math.pow(R(), 0.9), r = (0.06 + 0.94 * t) * Rg, th = arms[a] + hueTilt + P * Math.log(r / (0.05 * Rg)), off = gauss(R) * 0.03 * Rg;
      const x = c + Math.cos(th) * r - Math.sin(th) * off, y = c + Math.sin(th) * r + Math.cos(th) * off, s = 10 + R() * 22;
      g.drawImage(glow, x - s, y - s, s * 2, s * 2);
    }
    g.globalAlpha = 1;
    yield;
  }
  for (let i = 0; i < 2600; i++) { // bulge
    const r = Math.abs(gauss(R)) * 0.13 * Rg, a = R() * TAU;
    g.fillStyle = css([255, 228, 175], 0.15 + 0.7 * R());
    g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r * 0.9, 1, 1);
  }
  yield;
  g.globalCompositeOperation = 'destination-out'; // jalur debu gelap di sisi dalam lengan
  for (let a = 0; a < 2; a++) {
    for (let i = 0; i < 380; i++) {
      const t = 0.12 + 0.82 * R(), r = t * Rg, th = arms[a] + hueTilt + P * Math.log(r / (0.05 * Rg)) - 0.13 - 0.1 * t;
      g.fillStyle = `rgba(0,0,0,${(0.06 + 0.1 * R()).toFixed(3)})`;
      g.beginPath(); g.arc(c + Math.cos(th) * r, c + Math.sin(th) * r, 3 + R() * 8, 0, TAU); g.fill();
    }
  }
  g.globalCompositeOperation = 'lighter';
  gr = g.createRadialGradient(c, c, 0, c, c, Rg * 0.2);
  gr.addColorStop(0, 'rgba(255,250,235,0.95)'); gr.addColorStop(0.4, 'rgba(255,225,170,0.4)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  A[key] = cv;
}

function makeStarTile(n, seed) {
  const R = mulberry(seed), cv = mkCanvas(n), x = cv.getContext('2d');
  for (let i = 0; i < 340; i++) {
    const px = R() * n, py = R() * n, big = R() < 0.1;
    x.fillStyle = css(R() < 0.7 ? [200, 225, 255] : [255, 235, 190], 0.35 + R() * 0.65);
    x.fillRect(px, py, big ? 2 : 1, big ? 2 : 1);
    if (big) {
      const gr = x.createRadialGradient(px, py, 0, px, py, 7);
      gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(px - 7, py - 7, 14, 14);
    }
  }
  return cv;
}

/** Planet gas bercincin (siluet terang-gelap) — sumber kedalaman di ruang hampa. */
function makePlanet() {
  const W = 340, H = 240, cv = mkCanvas(W, H), x = cv.getContext('2d'), cx = W / 2, cy = H / 2 + 6, r = 62, R = mulberry(31);
  const ring = (front) => {
    x.save();
    x.translate(cx, cy); x.rotate(-0.32);
    for (let i = 0; i < 9; i++) {
      const k = 1.45 + i * 0.075 + R() * 0.02;
      x.strokeStyle = css(mix([255, 232, 190], [190, 160, 130], i / 9), 0.28 + 0.4 * R());
      x.lineWidth = 1.5 + R() * 3;
      x.beginPath(); x.ellipse(0, 0, r * k, r * k * 0.26, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); x.stroke();
    }
    x.restore();
  };
  ring(false);
  x.save();
  x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
  let gr = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
  gr.addColorStop(0, '#fff0cf'); gr.addColorStop(0.5, '#d9a860'); gr.addColorStop(1, '#6f4a2a');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) {
    const y = cy - r + (i / 16) * r * 2 + R() * 4;
    x.fillStyle = css(R() < 0.5 ? [255, 220, 170] : [150, 90, 60], 0.12 + 0.2 * R());
    x.fillRect(cx - r, y, r * 2, 3 + R() * 7);
  }
  gr = x.createRadialGradient(cx - r * 0.55, cy - r * 0.6, r * 0.3, cx + r * 0.25, cy + r * 0.3, r * 1.35);
  gr.addColorStop(0, 'rgba(0,0,12,0)'); gr.addColorStop(0.65, 'rgba(0,0,12,0.55)'); gr.addColorStop(1, 'rgba(0,0,12,0.96)');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.restore();
  gr = x.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.12);
  gr.addColorStop(0, 'rgba(255,225,170,0)'); gr.addColorStop(0.5, 'rgba(255,225,170,0.35)'); gr.addColorStop(1, 'rgba(255,225,170,0)');
  x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r * 1.12, 0, TAU); x.fill();
  ring(true);
  return cv;
}

/** Sinar vertikal: terang di pangkal (y = 0), memudar ke ujung & ke tepi kiri-kanan. */
function makeRay() {
  const cv = mkCanvas(32, 256), x = cv.getContext('2d');
  let gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 32, 256);
  x.globalCompositeOperation = 'destination-in';
  gr = x.createLinearGradient(0, 0, 32, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 32, 256);
  return cv;
}

function makeGlow(rgb) {
  const n = 64, cv = mkCanvas(n), x = cv.getContext('2d'), gr = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, css(rgb, 1)); gr.addColorStop(0.25, css(rgb, 0.55)); gr.addColorStop(0.6, css(rgb, 0.12)); gr.addColorStop(1, css(rgb, 0));
  x.fillStyle = gr; x.fillRect(0, 0, n, n);
  return cv;
}

/** Nebula cadangan murah (dipakai sampai nebula asli selesai dibangun). */
function quickNebula() {
  const n = 128, cv = mkCanvas(n), x = cv.getContext('2d'), R = mulberry(5);
  x.globalCompositeOperation = 'lighter';
  const cols = [[90, 60, 230], [230, 70, 180], [50, 190, 235]];
  for (let i = 0; i < 12; i++) {
    const px = R() * n, py = R() * n, r = 24 + R() * 40, gr = x.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, css(cols[i % 3], 0.35)); gr.addColorStop(1, css(cols[i % 3], 0));
    x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  return cv;
}

function createAssets() {
  const A = { nebA: quickNebula(), nebB: null, galaxy: null, galaxy2: null, stars: null, planet: null, ray: null, glow: null, ready: false };
  let jobs = null;
  function pump() {
    const t0 = performance.now();
    while (jobs.length && performance.now() - t0 < 9) {
      let r;
      try { r = jobs[0].next(); } catch (err) { console.error(err); jobs.shift(); continue; }
      if (r.done) jobs.shift();
    }
    if (jobs.length) setTimeout(pump, 0); else A.ready = true;
  }
  /** Mulai membangun (sekali). Dipanggil saat charge dimulai, supaya selesai sebelum tombol dilepas. */
  A.prepare = () => {
    if (jobs) return;
    A.ray = makeRay();
    A.glow = { white: makeGlow(WHITE), gold: makeGlow(GOLD), ice: makeGlow(ICE), violet: makeGlow(VIOLET) };
    A.stars = makeStarTile(512, 99);
    jobs = [
      (function* () { A.planet = makePlanet(); yield; })(),
      jobNebula(A, 'nebA', 320, 1, palA, 2.6),
      jobGalaxy(A, 'galaxy', 640, 7, 0),
      jobNebula(A, 'nebB', 256, 5, palB, 3.2),
      jobGalaxy(A, 'galaxy2', 400, 21, 0.9),
    ];
    setTimeout(pump, 0);
  };
  return A;
}

/* ===================================================================== */

export function createSlashFx({
  reduced = false, getScene = null, audio = null, emit = () => {}, getQ = () => 1,
  wordCanvas = null, lockActions = () => {}, onEnd = () => {},
} = {}) {
  const A = createAssets();
  let sl = null;
  const OUT8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  void OUT8;

  /* Bintang 3D yang terbang melewati kamera (diproyeksikan dari pusat celah). */
  const STARS = (() => {
    const R = mulberry(77);
    return Array.from({ length: 520 }, () => ({ x: R() * 2 - 1, y: R() * 2 - 1, z: R(), c: (R() * 4) | 0, w: R() < 0.18 ? 1 : 0 }));
  })();
  const STAR_COL = [WHITE, ICE, GOLD, ROSE];
  /* Bintik cahaya latar saat charge ("ruang angkasa mulai merembes"). */
  const SPECKS = (() => {
    const R = mulberry(303);
    return Array.from({ length: 110 }, () => ({ x: R(), y: R(), ph: R() * TAU, big: R() < 0.14, c: R() < 0.7 ? 0 : 2 }));
  })();
  const cparts = []; let cAcc = 0;   // partikel charge

  function fallbackPlan() {
    const beat = 60 / 190, events = [{ t: 0, kind: 'impact', pow: 1 }];
    for (let i = 1; i < 4; i++) events.push({ t: i * beat, kind: 'kick', pow: 0.8 });
    events.push({ t: 4 * beat, kind: 'final', pow: 1.3 });
    return { beat, N: 4, total: 4 * beat, events };
  }

  function sceneRect() {
    const sc = getScene?.();
    if (!sc || !sc.width) return null;
    const r = sc.getBoundingClientRect(), k = Math.min(r.width / sc.width, r.height / sc.height) || 1;
    return { sc, x: r.left + (r.width - sc.width * k) / 2, y: r.top + (r.height - sc.height * k) / 2, w: sc.width * k, h: sc.height * k };
  }

  function makeGhosts(sc) {
    const mk = (col) => {
      const c = mkCanvas(sc.width, sc.height), x = c.getContext('2d');
      x.drawImage(sc, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
      return c;
    };
    return { r: mk('#ff2a55'), c: mk('#2ae8ff') };
  }

  /* ---------- Partikel ---------- */

  /** type: 'mote' (debu emas) | 'feather' (bulu cahaya) | 'shard' (serpihan garis) | 'spark' (kilau salib) */
  function spawn(type, x, y, vx, vy, life, sz, g = 0) {
    if (sl.parts.length > 300) sl.parts.shift();
    sl.parts.push({ type, x, y, vx, vy, g, life, max: life, sz, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 4, ph: Math.random() * TAU, c: (Math.random() * 5) | 0 });
  }
  function burstAlongAxis(n, speedLo, speedHi, mixFeather = 0.2) {
    n = Math.max(3, Math.round(n * getQ()));
    for (let i = 0; i < n; i++) {
      const s = (Math.random() - 0.5) * 2 * sl.diag * 0.55, side = Math.random() < 0.5 ? -1 : 1, v = lerp(speedLo, speedHi, Math.random());
      const x = sl.cx + sl.ux * s, y = sl.cy + sl.uy * s;
      const ox = sl.ux * (Math.random() - 0.5) * 120, oy = sl.uy * (Math.random() - 0.5) * 120;
      const type = Math.random() < mixFeather ? 'feather' : Math.random() < 0.18 ? 'spark' : 'mote';
      spawn(type, x, y, sl.nx * side * v + ox, sl.ny * side * v + oy, 700 + Math.random() * 900, 1.5 + Math.random() * 2.2, type === 'feather' ? 30 : 60);
    }
  }
  function burstRadial(n, x, y, lo, hi, type = 'mote') {
    n = Math.max(3, Math.round(n * getQ()));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = lerp(lo, hi, Math.random());
      spawn(type, x, y, Math.cos(a) * v, Math.sin(a) * v, 500 + Math.random() * 800, 1.5 + Math.random() * 2, 120);
    }
  }
  function ringAt(T, o) { if (sl.rings.length > 12) sl.rings.shift(); sl.rings.push({ t0: T, life: 650, w: 8, col: GOLD, ...o }); }

  /* ---------- Penjadwalan beat ---------- */

  function onBeat(ev, T) {
    if (ev.kind === 'kick') {
      ringAt(T, { life: 600, w: 7, col: WHITE });
      ringAt(T + 40, { life: 700, w: 4, col: GOLD });
      burstAlongAxis(16, 120, 380, 0.25);
    } else if (ev.kind === 'snare') {
      burstAlongAxis(12, 180, 520, 0);
      for (let i = 0; i < 6; i++) spawn('shard', sl.cx + (Math.random() - 0.5) * sl.diag * 0.5 * sl.ux, sl.cy + (Math.random() - 0.5) * sl.diag * 0.5 * sl.uy, (Math.random() - 0.5) * 900, (Math.random() - 0.5) * 900, 350, 1);
    } else if (ev.kind === 'stab') {
      ringAt(T, { life: 520, w: 4, col: ICE });
    } else if (ev.kind === 'roll') {
      burstRadial(3, sl.cx + (Math.random() - 0.5) * sl.diag * 0.4 * sl.ux, sl.cy + (Math.random() - 0.5) * sl.diag * 0.4 * sl.uy, 60, 220, 'spark');
    }
  }

  function cutNow(now, T) {
    sl.cut = true;
    const sr = sceneRect();
    if (sr) sl.ghost = makeGhosts(sr.sc);
    burstAlongAxis(90, 200, 760, 0.3);
    for (let i = 0; i < 3; i++) ringAt(T + i * 60, { life: 800, w: 10 - i * 2, col: [WHITE, GOLD, ICE][i] });
    emit('cut', { x: sl.cx, y: sl.cy, ux: sl.ux, uy: sl.uy, power: sl.power });
  }

  function slamNow(now, T) {
    sl.slam = true;
    for (let i = 0; i < 4; i++) ringAt(T + i * 70, { life: 900, w: 16 - i * 3, col: [WHITE, GOLD, ICE, ROSE][i] });
    burstRadial(110, sl.cx, sl.cy, 220, 980, 'mote');
    burstRadial(24, sl.cx, sl.cy, 120, 520, 'feather');
    burstRadial(18, sl.cx, sl.cy, 160, 640, 'spark');
    emit('slam', { x: sl.cx, y: sl.cy, ux: sl.ux, uy: sl.uy, power: sl.power });
  }

  /* ---------- Mulai / selesai ---------- */

  function start({ cx, cy, ux, uy, q, power }) {
    A.prepare();
    let plan;
    try { plan = audio?.plan ? audio.plan(power) : fallbackPlan(); } catch (err) { console.error(err); plan = fallbackPlan(); }
    let played = null;
    try { played = audio?.play ? audio.play(plan, SWEEP_MS / 1000) : null; } catch (err) { console.error(err); }
    // Visual dimulai saat suara TERDENGAR (jadwal + latensi output), jadi impact visual = impact audio.
    const tI = performance.now() + (SWEEP_MS / 1000 + (played?.latency || 0)) * 1000;
    const iw = innerWidth, ih = innerHeight;
    sl = {
      cx, cy, ux, uy, nx: -uy, ny: ux, power, q, plan, tI, diag: Math.hypot(iw, ih),
      total: plan.N * plan.beat * 1000,
      gapMax: Math.min(iw, ih) * (0.17 + 0.08 * power),
      bulge: (Math.random() < 0.5 ? -1 : 1) * Math.hypot(iw, ih) * 0.08,
      hue0: Math.random() * 5, word: WORDS[(Math.random() * WORDS.length) | 0],
      ei: 0, cut: false, slam: false, o: 0, rings: [], parts: [], ghost: null,
      glitch: [], glitchAt: -1, seed: Math.random() * 1000, lastNow: 0,
    };
    lockActions(true);
  }

  function finish() {
    sl = null;
    lockActions(false);
    emit('end', {});
    onEnd();
  }
  function stop() { if (sl) { sl = null; lockActions(false); } }

  /* ---------- Gambar: komponen ---------- */

  /** Gradien palet surgawi bergeser (phase). */
  function celGrad(g, x0, y0, x1, y1, alpha, phase) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, css(celCol(phase + i * 0.9), alpha));
    return gr;
  }

  function tex(g, img, x, y, size, rot, a, h = size) {
    if (!img) return;
    g.save();
    g.translate(x, y); g.rotate(rot);
    g.globalAlpha = a;
    g.drawImage(img, -size / 2, -h / 2, size, h);
    g.restore();
  }

  /** Bintang berduri (6 duri ala teleskop angkasa) + 2 duri horizontal pendek. */
  function spikeStar(g, x, y, size, a, rot) {
    if (!A.ray || !A.glow) return;
    g.save();
    g.translate(x, y);
    g.globalAlpha = a;
    g.drawImage(A.glow.white, -size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
    g.globalAlpha = a * 0.5;
    g.drawImage(A.glow.ice, -size * 1.6, -size * 1.6, size * 3.2, size * 3.2);
    g.globalAlpha = a;
    for (let k = 0; k < 6; k++) {
      for (const flip of [0, Math.PI]) {
        g.save();
        g.rotate(rot + (k * Math.PI) / 3 + flip);
        g.drawImage(A.ray, -size * 0.045, 0, size * 0.09, size * 4.2);
        g.restore();
      }
    }
    for (const flip of [0, Math.PI]) {
      g.save(); g.rotate(Math.PI / 2 + rot + flip);
      g.drawImage(A.ray, -size * 0.03, 0, size * 0.06, size * 1.8);
      g.restore();
    }
    g.restore();
  }

  /** Ruang hampa galaksi di dalam celah (dipanggil dengan clip pita celah). */
  function drawVoid(g, T, o, off, hb, pulse, warp) {
    const { cx, cy, ux, uy, nx, ny, diag, gapMax: gm } = sl, ang = Math.atan2(uy, ux), Q = getQ();
    const prog = clamp(T / sl.total), dolly = 1 + 0.3 * easeOut3(prog) + 0.05 * pulse;   // kamera "maju" ke dalam kekosongan
    const L = diag * 1.1;
    g.save();
    g.beginPath();
    g.moveTo(cx - ux * L + nx * off, cy - uy * L + ny * off); g.lineTo(cx + ux * L + nx * off, cy + uy * L + ny * off);
    g.lineTo(cx + ux * L - nx * off, cy + uy * L - ny * off); g.lineTo(cx - ux * L - nx * off, cy - uy * L - ny * off);
    g.closePath(); g.clip();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#010008';
    g.fillRect(cx - diag, cy - diag, diag * 2, diag * 2);
    g.translate(cx, cy); g.rotate(ang);                  // sumbu x = sepanjang celah, sumbu y = tegak lurus
    g.imageSmoothingEnabled = true;
    g.globalCompositeOperation = 'lighter';

    // nebula (dua lapis, paralaks berbeda)
    tex(g, A.nebA, -0.1 * diag, 0.1 * gm, diag * 1.7 * Math.pow(dolly, 0.5), 0.35 + T / 26000, 0.78);
    tex(g, A.nebB || A.nebA, 0.22 * diag, -0.2 * gm, diag * 1.3 * Math.pow(dolly, 0.7), -0.8 - T / 19000, A.nebB ? 0.6 : 0.3);
    tex(g, A.stars, 0, 0, diag * 1.5 * Math.pow(dolly, 0.4), -T / 40000, 0.8);

    // galaksi spiral besar: berputar di bidangnya, dimiringkan, kamera mendekat
    if (A.galaxy) {
      g.save();
      g.translate(-0.15 * diag, 0.06 * gm); g.rotate(-0.32); g.scale(1, 0.44); g.rotate(T / 5200 + sl.seed);
      g.globalAlpha = 0.96;
      const s = gm * 3.6 * dolly;
      g.drawImage(A.galaxy, -s / 2, -s / 2, s, s);
      g.restore();
    }
    if (A.galaxy2) {
      g.save();
      g.translate(0.34 * diag, 0.42 * gm); g.rotate(0.85); g.scale(1, 0.62); g.rotate(-T / 7600);
      g.globalAlpha = 0.7;
      const s = gm * 1.5 * Math.pow(dolly, 0.8);
      g.drawImage(A.galaxy2, -s / 2, -s / 2, s, s);
      g.restore();
    }

    // planet bercincin (menutup latar di belakangnya, bergerak lebih cepat = lebih dekat)
    if (A.planet) {
      g.save();
      g.globalCompositeOperation = 'source-over';
      const ps = gm * 0.0058 * Math.pow(dolly, 1.5), px = 0.07 * diag - T * 0.012, py = -0.5 * gm;
      g.translate(px, py); g.rotate(0.1);
      g.globalAlpha = 0.97;
      g.drawImage(A.planet, -170 * ps * 1.2, -120 * ps * 1.2, 340 * ps * 1.2, 240 * ps * 1.2);
      g.restore();
    }

    // bintang berduri besar
    const tw = 0.85 + 0.15 * Math.sin(T / 90) + 0.35 * pulse;
    spikeStar(g, 0.04 * diag, 0.3 * gm, gm * 0.2 * tw, 0.95, 0.12);
    spikeStar(g, -0.33 * diag, -0.32 * gm, gm * 0.09 * tw, 0.8, 0.5);

    // bintang 3D yang terbang melewati kamera: makin panjang goresannya saat celah baru terbuka & saat akan menutup
    const nS = Math.round(STARS.length * (0.45 + 0.55 * Q)), buckets = [[], [], [], [], [], [], [], []];
    const dz = 0.01 + 0.07 * warp, kx = diag * 0.3, ky = gm * 1.5;
    for (let i = 0; i < nS; i++) {
      const s = STARS[i], z0 = ((s.z - T * 0.00055) % 1 + 1) % 1, z = 0.06 + z0 * 0.94, z1 = Math.min(1.2, z + dz);
      const x0 = (s.x * kx) / z, y0 = (s.y * ky) / z, x1 = (s.x * kx) / z1, y1 = (s.y * ky) / z1;
      if (Math.abs(y0) > gm * 1.3 || Math.abs(x0) > diag * 0.8) continue;
      const b = buckets[s.c * 2 + s.w];
      b.push(x0, y0, x1, y1, (1 - z) ** 0.8);
    }
    g.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const arr = buckets[k];
      if (!arr.length) continue;
      const col = STAR_COL[k >> 1];
      g.strokeStyle = css(col, 0.9);
      g.lineWidth = k & 1 ? 2.4 : 1.2;
      for (const alphaStep of [0.4, 0.75, 1]) {
        g.globalAlpha = alphaStep;
        g.beginPath();
        for (let i = 0; i < arr.length; i += 5) {
          const f = arr[i + 4];
          if (f > alphaStep - 0.34 && f <= alphaStep + (alphaStep === 1 ? 1 : 0.0001) && (alphaStep === 1 ? f > 0.66 : f <= alphaStep && f > alphaStep - 0.34)) {
            g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]);
          }
        }
        g.stroke();
      }
    }
    g.globalAlpha = 1;

    // komet melintas
    for (let i = 0; i < 3; i++) {
      const t0 = 160 + i * 330, q = (T - t0) / 520;
      if (q < 0 || q > 1) continue;
      const hx = lerp(-0.4 * diag, 0.45 * diag, q), hy = lerp((-0.7 + i * 0.7) * gm, (0.5 - i * 0.6) * gm, q), tl = diag * 0.12;
      const gr = g.createLinearGradient(hx, hy, hx - tl, hy + tl * 0.18);
      gr.addColorStop(0, css(WHITE, 0.95)); gr.addColorStop(0.3, css(ICE, 0.45)); gr.addColorStop(1, css(ICE, 0));
      g.strokeStyle = gr; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - tl, hy + tl * 0.18); g.stroke();
      if (A.glow) { g.globalAlpha = 0.9; g.drawImage(A.glow.white, hx - 12, hy - 12, 24, 24); g.globalAlpha = 1; }
    }

    // bayangan tepi: kedalaman, lalu cahaya hangat tepat di bibir celah
    g.globalCompositeOperation = 'source-over';
    for (const s of [1, -1]) {
      let gr = g.createLinearGradient(0, s * off, 0, s * (off - 90));
      gr.addColorStop(0, 'rgba(0,0,10,0.55)'); gr.addColorStop(1, 'rgba(0,0,10,0)');
      g.fillStyle = gr;
      g.fillRect(-L, s > 0 ? off - 90 : -off, L * 2, 90);
    }
    g.globalCompositeOperation = 'lighter';
    for (const s of [1, -1]) {
      const gr = g.createLinearGradient(0, s * off, 0, s * (off - 80));
      gr.addColorStop(0, css(PALE, 0.5 * o)); gr.addColorStop(0.25, css(GOLD, 0.18 * o)); gr.addColorStop(1, css(GOLD, 0));
      g.fillStyle = gr;
      g.fillRect(-L, s > 0 ? off - 80 : -off, L * 2, 80);
    }
    g.restore();
  }

  /** Sinar cahaya (god rays) memancar dari bibir celah ke arah luar. */
  function drawRays(g, T, o, off, pulse) {
    if (!A.ray || o < 0.04) return;
    const { cx, cy, ux, uy, diag } = sl, ang = Math.atan2(uy, ux), R = mulberry(Math.floor(sl.seed) + 11), n = Math.round(28 * getQ());
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.translate(cx, cy); g.rotate(ang);
    for (let i = 0; i < n; i++) {
      const u = (R() - 0.5) * 1.4 * diag, s = i % 2 ? 1 : -1, len = diag * (0.22 + 0.4 * R()), w = 8 + R() * 36, fan = (u / diag) * 0.45 * s;
      const flick = 0.55 + 0.45 * Math.sin(T / (90 + R() * 80) + i * 1.7);
      g.save();
      g.translate(u, s * off);
      g.rotate(s > 0 ? fan : Math.PI + fan);
      g.globalAlpha = clamp((0.08 + 0.14 * R()) * o * flick + 0.05 * pulse);
      g.drawImage(A.ray, -w / 2, 0, w, len);
      g.restore();
    }
    g.restore();
  }

  /** Halo geometri suci: cincin, skala penggaris berputar, bintang {12/5}, titik rune. */
  function drawHalo(g, T, o, off, pulse) {
    if (o < 0.03) return;
    const { cx, cy } = sl, r1 = off * 1.12 + 38 + 6 * pulse, a = clamp(o * 1.4) * 0.85;
    g.save();
    g.translate(cx, cy);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    for (const [w, al] of [[10, 0.12], [2.2, 0.95]]) {
      g.strokeStyle = css(PALE, al * a); g.lineWidth = w;
      g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.stroke();
    }
    // skala penggaris (mengacu video referensi) berputar
    g.save(); g.rotate(T / 3600);
    g.strokeStyle = css(GOLD, 0.8 * a); g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 120; i++) {
      const th = (i * TAU) / 120, len = i % 10 === 0 ? 12 : i % 5 === 0 ? 8 : 4;
      g.moveTo(Math.cos(th) * (r1 - 3), Math.sin(th) * (r1 - 3)); g.lineTo(Math.cos(th) * (r1 - 3 - len), Math.sin(th) * (r1 - 3 - len));
    }
    g.stroke();
    g.restore();
    g.save(); g.rotate(-T / 5200);
    g.setLineDash([3, 9]);
    g.strokeStyle = css(ICE, 0.7 * a); g.lineWidth = 1.4;
    g.beginPath(); g.arc(0, 0, r1 * 0.8, 0, TAU); g.stroke();
    g.setLineDash([]);
    // bintang {12/5}
    const rs = r1 * 0.74;
    g.strokeStyle = css(PALE, 0.55 * a); g.lineWidth = 1.1;
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a0 = (i * TAU) / 12, a1 = (((i + 5) % 12) * TAU) / 12;
      g.moveTo(Math.cos(a0) * rs, Math.sin(a0) * rs); g.lineTo(Math.cos(a1) * rs, Math.sin(a1) * rs);
    }
    g.stroke();
    g.beginPath(); g.arc(0, 0, r1 * 0.46, 0, TAU); g.stroke();
    g.fillStyle = css(WHITE, 0.9 * a);
    for (let i = 0; i < 12; i++) { const th = (i * TAU) / 12; g.beginPath(); g.arc(Math.cos(th) * rs, Math.sin(th) * rs, 2.3, 0, TAU); g.fill(); }
    g.restore();
    g.restore();
  }

  /** Garis sumbu bergaya penggaris (video referensi): garis tipis + tick + angka kecil. */
  function drawAxis(g, T, ext, alpha) {
    if (alpha < 0.02 || ext < 0.01) return;
    const { cx, cy, ux, uy, nx, ny, diag } = sl, L = diag * 0.75 * ext;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = css(WHITE, 0.55 * alpha); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(cx - ux * L, cy - uy * L); g.lineTo(cx + ux * L, cy + uy * L); g.stroke();
    const scroll = (T * 0.04) % 10;
    g.strokeStyle = css(WHITE, 0.4 * alpha); g.lineWidth = 1;
    g.beginPath();
    for (let k = -Math.floor(L / 10); k <= Math.floor(L / 10); k++) {
      const s = k * 10 + scroll, len = k % 10 === 0 ? 14 : k % 5 === 0 ? 8 : 4;
      if (Math.abs(s) > L) continue;
      const px = cx + ux * s, py = cy + uy * s;
      g.moveTo(px - nx * len, py - ny * len); g.lineTo(px + nx * len, py + ny * len);
    }
    g.stroke();
    g.fillStyle = css(PALE, 0.7 * alpha);
    g.font = '9px "Press Start 2P", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = -Math.floor(L / 100); k <= Math.floor(L / 100); k++) {
      if (!k) continue;
      const s = k * 100 + scroll * 10 % 100, px = cx + ux * s + nx * 24, py = cy + uy * s + ny * 24;
      if (px < -20 || py < -20 || px > innerWidth + 20 || py > innerHeight + 20) continue;
      g.fillText(String(Math.abs(Math.round(s))).padStart(4, '0'), px, py);
    }
    g.restore();
  }

  function drawBlade(g, T) {
    if (T > 420) return;
    const { cx, cy, ux, uy, nx, ny, diag, power } = sl, swp = clamp((T + SWEEP_MS) / SWEEP_MS);
    if (swp <= 0) return;
    const p = 1 - (1 - swp) ** 3, fade = T < 0 ? 1 : (1 - T / 420) ** 2;
    const L = diag * 0.78, e1x = cx - ux * L, e1y = cy - uy * L, ex = ux * L * 2, ey = uy * L * 2;
    const ns = Math.max(10, Math.round(26 * getQ())), wmax = 18 + 26 * power, bulge = sl.bulge;
    const ptsL = [], ptsR = [], core = [];
    for (let i = 0; i <= ns; i++) {
      const s = (p * i) / ns, a = 4 * s * (1 - s), px = e1x + ex * s + nx * bulge * a, py = e1y + ey * s + ny * bulge * a;
      const w = wmax * Math.pow(i / ns, 1.2) * (0.35 + 0.65 * Math.sin(Math.min(1, s) * Math.PI));
      ptsL.push([px + nx * w, py + ny * w]); ptsR.push([px - nx * w, py - ny * w]); core.push([px, py]);
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let rep = 0; rep < 3; rep++) {
      const sh = (rep - 1) * 11 * (T < 0 ? 1 : Math.exp(-T / 160));
      g.beginPath();
      g.moveTo(ptsL[0][0] + nx * sh, ptsL[0][1] + ny * sh);
      for (let i = 1; i < ptsL.length; i++) g.lineTo(ptsL[i][0] + nx * sh, ptsL[i][1] + ny * sh);
      for (let i = ptsR.length - 1; i >= 0; i--) g.lineTo(ptsR[i][0] + nx * sh, ptsR[i][1] + ny * sh);
      g.closePath();
      g.fillStyle = celGrad(g, e1x, e1y, e1x + ex, e1y + ey, (rep === 1 ? 0.85 : 0.4) * fade, sl.hue0 + rep * 1.3);
      g.fill();
    }
    g.beginPath();
    g.moveTo(core[0][0], core[0][1]);
    for (let i = 1; i < core.length; i++) g.lineTo(core[i][0], core[i][1]);
    g.strokeStyle = css(WHITE, 0.95 * fade); g.lineWidth = 3 + 3 * power; g.lineCap = 'round'; g.stroke();
    g.restore();
  }

  function updateParts(dt) {
    const s = dt;
    for (let i = sl.parts.length - 1; i >= 0; i--) {
      const p = sl.parts[i];
      p.life -= dt * 1000;
      if (p.life <= 0) { sl.parts.splice(i, 1); continue; }
      p.vx *= Math.exp(-s * (p.type === 'feather' ? 1.6 : 0.9));
      p.vy = p.vy * Math.exp(-s * (p.type === 'feather' ? 1.6 : 0.9)) + p.g * s;
      if (p.type === 'feather') p.vx += Math.sin(p.ph + p.life / 260) * 40 * s;
      p.x += p.vx * s; p.y += p.vy * s; p.rot += p.spin * s;
    }
  }

  function drawParts(g) {
    const bk = [[], [], [], [], []];
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const p of sl.parts) {
      const f = clamp((p.life / p.max) * 1.6);
      if (p.type === 'feather') {
        g.save();
        g.translate(p.x, p.y); g.rotate(p.rot);
        const len = 6 + p.sz * 4, wd = 1.6 + p.sz * 0.9;
        g.fillStyle = css(celCol(p.c * 0.8), 0.75 * f);
        g.beginPath();
        g.moveTo(0, -len); g.quadraticCurveTo(wd * 2.2, -len * 0.2, 0, len); g.quadraticCurveTo(-wd * 2.2, -len * 0.2, 0, -len);
        g.fill();
        g.strokeStyle = css(WHITE, 0.8 * f); g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(0, -len); g.lineTo(0, len); g.stroke();
        g.restore();
      } else if (p.type === 'shard') {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        g.strokeStyle = css(celCol(p.c), 0.8 * f); g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - (p.vx / sp) * 16, p.y - (p.vy / sp) * 16); g.stroke();
      } else if (p.type === 'spark') {
        g.fillStyle = css(PALE, f);
        const l = 3 + p.sz * 2.2;
        g.fillRect(p.x - l, p.y - 0.6, l * 2, 1.2); g.fillRect(p.x - 0.6, p.y - l, 1.2, l * 2);
      } else bk[p.c].push(p.x, p.y, Math.max(1.2, p.sz * (0.5 + 0.5 * f)), f);
    }
    for (let c = 0; c < 5; c++) {
      const arr = bk[c];
      for (let i = 0; i < arr.length; i += 4) {
        g.fillStyle = css(celCol(c * 0.8 + 0.3), arr[i + 3]);
        g.fillRect(arr[i], arr[i + 1], arr[i + 2], arr[i + 2]);
      }
    }
    g.restore();
  }

  function drawBlackFrame(g, T, big) {
    const { cx, cy, ux, uy, diag } = sl, iw = innerWidth, ih = innerHeight;
    g.save();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#000'; g.fillRect(0, 0, iw, ih);
    g.fillStyle = '#fff';
    const n = 64, R = mulberry(Math.floor(T) + 5);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n + (R() - 0.5) * 0.08, r0 = 30 + R() * 60, w = 0.008 + R() * 0.02;
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a - w) * diag, cy + Math.sin(a - w) * diag);
      g.lineTo(cx + Math.cos(a + w) * diag, cy + Math.sin(a + w) * diag);
      g.closePath();
    }
    g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = big ? 9 : 5;
    g.beginPath(); g.moveTo(cx - ux * diag, cy - uy * diag); g.lineTo(cx + ux * diag, cy + uy * diag); g.stroke();
    g.beginPath(); g.arc(cx, cy, big ? 70 : 42, 0, TAU); g.fill();
    g.restore();
  }

  function drawCross(g, d, a) {
    if (!A.ray || a < 0.02) return;
    const { cx, cy, ux, uy, diag } = sl, ang = Math.atan2(uy, ux), w = 46 * a + 4;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.translate(cx, cy);
    for (const [rot, len] of [[ang, diag], [ang + Math.PI, diag], [ang + Math.PI / 2, diag * 0.6], [ang - Math.PI / 2, diag * 0.6]]) {
      g.save(); g.rotate(rot - Math.PI / 2);
      g.globalAlpha = clamp(a);
      g.drawImage(A.ray, -w / 2, 0, w, len);
      g.restore();
    }
    if (A.glow) { g.globalAlpha = clamp(a); const s = 260 * (0.4 + a); g.drawImage(A.glow.white, -s, -s, s * 2, s * 2); }
    g.restore();
  }

  /* ---------- Satu frame tebasan ---------- */

  function frame(g, now, dt) {
    if (!sl) return;
    const T = now - sl.tI, plan = sl.plan, total = sl.total, beatMs = plan.beat * 1000;
    const iw = innerWidth, ih = innerHeight, { cx, cy, ux, uy, nx, ny, diag } = sl;
    const hb = sl.hue0 + now / 700, ang = Math.atan2(uy, ux), rmK = reduced ? 0.4 : 1;

    while (sl.ei < plan.events.length && T >= plan.events[sl.ei].t * 1000) onBeat(plan.events[sl.ei++], T);
    if (!sl.cut && T >= 0) cutNow(now, T);
    if (!sl.slam && T >= total) slamNow(now, T);

    let pulse = 0, snareP = 0, stabP = 0;
    for (let i = Math.max(0, sl.ei - 12); i < sl.ei; i++) {
      const ev = plan.events[i], age = T - ev.t * 1000;
      if (age < 0 || age > 500) continue;
      const v = ev.pow * Math.exp(-age / (ev.kind === 'kick' ? 130 : 90));
      if (ev.kind === 'kick' || ev.kind === 'final' || ev.kind === 'impact') pulse += v;
      else if (ev.kind === 'snare' || ev.kind === 'roll') snareP += v;
      else stabP += v;
    }
    pulse = Math.min(1.6, pulse);

    /* celah: terbuka cepat, bertahan, menutup menghantam tepat di SLAM */
    const openDur = 240, closeDur = clamp(beatMs * 0.8, 150, 260), closeStart = total - closeDur;
    let o = 0;
    if (T >= 0) o = T < openDur ? 1 - Math.pow(2, -10 * (T / openDur)) : 1;
    if (T > closeStart) o = Math.min(o, 1 - easeIn3(clamp((T - closeStart) / closeDur)));
    if (T >= total) o = 0;
    sl.o = o;
    const off = sl.gapMax * o * (reduced ? 0.55 : 1) * (1 + 0.05 * pulse);
    const warp = clamp(Math.exp(-T / 220) * 1.2 + smooth((T - closeStart) / closeDur) * 1.0 + 0.25 * pulse);
    const takeover = T >= 0 && T < total + 40;
    const sr = takeover ? sceneRect() : null;
    const strobe = STROBE && !reduced;
    const cutBlack = strobe && T >= 0 && T < 44, cutNeg = strobe && T >= 44 && T < 90;
    const slamBlack = strobe && T >= total && T < total + 44, slamNeg = strobe && T >= total + 44 && T < total + 90;

    g.save();
    g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = false;

    if (cutBlack || slamBlack) {
      drawBlackFrame(g, T, slamBlack);
      g.restore();
      updateParts(dt);
      return;
    }

    updateParts(dt);

    if (sr) {
      g.fillStyle = '#030510';
      g.fillRect(0, 0, iw, ih);
      const rot = 0.028 * sl.power * o * rmK;
      const glitchAmp = reduced ? 0 : 52 * Math.exp(-Math.max(0, T) / 85);

      if (off > 0.5) drawVoid(g, T, o, off, hb, pulse, warp);

      if (glitchAmp > 1.5 && now - sl.glitchAt > 34) {   // irisan geser acak ala glitch video
        sl.glitchAt = now;
        sl.glitch = Array.from({ length: 7 }, () => ({ y: Math.random() * ih, h: 8 + Math.random() * 46, dx: (Math.random() - 0.5) * 2 }));
      }
      const p1x = cx - ux * diag, p1y = cy - uy * diag, p2x = cx + ux * diag, p2y = cy + uy * diag;
      const eglow = clamp((0.5 + 0.35 * pulse + 0.2 * stabP) * Math.min(1, o * 4 + 0.2));
      for (const s of [1, -1]) {
        g.save();
        g.translate(nx * off * s, ny * off * s);
        g.translate(cx, cy); g.rotate(rot * s); g.translate(-cx, -cy);
        g.beginPath();
        g.moveTo(p1x, p1y); g.lineTo(p2x, p2y);
        g.lineTo(p2x + nx * s * diag, p2y + ny * s * diag); g.lineTo(p1x + nx * s * diag, p1y + ny * s * diag);
        g.closePath(); g.clip();
        g.drawImage(sr.sc, sr.x, sr.y, sr.w, sr.h);
        if (glitchAmp > 1.5) {
          for (const b of sl.glitch) {
            g.save();
            g.beginPath(); g.rect(sr.x - 100, b.y, sr.w + 200, b.h); g.clip();
            g.drawImage(sr.sc, sr.x + b.dx * glitchAmp, sr.y, sr.w, sr.h);
            g.restore();
          }
          if (sl.ghost) {   // aberasi kromatik (merah / cyan) sesaat setelah potongan
            g.globalCompositeOperation = 'lighter';
            const ga = 0.45 * Math.exp(-T / 120);
            g.globalAlpha = ga; g.drawImage(sl.ghost.r, sr.x + glitchAmp * 0.5, sr.y, sr.w, sr.h);
            g.globalAlpha = ga; g.drawImage(sl.ghost.c, sr.x - glitchAmp * 0.5, sr.y, sr.w, sr.h);
            g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          }
        }
        // bayangan tepi + cahaya surgawi di bibir potongan
        let gr = g.createLinearGradient(cx, cy, cx + nx * s * 130, cy + ny * s * 130);
        gr.addColorStop(0, 'rgba(0,0,12,0.6)'); gr.addColorStop(1, 'rgba(0,0,12,0)');
        g.fillStyle = gr; g.fillRect(cx - diag, cy - diag, diag * 2, diag * 2);
        g.globalCompositeOperation = 'lighter';
        gr = g.createLinearGradient(cx, cy, cx + nx * s * 120, cy + ny * s * 120);
        gr.addColorStop(0, css(WHITE, eglow)); gr.addColorStop(0.1, css(GOLD, eglow * 0.7)); gr.addColorStop(0.35, css(VIOLET, eglow * 0.22)); gr.addColorStop(1, css(ICE, 0));
        g.fillStyle = gr; g.fillRect(cx - diag, cy - diag, diag * 2, diag * 2);
        g.strokeStyle = celGrad(g, p1x, p1y, p2x, p2y, Math.min(1, eglow + 0.3), hb);
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.stroke();
        g.strokeStyle = css(WHITE, 0.95 * Math.min(1, o * 3));
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.stroke();
        g.restore();
      }
    }

    g.globalCompositeOperation = 'lighter';
    if (takeover) { drawRays(g, T, o, off, pulse); drawHalo(g, T, o, off, pulse); }
    const axisExt = T < 0 ? easeOut3(clamp((T + SWEEP_MS) / SWEEP_MS)) : 1;
    drawAxis(g, T, axisExt, T < 0 ? 1 : T < total ? 0.85 : clamp(1 - (T - total) / 300));
    if (takeover || T >= total) drawParts(g);
    if (T < 420) drawBlade(g, T);

    // cincin gelombang dari ketukan & SLAM
    g.globalCompositeOperation = 'lighter';
    for (let i = sl.rings.length - 1; i >= 0; i--) {
      const r = sl.rings[i], age = T - r.t0;
      if (age < 0) continue;
      if (age > r.life) { sl.rings.splice(i, 1); continue; }
      const q = age / r.life, rad = easeOut3(q) * diag * 0.6;
      g.lineWidth = r.w * (1 - q) + 1;
      g.strokeStyle = css(r.col, (1 - q) ** 1.3 * 0.85);
      g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke();
    }

    // flare salib saat SLAM + jahitan emas tempat dua belahan bertemu
    if (T >= total && T < total + 650) {
      const d = T - total, a = 1 - d / 650;
      drawCross(g, d, (1 - d / 480) ** 1.5);
      g.strokeStyle = celGrad(g, cx - ux * diag, cy - uy * diag, cx + ux * diag, cy + uy * diag, a, hb);
      g.lineWidth = 10 * a + 1;
      g.beginPath(); g.moveTo(cx - ux * diag, cy - uy * diag); g.lineTo(cx + ux * diag, cy + uy * diag); g.stroke();
    }
    if (T >= 0 && T < 300) drawCross(g, T, (1 - T / 300) ** 2 * 0.55);

    // kilat layar
    g.globalCompositeOperation = 'source-over';
    if (T >= 0 && T < 520) {
      const a = (reduced ? 0.3 : 0.7) * Math.exp(-T / 90);
      if (a > 0.01) { g.fillStyle = `rgba(255,252,240,${a.toFixed(3)})`; g.fillRect(0, 0, iw, ih); }
    }
    if (T >= total && T < total + 600) {
      const a = (reduced ? 0.4 : 0.9) * Math.exp(-(T - total) / 110);
      if (a > 0.01) { g.fillStyle = `rgba(255,252,240,${a.toFixed(3)})`; g.fillRect(0, 0, iw, ih); }
    }
    snareP; // dipakai efek ringan di atas (denyut), disisakan untuk penyesuaian
    if (cutNeg || slamNeg) {   // frame negatif sesaat (hitam-putih terbalik) ala impact frame anime
      g.globalCompositeOperation = 'difference';
      g.fillStyle = '#fff'; g.fillRect(0, 0, iw, ih);
      g.globalCompositeOperation = 'source-over';
    }

    // kata surgawi
    if (wordCanvas && T > 200 && T < total - 100) {
      const wsize = Math.round(Math.min(iw * 0.06, 52)), e = wordCanvas(sl.word, wsize, 0, true), dd = T - 200;
      const pop = reduced ? 1 : 1 + 0.9 * Math.exp(-dd / 110);
      const alpha = clamp(Math.min(dd / 100, (total - 100 - T) / 160));
      const wx = clamp(cx, e.tw * pop * 0.5 + 12, iw - e.tw * pop * 0.5 - 12), wy = clamp(cy - sl.gapMax - 60, 70, ih - 70);
      g.globalAlpha = alpha;
      g.save(); g.translate(wx, wy); g.scale(pop, pop); g.imageSmoothingEnabled = true; g.drawImage(e.cv, -e.w / 2, -e.oy); g.restore();
      g.globalAlpha = 1;
    }

    g.restore();
    if (T > total + AFTER_MS) finish();
    void ang; void hb;
  }

  /* ---------- Charge: cahaya surgawi berkumpul ---------- */

  function charge(g, now, dt, { sc, hx, hy, q, hb }) {
    const iw = innerWidth, ih = innerHeight, Q = getQ(), diag = Math.hypot(iw, ih), qs = smooth(q);
    const stage = q >= 1 ? 3 : q >= 0.66 ? 2 : q >= 0.33 ? 1 : 0;
    g.save();
    g.globalCompositeOperation = 'source-over';
    if (qs > 0.01) { // layar meredup, perhatian tertarik ke kursor
      const gr = g.createRadialGradient(hx, hy, Math.min(iw, ih) * 0.12, hx, hy, diag * 0.62);
      gr.addColorStop(0, 'rgba(2,3,18,0)'); gr.addColorStop(1, `rgba(2,3,18,${(0.5 * qs).toFixed(3)})`);
      g.fillStyle = gr; g.fillRect(0, 0, iw, ih);
    }
    g.globalCompositeOperation = 'lighter';

    // bintik bintang: ruang angkasa mulai merembes
    const nSp = Math.round(SPECKS.length * Q);
    for (let i = 0; i < nSp; i++) {
      const s = SPECKS[i], a = qs * (0.25 + 0.6 * Math.abs(Math.sin(now / 420 + s.ph)));
      if (a < 0.02) continue;
      g.fillStyle = css(STAR_COL[s.c], a);
      g.fillRect(s.x * iw, s.y * ih, s.big ? 2 : 1, s.big ? 2 : 1);
    }

    // sumbu bidik bergaya penggaris + segmen tarikan
    const ax = sc.x0, ay = sc.y0, dx = hx - ax, dy = hy - ay, d = Math.hypot(dx, dy), drag = d >= 24;
    const ux = drag ? dx / d : Math.cos(sc.ang0), uy = drag ? dy / d : Math.sin(sc.ang0), nx = -uy, ny = ux;
    const mx = drag ? (ax + hx) / 2 : ax, my = drag ? (ay + hy) / 2 : ay, L = diag * 1.2;
    g.lineCap = 'round';
    g.strokeStyle = celGrad(g, mx - ux * L, my - uy * L, mx + ux * L, my + uy * L, 0.2 + 0.45 * q, hb * 0.5);
    g.lineWidth = 1 + q * 1.2;
    g.beginPath(); g.moveTo(mx - ux * L, my - uy * L); g.lineTo(mx + ux * L, my + uy * L); g.stroke();
    g.globalAlpha = 0.18; g.lineWidth = 6; g.stroke(); g.globalAlpha = 1;
    const scroll = (now * 0.03) % 14;
    g.strokeStyle = css(PALE, 0.15 + 0.4 * q); g.lineWidth = 1;
    g.beginPath();
    for (let k = -Math.floor(L / 14); k <= Math.floor(L / 14); k++) {
      const s = k * 14 + scroll, len = k % 5 === 0 ? 9 : 4, px = mx + ux * s, py = my + uy * s;
      if (px < -20 || py < -20 || px > iw + 20 || py > ih + 20) continue;
      g.moveTo(px - nx * len, py - ny * len); g.lineTo(px + nx * len, py + ny * len);
    }
    g.stroke();
    if (drag) {
      g.strokeStyle = celGrad(g, ax, ay, hx, hy, 0.95, hb * 0.5);
      g.lineWidth = 2.2 + q * 1.6;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(hx, hy); g.stroke();
    }
    const r = 7 + q * 3, rt = now / 500;
    g.strokeStyle = css(WHITE, 0.85); g.lineWidth = 1.4;
    g.beginPath();
    for (let i = 0; i < 4; i++) { const a = rt + (i * TAU) / 4; g[i ? 'lineTo' : 'moveTo'](ax + Math.cos(a) * r, ay + Math.sin(a) * r); }
    g.closePath(); g.stroke();

    // halo yang terbentuk di sekitar kursor, makin lengkap tiap tahap
    const R1 = 40 + q * 66;
    g.save();
    g.translate(hx, hy);
    if (stage >= 1) {
      g.strokeStyle = css(PALE, 0.5 * q + 0.2); g.lineWidth = 1.6;
      g.beginPath(); g.arc(0, 0, R1, 0, TAU); g.stroke();
      g.save(); g.rotate(now / 900);
      g.beginPath();
      for (let i = 0; i < 48; i++) {
        const th = (i * TAU) / 48, len = i % 6 === 0 ? 9 : 4;
        g.moveTo(Math.cos(th) * (R1 - 2), Math.sin(th) * (R1 - 2)); g.lineTo(Math.cos(th) * (R1 - 2 - len), Math.sin(th) * (R1 - 2 - len));
      }
      g.stroke();
      g.restore();
    }
    if (stage >= 2) {
      g.save(); g.rotate(-now / 1300);
      g.strokeStyle = css(GOLD, 0.7); g.lineWidth = 1.1;
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a0 = (i * TAU) / 6, a1 = (((i + 2) % 6) * TAU) / 6, rr = R1 * 0.82;
        g.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
      }
      g.stroke();
      g.restore();
    }
    if (stage >= 3) {
      const pr = R1 * (1.3 + 0.06 * Math.sin(now / 90));
      g.setLineDash([3, 8]);
      g.strokeStyle = css(ICE, 0.8); g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.stroke();
      g.setLineDash([]);
      if (A.glow) { g.globalAlpha = 0.5 + 0.3 * Math.sin(now / 70); g.drawImage(A.glow.white, -pr, -pr, pr * 2, pr * 2); g.globalAlpha = 1; }
    }
    g.restore();

    // butir cahaya yang berputar menyedot ke kursor
    cAcc += dt * (20 + q * 150) * Q;
    while (cAcc >= 1) {
      cAcc -= 1;
      if (cparts.length > 90) cparts.shift();
      cparts.push({ a: Math.random() * TAU, r: 90 + Math.random() * 140, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3), c: Math.random() * 5, t0: now, life: 500 + Math.random() * 400 });
    }
    const bk = [[], [], [], [], []];
    for (let i = cparts.length - 1; i >= 0; i--) {
      const p = cparts[i], u = (now - p.t0) / p.life;
      if (u >= 1) { cparts.splice(i, 1); continue; }
      const rr = p.r * Math.pow(1 - u, 1.3), a = p.a + p.w * u * 2, u0 = Math.max(0, u - 0.08), rr0 = p.r * Math.pow(1 - u0, 1.3), a0 = p.a + p.w * u0 * 2;
      bk[Math.floor(p.c) % 5].push(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.9, hx + Math.cos(a0) * rr0, hy + Math.sin(a0) * rr0 * 0.9);
    }
    for (let b = 0; b < 5; b++) {
      const arr = bk[b];
      if (!arr.length) continue;
      g.strokeStyle = css(celCol(b * 0.9 + 0.3), 0.85); g.lineWidth = 1.8;
      g.beginPath();
      for (let i = 0; i < arr.length; i += 4) { g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]); }
      g.stroke();
    }
    g.restore();
  }

  return {
    prepare: A.prepare, charge, start, frame, stop,
    get active() { return !!sl; },
  };
}