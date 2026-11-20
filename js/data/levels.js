/* ===== DATA LEVEL =====
   n     : node  -> { id: [x, y] }  (koordinat tile)
   e     : edge  -> ['AB', 'BC', ...] koridor lurus antar 2 node
   bobot : jumlah tile antar node (dihitung otomatis di graph.js)
   start : node tempat pemain mulai (default: node pertama)
   W, H  : lebar & tinggi peta dalam tile */
export const LEVELS = [
  {
    name: 'LEVEL 1 · BEGINNER', W: 15, H: 7,
    n: { A: [1, 1], B: [6, 1], C: [13, 1], D: [1, 5], E: [6, 5], F: [13, 5] },
    e: ['AB', 'BC', 'AD', 'BE', 'DE', 'CF', 'EF'],
  },
  {
    name: 'LEVEL 2 · INTERMEDIATE', W: 17, H: 11,
    n: { A: [1, 1], B: [5, 1], C: [11, 1], D: [15, 1], E: [1, 6], F: [5, 6], G: [11, 6], H: [15, 6], I: [5, 9] },
    e: ['AB', 'BC', 'CD', 'EF', 'FG', 'GH', 'AE', 'BF', 'CG', 'DH', 'FI'],
  },
  {
    name: 'LEVEL 3 · ADVANCED', W: 19, H: 13,
    n: { A: [1, 1], B: [6, 1], C: [10, 1], D: [17, 1], E: [1, 5], F: [6, 5], G: [10, 5], H: [17, 5], I: [1, 11], J: [6, 11], K: [10, 11] },
    e: ['AB', 'BC', 'CD', 'EF', 'FG', 'GH', 'IJ', 'JK', 'AE', 'EI', 'BF', 'FJ', 'CG', 'GK', 'DH'],
  },
  {
    name: 'LEVEL 4 · ADVANCE', start: 'D', W: 21, H: 13,
    n: { A: [1, 1], B: [8, 1], C: [19, 1], D: [8, 5], E: [14, 5], F: [19, 5], G: [1, 11], H: [8, 11], I: [14, 11], J: [19, 11] },
    e: ['AB', 'BC', 'BD', 'DE', 'EF', 'CF', 'DH', 'EI', 'FJ', 'GH', 'HI', 'IJ', 'AG'],
  },
  {
    name: 'LEVEL 5 · EXPERT', start: 'G', W: 23, H: 15,
    n: { A: [1, 1], B: [7, 1], C: [15, 1], D: [21, 1], E: [1, 6], F: [7, 6], G: [15, 6], H: [21, 6], I: [7, 13], J: [15, 13], K: [21, 13], L: [1, 13] },
    e: ['AB', 'BC', 'CD', 'EF', 'FG', 'GH', 'AE', 'BF', 'CG', 'DH', 'EL', 'FI', 'HK', 'LI', 'IJ', 'JK'],
  },
];

/* ===== LEVEL ACAK =====
   Node diletakkan pada grid (kolom x baris), lalu edge dipilih acak.
   Pohon rentang acak dibuat dulu supaya graph PASTI terhubung,
   baru ditambah edge lain secara acak. */
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

export function randomLevel() {
  const cols = rand(3, 4), rows = rand(2, 3);

  // Posisi tiap kolom / baris dengan jarak acak
  const xs = [1], ys = [1];
  for (let i = 1; i < cols; i++) xs.push(xs[i - 1] + rand(4, 7));
  for (let j = 1; j < rows; j++) ys.push(ys[j - 1] + rand(3, 5));

  const n = {}, ids = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const id = String.fromCharCode(65 + ids.length);
      ids.push(id);
      n[id] = [xs[i], ys[j]];
    }
  }

  // Semua kemungkinan edge antar tetangga (kanan & bawah)
  const candidates = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const id = ids[j * cols + i];
      if (i < cols - 1) candidates.push(id + ids[j * cols + i + 1]);
      if (j < rows - 1) candidates.push(id + ids[(j + 1) * cols + i]);
    }
  }

  // Union-Find sederhana untuk menjamin graph terhubung
  const parent = {};
  ids.forEach((id) => (parent[id] = id));
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));

  const edges = [];
  shuffle(candidates.slice()).forEach((e) => {
    const ra = find(e[0]), rb = find(e[1]);
    if (ra !== rb) { parent[ra] = rb; edges.push(e); }
    else if (Math.random() < 0.6) edges.push(e); // edge tambahan (membentuk siklus)
  });

  return {
    name: 'LEVEL ACAK',
    W: xs[cols - 1] + 2,
    H: ys[rows - 1] + 2,
    n,
    e: edges,
  };
}
