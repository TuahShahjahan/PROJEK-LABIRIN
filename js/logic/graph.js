/* ===== REPRESENTASI GRAPH =====
   Mengubah data level (levels.js) menjadi graph yang siap dipakai game. */

const DIR_BY_VECTOR = { '0,-1': 'u', '0,1': 'd', '-1,0': 'l', '1,0': 'r' };

export function buildGraph(level) {
  const nodes = Object.entries(level.n).map(([id, [x, y]]) => ({ id, x, y, vis: false }));
  const by = {};   // node berdasarkan id
  const out = {};  // out[idNode][arah] = { e: edge, to: idNodeTujuan }
  nodes.forEach((n) => { by[n.id] = n; out[n.id] = {}; });

  // grid[y][x] = 1 jika tile itu bagian dari koridor (jalan), 0 = pohon/tembok
  const grid = Array.from({ length: level.H }, () => Array(level.W).fill(0));

  const edges = level.e.map((id) => {
    const a = by[id[0]], b = by[id[1]];
    const w = Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // bobot = jumlah tile
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);

    for (let i = 0; i <= w; i++) grid[a.y + dy * i][a.x + dx * i] = 1;

    const edge = { id, a: a.id, b: b.id, w, st: null, cur: false, claimed: false, blocked: false };
    out[a.id][DIR_BY_VECTOR[`${dx},${dy}`]] = { e: edge, to: b.id };
    out[b.id][DIR_BY_VECTOR[`${-dx},${-dy}`]] = { e: edge, to: a.id };
    return edge;
  });

  return { nodes, by, edges, grid, out, W: level.W, H: level.H };
}
