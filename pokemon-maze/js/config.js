/* ===== MAZE CONFIG (node = koordinat tile, edge = koridor lurus antar node, bobot = jumlah tile) =====
   start = node tempat pemain spawn (default node pertama). opt dihitung otomatis oleh solver.js.
   budget boleh dikosongkan: otomatis = 1.4 x rute optimal. */
const LEVELS = [
   {
      name: 'LEVEL 1 · BEGINNER', budget: 40, W: 15, H: 7,
      n: { A: [1, 1], B: [6, 1], C: [13, 1], D: [1, 5], E: [6, 5], F: [13, 5] }, e: ['AB', 'BC', 'AD', 'BE', 'DE', 'CF', 'EF']
   },
   {
      name: 'LEVEL 2 · INTERMEDIATE', budget: 52, W: 17, H: 11,
      n: { A: [1, 1], B: [5, 1], C: [11, 1], D: [15, 1], E: [1, 6], F: [5, 6], G: [11, 6], H: [15, 6], I: [5, 9] }, e: ['AB', 'BC', 'CD', 'EF', 'FG', 'GH', 'AE', 'BF', 'CG', 'DH', 'FI']
   },
   {
      name: 'LEVEL 3 · ADVANCED', budget: 60, W: 19, H: 13,
      n: { A: [1, 1], B: [6, 1], C: [10, 1], D: [17, 1], E: [1, 5], F: [6, 5], G: [10, 5], H: [17, 5], I: [1, 11], J: [6, 11], K: [10, 11] },
      e: ['AB', 'BC', 'CD', 'EF', 'FG', 'GH', 'IJ', 'JK', 'AE', 'EI', 'BF', 'FJ', 'CG', 'GK', 'DH']
   },
   {
      name: 'LEVEL 4 · SPAWN DI TENGAH', start: 'D', W: 21, H: 13,
      n: { A: [1, 1], B: [8, 1], C: [19, 1], D: [8, 5], E: [14, 5], F: [19, 5], G: [1, 11], H: [8, 11], I: [14, 11], J: [19, 11] },
      e: ['AB', 'BC', 'BD', 'DE', 'EF', 'CF', 'DH', 'EI', 'FJ', 'GH', 'HI', 'IJ', 'AG']
   },
   {
      name: 'LEVEL 5 · EXPERT', start: 'G', W: 23, H: 15,
      n: { A: [1, 1], B: [7, 1], C: [15, 1], D: [21, 1], E: [1, 6], F: [7, 6], G: [15, 6], H: [21, 6], I: [7, 13], J: [15, 13], K: [21, 13], L: [1, 13] },
      e: ['AB', 'BC', 'CD', 'EF', 'FG', 'GH', 'AE', 'BF', 'CG', 'DH', 'EL', 'FI', 'HK', 'LI', 'IJ', 'JK']
   }];
