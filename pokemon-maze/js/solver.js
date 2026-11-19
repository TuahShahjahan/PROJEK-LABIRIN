/* ===== SOLVER: jarak terpendek antar node (Floyd-Warshall) + rute optimal (DP bitmask) =====
   Tujuan pemain = kunjungi SEMUA node dengan total bobot minimum (tanpa harus kembali ke awal).
   MST memberi batas: bobot MST <= rute optimal <= 2 x bobot MST. */
function buildSolver(g) {
   const ids = g.nodes.map(n => n.id), N = ids.length, ix = {}; ids.forEach((k, i) => ix[k] = i);
   const INF = 1e9, d = [], nx = [];
   for (let i = 0; i < N; i++) { d.push(Array(N).fill(INF)); nx.push(Array(N).fill(-1)); d[i][i] = 0; nx[i][i] = i }
   g.edges.forEach(e => { const a = ix[e.a], b = ix[e.b]; d[a][b] = d[b][a] = e.w; nx[a][b] = b; nx[b][a] = a });
   for (let k = 0; k < N; k++)for (let i = 0; i < N; i++)for (let j = 0; j < N; j++)
      if (d[i][k] + d[k][j] < d[i][j]) { d[i][j] = d[i][k] + d[k][j]; nx[i][j] = nx[i][k] }
   const F = 1 << N, full = F - 1, rest = new Int32Array(F * N).fill(INF); // rest[mask*N+i] = sisa biaya minimum
   for (let m = full; m >= 1; m--)for (let i = 0; i < N; i++) {
      if (!(m & (1 << i))) continue;
      if (m === full) { rest[m * N + i] = 0; continue }
      let best = INF; for (let j = 0; j < N; j++) { if (m & (1 << j)) continue; const v = d[i][j] + rest[(m | 1 << j) * N + j]; if (v < best) best = v }
      rest[m * N + i] = best
   }
   const path = (i, j) => { const p = [i]; while (i !== j) { i = nx[i][j]; p.push(i) } return p };
   const next = (m, i) => { let bj = -1, bv = INF; for (let j = 0; j < N; j++) { if (m & (1 << j)) continue; const v = d[i][j] + rest[(m | 1 << j) * N + j]; if (v < bv) { bv = v; bj = j } } return bj };
   return {
      ids, ix, d, path, next, remaining: (m, i) => rest[m * N + i],
      // urutan node target + jalur lengkap rute optimal dari node awal
      route(s) {
         let m = 1 << s, i = s; const targets = [], full_ = [s];
         while (m !== full) { const j = next(m, i); targets.push(j); path(i, j).slice(1).forEach(x => full_.push(x)); m |= 1 << j; i = j }
         return { targets, nodes: full_ }
      }
   }
}
