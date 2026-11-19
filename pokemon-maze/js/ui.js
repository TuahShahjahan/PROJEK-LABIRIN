/* ===== UI + SCORING ===== */
function ui() {
   const g = S.g, v = g.nodes.filter(n => n.vis).length, N = g.nodes.length;
   $('sN').textContent = N; $('sV').textContent = v; $('sU').textContent = N - v; $('sM').textContent = Math.max(0, v - 1);
   $('sB').textContent = S.budget + ' / ' + S.budgetMax; $('sW').textContent = S.used; $('sT').textContent = S.k.tot;
   $('sP').textContent = S.bounces; $('bar').style.width = (S.budget / S.budgetMax * 100) + '%'; keyPanel()
}
/* key(n) = bobot edge termurah yang menyambung node n ke pohonmu (null = belum ada edge dari pohon) */
function keys() {
   const K = {}; S.g.nodes.forEach(n => { if (!n.vis) K[n.id] = null });
   S.g.edges.forEach(e => {
      const a = S.g.by[e.a], b = S.g.by[e.b];
      if (a.vis && !b.vis && (K[b.id] == null || e.w < K[b.id])) K[b.id] = e.w;
      if (b.vis && !a.vis && (K[a.id] == null || e.w < K[a.id])) K[a.id] = e.w
   }); return K
}
function bestEdge() {
   let best = null; // edge termurah yang melintasi batas (pohon <-> node baru): aman diambil (cut property)
   S.g.edges.forEach(e => { if (S.g.by[e.a].vis === S.g.by[e.b].vis) return; if (!best || e.w < best.w || (e.w === best.w && e.id < best.id)) best = e }); return best
}
function keyPanel() {
   const K = keys(), L = Object.entries(K).map(([id, k]) => ({ id, k })).sort((a, b) => (a.k == null) - (b.k == null) || a.k - b.k || a.id.localeCompare(b.id));
   const mk = L.length && L[0].k != null ? L[0].k : null;
   $('dl').innerHTML = L.length ? L.map(x => '<span class="' + (x.k != null && x.k === mk ? 'near' : '') + '"><b>' + x.id + '</b> ' + (x.k == null ? '–' : x.k) + '</span>').join('') : '<span>Semua node sudah terhubung</span>';
   $('dnote').textContent = mk != null ? 'Termurah sekarang: ' + L.filter(x => x.k === mk).map(x => x.id).join(', ') + ' (bobot ' + mk + '). “–” = belum ada edge dari pohonmu ke node itu.' : ''
}
function refreshHint() { if (S.hint) S.hint.path = treePath(S.last, S.hint.u).concat([S.hint.v]) }
function giveHint() {
   if (!S || S.over) return; const e = bestEdge(); if (!e) return;
   const u = S.g.by[e.a].vis ? e.a : e.b, v = u === e.a ? e.b : e.a; S.hints++;
   S.hint = { e, u, v, path: [], msg: '' }; S.hint.msg = '💡 Pasang edge <b>' + u + '–' + v + '</b> (bobot <b>' + e.w + '</b>): edge termurah yang menyambung pohonmu ke node baru dan tidak membentuk siklus. Petunjuk terpakai: ' + S.hints + ' (−50 skor/petunjuk).';
   refreshHint(); $('hmsg').innerHTML = S.hint.msg
}
function log(t) { const l = $('log'); l.insertAdjacentHTML('beforeend', '<p>' + t + '</p>'); l.scrollTop = l.scrollHeight }
function runKruskal() {
   if (S.krRun) return; S.krRun = true; S.g.edges.forEach(e => { e.st = null; e.cur = false });
   $('log').innerHTML = '<p><b>Urutkan edge dari bobot terkecil, lalu cek dengan Union-Find.</b></p>';
   let i = 0, phase = 0; const { steps } = S.k;
   krTimer = setInterval(() => {
      if (i >= steps.length) {
         clearInterval(krTimer); S.krRun = false; S.krDone = true;
         log('<b>Selesai: MST = ' + S.k.tot + ' dengan ' + (S.g.nodes.length - 1) + ' edge.</b>'); return
      }
      const s = steps[i], e = s.e;
      if (phase === 0) { e.cur = true; log('Cek edge ' + e.a + '–' + e.b + ' (bobot ' + e.w + ')…'); phase = 1 }
      else {
         e.cur = false; e.st = s.ok ? 'mst' : 'rej';
         log(s.ok ? '✔ Diterima: menghubungkan dua komponen. Total ' + s.tot : '✘ Ditolak: akan membentuk cycle'); phase = 0; i++
      }
   }, 550)
}
function instantKruskal() { clearInterval(krTimer); S.krRun = false; S.krDone = true; S.k.steps.forEach(s => { s.e.st = s.ok ? 'mst' : 'rej'; s.e.cur = false }) }
function finish(win) {
   S.over = true; S.mv = null; S.steps = []; S.route = []; S.pend = null; S.hint = null; instantKruskal(); $('kr').disabled = true; $('hint').disabled = true; $('hmsg').textContent = '';
   const u = S.used, t = S.k.tot, N = S.g.nodes, v = N.filter(n => n.vis).length, ex = u - t;
   const stars = !win ? 0 : u <= t ? 3 : u <= t * 1.25 ? 2 : 1, score = win ? Math.max(0, 1000 - 25 * ex - 50 * S.hints) : 0;
   const last = lvIdx >= LEVELS.length - 1; TC += stars; hud();
   $('ovc').innerHTML = '<h2 style="color:' + (win ? '#2e9b4a' : '#d9444d') + '">' + (win ? 'MENANG! ' + '★'.repeat(stars) + '☆'.repeat(3 - stars) : 'KALAH') + '</h2>' +
      '<p>' + (win ? (ex <= 0 ? 'Semua Poké Ball terhubung dengan pohon optimal: bobotnya sama dengan MST!' : 'Semua Poké Ball terhubung, tetapi pohonmu ' + ex + ' lebih berat dari MST.') : 'Budget tidak cukup untuk menyambung node yang tersisa.') + '</p>' +
      '<div class="cmp"><div>Bobot MST (target)<b>' + t + '</b></div><div>Bobot pohonmu<b>' + u + '</b></div>' +
      '<div>Selisih<b>' + (ex >= 0 ? '+' : '') + ex + '</b></div><div>Skor<b>' + score + '</b></div>' +
      '<div>Node terhubung<b>' + v + ' / ' + N.length + '</b></div><div>Siklus ditolak<b>' + S.bounces + '</b></div></div>' +
      '<p>Skor = maks(0, 1000 − 25 × selisih bobot − 50 × petunjuk (' + S.hints + ')). Di peta: garis hijau tebal = edge MST (Kruskal), garis merah putus-putus = edge yang ditolak karena siklus, garis biru = pohon buatanmu.</p>' +
      '<p><b>Pohon rentang:</b> menghubungkan semua V node dengan tepat V−1 = ' + (N.length - 1) + ' edge dan <b>tanpa siklus</b>. Edge yang menutup siklus pasti ditolak, itulah yang membuat Snorlax terpental. MST adalah pohon rentang dengan total bobot minimum.</p>' +
      '<p><b>Strategi:</b> pada tiap langkah, ambil edge termurah yang menyambung pohonmu ke node baru (algoritma Prim). Kruskal memilih edge dari bobot terkecil di seluruh graph dan menghasilkan bobot MST yang sama.</p>' +
      '<div class="row"><button class="btn" id="o1">ULANGI</button>' + (win && lvIdx >= 0 && !last ? '<button class="btn" id="o2">LEVEL BERIKUT</button>' : '') + '<button class="btn" id="o3">LIHAT PETA</button><button class="btn" id="o4">MENU</button></div>';
   $('ov').style.display = 'flex';
   $('o1').onclick = () => newGame(lvIdx, lvIdx < 0 ? S.c : null); if ($('o2')) $('o2').onclick = () => newGame(lvIdx + 1);
   $('o3').onclick = () => $('ov').style.display = 'none'; $('o4').onclick = menu
}
function menu() { clearInterval(krTimer); S = null; $('game').style.display = 'none'; $('ov').style.display = 'none'; $('lobby').style.display = 'flex' }
