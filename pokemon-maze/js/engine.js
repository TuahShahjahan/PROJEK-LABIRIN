/* ===== RENDERING / GAME ENGINE ===== */
function draw(ts) {
  if (!S) return; const g = S.g; cx.imageSmoothingEnabled = false;
  for (let y = 0; y < g.H; y++)for (let x = 0; x < g.W; x++) {
    if (g.grid[y][x]) { cx.fillStyle = (x + y) % 2 ? '#f1deae' : '#ead49a'; cx.fillRect(x * TS, y * TS, TS, TS) }
    else cx.drawImage(IM.t, x * TS, y * TS, TS, TS)
  }
  const C = n => [n.x * TS + TS / 2, n.y * TS + TS / 2];
  cx.font = 'bold 12px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  if (S.hint && S.hint.path.length > 1) {
    cx.save(); cx.globalAlpha = .55; cx.strokeStyle = '#8a4dff'; cx.lineWidth = 14; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.beginPath();
    S.hint.path.forEach((id, k) => { const q = C(g.by[id]); k ? cx.lineTo(...q) : cx.moveTo(...q) }); cx.stroke(); cx.restore()
  }
  const fl = S.flash && ts - S.flash.t0 < 800 ? S.flash : null, hotOf = e => fl && fl.id === e.id && Math.floor((ts - fl.t0) / 100) % 2 === 0;
  const colOf = e => hotOf(e) ? '#ff2d2d' : e.cur ? '#ffd83b' : e.st === 'mst' ? '#2e9b4a' : e.st === 'rej' ? '#d9444d' : e.blocked ? '#9d9486' : '#b08a4a';
  g.edges.forEach(e => {
    const a = C(g.by[e.a]), b = C(g.by[e.b]), hot = hotOf(e);
    cx.strokeStyle = colOf(e); cx.lineWidth = hot ? 9 : e.cur || e.st === 'mst' ? 7 : 4; cx.setLineDash(hot || e.st === 'mst' || e.cur ? [] : [8, 6]);
    cx.beginPath(); cx.moveTo(...a); cx.lineTo(...b); cx.stroke(); cx.setLineDash([])
  });
  // pohon yang sudah dipasang pemain (hanya edge yang benar-benar ditempuh dengan biaya)
  cx.strokeStyle = '#2f6fe0'; cx.lineWidth = 4; cx.lineCap = 'round';
  const T = S.trail.slice(); if (S.mv && S.mv.claim) { const t = Math.min(1, (ts - S.mv.t0) / S.mv.dur); T.push([S.mv.fx, S.mv.fy, S.mv.fx + (S.mv.tx - S.mv.fx) * t, S.mv.fy + (S.mv.ty - S.mv.fy) * t]) }
  cx.beginPath(); T.forEach(s => { cx.moveTo(s[0] * TS + TS / 2, s[1] * TS + TS / 2); cx.lineTo(s[2] * TS + TS / 2, s[3] * TS + TS / 2) }); cx.stroke(); cx.lineCap = 'butt';
  g.edges.forEach(e => {
    const a = C(g.by[e.a]), b = C(g.by[e.b]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    cx.fillStyle = '#fffdee'; cx.strokeStyle = colOf(e); cx.lineWidth = 2;
    cx.beginPath(); cx.roundRect(mx - 11, my - 10, 22, 20, 5); cx.fill(); cx.stroke();
    cx.fillStyle = '#264b4c'; cx.fillText(e.w, mx, my + 1)
  });
  const K = S.showDist && !S.over ? keys() : null, mk = K ? Math.min(...Object.values(K).filter(v => v != null)) : 0;
  g.nodes.forEach(n => {
    const [x, y] = C(n), r = 12;
    if (n.vis) {
      cx.fillStyle = '#f2b705'; cx.beginPath(); cx.arc(x, y, r + 3, 0, 7); cx.fill(); cx.fillStyle = '#fff3b0'; cx.beginPath(); cx.arc(x, y, r - 2, 0, 7); cx.fill();
      cx.strokeStyle = '#2e9b4a'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(x - 5, y); cx.lineTo(x - 1, y + 5); cx.lineTo(x + 6, y - 5); cx.stroke()
    }
    else {
      cx.fillStyle = '#d9444d'; cx.beginPath(); cx.arc(x, y, r, Math.PI, 0); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x, y, r, 0, Math.PI); cx.fill();
      cx.strokeStyle = '#222'; cx.lineWidth = 2.5; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.moveTo(x - r, y); cx.lineTo(x + r, y); cx.stroke();
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x, y, 4, 0, 7); cx.fill(); cx.stroke()
    }
    cx.fillStyle = '#243d63'; cx.fillText(n.id, x, y - r - 7);
    if (S.hint && S.hint.v === n.id) { const t = (ts % 900) / 900; cx.strokeStyle = '#8a4dff'; cx.lineWidth = 3; cx.globalAlpha = 1 - t; cx.beginPath(); cx.arc(x, y, r + 4 + t * 12, 0, 7); cx.stroke(); cx.globalAlpha = 1 }
    if (K && !n.vis) {
      const kv = K[n.id], c = kv == null ? '#8a8a8a' : kv === mk ? '#2e9b4a' : '#35609e';
      cx.fillStyle = c; cx.beginPath(); cx.roundRect(x - 13, y + r + 3, 26, 15, 7); cx.fill(); cx.fillStyle = '#fff'; cx.font = 'bold 11px system-ui'; cx.fillText(kv == null ? '–' : kv, x, y + r + 11); cx.font = 'bold 12px system-ui'
    }
  });
  S.fx = S.fx.filter(f => ts - f.t0 < 600);
  S.fx.forEach(f => {
    const t = (ts - f.t0) / 600, x = f.x * TS + TS / 2, y = f.y * TS + TS / 2; cx.globalAlpha = 1 - t; cx.fillStyle = '#ffd83b'; cx.strokeStyle = '#ffd83b'; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(x, y, 12 + t * 24, 0, 7); cx.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cx.fillRect(x + Math.cos(a) * (8 + t * 30) - 2, y + Math.sin(a) * (8 + t * 30) - 2, 4, 4) } cx.globalAlpha = 1
  });
  let px = S.px, py = S.py, bob = 0;
  if (S.mv) { const t = Math.min(1, (ts - S.mv.t0) / S.mv.dur); px = S.mv.fx + (S.mv.tx - S.mv.fx) * t; py = S.mv.fy + (S.mv.ty - S.mv.fy) * t; bob = Math.abs(Math.sin(t * Math.PI)) * 5 }
  if (S.pop && S.pop.text === 'SIKLUS!' && ts - S.pop.t0 < 500) px += Math.sin(ts / 22) * .07; // getar saat menabrak
  const sz = TS * 1.25; cx.fillStyle = 'rgba(0,0,0,.2)'; cx.beginPath(); cx.ellipse(px * TS + TS / 2, py * TS + TS - 4, 12, 4, 0, 0, 7); cx.fill();
  cx.drawImage(IM[CH + S.dir], px * TS + TS / 2 - sz / 2, py * TS + TS - sz + 2 - bob, sz, sz);
  if (S.pop && ts - S.pop.t0 < 900) {
    const t = (ts - S.pop.t0) / 900, x = S.pop.x * TS + TS / 2, y = S.pop.y * TS - 10 - t * 14;
    cx.globalAlpha = 1 - t * .6; cx.font = 'bold 13px system-ui'; const w = cx.measureText(S.pop.text).width + 16;
    cx.fillStyle = S.pop.text === 'SIKLUS!' ? '#d9444d' : '#243d63'; cx.beginPath(); cx.roundRect(x - w / 2, y - 11, w, 22, 6); cx.fill();
    cx.fillStyle = '#fff'; cx.fillText(S.pop.text, x, y + 1); cx.globalAlpha = 1; cx.font = 'bold 12px system-ui'
  }
}
function frame(ts) {
  if (S && !S.over) {
    if (S.mv && ts - S.mv.t0 >= S.mv.dur) arrive();
    if (S && !S.over) pump(ts)
  }
  draw(ts); requestAnimationFrame(frame)
}
