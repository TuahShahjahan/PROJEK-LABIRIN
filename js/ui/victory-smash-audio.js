/* ===== SUARA ULTRA SMASH · dentuman keras tiap klik di kursor level 5 =====
   Combo 1 sampai 100 memakai dentuman PENUH yang sama (boom, geraman, brass, lonceng, puing).
   Nada naik tiap combo sampai 1 oktaf (combo 13), lalu dijaga di nada itu dan ditambah lapisan lonceng
   ekstra supaya tetap terasa makin dahsyat. Versi ringan hanya dipakai kalau klik DEMPET banget (< 70 ms). */

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MAX_SHIFT = 12;       // nada naik maksimal (semiton) = 1 oktaf
const MIN_GAP_MS = 35;      // klik lebih rapat dari ini diabaikan
const LITE_GAP_MS = 70;     // klik lebih rapat dari ini memakai versi ringan

/** Kurva distorsi (clipping keras) untuk geraman. */
function distortionCurve(amount) {
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

export function createSmashAudio({ isEnabled = () => true } = {}) {
  let ctx = null, bus = null, send = null, noise = null, curve = null;
  let lastAt = 0, dead = false;

  function init() {
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

    bus = ctx.createGain();
    bus.connect(comp);

    // reverb ruang besar (impuls noise meluruh)
    const len = Math.floor(ctx.sampleRate * 2.2), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    send = ctx.createGain();
    send.connect(conv); conv.connect(wet); wet.connect(comp);

    // buffer noise
    const nl = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;

    curve = distortionCurve(60);
    return true;
  }

  /* ----- Suara dasar ----- */

  /** Osilator dengan envelope. Opsi: shape (waveshaper), lp (lowpass), rv (kirim ke reverb). */
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
    if (shape) { const ws = ctx.createWaveShaper(); ws.curve = curve; ws.oversample = '2x'; node.connect(ws); node = ws; extra.push(ws); }
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; extra.push(f); }
    node.connect(g);
    g.connect(bus);
    if (rv > 0) { const s = ctx.createGain(); s.gain.value = rv; g.connect(s); s.connect(send); extra.push(s); }
    o.start(t); o.stop(t + dur + 0.05);
    o.onended = () => { try { o.disconnect(); g.disconnect(); extra.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  }

  /** Noise berfilter (f0 -> f1 = sapuan frekuensi). */
  function hiss({ t, dur, f0, f1 = f0, type = 'lowpass', q = 0.8, gain, a = 0.003, rv = 0 }) {
    const s = ctx.createBufferSource();
    s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    const extra = [];
    if (rv > 0) { const r = ctx.createGain(); r.gain.value = rv; g.connect(r); r.connect(send); extra.push(r); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); extra.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  }

  /* ----- Dentuman ----- */

  function play({ combo = 1, k = 1, light = false } = {}) {
    if (!isEnabled() || !init()) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch { /* abaikan */ }
    void light;                                               // dentuman penuh untuk semua combo (tidak lagi dialihkan ke versi ringan)

    const nowMs = performance.now(), gap = nowMs - lastAt;
    if (gap < MIN_GAP_MS) return;                             // klik super cepat: abaikan
    lastAt = nowMs;

    const t = ctx.currentTime + 0.005;
    const lite = gap < LITE_GAP_MS;                           // hanya klik dempet banget

    const shift = Math.min(Math.max(combo - 1, 0), MAX_SHIFT); // nada naik per combo, berhenti di 1 oktaf
    const r = Math.pow(2, shift / 12) * (1 + (Math.random() - 0.5) * 0.06);
    const kk = Math.min(k, 2.2);                              // k sudah dibatasi di kursor; jaga-jaga
    const v = Math.min(1.25, 0.95 + 0.04 * Math.min(combo, 8)) * Math.min(1.15, 0.95 + 0.05 * kk);

    // 1. transien klik tajam (selalu)
    hiss({ t, dur: 0.045, f0: 2500, type: 'highpass', gain: 0.9 * v });

    // 2. sub-boom + thump (selalu)
    tone({ f0: 170 * r, f1: 34, t, dur: lite ? 0.55 : 0.95, gain: 1.0 * v, a: 0.002 });
    tone({ type: 'triangle', f0: 300 * r, f1: 60, t, dur: 0.38, gain: 0.7 * v, a: 0.002 });

    if (lite) {
      // hanya untuk klik dempet < 70 ms: tambah sedikit badan ledakan saja
      hiss({ t, dur: 0.5, f0: 5000, f1: 140, type: 'lowpass', q: 0.7, gain: 0.55 * v });
      return;
    }

    hiss({ t, dur: 0.18, f0: 1800, type: 'bandpass', q: 0.8, gain: 0.6 * v, rv: 0.2 });   // retakan ala snare

    // 3. geraman terdistorsi (kesan "destroyer")
    tone({ type: 'sawtooth', f0: 110 * r, f1: 38, t, dur: 0.8, gain: 0.5 * v, a: 0.006 - 0.002, shape: true, lp: 520 });

    // 4. ledakan noise: sapuan lowpass tinggi -> rendah + ekor reverb
    hiss({ t, dur: 1.3, f0: 7000, f1: 90, type: 'lowpass', q: 0.7, gain: 0.9 * v, rv: 0.4 });

    // 5. hantaman brass (power chord C2-G2-C3-G3), bergeser naik per combo
    [36, 43, 48, 55].forEach((m, i) => {
      tone({ type: 'sawtooth', f0: mtof(m) * r, t, dur: 0.8, gain: 0.09 * v, a: 0.006, rv: 0.25, lp: 700 + i * 500 });
    });

    // 6. kilau lonceng (C6 E6 G6 C7), memantul di reverb
    [84, 88, 91, 96].forEach((m, i) => {
      tone({ f0: mtof(m) * r, t: t + 0.04 + i * 0.04, dur: 1.6, gain: 0.07 * v, a: 0.003, rv: 0.8 });
    });

    // 7. serpihan puing: beberapa klik kecil acak
    for (let i = 0; i < 5; i++) {
      hiss({ t: t + 0.05 + Math.random() * 0.6, dur: 0.05, f0: 3000 + Math.random() * 5000, type: 'bandpass', q: 3, gain: 0.12 + Math.random() * 0.08, rv: 0.2 });
    }

    // 8. combo tinggi (>= 8): lapisan lonceng ekstra, makin banyak sampai combo 100 (nada tetap naik sampai 1 oktaf)
    if (combo >= 8) {
      const extra = Math.min(4, 1 + Math.floor((combo - 8) / 12));
      for (let i = 0; i < extra; i++) {
        tone({ f0: mtof(96 + i * 4) * r, t: t + 0.08 + i * 0.05, dur: 1.8, gain: 0.05 * v, a: 0.003, rv: 0.85 });
      }
      tone({ f0: 70 * r, f1: 28, t, dur: 1.1, gain: 0.35 * v, a: 0.004 });   // sub tambahan supaya tetap berat
    }
  }

  function close() {
    dead = true;
    if (!ctx) return;
    const c = ctx;
    ctx = null;
    setTimeout(() => { try { c.close(); } catch { /* abaikan */ } }, 2600); // biarkan ekor suara selesai
  }

  return { play, close };
}