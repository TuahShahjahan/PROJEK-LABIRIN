/* ===== AUDIO CUTSCENE KEMENANGAN =====*/

const KEY = 'pokemon-maze:sound';
const MASTER_GAIN = 0.9;

/* Musik loop dari file (mp3). Letakkan di: assets/audio/victory-loop.mp3
   Path relatif terhadap index.html (sama seperti aset gambar). Kalau file tidak ada / gagal
   dimuat, otomatis memakai musik sintesis di bawah. */
const LOOP_URL = 'assets/audio/victory-loop.mp3';
const LOOP_GAIN = 0.8; // volume file loop; ubah kalau terlalu keras/pelan
let loopBytes = null;  // byte file di-cache supaya tidak diunduh ulang (mis. saat LEWATI)
const loadLoopBytes = () => (loopBytes ||= fetch(LOOP_URL)
  .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
  .catch((err) => { loopBytes = null; throw err; }));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const STAR_NOTES = [72, 76, 79, 84, 88]; // C5 E5 G5 C6 E6 -> arpeggio C mayor naik, tiap bintang satu nada

const METHODS = [
  'awaken', 'launch', 'land', 'riser', 'impact', 'charge', 'starLaunch', 'starImpact',
  'titleRiser', 'letter', 'mega', 'type', 'hitstop', 'fadeOut', 'close', 'resume', 'startAmbient', 'stopAmbient',
];

function silent(enabled) {
  const api = Object.fromEntries(METHODS.map((m) => [m, () => {}]));
  api.enabled = enabled;
  api.toggle = () => false;
  return api;
}

