/* ===== GAME STATE ===== */
let STEP = 130; const TS = 36, DIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
let S = null, lvIdx = 0, krTimer = null;
const $ = id => document.getElementById(id), cv = $('cv'), cx = cv.getContext('2d');
function newGame(i, cfg) { // i = indeks level; cfg = level kustom (level acak)
    lvIdx = i; const c = cfg || LEVELS[i], g = buildGraph(c), a = g.by[c.start || g.nodes[0].id]; a.vis = true;
    const k = kruskal(g.nodes, g.edges), bm = k.tot + Math.max(6, Math.round(k.tot * .3)); // budget = MST + margin
    clearInterval(krTimer);
    S = {
        c, g, k, budgetMax: bm, budget: bm, used: 0, hints: 0, bounces: 0, hint: null, showDist: true, px: a.x, py: a.y, dir: 'd', mv: null, steps: [], route: [], pend: null,
        last: a.id, over: false, fx: [], trail: [], pop: null, flash: null, krRun: false, krDone: false
    };
    cv.width = g.W * TS; cv.height = g.H * TS; $('lname').textContent = c.name;
    $('log').innerHTML = '<p>Tekan tombol untuk melihat Kruskal memilih edge dari bobot terkecil.</p>';
    $('hmsg').textContent = '';
    $('kr').disabled = false; $('hint').disabled = false; $('lobby').style.display = 'none'; $('game').style.display = 'flex'; $('ov').style.display = 'none'; ui()
}
