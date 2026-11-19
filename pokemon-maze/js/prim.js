function prim(nodes, edges) {
    if (nodes.length === 0) {
        return { edges: [], tot: 0 };
    }

    const visited = new Set();
    const mst = [];
    let total = 0;

    visited.add(nodes[0].id);

    while (visited.size < nodes.length) {
        let best = null;

        edges.forEach(e => {
            const aVisited = visited.has(e.a);
            const bVisited = visited.has(e.b);

            if (aVisited !== bVisited) {
                if (
                    !best ||
                    e.w < best.w ||
                    (e.w === best.w && e.id < best.id)
                ) {
                    best = e;
                }
            }
        });

        if (!best) return null;

        mst.push(best);
        total += best.w;

        visited.add(
            visited.has(best.a) ? best.b : best.a
        );
    }

    return {
        edges: mst,
        tot: total
    };
}