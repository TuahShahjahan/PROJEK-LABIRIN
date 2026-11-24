/* ===== FINISHER COMBO 100 · "ULTIMATE NOVA" =====
   Dipicu dari victory-cursor.js saat klik kiri (ULTRA SMASH) mencapai combo 100.
   Visual (di canvas kursor, koordinat piksel layar) + suara (Web Audio, AudioContext sendiri).
   ~3,8 detik: frame hitam -> negatif -> kilat putih, sinar pelangi, 8 gelombang kejut,
   pilar cahaya, kembang api (disinkronkan dengan suara letusan), hujan bintang, teks raksasa.

   API: const fin = createFinisherFx({ reduced, getQ, wordCanvas, isAudioOn, onEnd });
        fin.start(x, y) · fin.frame(g, now, dt) · fin.stop() · fin.active */

const TAU = Math.PI * 2;
const DUR = 3800;
const STROBE = true; // kedipan hitam -> negatif di awal. false = matikan (otomatis mati saat prefers-reduced-motion)
const KEY = 'pokemon-maze:sound';
const TEXT_A = '100 COMBO!!';
const TEXT_B = 'ULTIMATE FINISH!!';
/** Waktu (ms sejak mulai) tiap letusan kembang api; dipakai visual DAN suara. */
export const POPS = [420, 640, 860, 1060, 1260, 1460, 1660, 1880, 2100, 2350, 2600, 2850];

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - (1 - t) ** 3;
const hsl = (h, l = 62, a = 1) => `hsla(${Math.round(((h % 360) + 360) % 360)},100%,${l}%,${clamp(a).toFixed(3)})`;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createFinisherFx({
  reduced = false,
  getQ = () => 1,
  wordCanvas = null,
  isAudioOn = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } },
  onEnd = () => {},
} = {}) {
  let f = null;

  /* ---------------- Suara ---------------- */
  let ctx = null, bus = null, send = null, noise = null, curve = null, dead = false;

  function initAudio() {
    if (ctx) return true;
    if (dead) return false;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) { dead = true; return false; }
    try { ctx = new AC(); } catch { dead = true; return false; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 10; comp.attack.value = 0.002; comp.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = 1;
    comp.connect(master); master.connect(ctx.destination);
    bus = ctx.createGain(); bus.connect(comp);
    const len = Math.floor(ctx.sampleRate * 2.8), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    send = ctx.createGain(); send.connect(conv); conv.connect(wet); wet.connect(comp);
    const nl = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
    curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i * 2) / 1024 - 1; curve[i] = (61 * x) / (1 + 60 * Math.abs(x)); }
    return true;
  }

  function tone({ type = 'sine', f0, f1 = f0, t, dur, gain, a = 0.003, rv = 0, shape = false, lp = 0 }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.min(f0, 18000), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, Math.min(f1, 18000)), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    const extra = [];
    if (shape) { const ws = ctx.createWaveShaper(); ws.curve = curve; node.connect(ws); node = ws; extra.push(ws); }
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; node.connect(fl); node = fl; extra.push(fl); }
    node.connect(g); g.connect(bus);
    if (rv > 0) { const s = ctx.createGain(); s.gain.value = rv; g.connect(s); s.connect(send); extra.push(s); }
    o.start(t); o.stop(t + dur + 0.05);
    o.onended = () => { try { o.disconnect(); g.disconnect(); extra.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  }

  function hiss({ t, dur, f0, f1 = f0, type = 'lowpass', q = 0.8, gain, a = 0.003, rv = 0 }) {
    const s = ctx.createBufferSource();
    s.buffer = noise; s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus);
    const extra = [];
    if (rv > 0) { const r = ctx.createGain(); r.gain.value = rv; g.connect(r); r.connect(send); extra.push(r); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    s.onended = () => { try { s.disconnect(); fl.disconnect(); g.disconnect(); extra.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  }

  function playAudio() {
    if (!isAudioOn() || !initAudio()) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch { /* abaikan */ }
    const t = ctx.currentTime + 0.01;
    // dentuman raksasa
    hiss({ t, dur: 0.06, f0: 2500, type: 'highpass', gain: 1 });
    tone({ f0: 200, f1: 26, t, dur: 2.0, gain: 1.2, a: 0.002 });
    tone({ type: 'triangle', f0: 340, f1: 50, t, dur: 0.7, gain: 0.8, a: 0.002 });
    tone({ type: 'sawtooth', f0: 100, f1: 34, t, dur: 1.2, gain: 0.5, shape: true, lp: 520 });
    hiss({ t, dur: 2.4, f0: 8000, f1: 80, type: 'lowpass', q: 0.7, gain: 1, rv: 0.5 });
    hiss({ t, dur: 2.6, f0: 6000, type: 'highpass', q: 0.5, gain: 0.35, rv: 0.6, a: 0.01 });
    // tumpukan brass
    [36, 43, 48, 52, 55, 60].forEach((m, i) => tone({ type: 'sawtooth', f0: mtof(m), t: t + 0.02, dur: 2.2, gain: 0.08, a: 0.03, rv: 0.3, lp: 900 + i * 500 }));
    // arpeggio lonceng naik
    [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => tone({ f0: mtof(m), t: t + 0.12 + i * 0.085, dur: 2.4, gain: 0.07, a: 0.003, rv: 0.85 }));
    // paduan akor C mayor
    [60, 64, 67, 72].forEach((m) => tone({ type: 'sawtooth', f0: mtof(m), t: t + 0.5, dur: 2.6, gain: 0.05, a: 0.4, rv: 0.6, lp: 1400 }));
    // kembang api (sinkron dengan POPS)
    POPS.forEach((ms) => {
      const tt = t + ms / 1000;
      hiss({ t: tt, dur: 0.22, f0: 2200 + Math.random() * 1500, type: 'bandpass', q: 0.9, gain: 0.45, rv: 0.4 });
      tone({ f0: mtof(84 + ((Math.random() * 12) | 0)), t: tt + 0.02, dur: 1.1, gain: 0.05, a: 0.003, rv: 0.8 });
    });
    // kilau penutup
    [91, 95, 98, 103].forEach((m, i) => tone({ f0: mtof(m), t: t + 2.9 + i * 0.06, dur: 1.6, gain: 0.06, a: 0.003, rv: 0.9 }));
  }

  /* ---------------- Visual ---------------- */

  function start(x, y) {
    const W = innerWidth, H = innerHeight, rnd = Math.random, np = reduced ? 4 : 9;
    f = {
      x, y, t0: performance.now(), parts: [],
      pillars: Array.from({ length: np }, (_, i) => ({ x: ((i + 0.5) / np) * W + (rnd() - 0.5) * W * 0.06, w: 30 + rnd() * 60, d: rnd() * 450, h: rnd() * 360 })),
      fw: POPS.map((t) => ({ t, x: W * (0.12 + rnd() * 0.76), y: H * (0.12 + rnd() * 0.5), h: rnd() * 360, done: false })),
      stars: Array.from({ length: reduced ? 0 : 50 }, () => ({ x: rnd() * W, y: -20 - rnd() * H * 0.6, vy: 260 + rnd() * 420, d: 500 + rnd() * 2200, s: 6 + rnd() * 10, rot: rnd() * TAU })),
    };
    playAudio();
  }

  function finish() { f = null; try { onEnd(); } catch (err) { console.error(err); } }
  function stop() { f = null; }

  function star4(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8, r = i % 2 ? s * 0.28 : s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.restore();
  }

  function drawText(g, word, size, cx, cy, dd, alpha) {
    if (!wordCanvas || dd < 0 || alpha <= 0) return;
    const e = wordCanvas(word, size, 0, true);
    const pop = reduced ? 1 : 1 + 1.3 * Math.exp(-dd / 110) + 0.05 * Math.cos(dd / 55) * Math.exp(-dd / 320);
    g.save();
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = clamp(alpha);
    g.translate(cx + (reduced ? 0 : (Math.random() - 0.5) * 6 * Math.exp(-dd / 160)), cy);
    g.scale(pop, pop);
    g.drawImage(e.cv, -e.w / 2, -e.oy);
    g.restore();
  }

  function frame(g, now, dt) {
    if (!f) return;
    const d = now - f.t0;
    if (d > DUR) { finish(); return; }
    const W = innerWidth, H = innerHeight, diag = Math.hypot(W, H), { x, y } = f, Q = getQ(), strobe = STROBE && !reduced, s = dt;

    g.save();
    g.globalCompositeOperation = 'source-over';
    if (!reduced && d < 900) { const a = 14 * Math.exp(-d / 260); g.translate((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a * 2); }

    // frame impact hitam (garis kecepatan putih)
    if (strobe && d < 85) {
      g.fillStyle = 'rgba(0,0,0,0.95)'; g.fillRect(-20, -20, W + 40, H + 40);
      g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < 70; i++) {
        const a = (i * TAU) / 70 + Math.random() * 0.05, r0 = 40 + Math.random() * 80, w = 0.01 + Math.random() * 0.02;
        g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        g.lineTo(x + Math.cos(a - w) * diag, y + Math.sin(a - w) * diag);
        g.lineTo(x + Math.cos(a + w) * diag, y + Math.sin(a + w) * diag);
        g.closePath();
      }
      g.fill();
      g.beginPath(); g.arc(x, y, 70, 0, TAU); g.fill();
      g.restore();
      return;
    }
    if (strobe && d < 150) { g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.fillRect(-20, -20, W + 40, H + 40); g.globalCompositeOperation = 'source-over'; }
    const fa = d < 85 ? 0 : d < 150 ? 0.9 : 0.9 * (1 - clamp((d - 150) / 650)) ** 2;
    if (fa > 0.01) { g.fillStyle = `rgba(255,248,220,${fa.toFixed(3)})`; g.fillRect(-20, -20, W + 40, H + 40); }

    g.globalCompositeOperation = 'lighter';

    // sinar pelangi berputar
    const rayA = 0.2 * (1 - d / 2600);
    if (rayA > 0.01) {
      const n = 24, rot = d / 700;
      for (let i = 0; i < n; i++) {
        const a = rot + (i * TAU) / n, w = (TAU / n) * 0.3;
        g.fillStyle = hsl(i * 15 + d / 8, 60, rayA * (i % 2 ? 0.6 : 1));
        g.beginPath(); g.moveTo(x, y);
        g.lineTo(x + Math.cos(a - w) * diag, y + Math.sin(a - w) * diag);
        g.lineTo(x + Math.cos(a + w) * diag, y + Math.sin(a + w) * diag);
        g.closePath(); g.fill();
      }
    }

    // inti cahaya
    if (d < 1000) {
      const r = 80 + 340 * easeOut3(clamp(d / 700)), gr = g.createRadialGradient(x, y, 0, x, y, r), a = 1 - d / 1000;
      gr.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); gr.addColorStop(0.4, `rgba(255,216,59,${(a * 0.5).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,216,59,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 8 gelombang kejut pelangi
    for (let i = 0; i < 8; i++) {
      const dd = d - i * 90;
      if (dd < 0 || dd > 1300) continue;
      const q = dd / 1300, r = easeOut3(q) * diag * 1.1;
      g.lineWidth = lerp(26, 2, q);
      g.strokeStyle = hsl(i * 45 + d / 5, 65, (1 - q) ** 1.3 * 0.8);
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    }

    // pilar cahaya
    for (const p of f.pillars) {
      const dd = d - p.d - 100;
      if (dd < 0 || dd > 1500) continue;
      const q = dd / 1500, a = (1 - q) ** 1.5, w = p.w * (1 - q * 0.6);
      const gr = g.createLinearGradient(p.x - w, 0, p.x + w, 0);
      gr.addColorStop(0, hsl(p.h + d / 4, 80, 0)); gr.addColorStop(0.5, hsl(p.h + d / 4, 85, a * 0.8)); gr.addColorStop(1, hsl(p.h + d / 4, 80, 0));
      g.fillStyle = gr; g.fillRect(p.x - w, 0, w * 2, H);
    }

    // balok flare horizontal
    if (d < 800) {
      const a = (1 - d / 800) ** 1.5, h = 6 + 90 * Math.exp(-d / 150);
      g.fillStyle = `rgba(255,244,200,${(a * 0.8).toFixed(3)})`;
      g.fillRect(0, y - h / 2, W, h);
    }

    // kembang api: lahirkan partikel saat waktunya
    for (const w of f.fw) {
      if (w.done || d < w.t) continue;
      w.done = true;
      const n = Math.round(70 * Q) + 10;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = 120 + Math.random() * 300, life = 900 + Math.random() * 600;
        f.parts.push({ x: w.x, y: w.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, h: w.h + (Math.random() - 0.5) * 50 });
      }
      f.parts.push({ x: w.x, y: w.y, vx: 0, vy: 0, life: 200, max: 200, h: 50, flare: true });
      if (f.parts.length > 1100) f.parts.splice(0, f.parts.length - 1100);
    }

    // update + gambar partikel
    g.lineCap = 'round';
    for (let i = f.parts.length - 1; i >= 0; i--) {
      const p = f.parts[i];
      p.life -= dt * 1000;
      if (p.life <= 0) { f.parts.splice(i, 1); continue; }
      const a = (p.life / p.max);
      if (p.flare) { const r = 90 * (1 - a) + 20; g.fillStyle = `rgba(255,255,255,${(a * 0.9).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, r * 0.35, 0, TAU); g.fill(); continue; }
      p.vx *= Math.exp(-0.8 * s); p.vy += 220 * s; p.x += p.vx * s; p.y += p.vy * s;
      g.lineWidth = 2.4;
      g.strokeStyle = hsl(p.h, 68, a ** 1.2);
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); g.stroke();
    }

    // hujan bintang emas
    for (const st of f.stars) {
      const dd = d - st.d;
      if (dd < 0) continue;
      const sy = st.y + (st.vy * dd) / 1000;
      if (sy > H + 30) continue;
      g.fillStyle = 'rgba(255,216,59,0.9)';
      star4(g, st.x, sy, st.s, st.rot + dd / 300);
    }

    g.globalCompositeOperation = 'source-over';
    const fade = d > DUR - 600 ? 1 - (d - (DUR - 600)) / 600 : 1;
    const sA = Math.round(Math.min(innerWidth * 0.08, 84)), sB = Math.round(Math.min(innerWidth * 0.05, 56));
    drawText(g, TEXT_A, sA, W / 2, H * 0.36, d - 150, fade);
    drawText(g, TEXT_B, sB, W / 2, H * 0.36 + sA * 1.6, d - 1050, fade);

    g.restore();
  }

  return {
    start, frame, stop,
    pops: POPS,
    get active() { return !!f; },
  };
}