export function createCineAudio() {
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch { /* localStorage diblokir */ }
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return silent(false);
  let ctx;
  try { ctx = new AC(); } catch { return silent(false); }

  /* ----- Graph: suara -> (langsung + reverb) -> lowpass -> compressor -> master ----- */
  const master = ctx.createGain();
  master.gain.value = on ? MASTER_GAIN : 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 22000; lp.Q.value = 0.7;
  const direct = ctx.createGain();
  const verb = ctx.createGain();
  const conv = ctx.createConvolver();
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  {
    const len = Math.floor(ctx.sampleRate * 2.6);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    conv.buffer = buf;
  }
  direct.connect(lp);
  verb.connect(conv); conv.connect(wet); wet.connect(lp);
  lp.connect(comp); comp.connect(master); master.connect(ctx.destination);

  const noiseBuf = (() => {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  })();

  const now = () => ctx.currentTime + 0.01;
  const route = (node, rv) => {
    node.connect(direct);
    if (rv > 0) { const s = ctx.createGain(); s.gain.value = rv; node.connect(s); s.connect(verb); }
  };
  const cleanup = (src, ...nodes) => {
    src.onended = () => { try { src.disconnect(); nodes.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  };

  /* ----- Suara dasar ----- */

  /** Osilator dengan envelope (attack → tahan → release). Filter opsional. */
  function osc({ type = 'sine', f0, f1 = f0, t, dur, gain = 0.3, a = 0.005, rel = 0.08, detune = 0, rv = 0.2, filter }) {
    const o = ctx.createOscillator();
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    const peak = Math.max(0.0002, gain), r = Math.min(rel, dur * 0.6), at = Math.min(a, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + at);
    g.gain.setValueAtTime(peak, t + Math.max(at, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = o, f = null;
    if (filter) {
      f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass'; f.Q.value = filter.q || 0.8;
      f.frequency.setValueAtTime(filter.f0, t);
      if (filter.f1 && filter.f1 !== filter.f0) f.frequency.exponentialRampToValueAtTime(filter.f1, t + dur);
      o.connect(f); last = f;
    }
    last.connect(g);
    route(g, rv);
    o.start(t); o.stop(t + dur + 0.05);
    cleanup(o, g, ...(f ? [f] : []));
  }

  /** Noise berfilter. shape 'decay' = hantaman; 'rise' = reverse-cymbal (naik lalu putus). */
  function noise({ t, dur, f0, f1 = f0, type = 'bandpass', q = 1, gain = 0.3, a = 0.005, rv = 0.2, shape = 'decay' }) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    const peak = Math.max(0.0002, gain);
    g.gain.setValueAtTime(0.0001, t);
    if (shape === 'rise') {
      g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.97);
      g.gain.setValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(peak, t + Math.min(a, dur * 0.4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    s.connect(f); f.connect(g);
    route(g, rv);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    cleanup(s, f, g);
  }

  const kick = (t, gain = 0.9) => {
    osc({ f0: 160, f1: 42, t, dur: 0.28, gain, a: 0.002, rel: 0.2, rv: 0 });
    noise({ t, dur: 0.03, f0: 3000, type: 'highpass', gain: gain * 0.25, rv: 0 });
  };
  const snare = (t, gain = 0.4) => {
    noise({ t, dur: 0.14, f0: 1800, q: 0.8, gain, rv: 0.25 });
    osc({ type: 'triangle', f0: 230, f1: 110, t, dur: 0.1, gain: gain * 0.7, rv: 0.1 });
  };
  const hat = (t, gain = 0.08) => noise({ t, dur: 0.045, f0: 8000, type: 'highpass', gain, rv: 0.05 });
  const crash = (t, dur = 1.4, gain = 0.35) => noise({ t, dur, f0: 6000, type: 'highpass', q: 0.5, gain, rv: 0.5, a: 0.004 });
  const boom = (t, size = 1) => {
    osc({ f0: 120, f1: 28, t, dur: 0.9 * size + 0.3, gain: 0.95, a: 0.003, rel: 0.6 * size, rv: 0.05 });
    osc({ type: 'triangle', f0: 220, f1: 50, t, dur: 0.5 * size + 0.2, gain: 0.5, a: 0.003, rel: 0.3, rv: 0.1 });
    noise({ t, dur: 0.8 * size + 0.2, f0: 4000, f1: 150, type: 'lowpass', gain: 0.7, rv: 0.35 });
  };
  const bell = (t, midi, gain = 0.4, dur = 1.2) => {
    const f = mtof(midi);
    osc({ f0: f, t, dur, gain, a: 0.003, rel: dur * 0.9, rv: 0.55 });
    osc({ f0: f * 2.76, t, dur: dur * 0.6, gain: gain * 0.35, a: 0.003, rel: dur * 0.5, rv: 0.55 });
    osc({ f0: f * 2, t, dur: dur * 0.8, gain: gain * 0.5, a: 0.003, rel: dur * 0.7, rv: 0.55 });
  };
  /** Brass sintetis: 3 sawtooth detune + filter yang membuka cepat. */
  const brass = (t, midi, dur = 0.4, gain = 0.3) => {
    const f = mtof(midi);
    [-9, 0, 9].forEach((d) => osc({
      type: 'sawtooth', f0: f, t, dur, gain: gain / 2.2, a: 0.02, rel: Math.min(0.15, dur * 0.5), detune: d, rv: 0.3,
      filter: { type: 'lowpass', f0: 500, f1: 2600, q: 1.2 },
    }));
  };
  const lead = (t, midi, dur = 0.2, gain = 0.1) => {
    const f = mtof(midi);
    osc({ type: 'square', f0: f, t, dur, gain, a: 0.004, rel: Math.min(0.08, dur * 0.5), rv: 0.15 });
  };

  /* ----- Cue ----- */

  /** Fanfare kemenangan (C mayor): melodi brass+chip, harmoni, bass, drum. Total ±3 detik. */
  function fanfare(t0) {
    const s = 0.85;
    const melody = [[72, 0, 0.16], [72, 0.18, 0.16], [72, 0.36, 0.16], [76, 0.54, 0.5], [74, 1.08, 0.16], [74, 1.26, 0.16], [74, 1.44, 0.16], [77, 1.62, 0.5], [76, 2.16, 0.16], [79, 2.34, 0.16], [84, 2.52, 1.4]];
    melody.forEach(([m, st, d]) => { brass(t0 + st * s, m, d * s, 0.3); lead(t0 + st * s, m + 12, d * s, 0.09); });
    const chords = [[0, 1.08, [48, 52, 55]], [1.08, 2.16, [43, 47, 50, 53]], [2.16, 3.6, [48, 55, 60, 64]]];
    chords.forEach(([a, b, notes]) => notes.forEach((m) => brass(t0 + a * s, m, (b - a) * s, 0.1)));
    [[36, 0, 1.08], [43, 1.08, 2.16], [36, 2.16, 3.6]].forEach(([m, a, b]) => {
      osc({ type: 'sawtooth', f0: mtof(m), t: t0 + a * s, dur: (b - a) * s, gain: 0.22, a: 0.01, rel: 0.1, rv: 0.05, filter: { type: 'lowpass', f0: 400, f1: 400 } });
    });
    [0, 0.54, 1.08, 1.62, 2.16, 2.52].forEach((st) => kick(t0 + st * s, 0.85));
    [0.27, 0.81, 1.35, 1.89, 2.43].forEach((st) => snare(t0 + st * s, 0.35));
    [2.2, 2.26, 2.32, 2.38, 2.44].forEach((st, i) => snare(t0 + st * s, 0.2 + i * 0.05));
    for (let i = 0; i < 18; i++) hat(t0 + i * 0.18 * s, 0.07);
    crash(t0 + 2.52 * s, 2.4, 0.4);
  }

  /* ----- Musik latar looping: "Legend Cleared" (komposisi original) -----
     8 bar · 120 BPM · C mayor · progresi: C – G – Am – F – C – G – F – G
     (bar terakhir ditutup drum fill lalu kembali ke C supaya loop mulus). */
  const BPM = 120, BEAT = 60 / BPM, EIGHTH = BEAT / 2, BAR = BEAT * 4, BARS = 8;
  const PROG = [
    { root: 36, pad: [55, 60, 64] }, // C
    { root: 43, pad: [55, 59, 62] }, // G
    { root: 45, pad: [57, 60, 64] }, // Am
    { root: 41, pad: [53, 57, 60] }, // F
    { root: 36, pad: [55, 60, 64] }, // C
    { root: 43, pad: [55, 59, 62] }, // G
    { root: 41, pad: [53, 57, 60] }, // F
    { root: 43, pad: [55, 59, 62] }, // G
  ];
  /* Melodi: [langkah 1/8 (0–63), nada MIDI, panjang dalam 1/8] */
  const TUNE = [
    [0, 76, 1], [1, 79, 1], [2, 84, 2], [4, 83, 1], [5, 79, 1], [6, 76, 2],
    [8, 74, 1], [9, 79, 1], [10, 83, 2], [12, 81, 1], [13, 79, 1], [14, 74, 2],
    [16, 76, 1], [17, 81, 1], [18, 84, 2], [20, 83, 1], [21, 81, 1], [22, 76, 2],
    [24, 77, 1], [25, 81, 1], [26, 84, 1], [27, 81, 1], [28, 79, 4],
    [32, 79, 1], [33, 84, 1], [34, 88, 2], [36, 86, 1], [37, 84, 1], [38, 79, 2],
    [40, 83, 1], [41, 86, 1], [42, 83, 2], [44, 81, 1], [45, 79, 1], [46, 74, 2],
    [48, 81, 1], [49, 84, 1], [50, 89, 2], [52, 88, 1], [53, 84, 1], [54, 81, 2],
    [56, 79, 1], [57, 83, 1], [58, 86, 1], [59, 83, 1], [60, 79, 2], [62, 74, 1], [63, 79, 1],
  ];

  /** Jadwalkan satu bar (0–7) mulai dari waktu audio t0. */
  function ambientBar(t0, b) {
    const { root, pad } = PROG[b];

    // pad lembut
    pad.forEach((m) => osc({ type: 'triangle', f0: mtof(m), t: t0, dur: BAR + 0.15, gain: 0.035, a: 0.1, rel: 0.3, rv: 0.45 }));

    // bass: akar + oktaf (pola 8 ketukan)
    [0, 0, 12, 0, 0, 0, 12, 0].forEach((o, i) => osc({
      type: 'sawtooth', f0: mtof(root + o), t: t0 + i * EIGHTH, dur: EIGHTH * 0.85, gain: 0.12, a: 0.006, rel: 0.05, rv: 0.05,
      filter: { type: 'lowpass', f0: 420, f1: 420 },
    }));

    // melodi (square + sedikit triangle supaya hangat)
    TUNE.forEach(([step, m, len]) => {
      if (Math.floor(step / 8) !== b) return;
      const t = t0 + (step % 8) * EIGHTH, d = Math.max(0.09, len * EIGHTH * 0.92);
      lead(t, m, d, 0.06);
      osc({ type: 'triangle', f0: mtof(m), t, dur: d, gain: 0.04, a: 0.006, rel: 0.06, rv: 0.2 });
    });

    // kilau lonceng di awal bar dan ketukan ke-3
    bell(t0, pad[2] + 12, 0.05, 1.0);
    bell(t0 + 2 * BEAT, pad[1] + 24, 0.035, 0.8);

    // drum: kick tiap ketukan, snare ketukan 2 & 4, hat di sela
    for (let k = 0; k < 4; k++) {
      kick(t0 + k * BEAT, 0.3);
      if (k % 2) snare(t0 + k * BEAT, 0.16);
    }
    for (let i = 0; i < 8; i++) hat(t0 + i * EIGHTH, i % 2 ? 0.035 : 0.018);
    if (b === 0) crash(t0, 1.0, 0.06);
    if (b === BARS - 1) for (let i = 0; i < 4; i++) snare(t0 + 3 * BEAT + i * (BEAT / 4), 0.09 + 0.03 * i); // fill
  }
  let ambTimer = null, ambNext = 0, ambBar = 0;

  /* ----- Loop dari file mp3 (dimuat di awal, siap sebelum fanfare selesai) ----- */
  let loopBuf = null, loopSrc = null, loopState = 'loading', wantAmbient = false;
  const loopGain = ctx.createGain();
  loopGain.gain.value = LOOP_GAIN;
  loopGain.connect(master);
  const startLoopFile = () => {
    if (loopSrc || !loopBuf) return;
    loopSrc = ctx.createBufferSource();
    loopSrc.buffer = loopBuf;
    loopSrc.loop = true;
    loopSrc.connect(loopGain);
    loopSrc.start();
  };
  /** Cadangan: musik sintesis (dipakai bila file mp3 tidak ada / gagal dimuat). */
  function startSynth() {
    if (ambTimer) return;
    ambNext = now() + 0.15; ambBar = 0;
    const pump = () => { while (ambNext < ctx.currentTime + 1.2) { ambientBar(ambNext, ambBar % BARS); ambBar++; ambNext += BAR; } };
    pump();
    ambTimer = setInterval(() => { try { pump(); } catch { /* abaikan */ } }, 400);
  }
  loadLoopBytes()
    .then((bytes) => ctx.decodeAudioData(bytes.slice(0)))
    .then((buf) => { loopBuf = buf; loopState = 'ready'; if (wantAmbient) startLoopFile(); })
    .catch(() => { loopState = 'failed'; if (wantAmbient && !ambTimer) startSynth(); });

  const api = {
    enabled: on,
    /** Musik latar berulang (dipakai setelah fanfare, selama tombol ULANGI / MENU tampil).
     *  Dijadwalkan per bar dengan lookahead 1,2 dtk. */
    startAmbient() {
      wantAmbient = true;
      if (loopState === 'ready') startLoopFile();
      else if (loopState === 'failed') startSynth();
      // 'loading': dimulai otomatis begitu file selesai didecode
    },
    stopAmbient() {
      wantAmbient = false;
      if (loopSrc) { try { loopSrc.stop(); } catch { /* sudah berhenti */ } loopSrc = null; }
      if (ambTimer) { clearInterval(ambTimer); ambTimer = null; }
    },
    resume() { try { if (ctx.state === 'suspended') ctx.resume(); } catch { /* abaikan */ } },

    /** FASE 1: drone naik, shimmer, detak, bip arpeggio antisipasi. */
    awaken() {
      const t = now();
      osc({ type: 'sawtooth', f0: mtof(36), t, dur: 2.3, gain: 0.22, a: 0.9, rel: 0.2, rv: 0.4, filter: { type: 'lowpass', f0: 150, f1: 1200 } });
      osc({ type: 'sawtooth', f0: mtof(36), t, dur: 2.3, gain: 0.18, a: 0.9, rel: 0.2, detune: 12, rv: 0.4, filter: { type: 'lowpass', f0: 150, f1: 1200 } });
      noise({ t, dur: 0.9, f0: 800, f1: 5000, gain: 0.16, shape: 'rise', rv: 0.4 });
      kick(t + 0.25, 0.35); kick(t + 0.7, 0.5);
      [84, 86, 88, 91, 93, 96].forEach((m, i) => osc({ f0: mtof(m), t: t + 0.05 + i * 0.15, dur: 0.12, gain: 0.07, rv: 0.4 }));
    },

    /** FASE 2: tiap Pokémon punya suara masuk yang berbeda. */
    launch(kind) {
      const t = now();
      if (kind === 'sn') {
        noise({ t, dur: 0.65, f0: 200, f1: 900, gain: 0.5, a: 0.05, rv: 0.3 });
        osc({ type: 'sawtooth', f0: 70, f1: 160, t, dur: 0.55, gain: 0.25, rv: 0.1, filter: { type: 'lowpass', f0: 300, f1: 900 } });
      } else if (kind === 'pk') {
        for (let i = 0; i < 4; i++) osc({ type: 'sawtooth', f0: 1800 - i * 150, f1: 300, t: t + i * 0.11, dur: 0.1, gain: 0.16, rv: 0.2 });
        noise({ t, dur: 0.55, f0: 3000, type: 'highpass', gain: 0.22, a: 0.02, rv: 0.2 });
      } else {
        for (let i = 0; i < 5; i++) osc({ f0: 400 + i * 40, f1: 1200 + i * 90, t: t + i * 0.1, dur: 0.09, gain: 0.16, rv: 0.3 });
        noise({ t, dur: 0.65, f0: 600, f1: 2400, gain: 0.3, a: 0.05, rv: 0.3 });
      }
    },
    land(kind) {
      const t = now();
      if (kind === 'sn') { kick(t, 1); boom(t, 0.5); noise({ t, dur: 0.4, f0: 1200, f1: 200, type: 'lowpass', gain: 0.3 }); }
      else if (kind === 'pk') { for (let i = 0; i < 3; i++) osc({ type: 'sawtooth', f0: 2200, f1: 500, t: t + i * 0.05, dur: 0.06, gain: 0.14, rv: 0.2 }); bell(t, 91, 0.25, 0.7); }
      else { noise({ t, dur: 0.35, f0: 2500, f1: 800, gain: 0.35, rv: 0.3 }); osc({ f0: 300, f1: 700, t, dur: 0.12, gain: 0.25, rv: 0.3 }); kick(t, 0.6); }
    },

    /** Riser pra-impact (reverse cymbal + nada naik). */
    riser(ms) {
      const t = now(), d = ms / 1000;
      noise({ t, dur: d, f0: 500, f1: 9000, type: 'highpass', gain: 0.45, shape: 'rise', rv: 0.4 });
      osc({ f0: 200, f1: 1600, t, dur: d, gain: 0.22, a: d * 0.8, rel: 0.02, rv: 0.4 });
    },
    /** FASE 3: Legendary Impact. */
    impact() {
      const t = now();
      boom(t, 1.6); crash(t, 1.8, 0.45); kick(t, 1);
      [48, 55, 60, 64].forEach((m) => brass(t, m, 0.9, 0.3));
      osc({ f0: 45, f1: 32, t, dur: 1.6, gain: 0.5, a: 0.01, rel: 1.2, rv: 0 });
    },

    /** FASE 4: charge satu bintang (nada naik, shimmer, detak yang makin cepat; bintang ke-5 + snare roll). */
    charge(i, ms) {
      const t = now(), d = ms / 1000, n = STAR_NOTES[i];
      osc({ f0: mtof(n - 24), f1: mtof(n), t, dur: d, gain: 0.26, a: d * 0.7, rel: 0.04, rv: 0.35 });
      osc({ type: 'triangle', f0: mtof(n - 12), f1: mtof(n + 12), t, dur: d, gain: 0.12, a: d * 0.7, rel: 0.04, rv: 0.35 });
      osc({ type: 'sawtooth', f0: mtof(n - 24), f1: mtof(n - 12), t, dur: d, gain: 0.08, a: d * 0.8, rel: 0.04, rv: 0.2, filter: { type: 'lowpass', f0: 300, f1: 3000 } });
      noise({ t, dur: d, f0: 1500, f1: 7000, gain: 0.12 + i * 0.02, shape: 'rise', rv: 0.4 });
      let tt = 0.14 + 0.02 * i, gap = 0.14;
      while (tt < d - 0.05) {
        const p = tt / d;
        if (i === 4) snare(t + tt, 0.12 + 0.35 * p);
        else osc({ f0: mtof(n + 12 + p * 12), t: t + tt, dur: 0.05, gain: 0.06 + 0.05 * p, rv: 0.2 });
        gap = Math.max(0.035, gap * (i === 4 ? 0.86 : 0.9));
        tt += gap;
      }
    },
    starLaunch(i, ms) {
      const t = now(), d = ms / 1000, n = STAR_NOTES[i];
      noise({ t, dur: d, f0: 500, f1: 6000, gain: 0.35, a: d * 0.5, rv: 0.3 });
      osc({ type: 'sawtooth', f0: mtof(n), f1: mtof(n + 12), t, dur: d, gain: 0.12, a: 0.02, rel: 0.05, rv: 0.2, filter: { type: 'lowpass', f0: 800, f1: 5000 } });
    },
    /** Impact bintang: kick + boom + crash + lonceng (nada tangga) + pad yang bertambah jadi akord penuh. */
    starImpact(i, holdSec = 6) {
      const t = now(), n = STAR_NOTES[i], k = 0.7 + 0.12 * i;
      kick(t, 0.9);
      boom(t, 0.7 + i * 0.15);
      crash(t, 0.9 + i * 0.2, 0.28 + i * 0.04);
      bell(t, n, 0.5 * k, 1.4 + i * 0.2);
      bell(t, n + 12, 0.3 * k, 1.2);
      bell(t + 0.05, n + 24, 0.18 * k, 0.9);
      osc({ type: 'triangle', f0: mtof(n - 12), t, dur: Math.max(1, holdSec), gain: 0.1, a: 0.12, rel: 0.5, rv: 0.4 });
      if (i === 4) { brass(t, 60, 1.2, 0.3); brass(t, 64, 1.2, 0.3); brass(t, 67, 1.2, 0.3); }
    },

    /** FASE 5: sebelum huruf menghantam. */
    titleRiser(ms) {
      const t = now(), d = ms / 1000;
      noise({ t, dur: d, f0: 300, f1: 7000, gain: 0.4, shape: 'rise', rv: 0.4 });
      osc({ f0: 40, f1: 90, t, dur: d, gain: 0.4, a: d * 0.7, rel: 0.02, rv: 0 });
    },
    /** Tiap huruf V-I-C-T-O-R-Y: hantaman + nada brass naik. */
    letter(k) {
      const t = now(), notes = [48, 50, 52, 55, 57, 60, 64], g = 0.55 + k * 0.06;
      kick(t, 0.75 + k * 0.03);
      noise({ t, dur: 0.07, f0: 2500, q: 0.7, gain: 0.25 });
      brass(t, notes[k] + 12, 0.22, g * 0.5);
      bell(t, notes[k] + 24, 0.2, 0.5);
      if (k === 6) { boom(t, 0.9); crash(t, 0.8, 0.3); }
    },
    /** Mega impact + fanfare + kilauan. */
    mega() {
      const t = now();
      boom(t, 2.4); crash(t, 2.6, 0.5); kick(t, 1);
      [36, 48, 55, 60, 64, 67, 72].forEach((m) => brass(t, m, 1.2, 0.3));
      fanfare(t + 0.05);
      for (let i = 0; i < 14; i++) bell(t + 0.6 + Math.random() * 2.4, [84, 88, 91, 96][i % 4], 0.12, 0.8);
    },
    /** Bip ketik subtitle. */
    type(line) {
      osc({ type: 'square', f0: line ? 990 : 1320, t: now(), dur: 0.03, gain: 0.05, a: 0.002, rel: 0.02, rv: 0.05 });
    },

    /** Hit-stop: suara teredam sesaat lalu membuka (khas frame impact). */
    hitstop(ms) {
      const t = ctx.currentTime;
      lp.frequency.cancelScheduledValues(t);
      lp.frequency.setValueAtTime(22000, t);
      lp.frequency.setTargetAtTime(500, t, 0.01);
      lp.frequency.setTargetAtTime(22000, t + ms / 1000, 0.07);
    },

    fadeOut(sec = 0.4) { master.gain.setTargetAtTime(0, ctx.currentTime, sec / 4); },
    close() { api.stopAmbient(); setTimeout(() => { try { ctx.close(); } catch { /* abaikan */ } }, 900); },
    toggle() {
      on = !on;
      api.enabled = on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* abaikan */ }
      master.gain.setTargetAtTime(on ? MASTER_GAIN : 0, ctx.currentTime, 0.02);
      return on;
    },
  };
  return api;
}