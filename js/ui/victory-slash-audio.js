/* ===== AUDIO SLASH · charge-up CELESTIAL + beat future core PENDEK =====
   Dibuat dengan Web Audio API (tanpa file suara), AudioContext sendiri yang dibuat saat charge dimulai
   (butuh gesture pengguna: tombol tengah mouse ditekan).

   REFERENSI
   - Video referensi (teaser rollback/Q): tempo ±172 BPM, hantaman rapat tiap not ke-8, bass berat dengan
     kick yang turun nadanya, riser naik lalu cut hening sesaat sebelum hantaman, tekstur glitch/stutter.
   - Resep bunyi surgawi (library SFX & sound design): choir tanpa kata (vokal "ooh -> aah"), shimmer
     bertingkat (oktaf/kuint di atas), lonceng kristal berekor panjang, harpa glissando naik, reverb
     katedral. Satu elemen cerah per saat supaya tidak melengking.
   - Rift/slash sinematik (mis. Judgment Cut): bunyi "shing" logam, lalu dentuman, lalu ekor bergema.

   SINKRONISASI (tetap sama dengan versi sebelumnya): tiap slash membuat PLAN berisi semua hantaman dengan
   waktu relatif terhadap momen tebasan (T = 0). Plan yang SAMA dipakai untuk (1) menjadwalkan suara di jam
   AudioContext dan (2) memicu denyut/glitch visual di kursor. Isinya acak (tempo 166-180, nada, pola),
   waktunya selalu terkunci. Nada charge-up memakai tangga nada yang sama dengan beat-nya.

   STRUKTUR (1 bar, 4 beat ≈ 1,4 detik, jauh lebih pendek dari sebelumnya):
     T=0         DROP: "shing" + dentuman + choir surgawi + kilau lonceng (layar terbelah)
     0 - 3 beat  groove padat: kick sub-bass, clap, hat, bass, lonceng 16th, glitch, choir kedua
     3 - 4 beat  BUILD: snare roll makin rapat + riser, hening kick (cut), lalu SLAM tepat saat layar menutup

   API:
     const a = createSlashAudio({ isEnabled });
     a.plan(power)            -> plan (selalu tersedia, juga saat suara dimatikan)
     a.chargeStart() / a.chargeSet(q) / a.ping(stage) / a.chargeEnd()
     a.play(plan, leadSec)    -> { latency } | null   (jadwalkan beat; impact jatuh leadSec detik dari sekarang)
     a.close() */

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** RNG kecil dengan seed (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BPMS = [166, 168, 170, 172, 174, 176, 180];           // sekitar tempo referensi (172)
const SCALES = [
  [0, 2, 4, 6, 7, 9, 11], // lydian (paling "surgawi")
  [0, 2, 4, 5, 7, 9, 11], // mayor
  [0, 2, 4, 5, 7, 9, 10], // mixolydian
  [0, 2, 3, 5, 7, 9, 10], // dorian
];
const PROGS = [[0, 4], [0, 5], [0, 3], [5, 3], [0, 6], [3, 4], [0, 2]];   // 2 akor per bar (derajat tangga nada)
const KICKS = ['1000100010010000', '1000101010001000', '1001001010010000', '1000100110001000', '1010100010100000'];
const CLAPS = [[4, 10], [4, 9], [6, 10], [4, 8]];
const N_BEATS = 4;
const ROLL_STEPS = [12, 13, 14, 14.5, 15, 15.25, 15.5, 15.75];            // snare roll (satuan 1/16 beat)
const CHARGE_DEG = [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14];                  // tangga pentatonik yang dinaiki saat charge

const semisOf = (scale, deg) => scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);

