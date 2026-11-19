/* ===== KONFIGURASI GAME =====
   Semua angka "ajaib" dikumpulkan di sini supaya mudah diubah. */

export const TILE_SIZE = 36; // ukuran 1 tile di canvas (px)

// Kecepatan jalan = ms per tile
export const SPEEDS = [
  { label: 'LAMBAT', ms: 190 },
  { label: 'NORMAL', ms: 130 },
  { label: 'CEPAT', ms: 80 },
];

// Vektor gerak untuk tiap arah: u = atas, d = bawah, l = kiri, r = kanan
export const DIRECTIONS = {
  u: [0, -1],
  d: [0, 1],
  l: [-1, 0],
  r: [1, 0],
};
export const OPPOSITE = { u: 'd', d: 'u', l: 'r', r: 'l' };

// Tombol keyboard -> arah
export const KEY_MAP = {
  ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r',
  w: 'u', s: 'd', a: 'l', d: 'r',
  W: 'u', S: 'd', A: 'l', D: 'r',
};

// Budget awal = bobot MST + margin (30% dari MST, minimal 6)
export const BUDGET_MARGIN_RATIO = 0.3;
export const BUDGET_MARGIN_MIN = 6;

// Aturan skor
export const SCORE = {
  base: 1000,
  perExtraWeight: 25, // pengurang per bobot selisih dari MST
  perHint: 50,        // pengurang per petunjuk
  twoStarRatio: 1.25, // bobot <= MST x 1.25 -> 2 bintang
};
