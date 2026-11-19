/* ===== ALGORITMA PRIM =====
   Pohon dimulai dari 1 node, lalu terus menambah edge TERMURAH
   yang menghubungkan pohon ke node yang belum terhubung. */

/** Hitung MST. Hasil: { edges, tot } atau null jika graph tidak terhubung. */
export function prim(nodes, edges) {
  if (nodes.length === 0) return { edges: [], tot: 0 };

  const inTree = new Set([nodes[0].id]);
  const mst = [];
  let tot = 0;

  while (inTree.size < nodes.length) {
    const best = cheapestCrossingEdge(edges, (id) => inTree.has(id));
    if (!best) return null; // graph tidak terhubung

    mst.push(best);
    tot += best.w;
    inTree.add(inTree.has(best.a) ? best.b : best.a);
  }
  return { edges: mst, tot };
}

/** Edge termurah yang menyeberang antara "sudah terhubung" dan "belum". */
function cheapestCrossingEdge(edges, isInTree) {
  let best = null;
  for (const e of edges) {
    if (isInTree(e.a) === isInTree(e.b)) continue;
    if (!best || e.w < best.w || (e.w === best.w && e.id < best.id)) best = e;
  }
  return best;
}

/** Edge terbaik berikutnya menurut Prim, berdasarkan pohon buatan pemain. */
export const bestEdge = (g) => cheapestCrossingEdge(g.edges, (id) => g.by[id].vis);

/** Untuk tiap node yang belum terhubung: bobot edge termurah dari pohon (null = belum ada). */
export function candidateCosts(g) {
  const costs = {};
  g.nodes.forEach((n) => { if (!n.vis) costs[n.id] = null; });

  g.edges.forEach((e) => {
    const a = g.by[e.a], b = g.by[e.b];
    if (a.vis === b.vis) return;
    const target = a.vis ? b : a;
    if (costs[target.id] == null || e.w < costs[target.id]) costs[target.id] = e.w;
  });
  return costs;
}