/** Bangun rencana slash: SEMUA waktu dalam detik relatif terhadap momen impact (T=0). */
export function buildPlan(seed, power = 1, key = null) {
  const R = rng(seed), pick = (a) => a[(R() * a.length) | 0];
  const bpm = pick(BPMS), beat = 60 / bpm, step = beat / 4, N = N_BEATS, total = N * beat;
  const scale = key?.scale || pick(SCALES), pc = key ? key.pc : (R() * 12) | 0;
  const root = 30 + ((((pc - 30) % 12) + 12) % 12);                       // 30..41 (bass), nada sama dengan charge
  const prog = pick(PROGS), kickPat = pick(KICKS).split('').map(Number), clapSteps = pick(CLAPS);
  const semis = (deg) => semisOf(scale, deg);
  const chordDeg = (s) => prog[Math.floor(s / 8)];                        // 8 langkah = 2 beat
  const chord = (cd) => [0, 2, 4, 7].map((d) => root + 24 + semis(cd + d));

  const hits = { kick: [], clap: [], hat: [], bass: [], bell: [], choir: [], glitch: [], roll: [] };
  const events = [{ t: 0, kind: 'impact', pow: 1 }];
  let glitches = 0;

  for (let s = 0; s < 16; s++) {
    const t = s * step, cd = chordDeg(s);

    // kick (tidak di s=0 karena impact membawa kick sendiri; hening di beat terakhir = cut sebelum SLAM)
    if (kickPat[s] && s > 0 && s < 12) {
      const pow = s % 4 === 0 ? 1 : 0.72;
      hits.kick.push({ t, pow });
      events.push({ t, kind: 'kick', pow });
    }
    if (clapSteps.includes(s)) {
      hits.clap.push({ t });
      events.push({ t, kind: 'snare', pow: 0.9 });
    }
    if (s < 12) {
      if (s % 4 === 2) hits.hat.push({ t, open: true });
      else if (R() < 0.5) hits.hat.push({ t, open: false });
    }

    // bass sub yang "menukik" (seperti kick referensi)
    if (s < 12 && (s === 0 || R() < (s % 4 === 0 ? 0.75 : s % 2 === 0 ? 0.4 : 0.25))) {
      const len = s === 0 ? 2 : R() < 0.35 ? 2 : 1, iv = s === 0 ? 0 : pick([0, 0, 0, 7, 12, 3, 10]);
      hits.bass.push({ t, m: Math.min(52, root + semis(cd) + iv), dur: len * step * 0.92 });
    }

    // lonceng kristal 16th (kilau surgawi)
    if (s > 0 && s < 12 && R() < 0.7) {
      const tone = pick([0, 2, 4, 7, 9, 11]);
      hits.bell.push({ t, m: Math.min(96, root + 36 + semis(cd + tone)), g: 0.5 + R() * 0.5 });
    }

    // glitch / stutter (memicu bar glitch horizontal di visual)
    if (s >= 1 && glitches < 6 && R() < (s >= 10 ? 0.5 : 0.28)) {
      const pow = 0.6 + R() * 0.4;
      hits.glitch.push({ t, pow });
      events.push({ t, kind: 'glitch', pow });
      glitches++;
    }
  }

  // choir kedua di tengah bar (akor ke-2)
  hits.choir.push({ t: 8 * step, notes: chord(prog[1]), dur: 4 * step });
  events.push({ t: 8 * step, kind: 'stab', pow: 0.8 });

  // snare roll yang makin rapat menuju SLAM
  ROLL_STEPS.forEach((st, i) => {
    const t = st * step, pow = 0.35 + 0.65 * (i / (ROLL_STEPS.length - 1));
    hits.roll.push({ t, pow });
    events.push({ t, kind: 'roll', pow: pow * 0.7 });
  });

  events.push({ t: total, kind: 'final', pow: 1.3 });
  events.sort((a, b) => a.t - b.t);

  return {
    seed, power, bpm, beat, step, N, total, root, scale, hits, events,
    riserFrom: 10 * step,
    chord0: chord(prog[0]),
    chordF: [0, 2, 4, 7, 9].map((d) => root + 24 + semis(d)),
  };
}

