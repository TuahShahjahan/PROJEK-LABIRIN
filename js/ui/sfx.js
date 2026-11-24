
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

/* ===== EFEK NOISE ===== */

let noiseBuf = null;

/** Noise berfilter (sapuan angin / gesekan rem). from -> to = sapuan frekuensi filter. */
function noise(dur, { type = 'bandpass', from = 1000, to = from, q = 1, vol = 0.05, delay = 0 } = {}) {
  const c = audio(), t = c.currentTime + delay;

  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);

    for (let i = 0; i < d.length; i++) {
      d[i] = Math.random() * 2 - 1;
    }
  }

  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;

  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  src.connect(f);
  f.connect(g);
  g.connect(c.destination);

  src.start(t);
  src.stop(t + dur);
}

/** Bungkus supaya masalah audio tidak pernah merusak game. */
const safe = (fn) => (...args) => {
  try {
    fn(...args);
  } catch (e) {
    /* abaikan */
  }
};

/* ===== DAFTAR EFEK SUARA ===== */

export const sfx = {

  // Tombol menu (START, CARA MAIN, PENGATURAN)
  click: safe(() => {
    tone(520, 0.05, { vol: 0.05 });
    tone(780, 0.07, { vol: 0.05, delay: 0.05 });
  }),

  // Langkah: kiri-kanan bergantian supaya terasa seperti berjalan
  step: safe(() => {
    footLeft = !footLeft;
    tone(footLeft ? 190 : 150, 0.05, { vol: 0.03 });
  }),

  // Mendapatkan Poké Ball
  pickup: safe(() => {
    tone(988, 0.08);
    tone(1319, 0.2, { delay: 0.08 });
  }),

  // Menabrak tembok
  wall: safe(() => {
    tone(130, 0.12, {
      type: 'square',
      vol: 0.07,
      slide: -50
    });
  }),

  // Kalah
  lose: safe(() => {
    [392, 330, 262, 196].forEach((f, i) =>
      tone(f, 0.22, {
        type: 'triangle',
        vol: 0.1,
        delay: i * 0.18
      })
    );
  }),

  // Easter egg Pikachu Dash: mulai berlari cepat
  // Sapuan angin + sengatan listrik acak
  dash: safe(() => {
    noise(0.26, {
      type: 'bandpass',
      from: 500,
      to: 4200,
      q: 1.2,
      vol: 0.05
    });

    tone(180, 0.22, {
      type: 'sawtooth',
      vol: 0.04,
      slide: 700
    });

    for (let i = 0; i < 7; i++) {
      tone(
        900 + Math.random() * 2200,
        0.03,
        {
          type: 'sawtooth',
          vol: 0.035,
          delay: i * 0.03
        }
      );
    }
  }),

  // Easter egg Pikachu Dash: rem di titik tujuan
  // Gesekan + hentakan + sisa listrik
  brake: safe(() => {
    noise(0.22, {
      type: 'lowpass',
      from: 2400,
      to: 300,
      q: 0.7,
      vol: 0.09
    });

    tone(150, 0.14, {
      type: 'square',
      vol: 0.07,
      slide: -90
    });

    tone(70, 0.18, {
      type: 'sine',
      vol: 0.09,
      slide: -30
    });

    for (let i = 0; i < 3; i++) {
      tone(
        1400 + Math.random() * 1800,
        0.025,
        {
          type: 'sawtooth',
          vol: 0.03,
          delay: 0.02 + i * 0.035
        }
      );
    }
  }),

  // Menang
  win: safe(() => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.16, { delay: i * 0.13 })
    );

    tone(1319, 0.4, { delay: 0.52 });
  }),

};
