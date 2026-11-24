/* ===== AUDIO EPILOG · musik prosedural + efek suara =====
   Dibuat dengan Web Audio API (tanpa file). Musik dijadwalkan per "bar" 1 detik (120 BPM)
   dan suasananya berganti mengikuti adegan. Efek suara dipicu dari timeline visual.

   const A = createEpilogueAudio({ scenes, total });
   A.start() · A.tick(ms) tiap frame · A.sfx.<nama>() · A.fadeOut(s) · A.toggle() · A.close() */

const KEY = 'pokemon-maze:sound';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CH = (r, q) => [r, r + (q === 'm' ? 3 : 4), r + 7];

/* Suasana tiap adegan: progresi akor (ganti tiap 2 bar) + gaya */
const MOOD = [
  { mode: 'dark', prog: [CH(57, 'm'), CH(53, 'M')] },
  { mode: 'dawn', prog: [CH(60, 'M'), CH(55, 'M'), CH(57, 'm'), CH(53, 'M')] },
  { mode: 'adv', prog: [CH(52, 'm'), CH(60, 'M'), CH(55, 'M'), CH(62, 'M')] },
  { mode: 'cave', prog: [CH(57, 'm'), CH(53, 'M'), CH(60, 'M'), CH(55, 'M')] },
  { mode: 'beach', prog: [CH(62, 'M'), CH(57, 'M'), CH(59, 'm'), CH(55, 'M')] },
  { mode: 'night', prog: [CH(50, 'm'), CH(58, 'M'), CH(53, 'M'), CH(60, 'M')] },
  { mode: 'epic', prog: [CH(60, 'M'), CH(55, 'M'), CH(57, 'm'), CH(53, 'M')] },
];
const ARP = [[0, 1, 2, 1], [0, 2, 1, 2], [2, 1, 0, 1], [0, 1, 2, 2]];

function silent() {
  const api = { enabled: false, start() {}, tick() {}, fadeOut() {}, close() {}, toggle: () => false };
  api.sfx = new Proxy({}, { get: () => () => {} });
  return api;
}

