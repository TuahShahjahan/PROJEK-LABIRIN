/* ===== EFEK SUARA =====
   Dibuat dengan Web Audio API, jadi tidak butuh file suara. */
let ctx = null;
let footLeft = true;

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Satu nada: frekuensi (Hz), durasi (detik), opsi { type, vol, delay, slide }. */
function tone(freq, dur, { type = 'square', vol = 0.08, delay = 0, slide = 0 } = {}) {
  const c = audio(), t = c.currentTime + delay;
  const osc = c.createOscillator(), gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

/** Bungkus supaya masalah audio tidak pernah merusak game. */
const safe = (fn) => (...args) => { try { fn(...args); } catch (e) { /* abaikan */ } };

export const sfx = {
  // tombol menu (START, CARA MAIN, PENGATURAN)
  click: safe(() => {
    tone(520, 0.05, { vol: 0.05 });
    tone(780, 0.07, { vol: 0.05, delay: 0.05 });
  }),
  // langkah: kiri-kanan bergantian supaya terasa seperti berjalan
  step: safe(() => {
    footLeft = !footLeft;
    tone(footLeft ? 190 : 150, 0.05, { vol: 0.03 });
  }),
  // dapat Poké Ball
  pickup: safe(() => {
    tone(988, 0.08);
    tone(1319, 0.2, { delay: 0.08 });
  }),
  // menabrak tembok
  wall: safe(() => {
    tone(130, 0.12, { type: 'square', vol: 0.07, slide: -50 });
  }),
  // kalah
  lose: safe(() => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.1, delay: i * 0.18 }));
  }),
  // menang
  win: safe(() => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { delay: i * 0.13 }));
    tone(1319, 0.4, { delay: 0.52 });
  }),
};