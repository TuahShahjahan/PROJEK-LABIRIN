/* ===== KRUSKAL + DISJOINT SET UNION ===== */
function kruskal(nodes, edges) {
    const p = {}; nodes.forEach(n => p[n.id] = n.id);
    const find = x => p[x] === x ? x : (p[x] = find(p[x]));
    const steps = []; let tot = 0;
    [...edges].sort((x, y) => x.w - y.w || x.id.localeCompare(y.id)).forEach(e => {
        const ra = find(e.a), rb = find(e.b);
        if (ra !== rb) { p[ra] = rb; tot += e.w; steps.push({ e, ok: true, tot }) } else steps.push({ e, ok: false, tot })
    });
    return { steps, tot }
}