export function createEpilogueAudio({ scenes, total }) {
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch { /* diblokir */ }
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return silent();
  let ctx;
  try { ctx = new AC(); } catch { return silent(); }

  const MASTER = 0.85;
  const master = ctx.createGain(); master.gain.value = on ? MASTER : 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
  const direct = ctx.createGain(), verb = ctx.createGain(), conv = ctx.createConvolver(), wet = ctx.createGain();
  wet.gain.value = 0.34;
  {
    const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    conv.buffer = buf;
  }
  direct.connect(comp); verb.connect(conv); conv.connect(wet); wet.connect(comp); comp.connect(master); master.connect(ctx.destination);
  const noiseBuf = (() => {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  })();

  const now = () => ctx.currentTime + 0.01;
  const route = (node, rv) => { node.connect(direct); if (rv > 0) { const s = ctx.createGain(); s.gain.value = rv; node.connect(s); s.connect(verb); } };
  const cleanup = (src, ...nodes) => { src.onended = () => { try { src.disconnect(); nodes.forEach((n) => n.disconnect()); } catch { /* sudah lepas */ } }; };

  function osc({ type = 'sine', f0, f1 = f0, t, dur, gain = 0.2, a = 0.005, rel = 0.08, detune = 0, rv = 0.2, lp = 0, lp1 = 0 }) {
    const o = ctx.createOscillator();
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain(), peak = Math.max(0.0002, gain), r = Math.min(rel, dur * 0.6), at = Math.min(a, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + at);
    g.gain.setValueAtTime(peak, t + Math.max(at, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = o, fl = null;
    if (lp) {
      fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 0.9;
      fl.frequency.setValueAtTime(lp, t);
      if (lp1 && lp1 !== lp) fl.frequency.exponentialRampToValueAtTime(lp1, t + dur);
      o.connect(fl); last = fl;
    }
    last.connect(g); route(g, rv);
    o.start(t); o.stop(t + dur + 0.05);
    cleanup(o, g, ...(fl ? [fl] : []));
  }

  function noise({ t, dur, f0, f1 = f0, type = 'bandpass', q = 1, gain = 0.3, a = 0.005, rv = 0.2, rise = false }) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(), peak = Math.max(0.0002, gain);
    g.gain.setValueAtTime(0.0001, t);
    if (rise) { g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.97); g.gain.setValueAtTime(0.0001, t + dur); }
    else { g.gain.exponentialRampToValueAtTime(peak, t + Math.min(a, dur * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    s.connect(fl); fl.connect(g); route(g, rv);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    cleanup(s, fl, g);
  }

  /* ---- Instrumen ---- */
  const kick = (t, g = 0.7) => { osc({ f0: 160, f1: 42, t, dur: 0.26, gain: g, a: 0.002, rel: 0.2, rv: 0 }); noise({ t, dur: 0.03, f0: 3000, type: 'highpass', gain: g * 0.25, rv: 0 }); };
  const snare = (t, g = 0.3) => { noise({ t, dur: 0.13, f0: 1800, q: 0.8, gain: g, rv: 0.25 }); osc({ type: 'triangle', f0: 230, f1: 110, t, dur: 0.1, gain: g * 0.7, rv: 0.1 }); };
  const hat = (t, g = 0.05) => noise({ t, dur: 0.04, f0: 8000, type: 'highpass', gain: g, rv: 0.05 });
  const tom = (t, f = 110, g = 0.5) => osc({ f0: f * 1.6, f1: f, t, dur: 0.3, gain: g, a: 0.002, rel: 0.2, rv: 0.2 });
  const bell = (t, m, g = 0.2, dur = 1.1) => { const f = mtof(m); osc({ f0: f, t, dur, gain: g, a: 0.003, rel: dur * 0.9, rv: 0.55 }); osc({ f0: f * 2.76, t, dur: dur * 0.5, gain: g * 0.3, a: 0.003, rel: dur * 0.4, rv: 0.55 }); osc({ f0: f * 2, t, dur: dur * 0.7, gain: g * 0.4, a: 0.003, rel: dur * 0.6, rv: 0.55 }); };
  const pluck = (t, m, g = 0.12) => { osc({ type: 'triangle', f0: mtof(m), t, dur: 0.5, gain: g, a: 0.003, rel: 0.4, rv: 0.35 }); osc({ f0: mtof(m) * 2, t, dur: 0.25, gain: g * 0.3, a: 0.003, rv: 0.35 }); };
  const lead = (t, m, dur = 0.22, g = 0.07) => osc({ type: 'square', f0: mtof(m), t, dur, gain: g, a: 0.004, rel: Math.min(0.08, dur * 0.5), rv: 0.2, lp: 2600 });
  const pad = (t, notes, dur, g = 0.04, type = 'triangle') => notes.forEach((m) => osc({ type, f0: mtof(m), t, dur, gain: g, a: 0.12, rel: 0.3, rv: 0.5, lp: type === 'sawtooth' ? 1500 : 0 }));
  const bass = (t, m, dur, g = 0.16) => osc({ type: 'sawtooth', f0: mtof(m), t, dur, gain: g, a: 0.006, rel: 0.06, rv: 0.05, lp: 420 });
  const brass = (t, m, dur = 0.5, g = 0.2) => [-9, 0, 9].forEach((d) => osc({ type: 'sawtooth', f0: mtof(m), t, dur, gain: g / 2.2, a: 0.02, rel: Math.min(0.15, dur * 0.5), detune: d, rv: 0.3, lp: 500, lp1: 2600 }));

  /* ---- Musik: satu bar (1 detik) ---- */
  function bar(t0, si, l) {
    const m = MOOD[si], ch = m.prog[Math.floor(l / 2) % m.prog.length], root = ch[0];
    const nBars = Math.round((scenes[si + 1] - scenes[si]) / 1000), lastBar = l === nBars - 1, first = l === 0;
    const E = 0.25;
    const arp = (inst, oct = 12, pat = ARP[l % 4]) => pat.forEach((ix, i) => inst(t0 + i * E, ch[ix] + oct));

    if (m.mode === 'dark') {
      pad(t0, ch.map((n) => n - 12), 1.1, 0.05);
      if (l % 2 === 0) bell(t0, ch[2] + 12, 0.12, 1.4);
      if (first) osc({ type: 'sawtooth', f0: mtof(33), f1: mtof(57), t: t0, dur: 3.2, gain: 0.12, a: 2.4, rel: 0.2, rv: 0.4, lp: 200, lp1: 1600 });
    } else if (m.mode === 'dawn') {
      pad(t0, ch, 1.1, 0.04);
      arp(pluck, 12);
      if (l % 2 === 0) bass(t0, root - 24, 1.8, 0.12);
      if (l % 4 === 0) bell(t0, ch[2] + 24, 0.1, 1.6);
    } else if (m.mode === 'adv') {
      pad(t0, ch, 1.1, 0.03);
      bass(t0, root - 24, 0.45); bass(t0 + 0.5, root - 12, 0.45, 0.12);
      kick(t0); kick(t0 + 0.5, 0.5); snare(t0 + 0.5, 0.2);
      for (let i = 0; i < 4; i++) hat(t0 + i * E, i % 2 ? 0.04 : 0.025);
      arp(lead, 12);
    } else if (m.mode === 'cave') {
      pad(t0, ch.map((n) => n - 12), 1.1, 0.05, 'sawtooth');
      osc({ type: 'sawtooth', f0: mtof(root - 24), t: t0, dur: 1.05, gain: 0.14, a: 0.05, rel: 0.2, rv: 0.2, lp: 260 });
      tom(t0, 70, 0.55); tom(t0 + 0.75, 95, 0.4);
      if (l % 2 === 0) brass(t0, root, 0.9, 0.16);
      if (l % 2 === 1) bell(t0 + 0.25, ch[1] + 24, 0.1, 1.2);
    } else if (m.mode === 'beach') {
      pad(t0, ch, 1.1, 0.03);
      bass(t0, root - 24, 0.4); bass(t0 + 0.5, root - 17, 0.4, 0.12);
      kick(t0); snare(t0 + 0.5, 0.18);
      for (let i = 0; i < 4; i++) hat(t0 + i * E, 0.035);
      arp((t, n) => pluck(t, n, 0.14), 12, [0, 2, 1, 2]);
      bell(t0 + 0.125, ch[2] + 24, 0.06, 0.5);
    } else if (m.mode === 'night') {
      pad(t0, ch, 1.1, 0.04);
      if (l % 2 === 0) bass(t0, root - 24, 1.9, 0.1);
      arp((t, n) => bell(t, n + 12, 0.07, 0.9), 12, [0, 1, 2, 1]);
      if (l >= 7) { kick(t0, 0.4 + (l - 7) * 0.08); if (l >= 8) snare(t0 + 0.5, 0.2); }
    } else {
      pad(t0, ch, 1.1, 0.045, 'sawtooth');
      bass(t0, root - 24, 0.45, 0.18); bass(t0 + 0.5, root - 24, 0.45, 0.14);
      kick(t0, 0.6); snare(t0 + 0.5, 0.2);
      for (let i = 0; i < 4; i++) hat(t0 + i * E, 0.04);
      arp(lead, 12);
      if (l % 2 === 0) brass(t0, ch[0] + 12, 0.8, 0.14);
      if (first) crash(t0, 1.6, 0.14);
      if (lastBar) { pad(t0, [60, 64, 67, 72], 2.6, 0.07); [84, 88, 91, 96].forEach((n, i) => bell(t0 + i * 0.1, n, 0.12, 2)); }
    }
  }
  function crash(t, dur, g) { noise({ t, dur, f0: 6000, type: 'highpass', q: 0.5, gain: g, rv: 0.5 }); }

  /* ---- Pompa jadwal musik (lookahead 1,6 dtk) ---- */
  let base = 0, nextBar = 0, started = false;
  const sceneOf = (ms) => { for (let i = scenes.length - 2; i >= 0; i--) if (ms >= scenes[i]) return i; return 0; };
  function start() { base = ctx.currentTime + 0.12; nextBar = 0; started = true; try { if (ctx.state === 'suspended') ctx.resume(); } catch { /* abaikan */ } }
  function tick(ms) {
    if (!started) return;
    while (base + nextBar < ctx.currentTime + 1.6 && nextBar * 1000 < total) {
      const ms0 = nextBar * 1000, si = sceneOf(ms0);
      try { bar(base + nextBar, si, Math.round((ms0 - scenes[si]) / 1000)); } catch { /* abaikan */ }
      nextBar++;
    }
    if (ms > total - 1400) { try { master.gain.setTargetAtTime(0, ctx.currentTime, 0.35); } catch { /* abaikan */ } }
  }

  /* ---- Efek suara ---- */
  const sfx = {
    chime() { const t = now(); [84, 88, 91].forEach((m, i) => bell(t + i * 0.05, m, 0.16, 0.9)); },
    wake() { const t = now(); osc({ type: 'triangle', f0: 110, f1: 230, t, dur: 0.45, gain: 0.25, rv: 0.2 }); noise({ t, dur: 0.3, f0: 400, f1: 900, gain: 0.12 }); },
    splash() { const t = now(); noise({ t, dur: 0.4, f0: 2200, f1: 600, gain: 0.35, rv: 0.3 }); for (let i = 0; i < 4; i++) osc({ f0: 500 + i * 180, f1: 1100 + i * 200, t: t + 0.05 + i * 0.07, dur: 0.08, gain: 0.08, rv: 0.3 }); },
    whoosh() { noise({ t: now(), dur: 0.3, f0: 400, f1: 4500, gain: 0.3, rise: true, rv: 0.2 }); },
    charge(ms = 1200) { const t = now(), d = ms / 1000; osc({ f0: 200, f1: 1800, t, dur: d, gain: 0.2, a: d * 0.8, rel: 0.03, rv: 0.3 }); osc({ type: 'sawtooth', f0: 90, f1: 500, t, dur: d, gain: 0.07, a: d * 0.8, rel: 0.03, lp: 400, lp1: 3000 }); noise({ t, dur: d, f0: 800, f1: 7000, gain: 0.18, rise: true, rv: 0.3 }); },
    zap() { const t = now(); for (let i = 0; i < 5; i++) osc({ type: 'sawtooth', f0: 1800 - i * 150, f1: 300, t: t + i * 0.03, dur: 0.08, gain: 0.12, rv: 0.2 }); },
    thunder() { const t = now(); noise({ t, dur: 0.12, f0: 3000, type: 'highpass', gain: 0.9, rv: 0.3 }); noise({ t, dur: 1.8, f0: 3500, f1: 90, type: 'lowpass', q: 0.7, gain: 0.8, rv: 0.5 }); osc({ f0: 120, f1: 28, t, dur: 1.2, gain: 0.7, a: 0.003, rel: 0.8, rv: 0 }); },
    boom(size = 1) { const t = now(); osc({ f0: 130, f1: 28, t, dur: 0.9 * size + 0.3, gain: 0.9, a: 0.003, rel: 0.6, rv: 0.05 }); osc({ type: 'triangle', f0: 220, f1: 50, t, dur: 0.4, gain: 0.45, rv: 0.1 }); noise({ t, dur: 0.7 * size + 0.2, f0: 4000, f1: 150, type: 'lowpass', gain: 0.6, rv: 0.35 }); },
    beam(ms = 1400) { const t = now(), d = ms / 1000; osc({ type: 'sawtooth', f0: 110, t, dur: d, gain: 0.2, a: 0.05, rel: 0.4, detune: 6, rv: 0.3, lp: 700, lp1: 3200 }); osc({ type: 'sawtooth', f0: 220, t, dur: d, gain: 0.12, a: 0.05, rel: 0.4, detune: -8, rv: 0.3, lp: 900, lp1: 4000 }); noise({ t, dur: d, f0: 1500, f1: 5000, gain: 0.3, a: 0.05, rv: 0.4 }); },
    water(ms = 1600) { const t = now(), d = ms / 1000; noise({ t, dur: d, f0: 2500, f1: 1800, q: 0.6, gain: 0.32, a: 0.08, rv: 0.3 }); for (let i = 0; i < 10; i++) osc({ f0: 500 + Math.random() * 800, f1: 1400 + Math.random() * 600, t: t + Math.random() * d, dur: 0.07, gain: 0.05, rv: 0.3 }); },
    steam() { const t = now(); noise({ t, dur: 1.2, f0: 5000, f1: 2500, type: 'highpass', q: 0.4, gain: 0.25, a: 0.1, rv: 0.4 }); },
    crackle(ms = 1000) { const t = now(); for (let i = 0; i < ms / 70; i++) noise({ t: t + Math.random() * (ms / 1000), dur: 0.03, f0: 1500 + Math.random() * 4000, q: 3, gain: 0.08, rv: 0.1 }); },
    star() { const t = now(); osc({ f0: 2600, f1: 500, t, dur: 0.7, gain: 0.07, a: 0.01, rv: 0.6 }); noise({ t, dur: 0.6, f0: 6000, f1: 2000, type: 'highpass', gain: 0.06, rv: 0.4 }); },
    node() { const t = now(); osc({ f0: 880, t, dur: 0.18, gain: 0.07, a: 0.003, rv: 0.4 }); osc({ f0: 1320, t: t + 0.05, dur: 0.22, gain: 0.05, a: 0.003, rv: 0.4 }); },
    combo() { const t = now(); noise({ t, dur: 0.9, f0: 400, f1: 9000, type: 'highpass', gain: 0.5, rise: true, rv: 0.4 }); [48, 55, 60, 64, 67, 72].forEach((m) => brass(t + 0.9, m, 1.4, 0.24)); },
    sunrise() { const t = now(); [72, 76, 79, 84, 88, 91].forEach((m, i) => bell(t + i * 0.14, m, 0.14, 2)); pad(t, [60, 64, 67, 72], 3.5, 0.05, 'sawtooth'); },
  };

  const api = {
    enabled: on, sfx, start, tick,
    fadeOut(sec = 0.4) { try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, sec / 4); } catch { /* abaikan */ } },
    close() { setTimeout(() => { try { ctx.close(); } catch { /* abaikan */ } }, 1200); },
    toggle() {
      on = !on; api.enabled = on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* abaikan */ }
      try { master.gain.setTargetAtTime(on ? MASTER : 0, ctx.currentTime, 0.02); } catch { /* abaikan */ }
      return on;
    },
  };
  return api;
}