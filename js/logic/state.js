/* ===== STATE GAME =====
   `state`   : data satu permainan (null saat di menu)
   `session` : total poin yang dikumpulkan selama halaman terbuka
   `hooks`   : callback ke UI, diisi oleh main.js supaya logika
               tidak perlu mengimpor kode UI. */
import { BUDGET_MARGIN_DEFAULT, BUDGET_MARGIN_MIN } from '../data/config.js';
import { buildGraph } from './graph.js';
import { prim } from './prim.js';

export const game = {
  state: null,        // lihat createState()
  levelIndex: 0,      // -1 = level acak
  character: 'snorlax',
  stepMs: 130,        // kecepatan jalan (ms per tile)
};

export const session = { balls: 0, coins: 0 };

export const hooks = {
  change() { },        // state berubah -> perbarui tampilan
  message(html) { },   // tampilkan pesan di panel
  finish(win) { },     // permainan selesai
};

/** Buat state baru dari data level. Mengembalikan null jika graph tidak terhubung. */
export function createState(level) {
  const g = buildGraph(level);
  const mst = prim(g.nodes, g.edges);
  if (!mst) return null;

  const start = g.by[level.start || g.nodes[0].id];
  start.vis = true;

  const margin = level.margin ?? BUDGET_MARGIN_DEFAULT;
  const budgetMax = mst.tot + Math.max(BUDGET_MARGIN_MIN, Math.round(mst.tot * margin));

  return {
    level, g, mst,
    budgetMax, budget: budgetMax, used: 0,
    hints: 0, bounces: 0, hint: null, showDist: false,
    // posisi & animasi pemain
    px: start.x, py: start.y, dir: 'd',
    last: start.id,   // node tempat pemain terakhir berdiri
    mv: null,         // langkah yang sedang dianimasikan
    steps: [],        // antrean langkah
    route: [],        // rute otomatis (klik node)
    pend: null,       // perintah arah yang menunggu
    // efek visual
    trail: [], fx: [], pop: null, flash: null,
    over: false,
  };
}
