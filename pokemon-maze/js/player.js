/* ===== PLAYER: membangun pohon rentang (spanning tree) edge demi edge =====
   Satu tekanan arah = menyusuri SATU edge (koridor) dari node tempat berdiri:
   - edge baru ke node belum dikunjungi -> dipasang ke pohon, biaya 1 budget per tile (= bobot edge)
   - edge yang sudah ada di pohon        -> boleh dilewati lagi GRATIS (untuk pindah cabang)
   - edge ke node yang sudah terhubung   -> membentuk SIKLUS: ditolak, pemain terpental balik (gratis)
   Tidak ada lagi "terjebak di dead-end": mundur lewat pohon tidak memakai budget. */
const OPP = { u: 'd', d: 'u', l: 'r', r: 'l' };
const busy = () => S.mv || S.steps.length;
const curNode = () => S.g.by[S.last];
function popup(text, ts) { S.pop = { t0: ts || performance.now(), x: S.px, y: S.py, text } }
function edgeFrom(n, d) { const o = S.g.out[n.id][d]; return o ? { e: o.e, to: S.g.by[o.to] } : null }
function treePath(a, b) { // jalur node-ke-node lewat edge yang sudah dipasang (BFS)
    const prev = { [a]: null }, q = [a];
    while (q.length) {
        const x = q.shift(); if (x === b) break;
        S.g.edges.forEach(e => { if (!e.claimed) return; const y = e.a === x ? e.b : e.b === x ? e.a : null; if (y && !(y in prev)) { prev[y] = x; q.push(y) } })
    }
    const p = []; for (let x = b; x != null; x = prev[x])p.push(x); return p.reverse()
}
function command(d) {
    if (!S || S.over) return; S.route = []; // input manual membatalkan jalan otomatis
    if (busy()) { S.pend = d; return }
    go(d)
}
function go(d) {
    const n = curNode(), r = edgeFrom(n, d); S.dir = d;
    if (!r) { popup('Tembok!'); return }
    const { e, to } = r, w = e.w, [dx, dy] = DIR[d], kind = e.claimed ? 'free' : to.vis ? 'cycle' : 'claim';
    if (kind === 'claim' && S.budget < w) { popup('Budget kurang!'); return }
    const st = [], n1 = kind === 'cycle' ? w - 1 : w; let x = n.x, y = n.y;
    for (let i = 0; i < n1; i++) { st.push({ fx: x, fy: y, tx: x + dx, ty: y + dy, cost: kind === 'claim' ? 1 : 0, claim: kind === 'claim', dir: d, fast: kind === 'free' }); x += dx; y += dy }
    if (kind === 'cycle') { // menabrak: ujung edge adalah node yang sudah terhubung -> terpental
        st.push({ pop: 'SIKLUS!', edge: e, from: n.id, to: to.id });
        for (let i = 0; i < n1; i++) { st.push({ fx: x, fy: y, tx: x - dx, ty: y - dy, cost: 0, dir: OPP[d], fast: true }); x -= dx; y -= dy }
    }
    else st.push({ arrive: to.id, edge: e, kind });
    S.steps = st
}
function arrive() { // satu tile selesai
    const m = S.mv; S.px = m.tx; S.py = m.ty; S.mv = null;
    if (m.cost) { S.used += m.cost; S.budget -= m.cost }
    if (m.claim) S.trail.push([m.fx, m.fy, m.tx, m.ty]);
    hud(); ui()
}
function finishEdge(s) { // tiba di ujung edge
    const to = S.g.by[s.arrive], e = s.edge;
    if (s.kind === 'claim') { e.claimed = true; to.vis = true; TB++; S.fx.push({ x: to.x, y: to.y, t0: performance.now() }) }
    S.last = to.id;
    if (S.hint) { if (S.hint.e.claimed || S.g.by[S.hint.v].vis) S.hint = null; else refreshHint() }
    $('hmsg').innerHTML = S.hint ? S.hint.msg : '';
    hud(); ui();
    if (S.g.nodes.every(n => n.vis)) finish(true);
    else if (!S.g.edges.some(x => S.g.by[x.a].vis !== S.g.by[x.b].vis && x.w <= S.budget)) finish(false)
}
function pump(ts) { // jalankan antrean langkah; saat diam, jalankan perintah tertunda / auto-travel
    while (!S.mv && S.steps.length) {
        const s = S.steps.shift();
        if (s.pop) {
            popup(s.pop, ts); S.flash = { id: s.edge.id, t0: ts }; s.edge.blocked = true; S.bounces++;
            $('hmsg').innerHTML = '<b>Siklus!</b> Edge ' + s.from + '–' + s.to + ' menghubungkan dua node yang sudah terhubung di pohonmu, jadi ditolak (sama seperti Kruskal menolak edge yang membentuk cycle). Snorlax terpental, budget tidak berkurang.'; ui(); continue
        }
        if (s.arrive) { finishEdge(s); if (S.over) return; continue }
        s.t0 = ts; s.dur = s.fast ? STEP * .55 : STEP; S.mv = s; S.dir = s.dir
    }
    if (!S.mv && !S.steps.length && !S.over) {
        if (S.pend) { const d = S.pend; S.pend = null; go(d) }
        else if (S.route.length) { const id = S.route.shift(), a = curNode(), b = S.g.by[id]; go(b.x > a.x ? 'r' : b.x < a.x ? 'l' : b.y > a.y ? 'd' : 'u') }
    }
}
function travelTo(id) { // klik node yang sudah terhubung -> jalan otomatis lewat pohon (gratis)
    if (S.over || busy() || id === S.last) return;
    if (!S.g.by[id].vis) { popup('Belum terhubung'); return }
    S.route = treePath(S.last, id).slice(1)
}
