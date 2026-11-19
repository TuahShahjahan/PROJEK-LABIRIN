/* ===== GRAPH REPRESENTATION ===== */
const DK = { '0,-1': 'u', '0,1': 'd', '-1,0': 'l', '1,0': 'r' };
function buildGraph(c) {
    const nodes = Object.entries(c.n).map(([id, [x, y]]) => ({ id, x, y, vis: false })), by = {}, out = {}; nodes.forEach(n => { by[n.id] = n; out[n.id] = {} });
    const grid = Array.from({ length: c.H }, () => Array(c.W).fill(0));
    const edges = c.e.map(s => {
        const a = by[s[0]], b = by[s[1]], w = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
        for (let i = 0; i <= w; i++)grid[a.y + dy * i][a.x + dx * i] = 1;
        const e = { id: s, a: s[0], b: s[1], w, st: null, cur: false, claimed: false };
        out[a.id][DK[dx + ',' + dy]] = { e, to: b.id }; out[b.id][DK[-dx + ',' + -dy]] = { e, to: a.id }; // dari node, arah mana -> edge mana
        return e
    });
    return { nodes, by, edges, grid, out, W: c.W, H: c.H }
}