export function createSlashAudio({ isEnabled = () => true } = {}) {
  let ctx = null, drum = null, music = null, duck = null, send = null, echo = null, noise = null;
  let ch = null, key = null, dead = false, pending = [];

  function init() {
    if (ctx) return true;
    if (dead) return false;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) { dead = true; return false; }
    try { ctx = new AC(); } catch { dead = true; return false; }

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -9; comp.knee.value = 8; comp.ratio.value = 10; comp.attack.value = 0.002; comp.release.value = 0.22;
    const master = ctx.createGain();
    master.gain.value = 0.95;
    comp.connect(master); master.connect(ctx.destination);

    drum = ctx.createGain(); drum.connect(comp);
    duck = ctx.createGain(); duck.connect(comp);          // sidechain palsu: diturunkan tiap kick
    music = ctx.createGain(); music.connect(duck);

    // reverb katedral: impuls noise meluruh dengan redaman frekuensi tinggi (bukan desis kasar)
    const len = Math.floor(ctx.sampleRate * 3.0), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const q = i / len;
        lp += ((Math.random() * 2 - 1) - lp) * (0.55 * (1 - q) + 0.06);
        d[i] = lp * Math.pow(1 - q, 2.2) * 2.2;
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    send = ctx.createGain();
    send.connect(conv); conv.connect(wet); wet.connect(comp);

    // echo (untuk lonceng), waktu tunda diatur per slash
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.25;
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const ew = ctx.createGain();
    ew.gain.value = 0.45;
    echo.connect(fb); fb.connect(echo); echo.connect(ew); ew.connect(comp);

    const nl = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, nl, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  /* ----- Suara dasar ----- */

  const bus = (to) => (to === 'music' ? music : drum);

  function osc({ type = 'sine', f0, f1 = f0, t, dur, gain, a = 0.003, to = 'drum', rv = 0, ec = 0, detune = 0, lp = 0, lp1 = 0 }) {
    const x = ctx.createOscillator();
    x.type = type; x.detune.value = detune;
    x.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) x.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(a, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = x;
    const extra = [];
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(lp, t);
      if (lp1 && lp1 !== lp) f.frequency.exponentialRampToValueAtTime(lp1, t + dur);
      node.connect(f); node = f; extra.push(f);
    }
    node.connect(g);
    g.connect(bus(to));
    if (rv > 0) { const s = ctx.createGain(); s.gain.value = rv; g.connect(s); s.connect(send); extra.push(s); }
    if (ec > 0) { const s = ctx.createGain(); s.gain.value = ec; g.connect(s); s.connect(echo); extra.push(s); }
    x.start(t); x.stop(t + dur + 0.05);
    x.onended = () => { try { x.disconnect(); g.disconnect(); extra.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  }

  /** Noise berfilter. rise = membesar lalu putus (swoosh / reverse-cymbal), selain itu meluruh. */
  function hiss({ t, dur, f0, f1 = f0, type = 'lowpass', q = 0.8, gain, a = 0.003, to = 'drum', rv = 0, rise = false }) {
    const s = ctx.createBufferSource();
    s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    if (rise) {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + dur * 0.96);
      g.gain.setValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(a, dur * 0.5));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    s.connect(f); f.connect(g); g.connect(bus(to));
    const extra = [];
    if (rv > 0) { const r = ctx.createGain(); r.gain.value = rv; g.connect(r); r.connect(send); extra.push(r); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); extra.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  }

  /** Suara paduan suara tanpa kata: 2 sawtooth bergeser tipis -> 3 filter formant paralel (vokal "aah"/"ooh"). */
  function choirVoice({ t, dur, midi, gain, a = 0.05, vowel = 1, rv = 0.7 }) {
    const sum = ctx.createGain();
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(a, dur * 0.5));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const F = vowel === 1 ? [800, 1150, 2900] : [350, 870, 2250], G = [2.2, 1.1, 0.55], extra = [sum, env];
    const oscs = [-8, 8].map((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = d;
      o.connect(sum); o.start(t); o.stop(t + dur + 0.05);
      return o;
    });
    F.forEach((f, i) => {
      const b = ctx.createBiquadFilter(), g = ctx.createGain();
      b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 9; g.gain.value = G[i];
      sum.connect(b); b.connect(g); g.connect(env); extra.push(b, g);
    });
    env.connect(drum);
    if (rv > 0) { const r = ctx.createGain(); r.gain.value = rv; env.connect(r); r.connect(send); extra.push(r); }
    oscs[0].onended = () => { try { oscs.forEach((o) => o.disconnect()); extra.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } };
  }
  const choir = (t, notes, dur, g, vowel = 1) => notes.forEach((m) => choirVoice({ t, dur, midi: m, gain: 0.05 * g, vowel }));

  /* ----- Instrumen ----- */

  const kick = (t, pw = 1) => {
    osc({ f0: 190, f1: 42, t, dur: 0.26, gain: 1.0 * pw, a: 0.001 });                 // kick menukik (spektrum referensi)
    osc({ f0: 82, f1: 34, t, dur: 0.6, gain: 0.8 * pw, a: 0.002 });                    // ekor sub-bass panjang
    hiss({ t, dur: 0.02, f0: 3000, type: 'highpass', gain: 0.5 * pw });
  };
  const clap = (t) => {
    for (let i = 0; i < 3; i++) hiss({ t: t + i * 0.011, dur: i === 2 ? 0.09 : 0.03, f0: 1500, type: 'bandpass', q: 1, gain: 0.3, rv: i === 2 ? 0.35 : 0 });
  };
  const hat = (t, open) => hiss({ t, dur: open ? 0.14 : 0.04, f0: 8500, type: 'highpass', gain: open ? 0.1 : 0.06 });
  const bass = (t, m, dur) => {
    osc({ f0: mtof(m) * 2.2, f1: mtof(m), t, dur, gain: 0.42, a: 0.003, to: 'music' });                       // sub menukik
    osc({ type: 'sawtooth', f0: mtof(m), t, dur, gain: 0.1, a: 0.004, to: 'music', lp: 700, lp1: 250 });
  };
  /** Lonceng kristal: tiga partial tak-harmonik, ekor memantul di reverb katedral. */
  const bell = (t, m, g = 1, dur = 1.4) => {
    const f = mtof(m);
    [[1, 1, 1], [2.756, 0.45, 0.6], [5.404, 0.22, 0.35]].forEach(([r, a, d]) => osc({ f0: f * r, t, dur: dur * d, gain: 0.07 * g * a, a: 0.002, rv: 0.9, ec: 0.25 }));
  };
  const pluck = (t, m, g = 1) => {
    osc({ type: 'triangle', f0: mtof(m), t, dur: 0.7, gain: 0.08 * g, a: 0.002, rv: 0.7 });
    osc({ f0: mtof(m) * 2, t, dur: 0.4, gain: 0.03 * g, a: 0.002, rv: 0.7 });
  };
  /** Glissando harpa naik. */
  const gliss = (t, scale, base, n, span, g = 1) => {
    for (let i = 0; i < n; i++) pluck(t + (i * span) / n, base + semisOf(scale, [0, 1, 2, 4, 5, 7, 8, 9, 11, 12][i % 10]), g);
  };
  const glitchHit = (t, pow) => {
    hiss({ t, dur: 0.035, f0: 1500 + Math.random() * 7500, type: 'bandpass', q: 4, gain: 0.25 * pow });
    osc({ type: 'square', f0: 900 + Math.random() * 2600, t, dur: 0.03, gain: 0.05 * pow, a: 0.001, rv: 0.1 });
  };
  const crash = (t, dur, g) => hiss({ t, dur, f0: 6000, type: 'highpass', q: 0.5, gain: g, rv: 0.7 });
  const boom = (t, size = 1) => {
    osc({ f0: 130, f1: 28, t, dur: 0.9 * size + 0.3, gain: 1.0, a: 0.002 });
    hiss({ t, dur: 0.9 * size + 0.3, f0: 7000, f1: 100, type: 'lowpass', q: 0.7, gain: 0.7, rv: 0.5 });
  };
  /** "Shing": denting logam tebasan (partial tak-harmonik tinggi + desis). */
  const shing = (t, base = 2400) => {
    [[1, 0.5, 0.9], [2.76, 0.35, 0.6], [5.4, 0.25, 0.4], [8.93, 0.15, 0.3], [13.3, 0.1, 0.2]].forEach(([r, g, d]) => osc({ f0: base * r, t, dur: d, gain: 0.08 * g, a: 0.001, rv: 0.6 }));
    hiss({ t, dur: 0.22, f0: 7000, f1: 12000, type: 'highpass', gain: 0.4, rv: 0.3 });
  };
  /** Kilau lonceng acak yang jatuh seperti debu bintang. */
  const sparkle = (t, plan, n, span) => {
    for (let i = 0; i < n; i++) bell(t + Math.random() * span, Math.min(100, plan.root + 48 + semisOf(plan.scale, (Math.random() * 12) | 0)), 0.4 + Math.random() * 0.5, 1.2);
  };

  /** Tebasan: sapuan noise + nada naik + desir "surgawi", berhenti TEPAT di momen impact. */
  function swoosh(t, dur) {
    hiss({ t, dur, f0: 600, f1: 9000, type: 'bandpass', q: 1.5, gain: 0.6, rise: true, rv: 0.3 });
    osc({ type: 'sawtooth', f0: 260, f1: 3200, t, dur, gain: 0.08, a: dur * 0.6, lp: 1500, lp1: 9000 });
    osc({ f0: 800, f1: 3200, t, dur, gain: 0.05, a: dur * 0.7, rv: 0.8 });
  }

  /** DROP: shing + dentuman + choir surgawi + kilau lonceng. */
  function impact(t, plan) {
    shing(t);
    kick(t, 1);
    boom(t, 1.0);
    crash(t, 1.2, 0.3);
    choir(t, plan.chord0, 1.3, 1.0, 1);
    bell(t, Math.min(96, plan.root + 60), 1, 1.8);
    sparkle(t + 0.05, plan, 6, 0.6);
  }

  /** SLAM: hantaman final saat layar menutup. */
  function final(t, plan) {
    shing(t, 3000);
    kick(t, 1);
    boom(t, 1.5);
    crash(t, 1.8, 0.4);
    choir(t, plan.chordF, 1.6, 1.15, 1);
    [72, 79, 84, 88, 91].forEach((m, i) => bell(t + 0.03 * i, plan.root + m - 36, 0.9, 1.8));
    sparkle(t + 0.05, plan, 10, 0.9);
  }

  /* ----- Jadwal beat (semua waktu mengikuti plan) -----
     Dijadwalkan BERTAHAP (lookahead): bagian 1 langsung, bagian 2 dan 3 dibuat 150 / 450 ms kemudian.
     Waktu bunyinya tetap absolut di jam AudioContext (tI + t), jadi sinkron dengan visual; yang dipecah
     hanya pembuatan node supaya tidak ada hitch di momen tebasan. */

  function schedule(plan, tI) {
    const { hits, beat } = plan;
    echo.delayTime.setValueAtTime(beat * 0.75, Math.max(0, tI - 0.3));

    const duckAt = (t) => {
      duck.gain.setValueAtTime(0.25, t);
      duck.gain.linearRampToValueAtTime(1, t + beat * 0.4);
    };

    /** Semua yang jatuh pada [a, b) detik dari impact. */
    const part = (a, b, first) => {
      if (!ctx) return;                                    // ditutup sebelum bagian ini sempat dibuat
      const inR = (h) => h.t >= a && h.t < b;
      if (first) { swoosh(tI - 0.14, 0.14); impact(tI, plan); duckAt(tI); }
      hits.kick.filter(inR).forEach((h) => { kick(tI + h.t, h.pow); duckAt(tI + h.t); });
      hits.clap.filter(inR).forEach((h) => clap(tI + h.t));
      hits.hat.filter(inR).forEach((h) => hat(tI + h.t, h.open));
      hits.bass.filter(inR).forEach((h) => bass(tI + h.t, h.m, h.dur));
      hits.bell.filter(inR).forEach((h) => bell(tI + h.t, h.m, h.g, 0.9));
      hits.glitch.filter(inR).forEach((h) => glitchHit(tI + h.t, h.pow));
      hits.choir.filter(inR).forEach((h) => choir(tI + h.t, h.notes, h.dur, 0.8, 2));
      hits.roll.filter(inR).forEach((h) => hiss({ t: tI + h.t, dur: 0.1, f0: 2200, type: 'bandpass', q: 0.8, gain: 0.5 * h.pow, rv: 0.25 }));
      if (plan.riserFrom >= a && plan.riserFrom < b) {     // riser celestial menuju SLAM: shimmer naik + noise
        const rs = tI + plan.riserFrom, rd = plan.total - plan.riserFrom;
        hiss({ t: rs, dur: rd, f0: 500, f1: 10000, type: 'highpass', q: 0.8, gain: 0.45, rise: true, rv: 0.35 });
        osc({ f0: 400, f1: 3200, t: rs, dur: rd, gain: 0.07, a: rd * 0.85, rv: 0.7 });
        osc({ f0: 800, f1: 6400, t: rs, dur: rd, gain: 0.04, a: rd * 0.85, rv: 0.7 });
      }
      if (b === Infinity) final(tI + plan.total, plan);    // SLAM
    };

    pending.forEach(clearTimeout);
    part(0, 0.5, true);
    pending = [
      setTimeout(() => part(0.5, 1.0, false), 150),
      setTimeout(() => part(1.0, Infinity, false), 450),
    ];
  }

  /* ----- Charge-up CELESTIAL (selama tombol ditahan) -----
     Paduan suara tanpa kata yang naik tangga nada pentatonik (vokal "ooh" -> "aah"), shimmer oktaf/kuint
     bergetar, sub yang membengkak, napas udara, dan kilau lonceng acak yang makin sering. */

  function chargeStart() {
    if (!isEnabled() || !init()) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch { /* abaikan */ }
    chargeEnd(true);
    const scale = SCALES[(Math.random() * SCALES.length) | 0], pc = (Math.random() * 12) | 0;
    key = { scale, pc };
    const base = 50 + ((((pc - 50) % 12) + 12) % 12);       // nada dasar 50..61
    const t = ctx.currentTime;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.08, t + 0.1);
    out.connect(drum);
    const rvs = ctx.createGain();
    rvs.gain.value = 0.6;
    out.connect(rvs); rvs.connect(send);

    const sum = ctx.createGain(), vox = ctx.createGain();
    vox.gain.value = 1;
    const forms = [2.2, 1.1, 0.55].map((gv) => {
      const b = ctx.createBiquadFilter(), g = ctx.createGain();
      b.type = 'bandpass'; b.frequency.value = 350; b.Q.value = 9; g.gain.value = gv;
      sum.connect(b); b.connect(g); g.connect(vox);
      return { b, g };
    });
    vox.connect(out);

    const lfo = ctx.createOscillator();                      // vibrato halus ala penyanyi
    lfo.frequency.value = 5.2;
    const lg = ctx.createGain();
    lg.gain.value = 6;
    lfo.connect(lg);
    const f0 = mtof(base);
    const oscs = [-10, 0, 10].map((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f0; o.detune.value = d;
      o.connect(sum); lg.connect(o.detune); o.start(t);
      return o;
    });

    // shimmer: oktaf + kuint di atas, bergetar (tremolo)
    const shg = ctx.createGain();
    shg.gain.value = 0.03;
    shg.connect(out);
    const tre = ctx.createOscillator();
    tre.frequency.value = 4.5;
    const tg = ctx.createGain();
    tg.gain.value = 0.02;
    tre.connect(tg); tg.connect(shg.gain);
    const shs = [2, 3].map((r) => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f0 * r; o.connect(shg); o.start(t);
      return o;
    });
    const sub = ctx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = f0 / 2;
    const sg = ctx.createGain();
    sg.gain.value = 0.45;
    sub.connect(sg); sg.connect(out); sub.start(t);

    const nz = ctx.createBufferSource();                     // napas udara
    nz.buffer = noise; nz.loop = true;
    const nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    nf.type = 'bandpass'; nf.frequency.value = 4500; nf.Q.value = 0.8; ng.gain.value = 0.0;
    nz.connect(nf); nf.connect(ng); ng.connect(out); nz.start(t);

    lfo.start(t); tre.start(t);
    ch = { out, forms, oscs, shs, shg, sub, nz, ng, lfo, tre, lg, base, scale, q: 0, timer: 0 };
    // kilau lonceng acak, makin sering seiring charge
    ch.timer = setInterval(() => {
      if (!ch || !ctx) return;
      if (Math.random() < 0.18 + 0.5 * ch.q) {
        const i = 4 + ((Math.random() * (CHARGE_DEG.length - 4)) | 0);
        bell(ctx.currentTime, Math.min(100, base + 12 + semisOf(scale, CHARGE_DEG[i])), 0.35 + 0.4 * ch.q, 1.0);
      }
    }, 120);
  }

  /** q = 0..1 progres charge: nada naik tangga pentatonik, vokal membuka, shimmer & volume ikut naik. */
  function chargeSet(q) {
    if (!ch || !ctx) return;
    ch.q = q;
    const t = ctx.currentTime, idx = Math.min(CHARGE_DEG.length - 1, Math.floor(q * (CHARGE_DEG.length - 0.01)));
    const f = mtof(ch.base + semisOf(ch.scale, CHARGE_DEG[idx]));
    ch.oscs.forEach((o) => o.frequency.setTargetAtTime(f, t, 0.06));      // portamento halus antar nada
    ch.sub.frequency.setTargetAtTime(f / 2, t, 0.06);
    ch.shs.forEach((o, i) => o.frequency.setTargetAtTime(f * (2 + i), t, 0.06));
    const F = [[350, 800], [870, 1150], [2250, 2900]];                    // "ooh" -> "aah"
    ch.forms.forEach((fm, i) => fm.b.frequency.setTargetAtTime(F[i][0] + (F[i][1] - F[i][0]) * q, t, 0.08));
    ch.shg.gain.setTargetAtTime(0.03 + 0.1 * q, t, 0.06);
    ch.ng.gain.setTargetAtTime(0.01 + 0.06 * q * q, t, 0.1);
    ch.lfo.frequency.setTargetAtTime(5 + 2 * q, t, 0.1);
    ch.lg.gain.setTargetAtTime(6 + 14 * q, t, 0.1);
    ch.out.gain.setTargetAtTime(0.06 + 0.2 * q, t, 0.06);
  }

  /** Penanda tahap: 33% glissando harpa, 66% harpa + choir, 100% akor choir penuh + lonceng ("siap"). */
  function ping(stage) {
    if (!ctx || !isEnabled() || !ch) return;
    const t = ctx.currentTime, st = Math.min(3, Math.max(1, stage)), base = ch.base + 12, scale = ch.scale;
    if (st === 1) gliss(t, scale, base, 6, 0.18, 0.9);
    else if (st === 2) {
      gliss(t, scale, base, 9, 0.24, 1);
      choir(t + 0.05, [0, 2, 4].map((d) => ch.base + semisOf(scale, d)), 0.9, 0.6, 2);
    } else {
      choir(t, [0, 2, 4, 7].map((d) => ch.base + semisOf(scale, d)), 1.2, 1, 1);
      [0, 2, 4, 7].forEach((d, i) => bell(t + 0.04 * i, base + 12 + semisOf(scale, d), 0.9, 1.6));
      hiss({ t, dur: 0.5, f0: 3000, f1: 9000, type: 'highpass', gain: 0.22, rv: 0.4 });
    }
  }

  function chargeEnd(quick = false) {
    if (!ch || !ctx) { ch = null; return; }
    const c0 = ch;
    ch = null;
    clearInterval(c0.timer);
    const t = ctx.currentTime;
    try {
      c0.out.gain.cancelScheduledValues(t);
      c0.out.gain.setTargetAtTime(0.0001, t, quick ? 0.01 : 0.03);
    } catch { /* abaikan */ }
    setTimeout(() => {
      try {
        c0.oscs.forEach((o) => o.stop()); c0.shs.forEach((o) => o.stop());
        c0.sub.stop(); c0.nz.stop(); c0.lfo.stop(); c0.tre.stop();
        c0.out.disconnect();
      } catch { /* sudah berhenti */ }
    }, 250);
  }

  /* ----- API ----- */

  /** Plan baru; nada & tangga nada mengikuti charge-up supaya terdengar menyambung. */
  const plan = (power = 1) => buildPlan((Math.random() * 2147483647) | 0, power, key);

  /** Jadwalkan seluruh beat. Momen impact jatuh `leadSec` detik dari sekarang (waktu AudioContext). */
  function play(p, leadSec = 0.14) {
    if (!isEnabled() || !init()) return null;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch { /* abaikan */ }
    const tI = ctx.currentTime + leadSec;
    schedule(p, tI);
    const lat = Math.min(0.25, (ctx.outputLatency || 0) + (ctx.baseLatency || 0));
    return { latency: lat, tImpact: tI };
  }

  function close() {
    dead = true;
    pending.forEach(clearTimeout);
    pending = [];
    chargeEnd(true);
    if (!ctx) return;
    const c = ctx;
    ctx = null;
    setTimeout(() => { try { c.close(); } catch { /* abaikan */ } }, 4500); // biarkan ekor suara selesai
  }

  return { plan, play, chargeStart, chargeSet, chargeEnd, ping, close };
}